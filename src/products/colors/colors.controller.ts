import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { ColorsService } from "./colors.service";
import { ProductColor } from "./entities/colors.entity";

@Controller("colors")
export class ColorsController {
  constructor(private readonly colorsService: ColorsService) {}

  @Post()
  create(@Body() createColorDto: Partial<ProductColor>) {
    return this.colorsService.create(createColorDto);
  }

  @Get()
  findAll(@Query("page") page: number = 1, @Query("limit") limit: number = 10) {
    return this.colorsService.findAll(+page, +limit);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.colorsService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() updateColorDto: Partial<ProductColor>) {
    return this.colorsService.update(id, updateColorDto);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.colorsService.remove(id);
  }
}
