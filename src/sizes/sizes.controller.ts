// src/sizes/sizes.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from "@nestjs/common";
import { UpdateSizeDto } from "./dto/update-size.dto";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { SizesService } from "./sizes.service";
import { CreateSizeDto } from "./dto/create-sizes.dto";
import { Size } from "./entity/sizes.entity";
import { ResponseInterface } from "src/common/types/responseInterface";
@ApiTags("Sizes")
@Controller("sizes")
export class SizesController {
  constructor(private readonly sizesService: SizesService) {}

  @Post()
  @ApiOperation({ summary: "Create a new size" })
  @ApiResponse({ status: 201, description: "Size created", type: Size })
  create(@Body() createSizeDto: CreateSizeDto): Promise<Size> {
    return this.sizesService.create(createSizeDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all sizes" })
  @ApiResponse({ status: 200, description: "List of sizes", type: [Size] })
  async findAll() {
    return {
      message: "sizes retrived successfully",
      status: "success",
      statusCode: 200,
      data: await this.sizesService.findAll(),
    };
  }
  @Get(":id")
  @ApiOperation({ summary: "Get size by ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Size found", type: Size })
  findOne(@Param("id", ParseIntPipe) id: number): Promise<Size> {
    return this.sizesService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update size by ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Size updated", type: Size })
  update(@Param("id", ParseIntPipe) id: number, @Body() updateSizeDto: UpdateSizeDto): Promise<Size> {
    return this.sizesService.update(id, updateSizeDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete size by ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Size deleted" })
  remove(@Param("id", ParseIntPipe) id: number): Promise<void> {
    return this.sizesService.remove(id);
  }
}
