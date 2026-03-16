import { BadRequestException, Controller, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { GetUser } from "src/auth/decorators/get-user.decorator";
import { JwtAuthenticationGuard } from "src/auth/guards/session-auth.guard";
import { User } from "src/user/entities/user.entity";
import { OrdersService } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get("checkout-info/:productId")
  @UseGuards(JwtAuthenticationGuard)
  async getCheckoutData(@GetUser() user: User, @Param("productId") productId: number) {
    return this.ordersService.getCheckoutData(Number(productId), user);
  }

  @Get("phurcases")
  @UseGuards(JwtAuthenticationGuard)
  getOrdersByBuyer(@GetUser() user: User, @Query("page") page = 1, @Query("limit") limit = 10) {
    return this.ordersService.findByBuyerId(user.id, page, limit, user);
  }
  @Get("sales")
  @UseGuards(JwtAuthenticationGuard)
  getOrdersBySeller(@GetUser() user: User, @Query("page") page = 1, @Query("limit") limit = 10) {
    return this.ordersService.findBySellerId(user.id, page, limit, user);
  }

  @Post(":id/purchases")
  @UseGuards(JwtAuthenticationGuard)
  phurcase(@GetUser() user: User, @Query("page") page = 1, @Query("limit") limit = 10) {
    return this.ordersService.findByBuyerId(user.id, page, limit);
  }
  @Put(":orderID/completed")
  @UseGuards(JwtAuthenticationGuard)
  orderCompleted(@GetUser() user: User, @Param("orderID") order_id: number) {
    if (!order_id) {
      throw new BadRequestException("Please put the order Id!");
    }
    order_id = Number(order_id);
    if (isNaN(order_id)) {
      throw new BadRequestException("Invalid Order Id");
    }
    return this.ordersService.completeOrder({ order_id, user });
  }
}
