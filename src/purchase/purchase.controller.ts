import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { GetUser } from "src/auth/decorators/get-user.decorator";
import { JwtAuthenticationGuard } from "src/auth/guards/session-auth.guard";
import { User } from "src/user/entities/user.entity";
import { PurchaseDto } from "./dto/purchase.dto";
import { PurchaseService } from "./purchase.service";

@ApiTags("Purchase")
@Controller("purchase")
@UseGuards(JwtAuthenticationGuard)
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Post()
  @ApiOperation({ summary: "Purchase a product or variant" })
  @ApiResponse({ status: 201, description: "Purchase successful" })
  async purchase(@Body() purchaseDto: PurchaseDto, @GetUser() user: User) {
    return await this.purchaseService.executePurchase(purchaseDto, user);
  }
}
