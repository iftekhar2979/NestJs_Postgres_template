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
      from: { name: this._name, address: this._from },
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
      from: { name: this._name, address: this._from },
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
      from: { name: this._name, address: this._from },
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
      from: { name: this._name, address: this._from },
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
        sellingPrice: product.selling_price, // added this
        offerPrice: offer.price,
      },
    });
  }

  async sellerOrderConfirmation(order: Order, parcelInfo: any, pricingInfo) {
    const seller = order.seller;
    const buyer = order.buyer;
    const product = order.product;

    const subject = `Your product has been sold on Pet Attix!`;
    this._logger.log(`Sending seller order confirmation email to ${seller.email}`);
    this._logger.log(` ${seller.email} has been sent the seller order confirmation email.`, {
      order,
      parcelInfo,
      pricingInfo,
    });
    await this._mailService.sendMail({
      to: seller.email,
      subject,
      template: "sell-confirmation", // seller-confirmation.pug
      context: {
        order,
        parcelInfo,
        pricingInfo,
      },
    });
  }

  async buyerOrderConfirmation(order: Order, parcelInfo: any, pricingInfo) {
    const buyer = order.buyer;

    const subject = `Your order has been confirmed on Pet Attix!`;
    this._logger.log(`Sending Buyer order confirmation email to ${buyer.email}`);
    return this._mailService.sendMail({
      to: buyer.email,
      subject,
      template: "buyer-confirmation", // buyer-confirmation.pug
      context: {
        order,
        parcelInfo,
        pricingInfo,
      },
    });
  }
}
