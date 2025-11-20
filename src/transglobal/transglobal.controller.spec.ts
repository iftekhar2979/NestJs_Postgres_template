import { Test, TestingModule } from "@nestjs/testing";
import { TransglobalController } from "./transglobal.controller";

describe("TransglobalController", () => {
  let controller: TransglobalController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransglobalController],
    }).compile();

    controller = module.get<TransglobalController>(TransglobalController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
