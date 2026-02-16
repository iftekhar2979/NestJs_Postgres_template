import { Module } from '@nestjs/common';
import { SubCategoriesController } from './sub_categories.controller';
import { SubCategoriesService } from './sub_categories.service';

@Module({
  controllers: [SubCategoriesController],
  providers: [SubCategoriesService]
})
export class SubCategoriesModule {}
