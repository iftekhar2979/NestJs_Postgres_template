import { InjectQueue } from "@nestjs/bull";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Queue } from "bull";
import { RedisService } from "src/redis/redis.service";
import { User } from "src/user/entities/user.entity";
import { DataSource, EntityManager, Repository } from "typeorm";
import { ConfirmStockDto, CreateInventoryDto, ReleaseStockDto, ReserveStockDto, UpdateInventoryDto } from "./dto/inventory.dto";
import { InventoryAction, InventoryLog } from "./entities/inventory-log.entity";
import { Inventory } from "./entities/inventory.entity";

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
    @InjectRepository(InventoryLog)
    private readonly inventoryLogRepo: Repository<InventoryLog>,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    @InjectQueue("product") private readonly productQueue: Queue,
  ) {}

  /**
   * 1. Initialize Inventory
   * Called during product/variant creation
   */
  async initializeInventory(dto: CreateInventoryDto, manager?: EntityManager, user?: User) {
    const repo = manager ? manager.getRepository(Inventory) : this.inventoryRepo;
    const logRepo = manager ? manager.getRepository(InventoryLog) : this.inventoryLogRepo;
    
    const inventory = repo.create({
      product_id: dto.productId,
      variant_id: dto.variantId,
      stock: dto.stock,
      reserved_stock: 0,
    });

    const saved = await repo.save(inventory);

    await logRepo.save({
      user_id: user?.id,
      product_id: saved.product_id,
      inventory_id: saved.id,
      action: InventoryAction.INIT,
      previous_value: 0,
      new_value: saved.stock,
      reason: "Initial inventory setup",
    });

    await this.invalidateCache(dto.productId, dto.variantId);
    
    return saved;
  }

  /**
   * 2. Get Inventory (Cached)
   * Read-through pattern
   */
  async getInventory(productId: number, variantId?: number): Promise<Inventory> {
    const cacheKey = this.getCacheKey(productId, variantId);
    const cached = await this.redisService.get<Inventory>(cacheKey);
    if (cached) return cached;

    const inventory = await this.inventoryRepo.findOne({
      where: {
        product_id: productId,
        variant_id: variantId || null,
      },
    });

    if (!inventory) {
      throw new NotFoundException(`Inventory not found for product ${productId}${variantId ? ` variant ${variantId}` : ""}`);
    }

    await this.redisService.set(cacheKey, inventory, 600); // 10 mins TTL
    return inventory;
  }

  /**
   * 3. Reserve Stock (Pessimistic Lock)
   * Used before payment
   */
  async reserveStock(dto: ReserveStockDto, user?: User) {
    return await this.dataSource.transaction(async (manager) => {
      const inventory = await manager
        .createQueryBuilder(Inventory, "inventory")
        .setLock("pessimistic_write")
        .where("inventory.product_id = :productId", { productId: dto.productId })
        .andWhere(dto.variantId ? "inventory.variant_id = :variantId" : "inventory.variant_id IS NULL", { variantId: dto.variantId })
        .getOne();

      if (!inventory) throw new NotFoundException("Inventory record not found");

      const availableStock = inventory.stock - inventory.reserved_stock;
      if (availableStock < dto.quantity) {
        throw new ConflictException(`Insufficient stock. Available: ${availableStock}, Requested: ${dto.quantity}`);
      }

      const previousReserved = inventory.reserved_stock;
      inventory.reserved_stock += dto.quantity;
      await manager.save(Inventory, inventory);

      await manager.save(InventoryLog, {
        user_id: user?.id,
        product_id: inventory.product_id,
        inventory_id: inventory.id,
        action: InventoryAction.RESERVE,
        previous_value: previousReserved,
        new_value: inventory.reserved_stock,
        reason: `Reserved ${dto.quantity} units`,
      });

      // Invalidate cache and publish event
      await this.postUpdateProcess(dto.productId, dto.variantId, "inventory.reserved", dto.quantity);
      
      return inventory;
    });
  }

  /**
   * 4. Confirm Stock (After success)
   */
  async confirmStock(dto: ConfirmStockDto, user?: User) {
    return await this.dataSource.transaction(async (manager) => {
        const inventory = await manager
        .createQueryBuilder(Inventory, "inventory")
        .setLock("pessimistic_write")
        .where("inventory.product_id = :productId", { productId: dto.productId })
        .andWhere(dto.variantId ? "inventory.variant_id = :variantId" : "inventory.variant_id IS NULL", { variantId: dto.variantId })
        .getOne();

      if (!inventory) throw new NotFoundException("Inventory record not found");

      if (inventory.reserved_stock < dto.quantity) {
          throw new BadRequestException("Confirming more stock than reserved");
      }

      const previousStock = inventory.stock;
      inventory.stock -= dto.quantity;
      inventory.reserved_stock -= dto.quantity;
      await manager.save(Inventory, inventory);

      await manager.save(InventoryLog, {
        user_id: user?.id,
        product_id: inventory.product_id,
        inventory_id: inventory.id,
        action: InventoryAction.CONFIRM,
        previous_value: previousStock,
        new_value: inventory.stock,
        reason: `Confirmed purchase of ${dto.quantity} units`,
      });

      await this.postUpdateProcess(dto.productId, dto.variantId, "inventory.updated", inventory.stock);

      return inventory;
    });
  }

  /**
   * 5. Release Stock (On Failure)
   */
  async releaseStock(dto: ReleaseStockDto, user?: User) {
    return await this.dataSource.transaction(async (manager) => {
        const inventory = await manager
        .createQueryBuilder(Inventory, "inventory")
        .setLock("pessimistic_write")
        .where("inventory.product_id = :productId", { productId: dto.productId })
        .andWhere(dto.variantId ? "inventory.variant_id = :variantId" : "inventory.variant_id IS NULL", { variantId: dto.variantId })
        .getOne();

      if (!inventory) throw new NotFoundException("Inventory record not found");

      if (inventory.reserved_stock < dto.quantity) {
          throw new BadRequestException("Releasing more stock than reserved");
      }

      const previousReserved = inventory.reserved_stock;
      inventory.reserved_stock -= dto.quantity;
      await manager.save(Inventory, inventory);

      await manager.save(InventoryLog, {
        user_id: user?.id,
        product_id: inventory.product_id,
        inventory_id: inventory.id,
        action: InventoryAction.RELEASE,
        previous_value: previousReserved,
        new_value: inventory.reserved_stock,
        reason: `Released ${dto.quantity} units from reservation`,
      });

      await this.postUpdateProcess(dto.productId, dto.variantId, "inventory.released", dto.quantity);

      return inventory;
    });
  }

  /**
   * 6. Admin/Owner Stock Update
   */
  async updateStock(inventory: Inventory, dto: UpdateInventoryDto, user?: User) {
    if (dto.stock < inventory.reserved_stock) {
      throw new BadRequestException(`New stock cannot be less than reserved stock (${inventory.reserved_stock})`);
    }

    const previousStock = inventory.stock;
    inventory.stock = dto.stock;
    const saved = await this.inventoryRepo.save(inventory);

    await this.inventoryLogRepo.save({
      user_id: user?.id,
      product_id: inventory.product_id,
      inventory_id: inventory.id,
      action: InventoryAction.UPDATE,
      previous_value: previousStock,
      new_value: saved.stock,
      reason: "Manual stock update",
    });

    await this.postUpdateProcess(inventory.product_id, inventory.variant_id, "inventory.updated", inventory.stock);
    
    return saved;
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  private getCacheKey(productId: number, variantId?: number): string {
    return `inventory:${productId}:${variantId || 'base'}`;
  }

  private async invalidateCache(productId: number, variantId?: number) {
    await this.redisService.del(this.getCacheKey(productId, variantId));
  }

  private async postUpdateProcess(productId: number, variantId: number | undefined, eventName: string, value: number) {
    await this.invalidateCache(productId, variantId);
    await this.productQueue.add(eventName, {
      productId,
      variantId,
      value,
    });
  }
}
