import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProductColor } from "./entities/colors.entity";

@Injectable()
export class ColorsService {
  constructor(
    @InjectRepository(ProductColor)
    private readonly colorRepository: Repository<ProductColor>
  ) {}

  async create(data: Partial<ProductColor>): Promise<ProductColor> {
    const color = this.colorRepository.create(data);
    return await this.colorRepository.save(color);
  }

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.colorRepository.findAndCount({
      skip,
      take: limit,
      order: { id: "DESC" }, // Show newest first
    });

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<ProductColor> {
    const color = await this.colorRepository.findOneBy({ id });
    if (!color) throw new NotFoundException(`Color with ID ${id} not found`);
    return color;
  }

  async update(id: number, data: Partial<ProductColor>): Promise<ProductColor> {
    const color = await this.findOne(id);
    Object.assign(color, data);
    return await this.colorRepository.save(color);
  }

  async remove(id: number): Promise<void> {
    const result = await this.colorRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Color with ID ${id} not found`);
    }
  }
}
