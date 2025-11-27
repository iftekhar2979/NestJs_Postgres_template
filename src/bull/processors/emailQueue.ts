import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable } from "@nestjs/common";
import sharp from "sharp";
import * as fs from "fs"; // File system module to write images to disk
import * as path from "path"; // Path module for handling file paths
import { UserBehaviourService } from "src/user-behaviour/user-behaviour.service";
import { MailService } from "src/mail/mail.service";

@Processor("email") // Processor listening to 'ProductQueue'
@Injectable()
export class EmailProcessor {
  constructor(
    private readonly _userBehaviourService: UserBehaviourService,
    private readonly _mailService: MailService
  ) {}

  @Process("mails")
  async OrderConfirmation(job: Job) {
    console.log("Email", job.data);
    // if (type === "send_offer") {
    //   await this._mailService.sendOfferConfirmation(user, seller, offer, product);
    // } else if (type === "accepted_offer") {
    //   await this._mailService.acceptOfferConfirmation(user, seller, offer, product);
    // } else {
    //   await this._mailService.offerRejection(user, seller, offer, product);
    // }
  }
}
