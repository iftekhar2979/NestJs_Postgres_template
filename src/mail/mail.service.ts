import { MailerService } from "@nestjs-modules/mailer";
import { Injectable, LoggerService } from "@nestjs/common";
import { FROM_EMAIL, ORG_NAME } from "./constants";
import { User } from "../user/entities/user.entity";
import { Offer } from "src/offers/entities/offer.entity";
import { Product } from "src/products/entities/products.entity";
import { Order } from "src/orders/entities/order.entity";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { MailDataRequired, default as SendGrid } from "@sendgrid/mail";

@Injectable()
export class MailService {
  /**
   * Organization Name
   */
  private _name: string = ORG_NAME;

  /**
   * getter function for Organization Name
   */
  public get name(): string {
    return this._name;
  }

  /**
   * setter function for Organization Name
   * @param value Name to be set
   */
  public set name(value: string) {
    this._name = value;
  }

  /**
   * email address for sending mails
   */
  private _from: string = FROM_EMAIL;

  /**
   * getter function for from - email address
   */
  public get from(): string {
    return this._from;
  }

  /**
   * setter function for from - email address
   * @param value email address to be set
   */
  public set from(value: string) {
    this._from = value;
  }

  constructor(
    private readonly _mailService: MailerService,
    @InjectLogger() private readonly _logger: LoggerService
  ) {
    SendGrid.setApiKey(process.env.SENDGRID_API_KEY);
  }

  async sendUserConfirmationMail(user: User, url: string) {
    const subject = `Welcome to Your Pet Attix! Hi ${user.firstName}, Here's Your Account Activation Code`;
    // await this._mailService.sendMail({
    this._mailService.sendMail({
      // from: { name: this._name, address: this._from },
      to: user.email,
      subject: subject,
      template: "welcome",
      context: {
        subject: "",
        header: "",
        firstName: user.firstName,
        lastName: user.lastName,
        url,
      },
    });
  }

  /**
   * sends a mail to user's email address with account activation URL
   * @param user user object containing user information
   * @param url account activation URL
   */

  async sendUserActivationToken(user: User, url: string) {
    // await this._mailService.sendMail({
    this._mailService.sendMail({
      // from: { name: this._name, address: this._from },
      to: user.email,
      subject: "",
      template: "account-activation",
      context: {
        subject: "",
        header: "",
        firstName: user.firstName,
        url,
      },
    });
  }

  /**
   * sends a mail to user's email address with URL for account activation confirmation
   * @param user user object containing user information
   * @param url account activation URL
   */
  async sendUserAccountActivationMail(user: User, url: string) {
    // await this._mailService.sendMail({
    this._mailService.sendMail({
      to: user.email,
      subject: "",
      template: "confirm-activation",
      context: {
        subject: "",
        header: "",
        firstName: user.firstName,
        url,
      },
    });
  }

