import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Inventory } from "../entities/inventory.entity";

@Injectable()
export class InventoryOwnershipGuard implements CanActivate {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      throw new ForbiddenException("User not authenticated");
    }

    const inventoryId = request.params.id || request.body.inventoryId;
    if (!inventoryId) {
      return true; // Let validation decorators handle missing ID if not captured here
    }

    const inventory = await this.inventoryRepo.findOne({
      where: { id: Number(inventoryId) },
      relations: ["product"],
    });

    if (!inventory) {
      throw new NotFoundException("Inventory not found");
    }

    if (inventory.product.user_id !== user.id && !user.roles?.includes("admin")) {
      throw new ForbiddenException("You do not own this inventory");
    }

    // Attach to request for reuse by decorator
    request.inventory = inventory;
    
    return true;
  }
}
