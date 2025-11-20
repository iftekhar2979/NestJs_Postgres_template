import { Test, TestingModule } from "@nestjs/testing";
import { UserBehaviourController } from "./user-behaviour.controller";

describe("UserBehaviourController", () => {
  let controller: UserBehaviourController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserBehaviourController],
    }).compile();

    controller = module.get<UserBehaviourController>(UserBehaviourController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
