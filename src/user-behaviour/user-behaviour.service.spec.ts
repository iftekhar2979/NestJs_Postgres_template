import { Test, TestingModule } from "@nestjs/testing";
import { UserBehaviourService } from "./user-behaviour.service";

describe("UserBehaviourService", () => {
  let service: UserBehaviourService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserBehaviourService],
    }).compile();

    service = module.get<UserBehaviourService>(UserBehaviourService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