  /**
   * sends a mail to user's email address with URL containing password reset token
   * @param email recipient's email address
   * @param url reset password URL
   */
  async sendForgotPasswordMail(email: string, url: string) {
    // await this._mailService.sendMail({
    this._mailService.sendMail({
      to: email,
      subject: "Forgot Password Verification code from Pet Attix",
      template: "forgot-password",
      context: {
        subject: "Forgot Password Verification code from Pet Attix",
        header: "",
        url,
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * sends a Password rest confirmation mail to user's email address.
   * @param user user object containing user information
   */
  async sendPasswordResetConfirmationMail(user: User) {
    // await this._mailService.sendMail({
    this._mailService.sendMail({
      to: user.email,
      subject: "",
      template: "reset-password",
      context: {
        subject: "",
        header: "",
      },
    });
  }

  /**
   * sends a Password Updated confirmation mail to user's email address.
   * @param user user object containing user information
   */
  async sendPasswordUpdateEmail(user: User) {
    // await this._mailService.sendMail({
    this._mailService.sendMail({
      to: user.email,
      subject: `Password Updated!`,
      template: "update-password",
      context: {
        subject: "",
        header: "",
        firstName: user.firstName,
      },
    });
  }

  /**
   * sends a account deletion mail to user's email address.
   * @param user user object containing user information
   */
  async sendUserDeletionMail(user: User) {
    // await this._mailService.sendMail({
    this._mailService.sendMail({
      to: user.email,
      subject: "",
      template: "account-deletion",
      context: {
        subject: "",
        header: "",
        firstName: user.firstName,
      },
    });
  }

  /**
   * sends a confirmation mail on updating user information to user's email address.
   * @param user user object containing user information
   */
  async sendConfirmationOnUpdatingUser(user: User) {
    // await this._mailService.sendMail({
    this._mailService.sendMail({
      to: user.email,
      subject: "",
      template: "user-updation",
      context: {
        subject: "",
        header: "",
        firstName: user.firstName,
      },
    });
  }
  async sendOfferConfirmation(buyer: User, seller: User, offer: Offer, product: Product) {
    const subject = `Got a new offer from Pet Attix!`;
    this._mailService.sendMail({
      to: seller.email,
      subject,
      template: "offer-sending", // must match offer-sending.pug
      context: {
        subject,
        header: "You received a new offer!",
        buyerFirstName: buyer.firstName,
        buyerLastName: buyer.lastName,
        sellerFirstName: seller.firstName,
        sellerLastName: seller.lastName,
        productName: product.product_name,
        sellingPrice: product.selling_price, // added this
        offerPrice: offer.price,
      },
    });
  }
  async acceptOfferConfirmation(buyer: User, seller: User, offer: Offer, product: Product) {
    const subject = `Offer has been accepted by seller from Pet Attix!`;
    this._mailService.sendMail({
      to: buyer.email,
      subject,
      template: "offer-accepting", // must match offer-sending.pug
      context: {
        subject,
        header: "",
        buyerFirstName: buyer.firstName,
        buyerLastName: buyer.lastName,
        sellerFirstName: seller.firstName,
        sellerLastName: seller.lastName,
        productName: product.product_name,
        sellingPrice: product.selling_price, // added this
        offerPrice: offer.price,
      },
    });
  }
  async offerRejection(buyer: User, seller: User, offer: Offer, product: Product) {
    const subject = `Offer has been accepted by seller from Pet Attix!`;
    this._mailService.sendMail({
      to: buyer.email,
      subject,
      template: "offer-rejected", // must match offer-sending.pug
      context: {
        subject,
        header: "",
        buyerFirstName: buyer.firstName,
        buyerLastName: buyer.lastName,
        sellerFirstName: seller.firstName,
        sellerLastName: seller.lastName,
        productName: product.product_name,
        sellingPrice: product.selling_price,
        offerPrice: offer.price,
      },
    });
  }

  // async sellerOrderConfirmation(order: Order, parcelInfo: any, pricingInfo) {
  //   const seller = order.seller;
  //   const buyer = order.buyer;
  //   const product = order.product;

  //   const subject = `Your product has been sold on Pet Attix!`;
  //   this._logger.log(`Sending seller order confirmation email to ${seller.email}`);
  //   this._logger.log(` ${seller.email} has been sent the seller order confirmation email.`, {
  //     order,
  //     parcelInfo,
  //     pricingInfo,
  //   });
  //   // console.log(first)
  //   await this._mailService.sendMail({
  //     to: seller.email,
  //     subject,
  //     template: "sell-confirmation", // seller-confirmation.pug
  //     context: {
  //       order: order,
  //       parcelInfo: parcelInfo,
  //       pricingInfo: pricingInfo,
  //     },
  //   });
  // }

  // async buyerOrderConfirmation(order: Order, parcelInfo: any, pricingInfo) {
  //   const buyer = order.buyer;
  //   console.log("Order Confirmation", parcelInfo, order, pricingInfo);
  //   const subject = `Your order has been confirmed on Pet Attix!`;

  //   this._logger.log(`Sending seller order confirmation email to ${buyer.email}`);
  //   this._logger.log(` ${buyer.email} has been sent the buyer order confirmation email.`, {
  //     order,
  //     parcelInfo,
  //     pricingInfo,
  //   });
  //   return this._mailService.sendMail({
  //     to: buyer.email,
  //     subject,
  //     template: "buyer-confirmation", // buyer-confirmation.
  //     context: {
  //       order: order,
  //       parcelInfo: parcelInfo,
  //       pricingInfo: pricingInfo,
  //     },
  //   });
  // }

  async sellerOrderConfirmation(order, parcelInfo, pricingInfo) {
    // Destructure the necessary properties from the order, parcelInfo, and pricingInfo
    const { seller, buyer, id, status, paymentStatus, parcelId, product } = order;
    const { currency, productPrice, productProtectionFee, deliveryCharge, deliveryProtectionFee, total } =
      pricingInfo;
    const { parcel } = parcelInfo;

    // Set default values in case any properties are missing
    const productName = product?.product_name || "No product name available";
    const productCategory = product?.category || "Category not available";
    const productCondition = product?.condition || "Condition not specified";
    const productDescription = product?.description || "No description available";
    const productImages = product?.images || [];

    const sellerName = `${seller?.firstName || "N/A"} ${seller?.lastName || "N/A"}`;
    const sellerEmail = seller?.email || "seller@petattix.com";

    const buyerName = `${buyer?.firstName || "N/A"} ${buyer?.lastName || "N/A"}`;
    const buyerEmail = buyer?.email || "buyer@petattix.com";
    const buyerPhone = buyer?.phone || "N/A";

    const trackingNumber = parcel?.tracking_number || "N/A";
    const shippingMethod = parcel?.shipping_method_checkout_name || "N/A";
    const carrierCode = parcel?.carrier?.code || "N/A";
    const parcelLabel = parcel?.label?.normal_printer || [];
    const parcelDocuments = parcel?.documents || [];

    const subject = `Your product has been sold on Pet Attix!`;

    this._logger.log(`Sending seller order confirmation email to ${seller?.email}`);
    this._logger.log(`Order confirmation email sent to ${seller?.email}`, {
      order,
      parcelInfo,
      pricingInfo,
    });

    try {
      // Send the email with destructured context
      await this._mailService.sendMail({
        to: seller?.email,
        subject,
        template: "sell-confirmation", // Use the sell-confirmation template
        context: {
          subject,
          sellerName,
          sellerEmail,
          buyerName,
          buyerEmail,
          buyerPhone,
          id,
          status,
          paymentStatus,
          parcelId,
          productName,
          productCategory,
          productCondition,
          productDescription,
          productImages,
          currency,
          productPrice,
          productProtectionFee,
          deliveryCharge,
          deliveryProtectionFee,
          total,
          trackingNumber,
          shippingMethod,
          carrierCode,
          parcelLabel,
          parcelDocuments,
        },
      });

      console.log(`Email sent to ${seller?.email}`);
    } catch (error) {
      console.error("Error sending email:", error);
    }
  }

  async buyerOrderConfirmation(order, parcelInfo, pricingInfo) {
    // Destructure the necessary properties from the order, parcelInfo, and pricingInfo
    const { buyer, id, status, paymentStatus, parcel_id, seller, product, deliveryInfo } = order;
    const { currency, total, productPrice, productProtectionFee, deliveryCharge, deliveryProtectionFee } =
      pricingInfo;
    const { parcel } = parcelInfo;

    // If any of the values are missing or undefined, you can set defaults here or leave them undefined
    const productName = product?.product_name || "No product name available";
    const productCategory = product?.category || "Category not available";
    const productCondition = product?.condition || "Condition not specified";
    const productDescription = product?.description || "No description available";
    const productImages = product?.images || [];

    const sellerName = `${seller?.firstName || "N/A"} ${seller?.lastName || "N/A"}`;
    const sellerEmail = seller?.email || "seller@petattix.com";

    const deliveryInfoName = deliveryInfo?.name || "N/A";
    const deliveryAddress = deliveryInfo?.address || "N/A";
    const deliveryCity = deliveryInfo?.city || "N/A";
    const deliveryPostalCode = deliveryInfo?.postal_code || "N/A";
    const deliveryCountry = deliveryInfo?.country || "N/A";

    const trackingNumber = parcel?.tracking_number || "N/A";
    const shippingMethod = parcel?.shipping_method_checkout_name || "N/A";
    const carrierCode = parcel?.carrier?.code || "N/A";
    const parcelLabel = parcel?.label?.normal_printer || [];
    const parcelDocuments = parcel?.documents || [];

    const subject = `Your order has been confirmed on Pet Attix!`;

    this._logger.log(`Sending buyer order confirmation email to ${buyer?.email}`);
    this._logger.log(`Order confirmation email sent to ${buyer?.email}`, {
      order,
      parcelInfo,
      pricingInfo,
    });

    try {
      // Send the email with destructured context
      await this._mailService.sendMail({
        to: buyer?.email,
        subject,
        template: "buyer-confirmation", // Use the buyer-confirmation template
        context: {
          subject,
          buyer: buyer || {},
          id,
          status,
          paymentStatus,
          parcel_id,
          sellerName,
          sellerEmail,
          productName,
          productCategory,
          productCondition,
          productDescription,
          productImages,
          currency,
          total,
          productPrice,
          productProtectionFee,
          deliveryCharge,
          deliveryProtectionFee,
          deliveryInfoName,
          deliveryAddress,
          deliveryCity,
          deliveryPostalCode,
          deliveryCountry,
          trackingNumber,
          shippingMethod,
          carrierCode,
          parcelLabel,
          parcelDocuments,
        },
      });

      console.log(`Email sent to ${buyer?.email}`);
    } catch (error) {
      console.error("Error sending email:", error);
    }
  }
}
