import { Test, TestingModule } from "@nestjs/testing";
import { WithdrawsController } from "./withdraws.controller";

describe("WithdrawsController", () => {
  let controller: WithdrawsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WithdrawsController],
    }).compile();

    controller = module.get<WithdrawsController>(WithdrawsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
