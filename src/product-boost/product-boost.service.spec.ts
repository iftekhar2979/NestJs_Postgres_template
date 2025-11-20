import { Test, TestingModule } from "@nestjs/testing";
import { ProductBoostService } from "./product-boost.service";

describe("ProductBoostService", () => {
  let service: ProductBoostService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductBoostService],
    }).compile();

    service = module.get<ProductBoostService>(ProductBoostService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
