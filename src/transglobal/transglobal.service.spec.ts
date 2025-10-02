import { Test, TestingModule } from "@nestjs/testing";
import { TransglobalService } from "./transglobal.service";

describe("TransglobalService", () => {
  let service: TransglobalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransglobalService],
    }).compile();

    service = module.get<TransglobalService>(TransglobalService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
