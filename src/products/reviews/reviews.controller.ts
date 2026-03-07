import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthenticationGuard } from 'src/auth/guards/session-auth.guard';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {

     constructor(private readonly reviewsService: ReviewsService) {}

  // ✅ Create Review
  @UseGuards(JwtAuthenticationGuard)
  @Post(":productId")
  create(
    @Param("productId", ParseUUIDPipe) productId: number,
    @Body() body,
    @Req() req,
  ) {
    const userId = req.user.id; // from JWT
    return this.reviewsService.create(userId, Number(productId), body);
  }

  // ✅ Get Reviews of Product
  @Get("product/:productId")
  findAll(
    @Param("productId", ParseUUIDPipe) productId: number,
    @Query("page") page = 1,
    @Query("limit") limit = 10,
  ) {
    return this.reviewsService.findAll(
      productId,
      Number(page),
      Number(limit),
    );
  }

  // ✅ Get Average Rating
  @Get("product/:productId/average")
  getAverage(
    @Param("productId", ParseUUIDPipe) productId: string,
  ) {
    return this.reviewsService.getAverageRating(productId);
  }

  // ✅ Get Single Review
  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.reviewsService.findOne(id);
  }

  // ✅ Update Review
  @UseGuards(JwtAuthenticationGuard)
  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body,
    @Req() req,
  ) {
    const userId = req.user.id;
    return this.reviewsService.update(id, userId, body);
  }

  // ✅ Delete Review
  @UseGuards(JwtAuthenticationGuard)
  @Delete(":id")
  remove(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req,
  ) {
    const userId = req.user.id;
    return this.reviewsService.remove(id, userId);
  }
}
