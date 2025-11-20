import { Test, TestingModule } from "@nestjs/testing";
import { SendcloudController } from "./sendcloud.controller";

describe("SendcloudController", () => {
  let controller: SendcloudController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SendcloudController],
    }).compile();

    controller = module.get<SendcloudController>(SendcloudController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
