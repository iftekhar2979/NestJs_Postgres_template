import { BadRequestException, Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { ShipmentService } from "./shipment.service";
import { CreateShipmentDto } from "./dto/createShipment.dto";
import { CreateCollectionAddressDto, CreateDeliveryAddressDto } from "./dto/createDelivery.dto";
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
  @Post("shipment")
  async create(@Body() createShipmentDto: CreateShipmentDto) {
    return this._shipmentService.create(createShipmentDto);
  }
  @Post(":productID")
  @UseGuards(JwtAuthenticationGuard)
  @ApiParam({ name: "productID", type: Number, description: "ID of the read the product" })
  @ApiResponse({ status: 200, description: "Product updated successfully", type: Delivery })
  async createDelivery(
    @Body() createDeliveryAddressDto: CreateDeliveryAddressDto,
    @GetUser() user: User,
    @Param("productID") product_id: string
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
  @Post(":productID/collection")
  @UseGuards(JwtAuthenticationGuard)
  @ApiParam({ name: "productID", type: Number, description: "ID of the read the product" })
  @ApiResponse({ status: 200, description: "Product updated successfully", type: Delivery })
  async updateCollection(
    @Body() createCollectionAddressDto: CreateCollectionAddressDto,
    @GetUser() user: User,
    @Param("productID") product_id: string
  ) {
    if (isNaN(parseFloat(product_id))) {
      throw new BadRequestException("Product id is not valid!");
    }

    return this._shipmentService.createCollectionAddressAndShipment({
      createCollectionAddressDto,
      product_id: Number(product_id),
      user,
    });
  }
  @Post(":productID/shipment")
  @UseGuards(JwtAuthenticationGuard)
  @ApiParam({ name: "productID", type: Number, description: "ID of the read the product" })
  @ApiResponse({ status: 200, description: "Product updated successfully", type: Delivery })
  async handleShipment(
    @Body() shipmentDto: CreateShipmentDto,
    @GetUser() user: User,
    @Param("productID") product_id: string
  ) {
    if (isNaN(parseFloat(product_id))) {
      throw new BadRequestException("Product id is not valid!");
    }

    return this._shipmentService.updateOrderInfo({
      shipmentDto,
      product_id: Number(product_id),
      user,
    });
  }
  @Post(":productID/shipment/late")
  @UseGuards(JwtAuthenticationGuard)
  @ApiParam({ name: "productID", type: Number, description: "ID of the read the product" })
  @ApiResponse({ status: 200, description: "Product updated successfully", type: Delivery })
  async ShipmentLatter(@GetUser() user: User, @Param("productID") product_id: string) {
    if (isNaN(parseFloat(product_id))) {
      throw new BadRequestException("Product id is not valid!");
    }

    return this._shipmentService.UpdateShipmentInformationLater({ user, product_id: Number(product_id) });
  }
}
