import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { OfferService } from "./offers.service";
import { JwtAuthenticationGuard } from "src/auth/guards/session-auth.guard";
import { GetUser } from "src/auth/decorators/get-user.decorator";
import { OfferDto } from "./dto/sendOffer.dto";
import { User } from "src/user/entities/user.entity";
@Controller("offers")
export class OffersController {
  constructor(private readonly _offerService: OfferService) {}
  @Post("send")
  @UseGuards(JwtAuthenticationGuard)
  async createOffer(@Body() offer: OfferDto, @GetUser() user: User) {
    const { product_id, price } = offer;
    return this._offerService.createOffer({ buyer_id: user.id, product_id, price }, user);
  }
  @Post(":id/accept")
  @UseGuards(JwtAuthenticationGuard)
  async acceptOffer(@Param("id") id: string, @GetUser() user: User) {
    return this._offerService.acceptOffer({ offerId: Number(id), sellerId: user.id });
  }
  @Post(":offerId/reject")
  @UseGuards(JwtAuthenticationGuard)
  async rejectOffer(@Param("offerId") offerId: number, @GetUser() user: User) {
    try {
      const response = await this._offerService.rejectOffer({
        offerId,
        sellerId: user.id,
      });
      return response;
    } catch (error) {
      // Handle any errors that may arise from the service
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      } else if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      } else if (error instanceof ForbiddenException) {
        throw new ForbiddenException(error.message);
      }
      throw error; // Re-throw unhandled errors
    }
  }
}
