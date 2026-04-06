import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { CategoryQuery } from "./dto/query";
import { SubCategoriesService } from "./sub_categories.service";

@Controller("sub-categories")
export class SubCategoriesController {
  constructor(private readonly subCategoriesService: SubCategoriesService) {}

  @Post()
  create(@Body() data: any) {
    return this.subCategoriesService.create(data);
  }

  @Get()
  findAll(
    @Query("categoryId") categoryId: CategoryQuery,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "10"
  ) {
    return this.subCategoriesService.findAll(
      parseInt(page),
      parseInt(limit),
      categoryId.categoryId ? parseInt(categoryId.categoryId) : undefined
    );
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.subCategoriesService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() data: any) {
    return this.subCategoriesService.update(id, data);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.subCategoriesService.remove(id);
  }
}
