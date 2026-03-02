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
  ValidationPipe,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { GetFilesDestination, GetUser } from "src/auth/decorators/get-user.decorator";
import { RolesGuard } from "src/auth/guards/roles-auth.guard";
import { JwtAuthenticationGuard } from "src/auth/guards/session-auth.guard";
import { multerConfig } from "src/common/multer/multer.config";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { Roles } from "src/user/decorators/roles.decorator";
import { User } from "src/user/entities/user.entity";
import { UserRoles } from "src/user/enums/role.enum";
import { Logger } from "winston";
import { CreateProductDto } from "./dto/CreateProductDto.dto";
import { GetAdminProductQuery, GetProductsQueryDto } from "./dto/GetProductDto.dto";
import { UpdateProductDto } from "./dto/updatingProduct.dto";
import { Product } from "./entities/products.entity";
import { ProductsService } from "./products.service";

@Controller("products")
@ApiTags("Products")
@ApiBearerAuth()
export class ProductsController {
  constructor(
    @InjectLogger() private readonly _logger: Logger,
    private readonly _productsService: ProductsService
  ) {}

  @Post()
  @UseGuards(JwtAuthenticationGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "images", maxCount: 6 }, // You can limit the number of files here
      ],
      multerConfig
    )
  )
  @ApiResponse({ status: 201, description: "Product created successfully", type: Product })
  @ApiBody({ type: CreateProductDto })
  async createProduct(
    @Body() createProductDto: CreateProductDto,
    @GetUser() user,
    @UploadedFiles() files: { images?: Express.Multer.File[] },
    @GetFilesDestination() filesDestination: string[]
  ) {
    this._logger.log("Product Upload", createProductDto);
    createProductDto.images = filesDestination;
    return this._productsService.create(createProductDto, user);
  }

  @Get("all")
  @UseGuards(JwtAuthenticationGuard)
  @ApiResponse({ status: 200, description: "Product retrived successfully", type: Product })
  @ApiBody({ type: CreateProductDto })
  async getProducts(@Query() query: GetAdminProductQuery) {
    return this._productsService.findAll(Number(query.page), Number(query.limit), query);
  }
  @Get(":productId/details")
  @UseGuards(JwtAuthenticationGuard)
  @ApiResponse({ status: 200, description: "Product retrived successfully", type: Product })
  @ApiBody({ type: CreateProductDto })
  async productInfo(@Param("productId", ParseIntPipe) id: number) {
    return this._productsService.getProductById(id);
  }

  @Get()
  @UseGuards(JwtAuthenticationGuard)
  @ApiResponse({ status: 200, description: "Product retrived successfully", type: Product })
  @ApiQuery({ type: GetProductsQueryDto, required: false })
  async getProductsWithFiltering(@Query() query: GetProductsQueryDto, @GetUser() user: User) {
    if (query.userId) {
      throw new ForbiddenException("Can't resolve the api");
    }
    query.userId = user.id;
    query.user = user;
    return this._productsService.findAllWithFilters(query);
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
  @Put(":id/boosts")
  @UseGuards(JwtAuthenticationGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiResponse({ status: 200, description: "Product boosted successfully", type: Product })
  @ApiParam({ name: "id", type: Number, description: "ID of the product to update" })
  async boostProduct(@Param("id", ParseIntPipe) id: number, @GetUser() user: User) {
    return this._productsService.boostProduct({ productId: id, user });
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
