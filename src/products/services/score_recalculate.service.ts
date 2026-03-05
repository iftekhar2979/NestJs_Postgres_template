import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { ProductStatus } from "../../products/enums/status.enum";
import { Product } from "../entities/products.entity";
import { ProductStats } from "../stats/entities/productStats.entity";
import { ProductScoringService } from "./products_scoring.service";

@Injectable()
export class ScoreRecalculationService {
  private readonly logger = new Logger(ScoreRecalculationService.name);

  constructor(
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @InjectRepository(ProductStats)
    private statsRepo: Repository<ProductStats>,
    private scoringService: ProductScoringService,
  ) {}

  /**
   * Recalculate score for a single product
   */
  async recalculateProduct(productId: number): Promise<number> {
    try {
      const product = await this.productRepo.findOne({
        where: { id: productId },
        relations: ["stats", "variants"],
      });

      if (!product) {
        this.logger.warn(`Product ${productId} not found for score recalculation`);
        return 0;
      }

      const newScore = this.scoringService.calculateScore(
        product,
        product.stats || null
      );

      // Only update if score changed significantly
      if (Math.abs(product.synthetic_score - newScore) > 0.0001) {
        await this.productRepo.update(productId, { synthetic_score: newScore });
        this.logger.debug(
          `Product ${productId} score updated: ${product.synthetic_score} → ${newScore}`
        );
      }

      return newScore;
    } catch (error) {
      this.logger.error(
        `Failed to recalculate score for product ${productId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Bulk recalculation for all active products
   */
  async recalculateBatch(chunkSize: number = 100): Promise<{
    total: number;
    updated: number;
    failed: number;
  }> {
    const startTime = Date.now();
    this.logger.log(`Starting batch score recalculation (chunk: ${chunkSize})`);

    const total = await this.productRepo.count({
      where: { status: ProductStatus.AVAILABLE },
    });

    let updated = 0;
    let failed = 0;

    for (let offset = 0; offset < total; offset += chunkSize) {
      const products = await this.productRepo.find({
        where: { status: ProductStatus.AVAILABLE },
        relations: ["stats", "variants"],
        skip: offset,
        take: chunkSize,
      });

      const updates = await Promise.all(
        products.map(async (product) => {
          try {
            const newScore = this.scoringService.calculateScore(
              product,
              product.stats || null
            );
            if (Math.abs(product.synthetic_score - newScore) > 0.0001) {
              updated++;
              return { id: product.id, synthetic_score: newScore };
            }
            return null;
          } catch (error) {
            failed++;
            this.logger.error(
              `Failed to calculate score for product ${product.id}`,
              error
            );
            return null;
          }
        })
      );

      const validUpdates = updates.filter((u) => u !== null);
      if (validUpdates.length > 0) {
        await this.productRepo.manager.save(Product, validUpdates, {
          chunk: 50,
          listeners: false, // Skip timestamps for bulk updates
        });
      }

      this.logger.log(
        `Processed chunk ${offset}-${offset + chunkSize}/${total}`
      );
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    this.logger.log(
      `Batch recalculation complete: ${updated} updated, ${failed} failed in ${duration}s`
    );

    return { total, updated, failed };
  }

  /**
   * Recalculate scores for products with updated stats (last hour)
   */
  async recalculateRecentlyUpdated(): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const updatedStats = await this.statsRepo.find({
      where: { updated_at: LessThan(oneHourAgo) },
      relations: ["product"],
    });

    for (const stat of updatedStats) {
      await this.recalculateProduct(stat.product_id).catch((err) =>
        this.logger.error(`Failed to update product ${stat.product_id}`, err)
      );
    }

    return updatedStats.length;
  }

  /**
   * Get score distribution statistics
   */
  async getScoreDistribution(): Promise<{
    average: number;
    median: number;
    min: number;
    max: number;
    productsCount: number;
  }> {
    const result = await this.productRepo
      .createQueryBuilder("product")
      .select("AVG(product.synthetic_score)", "average")
      .addSelect("MIN(product.synthetic_score)", "min")
      .addSelect("MAX(product.synthetic_score)", "max")
      .addSelect("COUNT(product.id)", "productsCount")
      .where("product.status = :status", { status: ProductStatus.AVAILABLE })
      .getRawOne();

    // Median requires separate query
    const medianResult = await this.productRepo
      .createQueryBuilder("product")
      .select("product.synthetic_score", "score")
      .where("product.status = :status", { status: ProductStatus.AVAILABLE })
      .orderBy("product.synthetic_score")
      .limit(1)
      .offset(Math.floor((await this.productRepo.count({ where: { status: ProductStatus.AVAILABLE } })) / 2))
      .getRawOne();

    return {
      average: parseFloat(result.average) || 0,
      median: parseFloat(medianResult.score) || 0,
      min: parseFloat(result.min) || 0,
      max: parseFloat(result.max) || 0,
      productsCount: parseInt(result.productsCount) || 0,
    };
  }
}