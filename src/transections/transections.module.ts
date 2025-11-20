import { Module } from "@nestjs/common";
import { TransectionsController } from "./transections.controller";
import { TransectionsService } from "./transections.service";
import { AuthModule } from "src/auth/auth.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Transections } from "./entity/transections.entity";
import { UserModule } from "src/user/user.module";

@Module({
  imports: [AuthModule, UserModule, TypeOrmModule.forFeature([Transections])],
  controllers: [TransectionsController],
  providers: [TransectionsService],
})
export class TransectionsModule {}
