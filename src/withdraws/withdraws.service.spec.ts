import { Test, TestingModule } from "@nestjs/testing";
import { WithdrawsService } from "./withdraws.service";

describe("WithdrawsService", () => {
  let service: WithdrawsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WithdrawsService],
    }).compile();

    service = module.get<WithdrawsService>(WithdrawsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
