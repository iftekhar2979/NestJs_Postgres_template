import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from 'src/user/user.module';
import { Review } from './entities/review.entity';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports:[UserModule,TypeOrmModule.forFeature([Review])],
  providers: [ReviewsService],
  controllers: [ReviewsController]
})
export class ReviewsModule {}
