import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductStats } from './entities/productStats.entity';
@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(ProductStats)
    private readonly statsRepository: Repository<ProductStats>,
  ) {}

  // --- CREATE ---
  async create(createDto: Partial<ProductStats>): Promise<ProductStats> {
    console.log("Create DTO", createDto);
    const newStat = this.statsRepository.create(createDto);
    console.log("New Stat", newStat);
    return await this.statsRepository.save(newStat);
  }

  // --- READ ALL ---
  async findAll(): Promise<ProductStats[]> {
    return await this.statsRepository.find({
      relations: ['product'], // Optionally load the related product data
    });
  }

  // --- READ ONE (by UUID) ---
  async findOne(id: string): Promise<ProductStats> {
    const stat = await this.statsRepository.findOne({
      where: { id },
      relations: ['product'],
    });

    if (!stat) {
      throw new NotFoundException(`ProductStats with ID ${id} not found`);
    }

    return stat;
  }

  // --- READ ONE (by Product ID) ---
  // This is often more useful for stats than looking up by the stats UUID
  async findOneByProductId(productId: number): Promise<ProductStats> {
    const stat = await this.statsRepository.findOne({
      where: { product_id: productId },
      relations: ['product'],
    });

    if (!stat) {
      throw new NotFoundException(`ProductStats for Product ID ${productId} not found`);
    }

    return stat;
  }

  // --- UPDATE ---
  async update(id: string, updateDto:Partial<ProductStats>): Promise<ProductStats> {
    // Check if exists
    const existingStat = await this.findOne(id);

    // Load new values into the entity
    Object.assign(existingStat, updateDto);

    // Save changes
    return await this.statsRepository.save(existingStat);
  }

  // --- DELETE ---
  async remove(id: string): Promise<void> {
    const result = await this.statsRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`ProductStats with ID ${id} not found`);
    }
  }

  // --- HELPER: INCREMENT STATS ---
  // Useful for atomic-like operations (e.g., when a view occurs)
  async incrementView(productId: number): Promise<ProductStats> {
    const stat = await this.findOneByProductId(productId);
    stat.total_views += 1;
    return await this.statsRepository.save(stat);
  }
}