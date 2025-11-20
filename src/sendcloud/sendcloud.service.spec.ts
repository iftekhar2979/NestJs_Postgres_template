import { Test, TestingModule } from "@nestjs/testing";
import { SendcloudService } from "./sendcloud.service";

describe("SendcloudService", () => {
  let service: SendcloudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SendcloudService],
    }).compile();

    service = module.get<SendcloudService>(SendcloudService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
