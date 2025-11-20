// src/sizes/sizes.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UpdateSizeDto } from "./dto/update-size.dto";
import { Size } from "./entity/sizes.entity";
import { CreateSizeDto } from "./dto/create-sizes.dto";

@Injectable()
export class SizesService {
  constructor(
    @InjectRepository(Size)
    private sizeRepository: Repository<Size>
  ) {}

  async create(createSizeDto: CreateSizeDto): Promise<Size> {
    const size = this.sizeRepository.create(createSizeDto);
    return this.sizeRepository.save(size);
  }

  async findAll(): Promise<Size[]> {
    return this.sizeRepository.find();
  }

  async findOne(id: number): Promise<Size> {
    const size = await this.sizeRepository.findOneBy({ id });
    if (!size) {
      throw new NotFoundException(`Size with id ${id} not found`);
    }
    return size;
  }

  async update(id: number, updateSizeDto: UpdateSizeDto): Promise<Size> {
    const size = await this.findOne(id);
    const updated = Object.assign(size, updateSizeDto);
    return this.sizeRepository.save(updated);
  }

  async remove(id: number): Promise<void> {
    const result = await this.sizeRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Size with id ${id} not found`);
    }
  }
}
