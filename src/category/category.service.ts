// src/category/category.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
// import { Category } from './entities/category.entity';
import { CreateCategoryDto } from "./dto/create-category.dto";
import { Category } from "./entity/category.entity";
import { UpdateCategoryDto } from "./dto/update-category";
import { ProductStatus } from "src/products/enums/status.enum";
// import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const category = this.categoryRepository.create(createCategoryDto);
    return this.categoryRepository.save(category);
  }

  // async findAll(): Promise<Category[]> {
  //   return this.categoryRepository.find();
  // }

  async findAll(limit: number = 10) {
    return this.categoryRepository
      .createQueryBuilder("category")
      .leftJoin("products", "product", "product.category = category.name")
      .select("category.id", "id")
      .addSelect("category.name", "name")
      .addSelect("category.image", "image")
      .addSelect("COUNT(product.id)", "productCount")
      .where("product.status = :status OR product.status IS NULL", {
        status: ProductStatus.AVAILABLE,
      })
      .groupBy("category.id")
      .addGroupBy("category.name")
      .addGroupBy("category.image")
      .orderBy('"productCount"', "DESC") // Quote to preserve case
      .limit(limit)
      .getRawMany();
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    return category;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);
    const updated = Object.assign(category, updateCategoryDto);
    return this.categoryRepository.save(updated);
  }

  async remove(id: number): Promise<void> {
    const result = await this.categoryRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
  }
}
