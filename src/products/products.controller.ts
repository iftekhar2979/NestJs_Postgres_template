import { ResponseInterface } from "src/common/types/responseInterface";
// import { Query, Query } from '@nestjs/common';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { GetFilesDestination, GetUser } from "src/auth/decorators/get-user.decorator";
import { RolesGuard } from "src/auth/guards/roles-auth.guard";
import { JwtAuthenticationGuard } from "src/auth/guards/session-auth.guard";
import { multerConfig } from "src/common/multer/multer.config";
import { RedisService } from "src/redis/redis.service";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { Roles } from "src/user/decorators/roles.decorator";
import { User } from "src/user/entities/user.entity";
import { UserRoles } from "src/user/enums/role.enum";
import { Logger } from "winston";
import { CreateProductDto } from "./dto/secondary/CreateProduct.dto";
import { GetAdminProductsQueryDto, GetProductsQueryDto } from "./dto/secondary/GetProduct.dto";
import { UpdateProductDto } from "./dto/secondary/UpdateProduct.dto";
import { Product } from "./entities/products.entity";
import { ProductStatus } from "./enums/status.enum";
import { ProductsService } from "./products.service";
import { ProductsSecondaryService } from "./services/products_secondary.service";

@Controller("products")
@ApiTags("Products")
@ApiBearerAuth()
export class ProductsController {
  constructor(
    @InjectLogger() private readonly _logger: Logger,
    private readonly _productsService: ProductsService,
    private readonly _productsSecondaryService: ProductsSecondaryService ,
    private readonly _cacheService:RedisService
  ) {}

  @Post()
  @UseGuards(JwtAuthenticationGuard)
  // @UseInterceptors(
  //   FileFieldsInterceptor(
  //     [
  //       { name: "images", maxCount: 6 }, // You can limit the number of files here
  //     ],
  //     multerConfig
  //   )
  // )
  @ApiResponse({ status: 201, description: "Product created successfully", type: Product })
  @ApiBody({ type: CreateProductDto })
    async create(
    @Body() dto: CreateProductDto,
    @GetUser() user: User,
    // @UploadedFiles() files: { images?: Express.Multer.File[] },
    // @GetFilesDestination() filePaths: string[]
  ) {

    this._logger.log("Create product", { user: user.id, variants: dto.variants?.length });
    return this._productsSecondaryService.create(dto, user);
  }

  // @Get("all")
  // @UseGuards(JwtAuthenticationGuard)
  // @ApiResponse({ status: 200, description: "Product retrived successfully", type: Product })
  // @ApiBody({ type: CreateProductDto })
  // async getProducts(@Query() query: GetAdminProductQuery) {
  //   return this._productsSecondaryService.findAll(Number(query.page), Number(query.limit), query);
  // }
  @Get(":productId/details")
  @UseGuards(JwtAuthenticationGuard)
  @ApiResponse({ status: 200, description: "Product retrived successfully", type: Product })
  @ApiBody({ type: CreateProductDto })
  async productInfo(@Param("productId", ParseIntPipe) id: number) {
    return this._productsService.getProductById(id);
  }


