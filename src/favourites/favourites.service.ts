import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ResponseInterface } from "src/common/types/responseInterface";
import { Product } from "src/products/entities/products.entity";
import { ProductStatus } from "src/products/enums/status.enum";
import { pagination } from "src/shared/utils/pagination";
import { UserService } from "src/user/user.service";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import { CreateFavoriteDto } from "./dto/favourite.dto";
import { Favorite } from "./entities/favourite.entity";

@Injectable()
export class FavouritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepo: Repository<Favorite>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly userService: UserService,
    private readonly _dataSource: DataSource
  ) {}
  async toggleFavorite(createFavoriteDto: CreateFavoriteDto): Promise<ResponseInterface<Favorite>> {
    const { userId, productId } = createFavoriteDto;

    // Check if the user exists
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check if the product exists
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException("Product not found");
    }

    // Check if the product is already in the user's favorites
    const existingFavorite = await this.favoriteRepo.findOne({
      where: { user: { id: userId }, product: { id: productId } },
    });

    if (existingFavorite) {
      // If the product is already a favorite, remove it
      await this.favoriteRepo.delete({ id: existingFavorite.id });
      return {
        message: "Product removed from favourite",
        status: "success",
        statusCode: 200,
        data: { ...existingFavorite },
      };
    } else {
      // If the product is not a favorite, add it
      const favorite = this.favoriteRepo.create({ user, product });
      return {
        message: "Product added to favourite",
        status: "success",
        statusCode: 201,
        data: await this.favoriteRepo.save(favorite),
      };
    }
  }

  // Get user's favorites with pagination
  async getUserFavorites(userId: string, page: number = 1, limit: number = 10) {
    // Check if the user exists
    // const user = await this.userService.getUserById(userId);
    // if (!user) {
    //   throw new NotFoundException("User not found");
    // }

    const skip = (page - 1) * limit;
    const take = limit;

    // Get the paginated list of favorites
    const [favorites, total] = await this.favoriteRepo.findAndCount({
      where: {
        user: {
          id: userId,
        },
        product: {
          status: In([ProductStatus.IN_PROGRESS, ProductStatus.AVAILABLE]),
        },
      },
      relations: ["product"], // Get the product details as well
      skip: skip,
      take: take,
      order: { created_at: "DESC" },
    });
console.log(favorites);
    // Calculate the total number of pages
    const totalPages = Math.ceil(total / limit);

    // Return the paginated response
    return {
      status: "success",
      statusCode: 200,

      data: favorites.map((favorite) => favorite.product), // Return only the products in favorites
      pagination: pagination({ limit, page, total }),
    };
  }

  async removeFavorite({
    userId,
    productId,
    manager,
  }: {
    userId: string;
    productId: number;
    manager?: EntityManager;
  }): Promise<void> {
    if (manager) {
      // Use parent transaction
      return this.removeFavoriteWithManager(manager, { userId, productId });
    }

    // Run standalone transaction
    return this._dataSource.transaction(async (transactionManager) => {
      return this.removeFavoriteWithManager(transactionManager, {
        userId,
        productId,
      });
    });
  }

  private async removeFavoriteWithManager(
    manager: EntityManager,
    { userId, productId }: { userId: string; productId: number }
  ): Promise<void> {
    const existing = await manager.findOne(Favorite, {
      where: {
        user: { id: userId },
        product: { id: productId },
      },
    });

    if (existing) {
      // throw new BadRequestException("Favorite not found");
      await manager.delete(Favorite, { id: existing.id });
    }
  }
}
