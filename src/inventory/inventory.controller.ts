import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { GetUser } from "src/auth/decorators/get-user.decorator";
import { JwtAuthenticationGuard } from "src/auth/guards/session-auth.guard";
import { User } from "src/user/entities/user.entity";
import { InventoryDec } from "./decorators/inventory.decorator";
import { ConfirmStockDto, CreateInventoryDto, ReleaseStockDto, ReserveStockDto, UpdateInventoryDto } from "./dto/inventory.dto";
import { Inventory } from "./entities/inventory.entity";
import { InventoryOwnershipGuard } from "./guards/inventory-ownership.guard";
import { ProductOwnershipGuard } from "./guards/product-ownership.guard";
import { InventoryService } from "./inventory.service";

@ApiTags("Inventory")
@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post("init")
  @UseGuards(JwtAuthenticationGuard) // Internal/System usually, but if manual, owner check needed
  @ApiOperation({ summary: "Initialize inventory (Internal/Admin use)" })
  async init(@Body() dto: CreateInventoryDto, @GetUser() user: User) {
    return await this.inventoryService.initializeInventory(dto, undefined, user);
  }

  @Get(":productId")
  @UseGuards(JwtAuthenticationGuard, ProductOwnershipGuard)
  @ApiOperation({ summary: "Get inventory for product/variant (Cached)" })
  async get(
    @Param("productId", ParseIntPipe) productId: number,
    @Query("variantId") variantId?: number,
  ) {
    return await this.inventoryService.getInventory(productId, variantId ? Number(variantId) : undefined);
  }

  @Post("reserve")
  @UseGuards(JwtAuthenticationGuard) // System often bypasses, but if user-facing:
  @ApiOperation({ summary: "Reserve stock during checkout" })
  async reserve(@Body() dto: ReserveStockDto, @GetUser() user: User) {
    return await this.inventoryService.reserveStock(dto, user);
  }

  @Post("confirm")
  @UseGuards(JwtAuthenticationGuard)
  @ApiOperation({ summary: "Confirm stock after successful payment" })
  async confirm(@Body() dto: ConfirmStockDto, @GetUser() user: User) {
    return await this.inventoryService.confirmStock(dto, user);
  }

  @Post("release")
  @UseGuards(JwtAuthenticationGuard)
  @ApiOperation({ summary: "Release reserved stock after failed payment" })
  async release(@Body() dto: ReleaseStockDto, @GetUser() user: User) {
    return await this.inventoryService.releaseStock(dto, user);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthenticationGuard, InventoryOwnershipGuard)
  @ApiOperation({ summary: "Update stock manually (Owner/Admin)" })
  async update(
    @InventoryDec() inventory: Inventory,
    @Body() dto: UpdateInventoryDto,
    @GetUser() user: User
  ) {
    return await this.inventoryService.updateStock(inventory, dto, user);
  }
}
