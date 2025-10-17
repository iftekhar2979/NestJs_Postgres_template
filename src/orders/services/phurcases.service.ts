import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Order } from "../entities/order.entity";
import { Repository } from "typeorm";
import { Wallets } from "src/wallets/entity/wallets.entity";
import { DeliveryAddress } from "src/delivery/entities/delivery_information.entity";
import { CollectionAddress } from "src/delivery/entities/collection_Address.entity";
import { Offer } from "src/offers/entities/offer.entity";

@Injectable()
export class PurchaseService {
  constructor(
    @InjectRepository(Order) private orderRepository: Repository<Order>,
    @InjectRepository(Wallets) private walletRepo: Repository<Wallets>,
    @InjectRepository(DeliveryAddress) private deliveryRepo: Repository<DeliveryAddress>,
    @InjectRepository(CollectionAddress) private collectionRepo: Repository<CollectionAddress>,
    @InjectRepository(Offer) private offerRepo: Repository<Offer>
  ) {}

  async createPurchase() {
    // check the product is available or not  .
    //check the available balance
    // create the order according to the product amount .
    // create delivery collection  .
    // order status should be changed to : -- collection_pending
    // check the currency  and calculate balance according to the wallets Info .
    // create notification to buyer seller and admin
  }

  async confirmPurchase() {
    // check user has the available product of the seller
    // create the collection record.
    // if order has not the collection then it should auto remove after 1 day passed . the product status should be changed .
    // now reduce the the wallet balance according to the product and delivery charge .
    // add a transection records as purchase .
    // order status should be changed to  :  -- collection_filled .
    // create notification to buyer and admin
  }
}
