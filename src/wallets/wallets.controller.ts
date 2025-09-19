import { BadRequestException, Body, Controller, Get, ParseFloatPipe, Post, UseGuards } from '@nestjs/common';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { JwtAuthenticationGuard } from 'src/auth/guards/session-auth.guard';
import { User } from 'src/user/entities/user.entity';
import { Wallets } from './entity/wallets.entity';
import { ResponseInterface } from 'src/common/types/responseInterface';
import { WalletsService } from './wallets.service';
import { RechargeDto } from 'src/stripe/dto/recharge.dto';

@Controller('wallets')
export class WalletsController {
    constructor(
        private readonly walletsService: WalletsService
    ) {}

    @Get("balance")
    @UseGuards(JwtAuthenticationGuard)
    async getWalletDetails(@GetUser() user:User): Promise<ResponseInterface<Wallets>> {
        return this.walletsService.getWalletByUserId(user.id);
    }

    @Post('recharge')
     @UseGuards(JwtAuthenticationGuard)
  async rechargeWallet(
    @GetUser() user: User,
    @Body() rechargeDto: RechargeDto
  ): Promise<ResponseInterface<{balance}>> {
    try {
      const payment =await this.walletsService.rechargeWallet({userId:user.id, amount: rechargeDto.amount , paymentMethod:rechargeDto.paymentMethod, paymentId:rechargeDto.paymentId,user})
      return {status:"success", statusCode:201,message:payment.message, data:payment }
    } catch (error) {
      throw new BadRequestException(error.response || error.message);
    }
  }
   @Post('withdraw')
   @UseGuards(JwtAuthenticationGuard)
  async withdraw(
    @GetUser() user:User,
    @Body('amount', ParseFloatPipe) amount: number,
  ) {
    return this.walletsService.withdrawFromWallet(user.id,amount)
  }

}
