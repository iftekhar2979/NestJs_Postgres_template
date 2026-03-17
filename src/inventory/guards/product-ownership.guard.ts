import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { Product } from "src/products/entities/products.entity";
import { DataSource } from "typeorm";

@Injectable()
export class ProductOwnershipGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("User not authenticated");
    }

    const productId = request.params.productId || request.body.productId;
    if (!productId) {
      return true;
    }

    const product = await this.dataSource.getRepository(Product).findOne({
      where: { id: Number(productId) },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    if (product.user_id !== user.id && !user.roles?.includes("admin")) {
      throw new ForbiddenException("You do not own this product");
    }

    return true;
  }
}
