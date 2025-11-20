import { Module } from "@nestjs/common";
import { SizesController } from "./sizes.controller";
import { SizesService } from "./sizes.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "src/auth/auth.module";
import { Size } from "./entity/sizes.entity";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Size])],
  controllers: [SizesController],
  providers: [SizesService],
})
export class SizesModule {}
