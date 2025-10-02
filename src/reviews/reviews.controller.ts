import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ReviewsService } from "./reviews.service";
import { CreateReviewDto } from "./dto/reviews.dto";
import { Reviews } from "./entity/reviews.entity";
import { ResponseInterface } from "src/common/types/responseInterface";
import { GetUser } from "src/auth/decorators/get-user.decorator";
import { User } from "src/user/entities/user.entity";
import { JwtAuthenticationGuard } from "src/auth/guards/session-auth.guard";

@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthenticationGuard)
  async create(
    @GetUser() user: User,
    @Body() createReviewDto: CreateReviewDto
  ): Promise<ResponseInterface<Reviews>> {
    createReviewDto.reviewer = user;
    const data = await this.reviewsService.create(createReviewDto);
    return { message: `Review added successfully`, statusCode: 201, status: "success", data };
  }

  @Get()
  findAll(): Promise<Reviews[]> {
    return this.reviewsService.findAll();
  }

  @Get(":id")
  @UseGuards(JwtAuthenticationGuard)
  findOne(@GetUser() user: User): Promise<Reviews> {
    return this.reviewsService.findOne(user.id);
  }

  //   @Patch(':id')
  //   update(
  //     @Param('id', ParseIntPipe) id: number,
  //     @Body() updateReviewDto: UpdateReviewDto,
  //   ): Promise<Reviews> {
  //     return this.reviewsService.update(id, updateReviewDto);
  //   }

  //   @Delete(':id')
  //   remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
  //     return this.reviewsService.remove(id);
  //   }
}
