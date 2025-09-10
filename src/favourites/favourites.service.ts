import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Favorite } from './entities/favourite.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from 'src/products/entities/products.entity';
import { User } from 'src/user/entities/user.entity';
import { CreateFavoriteDto } from './dto/favourite.dto';
import { ResponseInterface } from 'src/common/types/responseInterface';
import { pagination } from 'src/shared/utils/pagination';
import { UserService } from 'src/user/user.service';

@Injectable()
export class FavouritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepo: Repository<Favorite>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly userService:UserService
   
  ) {}
      async toggleFavorite(createFavoriteDto: CreateFavoriteDto): Promise<ResponseInterface<Favorite>> {
    const { userId, productId } = createFavoriteDto;

    // Check if the user exists
    const user = await this.userService.getUserById(userId)
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if the product exists
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if the product is already in the user's favorites
    const existingFavorite = await this.favoriteRepo.findOne({
      where: { user: { id: userId }, product: { id: productId } },
    });

    if (existingFavorite) {
      // If the product is already a favorite, remove it
   const favourite =   await this.favoriteRepo.remove(existingFavorite);
     return  {message:"Product removed from favourite",status:'success',statusCode:200,data:await this.favoriteRepo.save(favourite)}
    } else {
      // If the product is not a favorite, add it
      const favorite = this.favoriteRepo.create({ user, product });
      return {message:"Product added to favourite",status:'success',statusCode:201,data:await this.favoriteRepo.save(favorite)};
    }
  }

  // Get user's favorites with pagination
  async getUserFavorites(userId: string, page: number = 1, limit: number = 10) {
    // Check if the user exists
       const user = await this.userService.getUserById(userId)
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const skip = (page - 1) * limit;
    const take = limit;

    // Get the paginated list of favorites
    const [favorites, total] = await this.favoriteRepo.findAndCount({
      where: { user: { id: userId } },
      relations: ['product'],  // Get the product details as well
      skip: skip,
      take: take,
    });

    // Calculate the total number of pages
    const totalPages = Math.ceil(total / limit);

    // Return the paginated response
    return {
        status:'success',
        statusCode:200,

      data: favorites.map((favorite) => favorite.product),  // Return only the products in favorites
      pagination: pagination({limit,page,total}),
    };
  }
}
