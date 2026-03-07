import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Review } from "./entities/review.entity";

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  // ✅ Create Review
  async create(userId: string, productId: number, dto: any) {
    // Check if already reviewed
    const existing = await this.reviewRepository.findOne({
      where: {
        user_id: userId,
        product_id: productId,
      },
    });

    if (existing) {
      throw new BadRequestException("You already reviewed this product");
    }

    const review = this.reviewRepository.create({
      ...dto,
      user_id: userId,
      product_id: productId,
    });

    return this.reviewRepository.save(review);
  }

  // ✅ Get All Reviews (with pagination)
  async findAll(productId: number, page = 1, limit = 10) {
    const [data, total] = await this.reviewRepository.findAndCount({
      where: { product_id: productId },
      relations: ["user"],
      order: { created_at: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  // ✅ Get Single Review
  async findOne(id: string) {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: ["user", "product"],
    });

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    return review;
  }

  // ✅ Update Review
  async update(id: string, userId: string, dto: any) {
    const review = await this.reviewRepository.findOne({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    if (review.user_id !== userId) {
      throw new ForbiddenException("You can only update your own review");
    }

    await this.reviewRepository.update(id, dto);

    return this.findOne(id);
  }

  // ✅ Delete Review
  async remove(id: string, userId: string) {
    const review = await this.reviewRepository.findOne({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    if (review.user_id !== userId) {
      throw new ForbiddenException("You can only delete your own review");
    }

    await this.reviewRepository.delete(id);

    return { message: "Review deleted successfully" };
  }

  // ✅ Get Average Rating of Product
  async getAverageRating(productId: string) {
    const result = await this.reviewRepository
      .createQueryBuilder("review")
      .select("AVG(review.rating)", "avg")
      .where("review.product_id = :productId", { productId })
      .getRawOne();

    return {
      productId,
      averageRating: Number(result.avg) || 0,
    };
  }
}