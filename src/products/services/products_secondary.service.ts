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
import { DataSource, In, Repository } from "typeorm";

import { ConverterService } from "src/currency-converter/currency-converter.service";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { pagination, Pagination } from "src/shared/utils/pagination";
import { FeeWithCommision } from "src/shared/utils/utils";
import { UserBehaviourService } from "src/user-behaviour/user-behaviour.service";
import { User } from "src/user/entities/user.entity";
import { UserRoles } from "src/user/enums/role.enum";
import { UserService } from "src/user/user.service";

import { CollectionAddress } from "src/delivery/entities/collection_Address.entity";
import {
  NotificationAction,
  NotificationRelated,
  NotificationType,
} from "src/notifications/entities/notifications.entity";
import { PaymentStatus } from "src/orders/enums/orderStatus";
import { Transections } from "src/transections/entity/transections.entity";
import { TransectionType } from "src/transections/enums/transectionTypes";
import { Wallets } from "src/wallets/entity/wallets.entity";
import { PRODUCT_CONSTANT } from "../constants/product.contants";
import { CreateProductDto } from "../dto/secondary/CreateProduct.dto";
import { GetAdminProductsQueryDto, GetProductsQueryDto } from "../dto/secondary/GetProduct.dto";
import { UpdateProductDto } from "../dto/secondary/UpdateProduct.dto";
import { ProductImage } from "../entities/productImage.entity";
import { DAYS_IN_SECOND, Product, PRODUCT_BOOSTING_COST, PRODUCT_BOOSTING_DAYS } from "../entities/products.entity";
import { defaultCurrency, ProductStatus } from "../enums/status.enum";
import { ProductVariant } from "../varients/entities/productVarient.entity";

// ─── Response shape helpers ───────────────────────────────────────────────────

export interface PagedResponse<T> {
  message: string;
  statusCode: 200;
  data: T[];
  pagination: Pagination;
}

export interface SingleResponse<T> {
  message: string;
  statusCode: number;
  data: T;
  status?: string;
}

@Injectable()
export class ProductsSecondaryService {
  constructor(
    @InjectRepository(Product)
    private readonly _productRepo: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly _imageRepo: Repository<ProductImage>,

    @InjectRepository(ProductVariant)
    private readonly _variantRepo: Repository<ProductVariant>,

    @InjectRepository(Wallets)
    private readonly _walletRepo: Repository<Wallets>,

    @InjectRepository(CollectionAddress)
    private readonly _collectionRepo: Repository<CollectionAddress>,

    @InjectRepository(Transections)
    private readonly _transactionRepo: Repository<Transections>,

    private readonly _dataSource: DataSource,

    @InjectQueue("product")
    private readonly _productQueue: Queue,

    @InjectQueue("notifications")
    private readonly _notificationQueue: Queue,

    private readonly _currencyService: ConverterService,
    private readonly _userService: UserService,
    private readonly _userBehaviourService: UserBehaviourService,

    @InjectLogger()
    private readonly _logger: LoggerService
  ) {}

  // ══════════════════════════════════════════════════════════════════════════════
  // CREATE
  // ══════════════════════════════════════════════════════════════════════════════

