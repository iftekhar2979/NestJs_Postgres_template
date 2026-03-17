import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const InventoryDec = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.inventory;
  },
);