   @Get("admin/all")
  @UseGuards(RolesGuard)
  @Roles(UserRoles.ADMIN)
  @ApiOperation({
    summary: "[ADMIN] List all products across all statuses",
    description: `
Admin-only endpoint that returns products with all statuses including \`pending\`, \`rejected\`, \`deleted\`.

**Extra filters available to admin:**
- \`status\` — filter to a specific status
- \`sellerEmail\` — filter by seller email address
- All public filters (\`term\`, \`brand\`, \`subCategoryId\`) also apply.

Prices are NOT currency-converted — raw GBP values are returned.
    `.trim(),
  })
  @ApiQuery({ name: "page",          required: false, type: Number, example: 1 })
  @ApiQuery({ name: "limit",         required: false, type: Number, example: 10 })
  @ApiQuery({ name: "term",          required: false, type: String, example: "iPhone",      description: "Search name, brand, seller name" })
  @ApiQuery({ name: "brand",         required: false, type: String, example: "Apple" })
  @ApiQuery({ name: "subCategoryId", required: false, type: Number, example: 3 })
  @ApiQuery({ name: "status",        required: false, enum: ProductStatus,                  description: "Filter by product status" })
  @ApiQuery({ name: "sellerEmail",   required: false, type: String, example: "john@example.com", description: "Filter by seller email" })
  // @ApiResponse({ status: 200, description: "All products (admin view)", ...pagedProductResponse })
  // @ApiResponse({ status: 403, description: "Admin access required", ...ApiInternalServerErrorResponse(403, "Forbidden resource") })
  async findAllAdmin(@Query() query: GetAdminProductsQueryDto) {
    return this._productsSecondaryService.findAllAdmin(query);
  }
  @Get()
  @UseGuards(JwtAuthenticationGuard)
  @ApiResponse({ status: 200, description: "Product retrived successfully", type: Product })
  @ApiQuery({ type: GetProductsQueryDto, required: false })
  async getProducts(@Query() query: GetProductsQueryDto, @GetUser() user: User , @Query('type') type: string) {
    if (query.userId) {
      throw new ForbiddenException("Can't resolve the api");
    }
    query.userId = user.id;
    query.type = type;
    
    return this._productsSecondaryService.findAll(query);
  }
  @Patch(":id")
  @UseGuards(JwtAuthenticationGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "images", maxCount: 6 }, // You can limit the number of files here
      ],
      multerConfig
    )
  )
  @ApiResponse({ status: 200, description: "Product updated successfully", type: Product })
  @ApiParam({ name: "id", type: Number, description: "ID of the product to update" })
  @ApiBody({ type: UpdateProductDto })
  async updateProduct(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFiles() files: { images?: Express.Multer.File[] },
    @GetUser() user,
    @GetFilesDestination() filesDestination: string[]
  ) {
    this._logger.log(`Files`, filesDestination);
    updateProductDto.images = filesDestination;
    this._logger.log(`product update dto`, updateProductDto);
    return this._productsService.updateProduct(id, updateProductDto, user.id, user);
  }
  @Get(":id/boost-preview")
  @UseGuards(JwtAuthenticationGuard)
  @ApiOperation({ summary: "Get boost pricing preview for 3 and 7 days" })
  @ApiResponse({ status: 200, description: "Boost pricing preview retrieved successfully" })
  @ApiParam({ name: "id", type: Number, description: "ID of the product to preview boost pricing for" })
  async boostPreview(@Param("id", ParseIntPipe) id: number, @GetUser() user: User) {
    return this._productsService.boostPreview(id, user);
  }

  @Put(":id/boosts")
  @UseGuards(JwtAuthenticationGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: "Boost a product for a specific number of days" })
  @ApiResponse({ status: 200, description: "Product boosted successfully", type: Product })
  @ApiParam({ name: "id", type: Number, description: "ID of the product to boost" })
  @ApiQuery({ name: "days", type: Number, required: false, description: "Number of days to boost (defaults to 3)" })
  async boostProduct(
    @Param("id", ParseIntPipe) id: number,
    @GetUser() user: User,
    @Query("days", new ParseIntPipe({ optional: true })) days?: number
  ) {
    if (!days) {
      days = 3;
    }
    return this._productsService.boostProduct({ productId: id, user, days });
  }

  @Patch(":id/status")
  @UseGuards(JwtAuthenticationGuard, RolesGuard)
  @Roles(UserRoles.ADMIN)
  @ApiResponse({ status: 200, description: "Product updated successfully", type: Product })
  @ApiParam({ name: "id", type: Number, description: "ID of the read the product" })
  async updateProductStatus(
    @Param("id", ParseIntPipe) id: number
    // @GetUser() user: User
  ): Promise<ResponseInterface<Product>> {
    return this._productsService.updateProductsStatus(id);
  }

  @Get(":id")
  @UseGuards(JwtAuthenticationGuard)
  @ApiResponse({ status: 200, description: "Product updated successfully", type: Product })
  @ApiParam({ name: "id", type: Number, description: "ID of the read the product" })
  async getProductById(
    @Param("id", ParseIntPipe) id: number,
    @GetUser() user: User
  ): Promise<ResponseInterface<Product>> {
    return this._productsService.getProductifFavourites(id, user.id, user);
  }
  @Delete(":id")
  @UseGuards(JwtAuthenticationGuard)
  @ApiResponse({ status: 200, description: "Product updated successfully", type: Product })
  @ApiParam({ name: "id", type: Number, description: "ID of the read the product" })
  async deleteProduct(@Param("id", ParseIntPipe) id: number, @GetUser() user: User) {
    return this._productsService.getProductIdAndDelete(id, user.id);
  }
}
