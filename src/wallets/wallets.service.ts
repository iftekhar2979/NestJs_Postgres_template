import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { Wallets } from "./entity/wallets.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Transections } from "src/transections/entity/transections.entity";
import { TransectionType } from "src/transections/enums/transectionTypes";
import { PaymentStatus } from "src/orders/enums/orderStatus";
import { ResponseInterface } from "src/common/types/responseInterface";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { Logger } from "winston";

import { StripeService } from "src/stripe/stripe.service";

@Injectable()
export class WalletsService {
  constructor(
    // private stripe: Stripe,
    private readonly _dataSource: DataSource,
    @InjectRepository(Wallets) private readonly _walletRepository: Repository<Wallets>,
    @InjectRepository(Transections) private readonly _transectionRepository: Repository<Transections>,
    @InjectLogger() private readonly _logger: Logger,
    private readonly _stripeService: StripeService
  ) {}

  // Wallet Recharge Service
  async rechargeWallet({
    userId,
    amount,
    paymentMethod,
    paymentId,
  }: {
    userId: string;
    amount: number;
    paymentMethod: string;
    paymentId: string;
  }) {
    if (amount <= 0) {
      throw new BadRequestException("Amount must be greater than zero");
    }

    const transection = await this._transectionRepository.findOne({
      where: {
        user: {
          id: userId,
        },
        paymentId: paymentId,
      },
    });
    if (transection) {
      throw new BadRequestException("Transection already exist with the payment Id!");
    }
    const paymentInfo = await this._stripeService.getPaymentIntent(paymentId);

    if (paymentInfo.amount_received !== amount * 100) {
      throw new BadRequestException("Payment is not verified!");
    }
    // Start a transaction to ensure data integrity
    const queryRunner = this._walletRepository.manager.connection.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const transectionExist = await this._transectionRepository.findOne({ where: { paymentId } });
      if (transectionExist) {
        throw new BadRequestException("Payment already received with that payment Id");
      }
      const wallet = await queryRunner.manager.findOne(Wallets, { where: { user_id: userId } });
      if (!wallet) {
        throw new NotFoundException("Wallet not found");
      }
      // Update wallet balance
      wallet.balance += amount;
      await queryRunner.manager.save(Wallets, wallet);

      // Record the transaction
      const transection = new Transections();
      transection.user_id = userId;
      transection.amount = amount;
      transection.transection_type = TransectionType.RECHARGE; // Credit for recharge
      transection.paymentId = paymentId;
      transection.paymentMethod = paymentMethod;
      transection.status = PaymentStatus.COMPLETED;
      transection.wallet_id = wallet.id;

      await queryRunner.manager.save(Transections, transection);

      // Commit the transaction
      await queryRunner.commitTransaction();

      return { message: "Wallet recharged successfully", balance: wallet.balance };
    } catch (error) {
      console.log(error);
      // If any error occurs, rollback the transaction
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }

  async getWalletByUserId(userId: string): Promise<ResponseInterface<Wallets>> {
    // console.log(userId)
    const wallet = await this._walletRepository.findOne({ where: { user: { id: userId } } });
    // const bul = await this._bullQueue.add('Added',wallet)
    // console.log(wallet)
    // this._logger.error("Balance detect",wallet.balance)
    if (!wallet) {
      throw new NotFoundException("Wallet not found");
    }
    return { message: "wallets retrived successfully", status: "success", statusCode: 200, data: wallet };
  }
  // Wallet Withdraw Service
  async withdrawFromWallet(userId: string, amount: number): Promise<any> {
    if (amount <= 10) {
      throw new BadRequestException("Amount must be greater than 10");
    }
    // Start a transaction to ensure data integrity
    const queryRunner = this._walletRepository.manager.connection.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallets, { where: { user_id: userId } });
      if (!wallet) {
        throw new Error("Wallet not found");
      }
      if (wallet.balance < amount) {
        throw new Error("Insufficient balance");
      }
      wallet.balance -= amount;
      wallet.version++;
      await queryRunner.manager.save(Wallets, wallet);

      const transection = new Transections();
      transection.user_id = userId;
      transection.amount = amount;
      transection.transection_type = TransectionType.WITHDRAW; // Debit for withdrawal
      transection.paymentId = "";
      transection.paymentMethod = "withdraw";
      transection.status = PaymentStatus.PENDING;
      transection.wallet_id = wallet.id;

      await queryRunner.manager.save(Transections, transection);

      await queryRunner.commitTransaction();

      return { message: "Withdrawal successful", data: wallet };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(error.message);
    } finally {
      await queryRunner.release();
    }
  }
}
