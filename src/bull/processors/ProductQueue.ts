import { Process, Processor } from "@nestjs/bull";
import { Injectable } from "@nestjs/common";
import { Job } from "bull";
import * as fs from "fs"; // File system module to write images to disk
import * as path from "path"; // Path module for handling file paths
import sharp from "sharp";
import { CategoryService } from "src/category/category.service";
import { MailService } from "src/mail/mail.service";
import { PRODUCT_CONSTANT } from "src/products/constants/product.contants";
import { StatsService } from "src/products/stats/stats.service";
import { UserBehaviourService } from "src/user-behaviour/user-behaviour.service";

@Processor("product") // Processor listening to 'ProductQueue'
@Injectable()
export class ImageProcessor {
  constructor(
    private readonly _userBehaviourService: UserBehaviourService,
    private readonly _mailService: MailService,
    private readonly _category: CategoryService ,
    private readonly _productStatsService: StatsService
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
  // @Process("category")
  // async categoryCreation(job: Job<Category>) {
  //   console.log("category", job.data);
  //   const { image, name } = job.data;

  //   await this._category.create({ image, name });
  // }
}
