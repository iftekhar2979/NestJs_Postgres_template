import { InjectQueue, Process, Processor } from "@nestjs/bull";
import { Injectable } from "@nestjs/common";
import { Job, Queue } from "bull";
import * as fs from "fs"; // File system module to write images to disk
import * as path from "path"; // Path module for handling file paths
import sharp from "sharp";
import { CategoryService } from "src/category/category.service";
import { MailService } from "src/mail/mail.service";
import { NotificationAction, NotificationRelated, NotificationType } from "src/notifications/entities/notifications.entity";
import { PRODUCT_CONSTANT } from "src/products/constants/product.contants";
import { ProductsService } from "src/products/products.service";
import { StatsService } from "src/products/stats/stats.service";
import { RedisService } from "src/redis/redis.service";
import { UserBehaviourService } from "src/user-behaviour/user-behaviour.service";
import { UserRoles } from "src/user/enums/role.enum";

@Processor("product") // Processor listening to 'ProductQueue'
@Injectable()
export class ImageProcessor {
  constructor(
    private readonly _userBehaviourService: UserBehaviourService,
    private readonly _mailService: MailService,
    private readonly _category: CategoryService ,
    private readonly _productStatsService: StatsService,
    private readonly _productsService: ProductsService,
    @InjectQueue("notifications") private readonly _notificationQueue: Queue,
    private readonly _redisService: RedisService,
  ) {}
  @Process("Product-image") // Listen for jobs of type 'Product-image'
  async handleImageJob(job: Job) {
    console.log("Job Processing");
    console.time();
    const images = job.data;
    const projectRoot = path.join(__dirname, "..", "..", "..", "..", "public"); // go back to project root
    const outputDir = path.join(projectRoot, "uploads");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const imgUrl of images) {
      const absoluteInputPath = path.join(projectRoot, imgUrl); // make absolute
      const outputImagePath = path.join(projectRoot, path.basename(imgUrl)); // overwrite with same name
      const tempPath = absoluteInputPath + ".tmp";
      try {
        await sharp(absoluteInputPath).resize(800, 800).toFile(tempPath);
        fs.renameSync(tempPath, absoluteInputPath);
        console.log(`Image replaced successfully: ${outputImagePath}`);
        console.timeEnd();
      } catch (err) {
        console.error(`Error processing image: ${absoluteInputPath}`, err);
      }
    }
  }
  @Process("user-behaviour")
  async userBehaviour(job: Job) {
    console.log("User Behavior", job.data);
    try {
      if (job.data.search || job.data.category || job.data.brand) {
        await this._userBehaviourService.createUserBehaviour(job.data);
      }
    } catch (error) {
      console.log(error);
    }
  }

  @Process("mail")
  async mailSender(job: Job) {
    console.log("User Behavior", job.data);
    const { user, seller, product, offer, type } = job.data;
    if (!user || !seller || !product || !offer) {
      throw new Error("Job Data is not proper");
    }
    if (!type) {
      throw new Error("No type mentioned");
    }
    if (type === "send_offer") {
      await this._mailService.sendOfferConfirmation(user, seller, offer, product);
    } else if (type === "accepted_offer") {
      await this._mailService.acceptOfferConfirmation(user, seller, offer, product);
    } else {
      await this._mailService.offerRejection(user, seller, offer, product);
    }
  }

  @Process("orderConfirmation")
  async OrderConfirmation(job: Job) {
    const { parcelInfo, order, pricingInfo } = job.data;
    console.log("Order Confirmation", parcelInfo, order, pricingInfo);
    await this._mailService.sellerOrderConfirmation(order, parcelInfo, pricingInfo);
    await this._mailService.buyerOrderConfirmation(order, parcelInfo, pricingInfo);
    // await this._mailService.
    // if (type === "send_offer") {
    //   await this._mailService.sendOfferConfirmation(user, seller, offer, product);
    // } else if (type === "accepted_offer") {
    //   await this._mailService.acceptOfferConfirmation(user, seller, offer, product);
    // } else {
    //   await this._mailService.offerRejection(user, seller, offer, product);
    // }
  }

  @Process("mails")
  async VerificationConfirmation(job: Job) {
    console.log("Email", job.data);
  }

  @Process(PRODUCT_CONSTANT.productUtils)
  async productUtils(job: Job) {
    console.log("Product Utils", job.data);
    const {type,data} = job.data;
    if(type === PRODUCT_CONSTANT.productStats){
      await this._productStatsService.create(data);
    }
  }

  @Process("ProductCreatedEvent")
  async handleProductCreated(job: Job) {
    console.log("Job: ProductCreatedEvent", job.data);
    const { productId } = job.data;
    
    // Check cache first
    let productData = await this._redisService.get<any>(`product:${productId}`);
    
    if (!productData) {
      const response = await this._productsService.getProduct(productId);
      productData = response;
    }

    if (!productData) {
      console.error(`Product ${productId} not found in handleProductCreated`);
      return;
    }

    const { user, product_name, id, is_boosted, boost_end_time } = productData;

    // Notify Admin
    await this._notificationQueue.add("notification_saver", {
      user: user,
      related: NotificationRelated.PRODUCT,
      msg: `${product_name} is listed for your review!`,
      type: NotificationType.SUCCESS,
      targetId: id,
      notificationFor: UserRoles.ADMIN,
      action: NotificationAction.CREATED,
      isImportant: true,
    });

    // Notify User
    await this._notificationQueue.add("notification_saver", {
      user: user,
      related: NotificationRelated.PRODUCT,
      msg: `You product ${product_name} is listed for admins review!`,
      type: NotificationType.SUCCESS,
      targetId: id,
      notificationFor: UserRoles.USER,
      action: NotificationAction.CREATED,
      isImportant: true,
      title: `You product ${product_name} is listed for admins review!`,
      body: `You will be notified once it is approved.`,
    });

    // Handle Boost Notification if applicable
    if (is_boosted) {
      await this._notificationQueue.add("notification_saver", {
        user: user,
        related: NotificationRelated.WALLET,
        msg: `${product_name} is boosted!`,
        type: NotificationType.SUCCESS,
        targetId: id,
        notificationFor: UserRoles.USER,
        action: NotificationAction.CREATED,
        isImportant: true,
        title: `${product_name} is boosted!`,
        body: `It will be visible to more buyers until ${boost_end_time ? new Date(boost_end_time).toLocaleDateString() : ''}`,
      });
    }
  }

  @Process("InventoryInitializedEvent")
  async handleInventoryInitialized(job: Job) {
    console.log("Job: InventoryInitializedEvent", job.data);
    const { productId, variantId, initialStock } = job.data;
    // Business logic: Initialize stats or track initial stock arrival
    console.log(`Inventory for product ${productId}${variantId ? ` (variant ${variantId})` : ''} initialized with ${initialStock} units.`);
  }

  @Process("inventory_updated_event")
  async handleInventoryUpdated(job: Job) {
    console.log("Job: inventory_updated_event", job.data);
    const { productId, variantId, remainingStock } = job.data;
    
    // Business logic: Check for low stock alert
    if (remainingStock < 5) {
       // Could trigger a low stock notification here
       console.log(`Low stock alert for product ${productId}: ${remainingStock} left.`);
    }
  }
  // @Process("category")
  // async categoryCreation(job: Job<Category>) {
  //   console.log("category", job.data);
  //   const { image, name } = job.data;

  //   await this._category.create({ image, name });
  // }
}
