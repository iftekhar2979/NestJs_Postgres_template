import { BadRequestException, Body, Controller, Get, ParseFloatPipe, Post, UseGuards } from "@nestjs/common";
import { GetUser } from "src/auth/decorators/get-user.decorator";
import { JwtAuthenticationGuard } from "src/auth/guards/session-auth.guard";
import { User } from "src/user/entities/user.entity";
import { Wallets } from "./entity/wallets.entity";
import { ResponseInterface } from "src/common/types/responseInterface";
import { WalletsService } from "./wallets.service";
import { RechargeDto } from "src/stripe/dto/recharge.dto";

@Controller("wallets")
export class WalletsController {
  constructor(private readonly _walletsService: WalletsService) {}

  @Get("balance")
  @UseGuards(JwtAuthenticationGuard)
  async getWalletDetails(@GetUser() user: User): Promise<ResponseInterface<Wallets>> {
    return this._walletsService.getWalletByUserId(user.id);
  }

  @Post("recharge")
  @UseGuards(JwtAuthenticationGuard)
  async rechargeWallet(
    @GetUser() user: User,
    @Body() rechargeDto: RechargeDto
  ): Promise<ResponseInterface<any>> {
    try {
      const payment = await this._walletsService.rechargeWallet({
        userId: user.id,
        amount: rechargeDto.amount,
        paymentMethod: rechargeDto.paymentMethod,
        paymentId: rechargeDto.paymentId,
      });
      return { status: "success", statusCode: 201, message: payment.message, data: payment };
    } catch (error) {
      throw new BadRequestException(error.response || error.message);
    }
  }
  @Post("withdraw")
  @UseGuards(JwtAuthenticationGuard)
  async withdraw(@GetUser() user: User, @Body("amount", ParseFloatPipe) amount: number) {
    return this._walletsService.withdrawFromWallet(user.id, amount);
  }
}
