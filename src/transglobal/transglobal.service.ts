import { number } from 'joi';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Service } from './entity/courier_details.entity';
import { CreateServiceDto } from './dto/create_courier_details.dto';
import { Repository } from 'typeorm';
import { OrdersService } from 'src/orders/orders.service';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class TransglobalService {

      constructor(
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    private OrderService: OrdersService
  ) {}

  async createService(createServiceDto: CreateServiceDto,buyer_id?:string): Promise<Service> {
    const order = await this.OrderService.findOrder({id: createServiceDto.order_id});
   
    const service = this.serviceRepository.create({order,...createServiceDto});
    return await this.serviceRepository.save(service);
  } 

  
}
