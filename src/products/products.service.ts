import { InjectQueue } from "@nestjs/bull";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  LoggerService,
  NotFoundException,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Queue } from "bull";
import { ResponseInterface } from "src/common/types/responseInterface";
import { ConverterService } from "src/currency-converter/currency-converter.service";
import { CollectionAddress } from "src/delivery/entities/collection_Address.entity";
import {
  NotificationAction,
  NotificationRelated,
  NotificationType,
} from "src/notifications/entities/notifications.entity";
import { NotificationsService } from "src/notifications/notifications.service";
import { PaymentStatus } from "src/orders/enums/orderStatus";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { Pagination, pagination } from "src/shared/utils/pagination";
import { FeeWithCommision } from "src/shared/utils/utils";
import { Transections } from "src/transections/entity/transections.entity";
import { TransectionType } from "src/transections/enums/transectionTypes";
import { UserBehaviourService } from "src/user-behaviour/user-behaviour.service";
import { User } from "src/user/entities/user.entity";
import { UserRoles } from "src/user/enums/role.enum";
import { UserService } from "src/user/user.service";
import { Wallets } from "src/wallets/entity/wallets.entity";
import { Between, DataSource, ILike, In, Repository } from "typeorm";
import { PRODUCT_CONSTANT } from "./constants/product.contants";
import { CreateProductDto } from "./dto/CreateProductDto.dto";
import { GetAdminProductQuery, GetProductsQueryDto } from "./dto/GetProductDto.dto";
import { ProductImage } from "./entities/productImage.entity";
import {
  DAYS_IN_SECOND,
  Product,
  PRODUCT_BOOSTING_COST,
  PRODUCT_BOOSTING_DAYS,
} from "./entities/products.entity";
import { defaultCurrency, ProductStatus } from "./enums/status.enum";
// import {Conver}
@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly _productRepository: Repository<Product>,

    private readonly _dataSource: DataSource,
    @InjectQueue("product") private readonly _queue: Queue,
    @InjectQueue("notifications") private readonly _notificationQueue: Queue,
    //  @InjectQueue("behaviour") private readonly userBehaviour:Queue ,
    private readonly _userBehaviourService: UserBehaviourService,
    @InjectRepository(ProductImage)
    private readonly _productImageRepository: Repository<ProductImage>,
    @InjectRepository(Wallets)
    private readonly _walletsRepo: Repository<Wallets>,
    @InjectRepository(CollectionAddress)
    private readonly _collectionRepo: Repository<CollectionAddress>,
    private readonly _notificationService: NotificationsService,
    private readonly _currencyConverterService: ConverterService,
    private readonly _userService: UserService,
    @InjectRepository(Transections) private readonly _transectionRepository: Repository<Transections>,
    @InjectLogger() private readonly _logger: LoggerService
  ) {}
  // async getProductById({product_id,status,}){

  // }
  checkProductStatus(status: ProductStatus) {
    if (status === ProductStatus.SOLD) {
      throw new BadRequestException("Product is already sold");
    }
    if (status === ProductStatus.DELETED) {
      throw new BadRequestException("Product is already Deleted");
    }
  }

  async updateProductStatus({
    id,
    user_id,
    status,
  }: {
    id: number;
    user_id?: string;
    status: ProductStatus;
  }): Promise<Product> {
    const query = user_id ? { id, user_id } : { id };
    const product = await this._productRepository.findOne({ where: { ...query } });
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found.`);
    }
    this.checkProductStatus(product.status);

    return this._productRepository.save({
      ...product,
      status,
    });
  }

  async create(createProductDto: CreateProductDto, user: User) {
    try {
      const wallets = await this._walletsRepo.findOne({ where: { user_id: user.id } });
      const userInfo = await this._userService.getUser(user.id);
      if (!wallets) {
        throw new BadRequestException("Your wallet is not active!");
      }
      const boostDays = PRODUCT_BOOSTING_DAYS;
      // let productBoostingCost = PRODUCT_BOOSTING_COST;
      const isBoosted = String(createProductDto.is_boosted).toLowerCase() === "true";
      const isNegotiable = String(createProductDto.is_negotiable).toLowerCase() === "true";
      let sellingPrice = parseFloat(createProductDto.price);
      const unit = parseInt(createProductDto.unit, 10);
      const weight = parseInt(createProductDto.weight, 10);
      const height = parseInt(createProductDto.height, 10);
      const width = parseInt(createProductDto.width, 10);
      const length = parseInt(createProductDto.length, 10);
      // let service_point_id: number = 0;

      if (isNaN(sellingPrice) || isNaN(unit)) {
        throw new BadRequestException("Invalid numeric values for price or unit!");
      }

      const productBoostingCost = await this._currencyConverterService.convert(
        defaultCurrency,
        user.currency.toUpperCase(),
        PRODUCT_BOOSTING_COST
      );
      sellingPrice = await this._currencyConverterService.convert(
        user.currency.toUpperCase(),
        defaultCurrency,
        sellingPrice
      );
      if (isBoosted && wallets.balance <= FeeWithCommision(productBoostingCost)) {
        throw new ForbiddenException(
          `You need at least ${FeeWithCommision(productBoostingCost)} ${user.currency} balance to boost a product`
        );
      }

      const queryRunner = this._dataSource.createQueryRunner();
      await queryRunner.startTransaction();

      try {
        // Create product
        const product = new Product();
        product.user_id = user.id;
        product.product_name = createProductDto.product_name;
        product.price = sellingPrice;

        // product.category = createProductDto.category;
        product.unit = unit;
        product.description = createProductDto.description;
        product.condition = createProductDto.condition;
        // (product.sizeId = createProductDto.size),
        //   (product.colorId = createProductDto.color),
        product.brand = createProductDto.brand;
        product.is_negotiable = isNegotiable;
        product.status = ProductStatus.PENDING;
        product.is_boosted = isBoosted;
        product.boost_start_time = isBoosted ? new Date() : null;
        product.boost_end_time = isBoosted ? new Date(Date.now() + boostDays * DAYS_IN_SECOND) : null;
        product.weight = weight;
        product.height = height;
        product.length = length;
        product.width = width;
        product.sizeId = createProductDto.size;
        product.colorId = createProductDto.color;
        product.subCategoryId = createProductDto.category;
        // product.service_point_id = service_point_id ? service_point_id : null;
        const savedProduct = await queryRunner.manager.save(Product, product);

        // Handle boost transaction
        if (isBoosted) {
          wallets.balance -= productBoostingCost;
          wallets.version += 1;

          const transection = new Transections();
          transection.amount = productBoostingCost;
          transection.paymentMethod = PRODUCT_CONSTANT.internalPaymentMethod();
          transection.product = product;
          transection.user = user;
          transection.user_id = user.id;
          transection.status = PaymentStatus.COMPLETED;
          transection.transection_type = TransectionType.BOOST;
          transection.paymentId = PRODUCT_CONSTANT.paymentTransectionId(product.id);
          transection.product_id = product.id;
          transection.wallet = wallets;
          transection.wallet_id = wallets.id;

          await queryRunner.manager.save(Wallets, wallets);
          await queryRunner.manager.save(Transections, transection);
        }
        // if (createProductDto.carrer_type == CARRER_TYPE.COLLECTION_TYPE) {
        // const productCollection = new CollectionAddress();
        // productCollection.name = `${userInfo.firstName} ${userInfo.lastName}`;
        // productCollection.email = userInfo.email;
        // productCollection.telephone = userInfo.phone;
        // productCollection.product = savedProduct;
        // // productCollection.
        // await queryRunner.manager.save(CollectionAddress, productCollection);
        // }
        // Handle images
        if (Array.isArray(createProductDto.images) && createProductDto.images.length > 0) {
          const productImages = createProductDto.images.map((imgUrl: string) => {
            const img = new ProductImage();
            img.image = imgUrl;
            img.product_id = savedProduct.id;
            img.product = savedProduct;
            return img;
          });

          // await this._queue.add("category", {
          //   image: productImages[0].image,
          //   name: product.category,
          // });

          await queryRunner.manager.save(ProductImage, productImages);
        }

        await queryRunner.commitTransaction();

        await this._notificationQueue.add("notification_saver", {
          user: userInfo,
          related: NotificationRelated.PRODUCT,
          msg: `${product.product_name} is listed for your review!`,
          type: NotificationType.SUCCESS,
          targetId: savedProduct.id,
          notificationFor: UserRoles.ADMIN,
          action: NotificationAction.CREATED,
          isImportant: true,
        });
        await this._notificationQueue.add("notification_saver", {
          user: userInfo,
          related: NotificationRelated.PRODUCT,
          msg: `You product ${product.product_name} is listed for admins review!`,
          type: NotificationType.SUCCESS,
          targetId: savedProduct.id,
          notificationFor: UserRoles.USER,
          action: NotificationAction.CREATED,
          isImportant: true,
          title: `You product ${product.product_name} is listed for admins review!`,
          body: `You will be notified once it is approved.`,
        });
        if (isBoosted) {
          await this._notificationQueue.add("notification_saver", {
            user: userInfo,
            related: NotificationRelated.WALLET,
            msg: `${product.product_name} is boosted for ${boostDays} days with ${productBoostingCost} GBP!`,
            type: NotificationType.SUCCESS,
            targetId: savedProduct.id,
            notificationFor: UserRoles.USER,
            action: NotificationAction.CREATED,
            isImportant: true,
            title: `${product.product_name} is boosted for ${boostDays} days with ${productBoostingCost} GBP!`,
            body: `It will will be visible to more buyers until ${product.boost_end_time.toLocaleDateString()}`,
          });
        }
        const productWithImages = await this._productRepository.findOne({
          where: { id: savedProduct.id },
        });
        const productImage = await this._productImageRepository.find({
          where: { product_id: savedProduct.id },
        });
        productWithImages.images = productImage;

        console.log("✅ Product created successfully:", savedProduct.id);

        return {
          message: "Product created successfully",
          data: productWithImages,
          statusCode: 201,
        };
      } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error("❌ Error creating product:", error.message, error.stack);
        throw new BadRequestException(error.message || "Error occurred while creating the product");
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  async findAll(
    page = 1,
    limit = 10,
    filters?: GetAdminProductQuery
  ): Promise<{ data: Product[]; pagination: Pagination; message: string; statusCode: 200 }> {
    const skip = (page - 1) * limit;

    const query = this._productRepository
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.images", "images");
    // .leftJoinAndSelect('product.images', 'images');
    query.leftJoinAndSelect("product.user", "user");
    // Filters
    if (filters?.name) {
      query.andWhere(
        `(product.product_name ILIKE :name 
      OR product.brand ILIKE :name 
      OR product.description ILIKE :name 
      OR user.firstName ILIKE :name 
      OR user.lastName ILIKE :name)`,
        { name: `%${filters.name}%` }
      );
    }

    if (filters?.status) {
      query.andWhere("product.status ILIKE :status", { status: `%${filters.status}%` });
    }
    if (filters?.category) {
      query.andWhere("product.category ILIKE :category", { category: `%${filters.category}%` });
    }

    if (filters?.size) {
      query.andWhere("product.size = :size", { size: filters.size });
    }
    // query.leftJoinAndSelect('product.images', 'productImages');
    query
      .orderBy("product.is_boosted", "DESC")
      .addOrderBy("product.boost_end_time", "ASC")
      .addOrderBy("product.created_at", "DESC");
    // Pagination
    query.skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      message: "Product retrived successfully",
      statusCode: 200,
      data,
      pagination: pagination({ page, limit, total }),
    };
  }

  shuffleArray(array) {
    let currentIndex = array.length,
      randomIndex,
      temporaryValue;

    // While there remain elements to shuffle
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // Swap elements
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
  }
  async findAllWithFilters(query: GetProductsQueryDto) {
    const { term, size, category, price, page = "1", limit = "10", userId, user, type, country } = query;

    // console.log(term)
    const where: any = {};
    const orderby: { is_boosted?: "DESC"; boost_end_time?: "ASC"; created_at?: "DESC" } = {};

    // Text Search
    if (term) {
      where.product_name = ILike(`%${term}%`);
    }
    if (country) {
      where.user = { address: ILike(`%${country}%`) };
    }

    if (category) {
      where.category = ILike(`%${category}%`);
    }

    if (size) {
      const sizes = size.split(",");
      where.size = In(sizes);
    }

    if (price) {
      const [min, max] = price.split("-").map(Number);
      where.price = Between(min || 0, max || Number.MAX_SAFE_INTEGER);
    }

    if (type === "own") {
      where.user_id = userId;
      where.status = In([ProductStatus.AVAILABLE, ProductStatus.PENDING]);
      // where.product.status = In([ProductStatus.AVAILABLE, ProductStatus.PENDING]);
      orderby.created_at = "DESC";
    } else {
      where.status = ProductStatus.PENDING;
      orderby.is_boosted = "DESC";
      orderby.boost_end_time = "ASC";
      orderby.created_at = "DESC";
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    if ((term || category || price) && type !== "own") {
      this._queue
        .add("user-behaviour", { userId: user.id, search: term, category, price, size })
        .catch((err) => console.error("Failed to queue user-behaviour job:", err));
    }
    // let orderBy: {
    //   is_boosted?: string;
    //   boost_end_time?: string;
    //   created_at?: string;
    //   status?: string;
    //   updated_at?: string;
    // } = { is_boosted: "DESC", boost_end_time: "ASC", created_at: "DESC", status: "DESC" };
    // if (type === "own") {
    //   orderBy = { updated_at: "DESC", created_at: "DESC" };
    // }
    console.log(where);
    const [data, total] = await this._productRepository.findAndCount({
      where,
      skip,
      take,
      order: orderby,
      relations: ["images"], // Ensure images are loaded
    });
    // const productIds = data.map((product) => product.id);
    // const productImages = await this._productImageRepository.find({
    //   where: { product_id: In(productIds) },
    // });
    const protectionFeeExtraCharge = await this._currencyConverterService.convert(
      defaultCurrency,
      user.currency.toUpperCase(),
      0.8
    );

    await Promise.all(
      data.map(async (product) => {
        const price = parseFloat(product.price as unknown as string);
        const convertedPrice = await this._currencyConverterService.convert(
          defaultCurrency,
          user.currency.toUpperCase(),
          price
        );
        product.price = convertedPrice;
        product.buyer_protection = FeeWithCommision(convertedPrice, 10) + protectionFeeExtraCharge;
        product.currency = user.currency.toUpperCase();
        // product.images = productImages?.filter((item) => item.product_id);
      })
    );
    const boostedProducts = data.filter((product) => product.is_boosted);
    // console.log(boostedProducts)
    const nonBoostedProducts = data.filter((product) => !product.is_boosted);
    // Shuffle only the boosted products
    const shuffledBoostedProducts = this.shuffleArray(boostedProducts);
    const finalData = [...shuffledBoostedProducts, ...nonBoostedProducts];
    return {
      message: "Products retrieved successfully",
      statusCode: 200,
      data: finalData,
      pagination: pagination({ page: parseInt(page), limit: parseInt(limit), total }),
    };
  }
  async boostProduct({ productId, user }: { productId: number; user: User }) {
    const product = await this.getProduct(productId); // Assume this fetches the product
    const wallets = await this._walletsRepo.findOne({ where: { user_id: user.id } });

    if (!wallets) {
      throw new BadRequestException("Wallet not found for this user");
    }

    if (product.is_boosted) {
      throw new BadRequestException("Product already boosted!");
    }

    const productBoostingCost = PRODUCT_BOOSTING_COST;
    const boostDays = PRODUCT_BOOSTING_DAYS;
    const daysInSecond = DAYS_IN_SECOND;

    if (wallets.balance < productBoostingCost) {
      throw new BadRequestException("You don't have enough balance to boost the product!");
    }

    if (product.user.id !== user.id) {
      throw new ForbiddenException("This is not your product");
    }

    // Start a new transaction
    const queryRunner = this._dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      // Update wallet balance
      wallets.balance -= productBoostingCost;
      wallets.version += 1;

      // Update product details
      product.is_boosted = true;
      product.boost_start_time = new Date();
      product.boost_end_time = new Date(Date.now() + boostDays * daysInSecond);

      // Create a new transaction record
      const transection = new Transections();
      transection.amount = productBoostingCost;
      transection.paymentMethod = "Internal";
      transection.product = product;
      transection.user = product.user;
      transection.wallet = wallets;
      transection.wallet_id = wallets.id;
      transection.status = PaymentStatus.COMPLETED;
      transection.transection_type = TransectionType.BOOST;
      transection.paymentId = `TSN-${productId}-${Math.floor(Math.random() * 1000000)}`;
      transection.product_id = product.id;

      // Save the transaction, wallet, and product within the transaction context
      await queryRunner.manager.save(Transections, transection);
      await queryRunner.manager.save(Wallets, wallets);
      const savedProduct = await queryRunner.manager.save(Product, product);

      // Commit the transaction after all operations
      await queryRunner.commitTransaction();

      return {
        message: "Product boosted successfully",
        data: savedProduct,
        status: "success",
        statusCode: 200,
      };
    } catch (error) {
      // Rollback the transaction if any error occurs
      await queryRunner.rollbackTransaction();
      console.error("Error during boosting product transaction:", error);
      throw new InternalServerErrorException("An error occurred while boosting the product.");
    } finally {
      // Always release the queryRunner, whether the transaction was successful or not
      await queryRunner.release();
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireBoostedProducts() {
    const currentDate = new Date();

    const result = await this._productRepository
      .createQueryBuilder()
      .update()
      .set({
        is_boosted: false,
        boost_start_time: null,
        boost_end_time: null,
      })
      .where("is_boosted = :isBoosted", { isBoosted: true })
      .andWhere("boost_end_time <= :currentDate", { currentDate })
      .returning("id") // PostgreSQL only — returns affected IDs
      .execute();

    console.log(`Cron Job: Expired products:`, result.raw);
  }

  async updateProduct(
    id: number,
    updateDto,
    user_id: string,
    user: User
  ): Promise<{ message: string; statusCode: number; data: Product }> {
    this._logger.log(`update product Dto`, updateDto);
    // return await this._dataSource.transaction(async (manager) => {
    //   const productRepo = manager.getRepository(Product);
    //   // if(productRepo)
    //   // const productImageRepo = manager.getRepository(ProductImage);
    //   const addressRepo = manager.getRepository(CollectionAddress);
    // console.log(id, user_id);
    const product = await this._productRepository.findOne({
      where: { id, user_id },
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found.`);
    }
    // console.log(product);
    if (
      product.status !== ProductStatus.PENDING &&
      product.status !== ProductStatus.AVAILABLE &&
      product.status !== ProductStatus.IN_PROGRESS
    ) {
      throw new BadRequestException(`Only available products can be updated.`);
    }

    const sellingPriceInput = Number(updateDto.price);

    // console.log(updateDto);

    // Convert selling price → default currency
    const convertedPrice = await this._currencyConverterService.convert(
      user.currency.toUpperCase(),
      defaultCurrency,
      sellingPriceInput
    );
    console.log("Updated-1", updateDto);
    // Buyer protection fee (example formula)

    if (updateDto.price) {
      // updateDto.price = convertedPrice;
      product.price = convertedPrice;
    }
    if (updateDto.unit) {
      // updateDto.unit = Number(updateDto.unit);
      product.unit = Number(updateDto.unit);
    }
    if (updateDto.is_boosted) {
      updateDto.is_boosted = updateDto.is_boosted === "true";
      product.is_boosted = updateDto.is_boosted;
    }
    if (updateDto.weight) {
      updateDto.weight = Number(updateDto.weight);
      product.weight = Number(updateDto.weight);
    }
    if (updateDto.width) {
      updateDto.width = Number(updateDto.width);
      product.width = Number(updateDto.width);
    }
    if (updateDto.height) {
      updateDto.height = Number(updateDto.height);
      product.height = Number(updateDto.height);
    }
    if (updateDto.length) {
      updateDto.length = Number(updateDto.length);
      product.length = Number(updateDto.length);
    }
    // if (updateDto.size) {
    //   product.size = updateDto.size;
    // }
    if (updateDto.product_name) {
      product.product_name = updateDto.product_name;
    }
    // if (updateDto.category) {
    //   product.category = updateDto.category;
    // }
    if (updateDto.brand) {
      product.brand = updateDto.brand;
    }
    if (updateDto.condition) {
      product.condition = updateDto.condition;
    }
    if (updateDto.description) {
      product.description = updateDto.description;
    }
    // Assign product fields
    // Object.assign(product, {
    //   ...updateDto,
    // });

    // -----------------------------
    // IMAGES
    // -----------------------------
    console.log("Updated", updateDto);
    // this._logger.log("Product", updateDto);
    let productImg = null;
    if (updateDto.images && updateDto.images.length > 0) {
      console.log("Updating images...");
      await this._productImageRepository.delete({ product: { id: id } });
      const newImages = updateDto.images.map((imgUrl) => {
        const obj = new ProductImage();
        obj.product = product;
        obj.product_id = id;
        // obj.productId = product.id;
        obj.image = imgUrl;
        return obj;
      });
      this._logger.log(`Edit Product Images`, newImages);
      productImg = newImages;
      // await manager.save(ProductImage, newImages);
      await this._productImageRepository.save(newImages);
      // product.images = newImages
    }

    // if (productImg) {
    //   product.images = productImg;
    // }
    const productImages = await this._productImageRepository.find({ where: { product_id: id } });
    product.images = productImages;

    // -----------------------------
    // ADDRESS / CARRIER LOGIC
    if (updateDto.carrer_type === "collection_address") {
      if (product.collectionAddress) {
        console.log("Updating existing address...");
        console.log("Before update:", product.collectionAddress);

        // Merge only fields that exist in updateDto
        for (const key of Object.keys(updateDto)) {
          if (key in product.collectionAddress) {
            (product.collectionAddress as any)[key] = (updateDto as any)[key];
          }
        }

        const address = await this._collectionRepo.save(product.collectionAddress);
        console.log("Updated existing address:", address);
      }
    }
    product.carrer_option = updateDto.carrer_type;
    // If courier drop-off or pickup
    // if (updateDto.carrer_type !== "collection_address") {
    //   // If they choose shipping with service point
    //   if (updateDto.service_point_id) {
    //     product.service_point_id = Number(updateDto.service_point_id);
    //   } else {
    //     product.service_point_id = null;
    //   }
    // }

    // -----------------------------
    // Store protection fee
    // -----------------------------
    // product.protectionFee = buyerProtectionFee;
    console.log("Product Img", productImg);
    // product.images = productImg ? productImg : product.images;
    // Save final product
    await this._productRepository.save(product);

    return {
      message: "Product updated successfully",
      statusCode: 200,
      data: product,
    };
    // );
  }

  async getProduct(id: number): Promise<Product> {
    return await this._productRepository.findOne({
      where: { id },
      relations: ["user", "favorites", "images"],
    });
  }

  async updateProductsStatus(id: number): Promise<ResponseInterface<Product>> {
    try {
      const product = await this._productRepository.findOne({
        where: { id, status: ProductStatus.PENDING },
        relations: ["user"],
      });
      if (!product) {
        throw new NotFoundException("Product not found!");
      }
      product.status = ProductStatus.AVAILABLE;
      await this._productRepository.save(product);

      // await this._notificationService.createNotification({
      //   userId: product.user.id,
      //   action: NotificationAction.UPDATED,
      //   msg: `${product.product_name} is now available on marketplace`,
      //   isImportant: false,
      //   related: NotificationRelated.PRODUCT,
      //   targetId: product.id,
      // });

      await this._notificationQueue.add("notification_saver", {
        user: product.user,
        related: NotificationRelated.PRODUCT,
        action: NotificationAction.UPDATED,
        msg: `${product.product_name} is now available on marketplace`,
        type: NotificationType.SUCCESS,
        targetId: product.id,
        notificationFor: UserRoles.USER,
        isImportant: true,
        title: `${product.product_name} is now available on marketplace`,
        body: `Your product ${product.product_name} is approved.`,
      });
      return { message: "Product updated", statusCode: 200, data: product, status: "success" };
    } catch (error) {
      console.log(error);
    }
  }
  async getProductifFavourites(id: number, userId?: string, user?: User): Promise<any> {
    const product = await this.getProduct(id);
    // If the product doesn't exist, throw an exception
    if (!product) {
      throw new NotFoundException("Product not found");
    }
    if (product.status === ProductStatus.REJECTED) {
      throw new BadRequestException("Product is Rejected");
    }
    if (product.status === ProductStatus.PENDING) {
      throw new BadRequestException("Product is pending");
    }
    if (product.status === ProductStatus.DELETED) {
      throw new BadRequestException("Product is deleted");
    }
    if (product.status === ProductStatus.SOLD) {
      throw new BadRequestException("Product is sold");
    }
    // Check if the product has been favorited by the user
    const isFavorite = product.favorites.some((favorite) => favorite.user.id === userId);

    if (user.currency) {
      const price = parseFloat(product.price as unknown as string);
      const protectionFeeExtraCharge = await this._currencyConverterService.convert(
        defaultCurrency,
        user.currency.toUpperCase(),
        0.8
      );
      product.price = await this._currencyConverterService.convert(
        defaultCurrency,
        user.currency.toUpperCase(),
        price
      );
      console.log(protectionFeeExtraCharge);
      product.buyer_protection = FeeWithCommision(product.price, 10) + protectionFeeExtraCharge;
    }
    // const productImage = await this._productImageRepository.find({ where: { id: product.id } });
    // product.images = productImage;
    delete product.favorites;

    // Return product with favorite status (true or false) and associated images
    return {
      message: "Product retrieved successfully",
      statusCode: 200,
      data: {
        ...product, // Spread product properties
        isFavorite, // Set the favorite status based on user’s favorite
      },
    };
  }
  async checkProductIsAvailable(product: Product) {
    if (product.status === ProductStatus.REJECTED) {
      throw new BadRequestException("Product is Rejected");
    }
    if (product.status === ProductStatus.PENDING) {
      throw new BadRequestException("Product is pending");
    }
    if (product.status === ProductStatus.DELETED) {
      throw new BadRequestException("Product is deleted");
    }
    if (product.status === ProductStatus.SOLD) {
      throw new BadRequestException("Product is sold");
    }
    return product;
  }
  async getProductIdAndDelete(product_id: number, userId?: string) {
    const product = await this._productRepository.findOne({ where: { id: product_id, user_id: userId } });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    // Option 1: Soft delete (recommended if you have a status field)
    product.status = ProductStatus.DELETED;
    await this._productRepository.save(product);

    // Option 2: Hard delete (uncomment if you want to remove from DB)
    // await this._productRepository.delete({ id: product_id, user_id: userId });

    return {
      message: "Product deleted successfully",
      statusCode: 200,
      data: {},
    };
  }

  async getProductById(id: number): Promise<ResponseInterface<Product>> {
    const product = await this.getProduct(id);
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    return { message: "Product Retrived Successfully", data: product, statusCode: 200, status: "success" };
  }

  async findByIdWithSeller(productId: number): Promise<Product> {
    return await this._productRepository.findOne({
      where: { id: productId },
      relations: ["user"],
    });
  }
}
