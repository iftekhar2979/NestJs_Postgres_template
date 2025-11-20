import { Test, TestingModule } from "@nestjs/testing";
import { ProductBoostController } from "./product-boost.controller";

describe("ProductBoostController", () => {
  let controller: ProductBoostController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductBoostController],
    }).compile();

    controller = module.get<ProductBoostController>(ProductBoostController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
