// src/category/category.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { CategoryService } from "./category.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
// import { UpdateCategoryDto } from './dto/update-category.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { Category } from "./entity/category.entity";
import { UpdateCategoryDto } from "./dto/update-category";
import { FileInterceptor } from "@nestjs/platform-express";
import { multerConfig } from "src/common/multer/multer.config";
import { GetFileDestination } from "src/auth/decorators/get-user.decorator";

@ApiTags("Categories")
@Controller("categories")
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ApiOperation({ summary: "Create a new category" })
  @ApiResponse({ status: 201, description: "Category created", type: Category })
  @UseInterceptors(FileInterceptor("image", multerConfig))
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @GetFileDestination() destination: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    // console.log(first)
    console.log(destination);
    createCategoryDto.image = destination;
    return {
      status: "success",
      message: "Category created successfully",
      data: await this.categoryService.create(createCategoryDto),
      statusCode: 201,
    };
  }

  @Get()
  @ApiOperation({ summary: "Get all categories" })
  @ApiResponse({ status: 200, description: "List of categories", type: [Category] })
  async findAll() {
    return {
      message: "category retrived successfully",
      data: await this.categoryService.findAll(),
      statusCode: 200,
    };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a category by ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Category found", type: Category })
  @ApiResponse({ status: 404, description: "Category not found" })
  findOne(@Param("id", ParseIntPipe) id: number): Promise<Category> {
    return this.categoryService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a category by ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Category updated", type: Category })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto
  ): Promise<Category> {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a category by ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Category deleted" })
  remove(@Param("id", ParseIntPipe) id: number): Promise<void> {
    return this.categoryService.remove(id);
  }
}
