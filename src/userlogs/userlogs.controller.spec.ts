import { Test, TestingModule } from "@nestjs/testing";
import { UserlogsController } from "./userlogs.controller";

describe("UserlogsController", () => {
  let controller: UserlogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserlogsController],
    }).compile();

    controller = module.get<UserlogsController>(UserlogsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
