import { Test, TestingModule } from "@nestjs/testing";
import { TransectionsService } from "./transections.service";

describe("TransectionsService", () => {
  let service: TransectionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransectionsService],
    }).compile();

    service = module.get<TransectionsService>(TransectionsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
