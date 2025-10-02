import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Service } from "./entity/courier_details.entity";
import { CreateServiceDto } from "./dto/create_courier_details.dto";
import { Repository } from "typeorm";
import { OrdersService } from "src/orders/orders.service";

@Injectable()
export class TransglobalService {
  constructor(
    @InjectRepository(Service)
    private _serviceRepository: Repository<Service>,
    private _OrderService: OrdersService
  ) {}

  async createService(createServiceDto: CreateServiceDto): Promise<Service> {
    const order = await this._OrderService.findOrder({ id: createServiceDto.order_id });

    const service = this._serviceRepository.create({ order, ...createServiceDto });
    return await this._serviceRepository.save(service);
  }
}
