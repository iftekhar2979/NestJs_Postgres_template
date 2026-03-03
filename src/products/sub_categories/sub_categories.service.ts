import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SubCategory } from "./entities/sub_categories.entity";

@Injectable()
export class SubCategoriesService {
  constructor(
    @InjectRepository(SubCategory)
    private readonly subCategoryRepo: Repository<SubCategory>
  ) {}

  async create(data: Partial<SubCategory>) {
    try {
      const subCategory = this.subCategoryRepo.create(data);
      return await this.subCategoryRepo.save(subCategory);
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        // MySQL/MariaDB unique constraint error
        throw new ConflictException("A sub-category with this name already exists in this category.");
      }
      throw error;
    }
  }

  async findAll(page: number = 1, limit: number = 10, categoryId?: number) {
    const skip = (page - 1) * limit;

    // Build query with optional filtering
    const queryBuilder = this.subCategoryRepo
      .createQueryBuilder("subCategory")
      .leftJoinAndSelect("subCategory.category", "category")
      .skip(skip)
      .take(limit)
      .orderBy("subCategory.createdAt", "DESC");

    if (categoryId) {
      queryBuilder.where("subCategory.categoryId = :categoryId", { categoryId });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const subCategory = await this.subCategoryRepo.findOne({
      where: { id },
      relations: ["category"],
    });
    if (!subCategory) throw new NotFoundException(`SubCategory #${id} not found`);
    return subCategory;
  }

  async update(id: number, data: Partial<SubCategory>) {
    const subCategory = await this.findOne(id);
    Object.assign(subCategory, data);
    return await this.subCategoryRepo.save(subCategory);
  }

  async remove(id: number) {
    const result = await this.subCategoryRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException(`SubCategory #${id} not found`);
    return { deleted: true };
  }
}
