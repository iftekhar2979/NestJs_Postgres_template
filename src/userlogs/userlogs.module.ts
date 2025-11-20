import { Module } from "@nestjs/common";
import { UserlogsService } from "./userlogs.service";
import { UserlogsController } from "./userlogs.controller";

@Module({
  providers: [UserlogsService],
  controllers: [UserlogsController],
})
export class UserlogsModule {}
