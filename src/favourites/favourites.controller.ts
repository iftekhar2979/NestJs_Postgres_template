import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthenticationGuard } from 'src/auth/guards/session-auth.guard';
import { FavouritesService } from './favourites.service';
import { CreateFavoriteDto } from './dto/favourite.dto';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/user/entities/user.entity';

@Controller('favourites')
export class FavouritesController {

     constructor(private readonly favoritesService: FavouritesService) {}

  // Toggle favorite (add or remove a product)
  @Post()
  @HttpCode(200)
  @UseGuards(JwtAuthenticationGuard)
  async toggleFavorite(@GetUser() user:User,@Body() createFavoriteDto: CreateFavoriteDto) {
    createFavoriteDto.userId= user.id
    return await this.favoritesService.toggleFavorite(createFavoriteDto);
  }

  // Get user's favorites with pagination
  @Get()
  @UseGuards(JwtAuthenticationGuard) // Ensure user is authenticated
  async getUserFavorites(
    @Query('userId') userId: string,
    @Query('page') page: number = 1,  // Default to page 1
    @Query('limit') limit: number = 10,  // Default to limit 10
  ) {
    return await this.favoritesService.getUserFavorites(userId, page, limit);
  }
}
