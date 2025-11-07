import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ShipmentService } from "./shipment.service";
import { CreateDeliveryAddressDto } from "./dto/createDelivery.dto";
import { DeliveryService } from "./delivery.service";
import { GetUser } from "src/auth/decorators/get-user.decorator";
import { User } from "src/user/entities/user.entity";
import { JwtAuthenticationGuard } from "src/auth/guards/session-auth.guard";
import { ApiParam, ApiResponse } from "@nestjs/swagger";
import { Delivery } from "./entities/delivery.entity";

@Controller("delivery")
export class DeliveryController {
  constructor(
    private readonly _shipmentService: ShipmentService,
    private readonly _deliveryService: DeliveryService
  ) {}

  // Endpoint to create a new shipment
  // @Post("shipment")
  // async create(@Body() createShipmentDto: CreateShipmentDto) {
  //   return this._shipmentService.create(createShipmentDto);
  // }
  @Post(":productId")
  @UseGuards(JwtAuthenticationGuard)
  @ApiParam({ name: "productId", type: Number, description: "ID of the read the product" })
  @ApiResponse({ status: 200, description: "Product updated successfully", type: Delivery })
  async createDelivery(
    @Body() createDeliveryAddressDto: CreateDeliveryAddressDto,
    @GetUser() user: User,
    @Param("productId") product_id: string
  ) {
    if (isNaN(parseFloat(product_id))) {
      throw new BadRequestException("Product id is not valid!");
    }

    return this._deliveryService.createDeliveryAddress({
      createDeliveryAddressDto,
      user,
      product_id: Number(product_id),
    });
  }
  @Get(":productId/shipping/methods")
  @UseGuards(JwtAuthenticationGuard)
  @ApiParam({ name: "orderId", type: Number, description: "ID of the read the Order" })
  @ApiResponse({ status: 200, description: "Product updated successfully", type: Delivery })
  async getDeliveryPricing(
    // @Body() createDeliveryAddressDto: CreateDeliveryAddressDto,
    @GetUser() user: User,
    @Param("productId") product_id: string
  ) {
    if (isNaN(parseInt(product_id))) {
      throw new BadRequestException("Product id is not valid!");
    }

    return this._deliveryService.getDeliveryPricing({ productId: parseInt(product_id), user });
  }
  @Get(":productId/shipping/:shippingId/pricing")
  @UseGuards(JwtAuthenticationGuard)
  @ApiParam({ name: "orderId", type: Number, description: "ID of the read the Order" })
  @ApiResponse({ status: 200, description: "Product updated successfully", type: Delivery })
  async getSingleShippingPricing(
    // @Body() createDeliveryAddressDto: CreateDeliveryAddressDto,
    @GetUser() user: User,
    @Param("productId") product_id: string,
    @Param("shippingId") shipping_id: string
  ) {
    if (isNaN(parseInt(product_id))) {
      throw new BadRequestException("Product id is not valid!");
    }
    if (isNaN(parseInt(shipping_id))) {
      throw new BadRequestException("Product id is not valid!");
    }

    return this._deliveryService.getShippingsEstimate({
      productId: parseInt(product_id),
      shippingId: parseInt(shipping_id),
      user,
    });
  }
  // @Post(":productID/collection")
  // @UseGuards(JwtAuthenticationGuard)
  // @ApiParam({ name: "productID", type: Number, description: "ID of the read the product" })
  // @ApiResponse({ status: 200, description: "Product updated successfully", type: Delivery })
  // async updateCollection(
  //   @Body() createCollectionAddressDto: CreateCollectionAddressDto,
  //   @GetUser() user: User,
  //   @Param("productID") product_id: string
  // ) {
  //   if (isNaN(parseFloat(product_id))) {
  //     throw new BadRequestException("Product id is not valid!");
  //   }

  //   return this._shipmentService.createCollectionAddressAndShipment({
  //     createCollectionAddressDto,
  //     product_id: Number(product_id),
  //     user,
  //   });
  // }
  // @Post(":productID/shipment")
  // @UseGuards(JwtAuthenticationGuard)
  // @ApiParam({ name: "productID", type: Number, description: "ID of the read the product" })
  // @ApiResponse({ status: 200, description: "Product updated successfully", type: Delivery })
  // async handleShipment(
  //   @Body() shipmentDto: CreateShipmentDto,
  //   @GetUser() user: User,
  //   @Param("productID") product_id: string
  // ) {
  //   if (isNaN(parseFloat(product_id))) {
  //     throw new BadRequestException("Product id is not valid!");
  //   }

  //   return this._shipmentService.updateOrderInfo({
  //     shipmentDto,
  //     product_id: Number(product_id),
  //     user,
  //   });
  // }
  // @Post(":productID/shipment/late")
  // @UseGuards(JwtAuthenticationGuard)
  // @ApiParam({ name: "productID", type: Number, description: "ID of the read the product" })
  // @ApiResponse({ status: 200, description: "Product updated successfully", type: Delivery })
  // async ShipmentLatter(@GetUser() user: User, @Param("productID") product_id: string) {
  //   if (isNaN(parseFloat(product_id))) {
  //     throw new BadRequestException("Product id is not valid!");
  //   }

  //   return this._shipmentService.UpdateShipmentInformationLater({ user, product_id: Number(product_id) });
  // }
}