  async create(dto: CreateProductDto, user: User){
    // ── Wallet check ────────────────────────────────────────────────────────────
    const wallet = await this._walletRepo.findOne({ where: { user_id: user.id } });
    if (!wallet) throw new BadRequestException("Your wallet is not active!");

    const userInfo = await this._userService.getUser(user.id);
    const isBoosted = Boolean(dto.is_boosted);
    const isNegotiable = Boolean(dto.is_negotiable);

    // ── Currency conversion ─────────────────────────────────────────────────────
    const basePriceInDefault = await this._currencyService.convert(
      user.currency.toUpperCase(),
      defaultCurrency,
      Number(dto.price)
    );

    const boostCostInUserCurrency = await this._currencyService.convert(
      defaultCurrency,
      user.currency.toUpperCase(),
      PRODUCT_BOOSTING_COST
    );

    if (isBoosted && wallet.balance < FeeWithCommision(boostCostInUserCurrency)) {
      throw new ForbiddenException(
        `Insufficient balance. You need at least ${FeeWithCommision(boostCostInUserCurrency)} ${user.currency.toUpperCase()} to boost a product.`
      );
    }

    // ── Validate variants (no duplicate color+size) ─────────────────────────────
    this._assertNoDuplicateVariants(dto.variants);

    // ── Transaction ─────────────────────────────────────────────────────────────
    const queryRunner = this._dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Save product
      const product = queryRunner.manager.create(Product, {
        user_id: user.id,
        product_name: dto.product_name,
        description: dto.description,
        condition: dto.condition,
        brand: dto.brand,
        price: basePriceInDefault,
        subCategoryId: Number(dto.subCategoryId),
        is_negotiable: isNegotiable,
        is_boosted: isBoosted,
        boost_start_time: isBoosted ? new Date() : undefined,
        boost_end_time: isBoosted ? new Date(Date.now() + PRODUCT_BOOSTING_DAYS * DAYS_IN_SECOND) : undefined,
        weight: dto.weight ? Number(dto.weight) : undefined,
        height: dto.height ? Number(dto.height) : undefined,
        width: dto.width ? Number(dto.width) : undefined,
        carrer_option: dto.carrer_option,
        status: ProductStatus.PENDING,
      });
      const savedProduct = await queryRunner.manager.save(Product, product);

      // 2. Save images
      if (dto.images?.length > 0) {
        const images = dto.images.map((url) =>
          queryRunner.manager.create(ProductImage, {
            image: url,
            product_id: savedProduct.id,
            product: savedProduct,
          })
        );
        await queryRunner.manager.save(ProductImage, images);
      }

      // 3. Save variants
      const variants = dto.variants.map((v) =>
        queryRunner.manager.create(ProductVariant, {
          product_id: savedProduct.id,
          product: savedProduct,
          colorId: v.colorId,
          sizeId: v.sizeId,
          unit: v.unit,
          price_override: v.price_override ?? null,
          sku: v.sku ?? null,
        })
      );
      await queryRunner.manager.save(ProductVariant, variants);

      // 4. Collection address
      if (dto.carrer_option === "collection_address" && dto.collectionAddress) {
        const addr = queryRunner.manager.create(CollectionAddress, {
          ...dto.collectionAddress,
          product: savedProduct,
        });
        await queryRunner.manager.save(CollectionAddress, addr);
      }

      // 5. Boost deduction
      if (isBoosted) {
        wallet.balance -= PRODUCT_BOOSTING_COST;
        wallet.version += 1;
        await queryRunner.manager.save(Wallets, wallet);

        const tx = queryRunner.manager.create(Transections, {
          amount: PRODUCT_BOOSTING_COST,
          paymentMethod: PRODUCT_CONSTANT.internalPaymentMethod(),
          paymentId: PRODUCT_CONSTANT.paymentTransectionId(savedProduct.id),
          product: savedProduct,
          product_id: savedProduct.id,
          user: user,
          user_id: user.id,
          wallet: wallet,
          wallet_id: wallet.id,
          status: PaymentStatus.COMPLETED,
          transection_type: TransectionType.BOOST,
        });
        await queryRunner.manager.save(Transections, tx);
      }

      await queryRunner.commitTransaction();

      // ── Notifications ──────────────────────────────────────────────────────────
      await Promise.all([
        this._notificationQueue.add("notification_saver", {
          user: userInfo,
          related: NotificationRelated.PRODUCT,
          msg: `New product "${savedProduct.product_name}" submitted for review.`,
          type: NotificationType.SUCCESS,
          targetId: savedProduct.id,
          notificationFor: UserRoles.ADMIN,
          action: NotificationAction.CREATED,
          isImportant: true,
        }),
        this._notificationQueue.add("notification_saver", {
          user: userInfo,
          related: NotificationRelated.PRODUCT,
          msg: `Your product "${savedProduct.product_name}" has been submitted for admin review.`,
          type: NotificationType.SUCCESS,
          targetId: savedProduct.id,
          notificationFor: UserRoles.USER,
          action: NotificationAction.CREATED,
          isImportant: true,
          title: "Product submitted!",
          body: "You will be notified once it is approved.",
        }),
        isBoosted &&
          this._notificationQueue.add("notification_saver", {
            user: userInfo,
            related: NotificationRelated.WALLET,
            msg: `"${savedProduct.product_name}" boosted for ${PRODUCT_BOOSTING_DAYS} days.`,
            type: NotificationType.SUCCESS,
            targetId: savedProduct.id,
            notificationFor: UserRoles.USER,
            action: NotificationAction.CREATED,
            isImportant: true,
            title: "Product Boosted!",
            body: `Boost active until ${savedProduct.boost_end_time?.toLocaleDateString()}.`,
          }),
      ]);
 await this._productQueue.add(PRODUCT_CONSTANT.productUtils, {
            type: PRODUCT_CONSTANT.productStats,
            data: {
              product_id: savedProduct.id,
              user_id: user.id,
            },
          });
      // Reload with all relations
      const result = await this._loadProduct(savedProduct.id);
      return { message: "Product created successfully", statusCode: 201, data: result };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this._logger.error("Product create failed", err);
      throw new BadRequestException(err.message || "Failed to create product");
    } finally {
      await queryRunner.release();
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // READ — Public listing (filterable, paginated, currency-converted)
  // ══════════════════════════════════════════════════════════════════════════════

 async findAll(query: GetProductsQueryDto) {
  const {
    page = 1,
    limit = 10,
    term,
    brand,
    country,
    subCategoryId,
    sizes,
    colors,
    price,
    userId,
  } = query;

  const qb = this._productRepo
    .createQueryBuilder("p")
    .select([
      "p.id",
      "p.product_name",
      "p.price",
      "p.description",
    ]);

  // ── STATUS ─────────────────────────────
  qb.andWhere("p.status = :status", {
    status: ProductStatus.PENDING,
  });

  // ── SEARCH ─────────────────────────────
  if (term) {
    qb.andWhere(
      "(p.product_name ILIKE :term OR p.description ILIKE :term)",
      { term: `%${term}%` }
    );
  }

  if (brand) {
    qb.andWhere("p.brand ILIKE :brand", {
      brand: `%${brand}%`,
    });
  }

  if (subCategoryId) {
    qb.andWhere("p.subCategoryId = :subCategoryId", {
      subCategoryId,
    });
  }

  if (price) {
    const [min, max] = price.split("-").map(Number);
    if (!isNaN(min)) qb.andWhere("p.price >= :min", { min });
    if (!isNaN(max)) qb.andWhere("p.price <= :max", { max });
  }

  // ── SIZE FILTER (NO JOIN) ─────────────
  if (sizes) {
    const sizeIds = sizes.split(",").map(Number).filter(Boolean);
    if (sizeIds.length) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM product_variants v
          WHERE v.product_id = p.id
          AND v.size_id IN (:...sizeIds)
        )`,
        { sizeIds }
      );
    }
  }

  // ── COLOR FILTER (NO JOIN) ────────────
  if (colors) {
    const colorIds = colors.split(",").map(Number).filter(Boolean);
    if (colorIds.length) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM product_variants v
          WHERE v.product_id = p.id
          AND v.color_id IN (:...colorIds)
        )`,
        { colorIds }
      );
    }
  }

  // ── COUNTRY FILTER (NO JOIN) ──────────
  if (country) {
    qb.andWhere(
      `EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = p.user_id
        AND u.address ILIKE :country
      )`,
      { country: `%${country}%` }
    );
  }

  qb.orderBy("p.created_at", "DESC")
    .skip((page - 1) * limit)
    .take(limit);

  const [products, total] = await qb.getManyAndCount();

  // ── Get ONE image per product (separate lightweight query) ─────
  const productIds = products.map(p => p.id);

  let images = [];
  if (productIds.length > 0) {
    images = await this._imageRepo
      .createQueryBuilder("img")
      .select(["img.product_id", "MIN(img.image) as image"])
      .where("img.product_id IN (:...ids)", { ids: productIds })
      .groupBy("img.product_id")
      .getRawMany();
  }

  const imageMap = {};
  images.forEach(img => {
    imageMap[img.img_product_id] = img.image;
  });

  const data = products.map(p => ({
    id: p.id,
    product_name: p.product_name,
    price: p.price,
    description: p.description,
    image: imageMap[p.id] || null,
    rating:4,
    reviewCount:5,
  }));

  return {
    message: "Products retrieved successfully",
    statusCode: 200,
    data,
    pagination: pagination({ page, limit, total }),
  };
}

  // ══════════════════════════════════════════════════════════════════════════════
  // READ — Admin listing (all statuses, extra filters)
  // ══════════════════════════════════════════════════════════════════════════════

  async findAllAdmin(query: GetAdminProductsQueryDto): Promise<PagedResponse<Product>> {
    const { page = 1, limit = 10, term, brand, status, subCategoryId, sellerEmail } = query;
    const skip = (page - 1) * limit;

    const qb = this._productRepo
      .createQueryBuilder("p")
      .leftJoinAndSelect("p.images", "images")
      .leftJoinAndSelect("p.variants", "variants")
      .leftJoinAndSelect("variants.color", "color")
      .leftJoinAndSelect("variants.size", "size")
      .leftJoinAndSelect("p.subCategory", "subCategory")
      .leftJoinAndSelect("p.user", "user");

    if (term) {
      qb.andWhere(
        "(p.product_name ILIKE :term OR p.brand ILIKE :term OR user.firstName ILIKE :term OR user.lastName ILIKE :term)",
        { term: `%${term}%` }
      );
    }
    if (brand) qb.andWhere("p.brand ILIKE :brand", { brand: `%${brand}%` });
    if (status) qb.andWhere("p.status = :status", { status });
    if (subCategoryId) qb.andWhere("p.subCategoryId = :subCategoryId", { subCategoryId });
    if (sellerEmail) qb.andWhere("user.email ILIKE :email", { email: `%${sellerEmail}%` });

    qb.orderBy("p.is_boosted", "DESC")
      .addOrderBy("p.created_at", "DESC")
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      message: "Products retrieved successfully",
      statusCode: 200,
      data,
      pagination: pagination({ page, limit, total }),
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // READ — Single product detail
  // ══════════════════════════════════════════════════════════════════════════════

  async findOne(id: number, user: User): Promise<SingleResponse<any>> {
    const product = await this._loadProduct(id);
    if (!product) throw new NotFoundException(`Product ${id} not found`);

    this._assertProductVisible(product);

    const isFavorite = product.favorites?.some((f) => f.user?.id === user.id) ?? false;
    delete product.favorites;

    // Currency conversion
    const userCurrency = user.currency?.toUpperCase() ?? defaultCurrency;
    const basePrice = parseFloat(product.price as unknown as string);
    const protectionExtra = await this._currencyService.convert(defaultCurrency, userCurrency, 0.8);
    product.price = await this._currencyService.convert(defaultCurrency, userCurrency, basePrice);
    product.currency = userCurrency;
    product.buyer_protection = FeeWithCommision(product.price, 10) + protectionExtra;

    // Convert variant price overrides
    

    return {
      message: "Product retrieved successfully",
      statusCode: 200,
      data: { ...product, isFavorite },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // UPDATE
  // ══════════════════════════════════════════════════════════════════════════════

  async update(id: number, dto: UpdateProductDto, user: User): Promise<SingleResponse<Product>> {
    const product = await this._productRepo.findOne({
      where: { id, user_id: user.id },
      relations: ["images", "variants", "collectionAddress"],
    });

    if (!product) throw new NotFoundException(`Product ${id} not found`);

    const editableStatuses = [ProductStatus.PENDING, ProductStatus.AVAILABLE, ProductStatus.IN_PROGRESS];
    if (!editableStatuses.includes(product.status)) {
      throw new BadRequestException(`Product with status "${product.status}" cannot be updated`);
    }

    const queryRunner = this._dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // ── Scalar fields ──────────────────────────────────────────────────────
      if (dto.product_name !== undefined) product.product_name = dto.product_name;
      if (dto.description !== undefined) product.description = dto.description;
      if (dto.condition !== undefined) product.condition = dto.condition;
      if (dto.brand !== undefined) product.brand = dto.brand;
      if (dto.is_negotiable !== undefined) product.is_negotiable = dto.is_negotiable;
      if (dto.weight !== undefined) product.weight = dto.weight;
      if (dto.length !== undefined) product.length = dto.length;
      if (dto.width !== undefined) product.width = dto.width;
      if (dto.height !== undefined) product.height = dto.height;
      if (dto.carrer_option !== undefined) product.carrer_option = dto.carrer_option;
      if (dto.subCategoryId !== undefined) product.subCategoryId = dto.subCategoryId;

      // ── Price conversion ───────────────────────────────────────────────────
      if (dto.price !== undefined) {
        product.price = await this._currencyService.convert(
          user.currency.toUpperCase(),
          defaultCurrency,
          Number(dto.price)
        );
      }

      // Reset to PENDING so admin re-approves after edit
      product.status = ProductStatus.PENDING;

      await queryRunner.manager.save(Product, product);

      // ── Images: replace all ────────────────────────────────────────────────
      if (dto.images && dto.images.length > 0) {
        await queryRunner.manager.delete(ProductImage, { product_id: id });
        const newImages = dto.images.map((url) =>
          queryRunner.manager.create(ProductImage, {
            image: url,
            product_id: id,
            product,
          })
        );
        await queryRunner.manager.save(ProductImage, newImages);
        product.images = newImages;
      }

      // ── Variants: upsert + delete removed ─────────────────────────────────
      if (dto.variants && dto.variants.length > 0) {
        this._assertNoDuplicateVariants(dto.variants);

        const existing = await queryRunner.manager.find(ProductVariant, { where: { product_id: id } });
        const incomingIds = dto.variants.filter((v) => v.id).map((v) => v.id);
        const toDelete = existing.filter((v) => !incomingIds.includes(v.id)).map((v) => v.id);

        if (toDelete.length > 0) {
          await queryRunner.manager.delete(ProductVariant, { id: In(toDelete) });
        }

        const savedVariants: ProductVariant[] = [];
        for (const vDto of dto.variants) {
          let variant: ProductVariant;
          if (vDto.id) {
            variant = existing.find((v) => v.id === vDto.id);
            if (!variant) throw new NotFoundException(`Variant ${vDto.id} not found on product ${id}`);
          } else {
            variant = queryRunner.manager.create(ProductVariant, { product_id: id, product });
          }
          if (vDto.colorId !== undefined) variant.colorId = vDto.colorId;
          if (vDto.sizeId !== undefined) variant.sizeId = vDto.sizeId;
          if (vDto.unit !== undefined) variant.unit = vDto.unit;
        //   variant.price_override = vDto.price_override ?? null;
          variant.sku = vDto.sku ?? null;
          savedVariants.push(await queryRunner.manager.save(ProductVariant, variant));
        }
        product.variants = savedVariants;
      }

      // ── Collection address ─────────────────────────────────────────────────
      if (dto.carrer_option === "collection_address" && dto.collectionAddress) {
        if (product.collectionAddress) {
          Object.assign(product.collectionAddress, dto.collectionAddress);
          await queryRunner.manager.save(CollectionAddress, product.collectionAddress);
        } else {
          const addr = queryRunner.manager.create(CollectionAddress, {
            ...dto.collectionAddress,
            product,
          });
          await queryRunner.manager.save(CollectionAddress, addr);
        }
      }

      await queryRunner.commitTransaction();

      // ── Notification ───────────────────────────────────────────────────────
      await this._notificationQueue.add("notification_saver", {
        user,
        related: NotificationRelated.PRODUCT,
        msg: `"${product.product_name}" has been updated and is pending re-approval.`,
        type: NotificationType.SUCCESS,
        targetId: id,
        notificationFor: UserRoles.ADMIN,
        action: NotificationAction.UPDATED,
        isImportant: true,
      });

      const result = await this._loadProduct(id);
      return { message: "Product updated successfully", statusCode: 200, data: result };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this._logger.error("Product update failed", err);
      throw new BadRequestException(err.message || "Failed to update product");
    } finally {
      await queryRunner.release();
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // DELETE (soft)
  // ══════════════════════════════════════════════════════════════════════════════

  async remove(id: number, userId: string): Promise<SingleResponse<{}>> {
    const product = await this._productRepo.findOne({ where: { id, user_id: userId } });
    if (!product) throw new NotFoundException("Product not found");

    if (product.status === ProductStatus.DELETED) {
      throw new BadRequestException("Product is already deleted");
    }

    product.status = ProductStatus.DELETED;
    await this._productRepo.save(product);

    return { message: "Product deleted successfully", statusCode: 200, data: {} };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // APPROVE (Admin)
  // ══════════════════════════════════════════════════════════════════════════════

  async approve(id: number): Promise<SingleResponse<Product>> {
    const product = await this._productRepo.findOne({
      where: { id, status: ProductStatus.PENDING },
      relations: ["user"],
    });
    if (!product) throw new NotFoundException("Pending product not found");

    product.status = ProductStatus.AVAILABLE;
    await this._productRepo.save(product);

    await this._notificationQueue.add("notification_saver", {
      user: product.user,
      related: NotificationRelated.PRODUCT,
      msg: `"${product.product_name}" is now live on the marketplace!`,
      type: NotificationType.SUCCESS,
      targetId: product.id,
      notificationFor: UserRoles.USER,
      action: NotificationAction.UPDATED,
      isImportant: true,
      title: "Product Approved!",
      body: `Your product "${product.product_name}" is now visible to buyers.`,
    });

    return { message: "Product approved", statusCode: 200, data: product, status: "success" };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // BOOST (standalone — after product is already created)
  // ══════════════════════════════════════════════════════════════════════════════

  async boost(productId: number, user: User): Promise<SingleResponse<Product>> {
    const product = await this._productRepo.findOne({
      where: { id: productId },
      relations: ["user"],
    });
    if (!product) throw new NotFoundException("Product not found");
    if (product.user_id !== user.id) throw new ForbiddenException("Not your product");
    if (product.is_boosted) throw new BadRequestException("Product is already boosted");

    const wallet = await this._walletRepo.findOne({ where: { user_id: user.id } });
    if (!wallet) throw new BadRequestException("Wallet not found");
    if (wallet.balance < PRODUCT_BOOSTING_COST) {
      throw new BadRequestException(
        `Insufficient balance. Need ${PRODUCT_BOOSTING_COST} GBP to boost.`
      );
    }

    const queryRunner = this._dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      wallet.balance -= PRODUCT_BOOSTING_COST;
      wallet.version += 1;
      product.is_boosted = true;
      product.boost_start_time = new Date();
      product.boost_end_time = new Date(Date.now() + PRODUCT_BOOSTING_DAYS * DAYS_IN_SECOND);

      const tx = queryRunner.manager.create(Transections, {
        amount: PRODUCT_BOOSTING_COST,
        paymentMethod: "Internal",
        paymentId: `BOOST-${productId}-${Date.now()}`,
        product,
        product_id: product.id,
        user,
        user_id: user.id,
        wallet,
        wallet_id: wallet.id,
        status: PaymentStatus.COMPLETED,
        transection_type: TransectionType.BOOST,
      });

      await queryRunner.manager.save(Wallets, wallet);
      await queryRunner.manager.save(Transections, tx);
      const saved = await queryRunner.manager.save(Product, product);
      await queryRunner.commitTransaction();

      await this._notificationQueue.add("notification_saver", {
        user,
        related: NotificationRelated.WALLET,
        msg: `"${product.product_name}" is now boosted for ${PRODUCT_BOOSTING_DAYS} days!`,
        type: NotificationType.SUCCESS,
        targetId: product.id,
        notificationFor: UserRoles.USER,
        action: NotificationAction.UPDATED,
        isImportant: true,
        title: "Boost Activated!",
        body: `Your product will get priority visibility until ${product.boost_end_time.toLocaleDateString()}.`,
      });

      return { message: "Product boosted successfully", statusCode: 200, data: saved };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException("Failed to boost product");
    } finally {
      await queryRunner.release();
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // CRON — expire boosts at midnight
  // ══════════════════════════════════════════════════════════════════════════════

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireBoosts(): Promise<void> {
    const result = await this._productRepo
      .createQueryBuilder()
      .update()
      .set({ is_boosted: false, boost_start_time: null, boost_end_time: null })
      .where("is_boosted = true")
      .andWhere("boost_end_time <= :now", { now: new Date() })
      .returning("id")
      .execute();

    this._logger.log(`Boost expiry cron: expired ${result.raw?.length ?? 0} products`);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // STATUS update (admin can reject, mark sold, etc.)
  // ══════════════════════════════════════════════════════════════════════════════

  async updateStatus(id: number, status: ProductStatus, userId?: string): Promise<SingleResponse<Product>> {
    const where = userId ? { id, user_id: userId } : { id };
    const product = await this._productRepo.findOne({ where });
    if (!product) throw new NotFoundException(`Product ${id} not found`);

    if (product.status === ProductStatus.DELETED) throw new BadRequestException("Product is deleted");
    if (product.status === ProductStatus.SOLD) throw new BadRequestException("Product is already sold");

    product.status = status;
    const saved = await this._productRepo.save(product);
    return { message: "Product status updated", statusCode: 200, data: saved };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // Helpers
  // ══════════════════════════════════════════════════════════════════════════════

  async findByIdRaw(id: number): Promise<Product> {
    const product = await this._productRepo.findOne({ where: { id }, relations: ["user"] });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  private async _loadProduct(id: number): Promise<Product> {
    return this._productRepo.findOne({
      where: { id },
      relations: [
        "images",
        "variants",
        "variants.color",
        "variants.size",
        "subCategory",
        "user",
        "favorites",
        "favorites.user",
        "collectionAddress",
      ],
    });
  }

  private _assertProductVisible(product: Product): void {
    const blocked = [ProductStatus.DELETED, ProductStatus.REJECTED, ProductStatus.PENDING, ProductStatus.SOLD];
    if (blocked.includes(product.status)) {
      throw new BadRequestException(`Product is ${product.status}`);
    }
  }

  private _assertNoDuplicateVariants(variants: Array<{ colorId?: number; sizeId?: number }>): void {
    const seen = new Set<string>();
    for (const v of variants) {
      const key = `${v.colorId}-${v.sizeId}`;
      if (seen.has(key)) {
        throw new BadRequestException(
          `Duplicate variant: colorId ${v.colorId} + sizeId ${v.sizeId} appears more than once`
        );
      }
      seen.add(key);
    }
  }

  private _shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}