import { Test, TestingModule } from "@nestjs/testing";
import { TransectionsController } from "./transections.controller";

describe("TransectionsController", () => {
  let controller: TransectionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransectionsController],
    }).compile();

    controller = module.get<TransectionsController>(TransectionsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
