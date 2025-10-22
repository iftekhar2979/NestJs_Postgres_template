import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, DataSource, ILike, In, LessThanOrEqual, Repository } from "typeorm";
import {
  DAYS_IN_SECOND,
  Product,
  PRODUCT_BOOSTING_COST,
  PRODUCT_BOOSTING_DAYS,
} from "./entities/products.entity";
import { ProductImage } from "./entities/productImage.entity";
import { CreateProductDto } from "./dto/CreateProductDto.dto";
import { defaultCurrency, ProductStatus } from "./enums/status.enum";
import { GetAdminProductQuery, GetProductsQueryDto } from "./dto/GetProductDto.dto";
import { Pagination, pagination } from "src/shared/utils/pagination";
import { UpdateProductDto } from "./dto/updatingProduct.dto";
import { ResponseInterface } from "src/common/types/responseInterface";
import { NotificationsService } from "src/notifications/notifications.service";
import {
  NotificationAction,
  NotificationRelated,
  NotificationType,
} from "src/notifications/entities/notifications.entity";
import { UserRoles } from "src/user/enums/role.enum";
import { User } from "src/user/entities/user.entity";
import { Transections } from "src/transections/entity/transections.entity";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Wallets } from "src/wallets/entity/wallets.entity";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { UserBehaviourService } from "src/user-behaviour/user-behaviour.service";
import { TransectionType } from "src/transections/enums/transectionTypes";
import { PaymentStatus } from "src/orders/enums/orderStatus";
import { ConverterService } from "src/currency-converter/currency-converter.service";
import { FeeWithCommision } from "src/shared/utils/utils";
// import {Conver}
@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly _productRepository: Repository<Product>,

    private readonly _dataSource: DataSource,
    @InjectQueue("product") private readonly _queue: Queue,
    //  @InjectQueue("behaviour") private readonly userBehaviour:Queue ,
    private readonly _userBehaviourService: UserBehaviourService,
    @InjectRepository(ProductImage)
    private readonly _productImageRepository: Repository<ProductImage>,
    @InjectRepository(Wallets)
    private readonly _walletsRepo: Repository<Wallets>,
    private readonly _notificationService: NotificationsService,
    private readonly _currencyConverterService: ConverterService,

    @InjectRepository(Transections) private readonly _transectionRepository: Repository<Transections>
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
    const wallets = await this._walletsRepo.findOne({ where: { user_id: user.id } });
    if (!wallets) {
      throw new BadRequestException("Your wallet is not active!");
    }
    const boostDays = PRODUCT_BOOSTING_DAYS;
    // let productBoostingCost = PRODUCT_BOOSTING_COST;
    const isBoosted = String(createProductDto.is_boosted).toLowerCase() === "true";
    const isNegotiable = String(createProductDto.is_negotiable).toLowerCase() === "true";
    let sellingPrice = parseFloat(createProductDto.selling_price);
    const quantity = parseInt(createProductDto.quantity, 10);

    if (isNaN(sellingPrice) || isNaN(quantity)) {
      throw new BadRequestException("Invalid numeric values for price or quantity");
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
      product.selling_price = sellingPrice;
      product.category = createProductDto.category;
      product.quantity = quantity;
      product.description = createProductDto.description;
      product.condition = createProductDto.condition;
      product.size = createProductDto.size;
      product.brand = createProductDto.brand;
      product.is_negotiable = isNegotiable;
      product.status = ProductStatus.PENDING;
      product.is_boosted = isBoosted;
      product.boost_start_time = isBoosted ? new Date() : null;
      product.boost_end_time = isBoosted ? new Date(Date.now() + boostDays * DAYS_IN_SECOND) : null;

      const savedProduct = await queryRunner.manager.save(Product, product);

      // Handle boost transaction
      if (isBoosted) {
        wallets.balance -= productBoostingCost;
        wallets.version += 1;

        const transection = new Transections();
        transection.amount = productBoostingCost;
        transection.paymentMethod = "Internal";
        transection.product = product;
        transection.user = user;
        transection.user_id = user.id;
        transection.status = PaymentStatus.COMPLETED;
        transection.transection_type = TransectionType.BOOST;
        transection.paymentId = `TSN-${product.id}-${Math.floor(Math.random() * 1000000)}`;
        transection.product_id = product.id;
        transection.wallet = wallets;
        transection.wallet_id = wallets.id;

        await queryRunner.manager.save(Wallets, wallets);
        await queryRunner.manager.save(Transections, transection);
      }

      // Handle images
      if (Array.isArray(createProductDto.images) && createProductDto.images.length > 0) {
        const productImages = createProductDto.images.map((imgUrl: string) => {
          const img = new ProductImage();
          img.image = imgUrl;
          img.product_id = savedProduct.id;
          img.product = savedProduct;
          return img;
        });
        await queryRunner.manager.save(ProductImage, productImages);
      }

      await queryRunner.commitTransaction();

      // Notification (outside transaction)
      await this._notificationService.createNotification({
        userId: user.id,
        related: NotificationRelated.PRODUCT,
        msg: `${product.product_name} is listed for your review!`,
        type: NotificationType.SUCCESS,
        targetId: savedProduct.id,
        notificationFor: UserRoles.ADMIN,
        action: NotificationAction.CREATED,
        isImportant: true,
      });

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
      where.selling_price = Between(min || 0, max || Number.MAX_SAFE_INTEGER);
    }

    if (type === "own") {
      where.user_id = userId;
    } else {
      where.status = ProductStatus.AVAILABLE;
    }

    if (!term || !category || type !== "own") {
      // if(behaviorData && behaviorData.search){
      //   where.product_name = ILike(`%${behaviorData.search}%`)
      // }
      // if(behaviorData && behaviorData.category){
      //   where.category = ILike(`%${behaviorData.category}%`)
      // }
      // Adjust filters based on user behavior
      // if (behaviorData.searchTerms.length > 0) {
      //   where.product_name = ILike(`%${behaviorData.searchTerms.join(' ')}%`);  // Combine search terms
      // }
    }
    // if (behaviorData.categories.length > 0) {
    //   where.category = In(behaviorData.categories);  // Match any of the aggregated categories
    // }

    // if (behaviorData.brand.length > 0) {
    //   where.size = In(behaviorData.brand);  // Match any of the aggregated sizes
    // }

    // if (behaviorData.priceRanges.length > 0) {
    //   const [minPrice, maxPrice] = behaviorData.priceRanges[0].split('-').map(Number);  // Just use the first available range
    //   where.selling_price = Between(minPrice || 0, maxPrice || Number.MAX_SAFE_INTEGER);
    // }
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
    const [data, total] = await this._productRepository.findAndCount({
      where,
      skip,
      take,
      order: { is_boosted: "DESC", boost_end_time: "ASC", created_at: "DESC" },
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
    console.log(user.currency.toUpperCase(), defaultCurrency);
    console.log(protectionFeeExtraCharge);
    await Promise.all(
      data.map(async (product) => {
        const price = parseFloat(product.selling_price as unknown as string);
        const convertedPrice = await this._currencyConverterService.convert(
          defaultCurrency,
          user.currency.toUpperCase(),
          price
        );
        product.selling_price = convertedPrice;
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
    console.log(user);
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

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT) // Runs every minute for demonstration ; adjust as needed .
  async expireBoostedProducts() {
    const currentDate = new Date();

    const expiredBoostedProducts = await this._productRepository.find({
      where: {
        is_boosted: true,
        boost_end_time: LessThanOrEqual(currentDate), // Expired boosts
      },
    });

    await this._currencyConverterService.getRates(defaultCurrency);
    // console.log()
    console.log("Cron Job : ", expiredBoostedProducts);
    for (const product of expiredBoostedProducts) {
      product.is_boosted = false;
      product.boost_start_time = null;
      product.boost_end_time = null;
      await this._productRepository.save(product);
    }
  }

  async updateProduct(
    id: number,
    updateDto: UpdateProductDto,
    user_id: string,
    user: User
  ): Promise<{ message: string; statusCode: number; data: Product }> {
    const product = await this._productRepository.findOne({
      where: { id, user_id, status: ProductStatus.AVAILABLE },
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found.`);
    }
    const productSellingPrice = Number(updateDto.selling_price);

    const productPrice = await this._currencyConverterService.convert(
      user.currency,
      defaultCurrency,
      productSellingPrice
    );
    try {
      Object.assign(product, {
        ...updateDto,
        selling_price: productPrice,
        quantity: Number(updateDto.quantity),
        is_negotiable: updateDto.is_negotiable === "true",
        images: updateDto.images.length > 0 ? updateDto.images : product.images,
      });
      // Optional: Replace images if new images are provided
      if (updateDto.images && Array.isArray(updateDto.images) && updateDto.images.length > 0) {
        await this._productImageRepository.delete({ product_id: id });

        // Add new images
        product.images = updateDto.images.map((imgUrl: string) => {
          const img = new ProductImage();
          img.image = imgUrl; // assuming images are URLs; if files, handle accordingly
          img.product_id = product.id; // link image to product
          return img;
        });
        await this._productImageRepository.insert(product.images);
      }
      await this._productRepository.save(product);
      return { message: "Product updated successfully", statusCode: 200, data: product };
    } catch (error) {
      console.error("Error updating product:", error);
      throw new BadRequestException("Failed to update product.");
    }
  }

  async getProduct(id: number): Promise<Product> {
    return await this._productRepository.findOne({
      where: { id },
      relations: ["user", "favorites", "images"],
    });
  }

  async updateProductsStatus(id: number): Promise<ResponseInterface<Product>> {
    try {
      const product = await this._productRepository.findOne({ where: { id, status: ProductStatus.PENDING } });
      if (!product) {
        throw new NotFoundException("Product not found!");
      }
      product.status = ProductStatus.AVAILABLE;
      await this._productRepository.save(product);

      await this._notificationService.createNotification({
        userId: product.user.id,
        action: NotificationAction.UPDATED,
        msg: `${product.product_name} is now available on marketplace`,
        isImportant: false,
        related: NotificationRelated.PRODUCT,
        targetId: product.id,
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
      const price = parseFloat(product.selling_price as unknown as string);
      product.selling_price = await this._currencyConverterService.convert(
        defaultCurrency,
        user.currency.toUpperCase(),
        price
      );

      product.buyer_protection = FeeWithCommision(product.selling_price, 10);
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
