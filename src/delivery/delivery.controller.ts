import { BadRequestException, Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ShipmentService } from './shipment.service';
import { CreateShipmentDto } from './dto/createShipment.dto';
import { CreateCollectionAddressDto, CreateDeliveryAddressDto } from './dto/createDelivery.dto';
import { DeliveryService } from './delivery.service';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/user/entities/user.entity';
import { JwtAuthenticationGuard } from 'src/auth/guards/session-auth.guard';
import { ApiParam, ApiResponse } from '@nestjs/swagger';
import { Product } from 'src/products/entities/products.entity';
import { Delivery } from './entities/delivery.entity';

@Controller('delivery')
export class DeliveryController {

     constructor(
      private readonly shipmentService: ShipmentService,
      private readonly deliveryService: DeliveryService

     ) {}

  // Endpoint to create a new shipment
  @Post('shipment')
  async create(@Body() createShipmentDto: CreateShipmentDto) {
    return this.shipmentService.create(createShipmentDto);
  }
  @Post(':id')
  @UseGuards(JwtAuthenticationGuard)
  @ApiParam({ name: 'id', type: Number, description: 'ID of the read the product' })
  @ApiResponse({ status: 200, description: 'Product updated successfully', type: Delivery })
  async createDelivery(@Body() createDeliveryAddressDto: CreateDeliveryAddressDto ,@GetUser() user:User,@Param('id') product_id:string) {
    if(isNaN(parseFloat(product_id))){
      throw new BadRequestException("Product id is not valid!")
    }
   
    return this.deliveryService.createDeliveryAddress({createDeliveryAddressDto,user,product_id:Number(product_id)})
  }
  @Post(':id/collection')
  @UseGuards(JwtAuthenticationGuard)
  @ApiParam({ name: 'id', type: Number, description: 'ID of the read the product' })
  @ApiResponse({ status: 200, description: 'Product updated successfully', type: Delivery })
  async updateCollection(@Body() createCollectionAddressDto: CreateCollectionAddressDto ,@GetUser() user:User,@Param('id') product_id:string) {
    if(isNaN(parseFloat(product_id))){
      throw new BadRequestException("Product id is not valid!")
    }
   
    return this.shipmentService.createCollectionAddressAndShipment({
      createCollectionAddressDto,
      product_id : Number(product_id),
      user
    })
  }
  @Post(':id/shipment')
  @UseGuards(JwtAuthenticationGuard)
  @ApiParam({ name: 'id', type: Number, description: 'ID of the read the product' })
  @ApiResponse({ status: 200, description: 'Product updated successfully', type: Delivery })
  async handleShipment(@Body() shipmentDto: CreateShipmentDto ,@GetUser() user:User,@Param('id') product_id:string) {
    if(isNaN(parseFloat(product_id))){
      throw new BadRequestException("Product id is not valid!")
    }
   
    return this.shipmentService.updateOrderInfo({
      shipmentDto,
      product_id : Number(product_id),
      user
    })
  }
}
