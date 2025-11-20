import { Test, TestingModule } from "@nestjs/testing";
import { UserlogsService } from "./userlogs.service";

describe("UserlogsService", () => {
  let service: UserlogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserlogsService],
    }).compile();

    service = module.get<UserlogsService>(UserlogsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
