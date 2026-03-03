import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ColorsController } from "./colors.controller";
import { ColorsService } from "./colors.service";
import { ProductColor } from "./entities/colors.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ProductColor])],
  providers: [ColorsService],
  controllers: [ColorsController],
})
export class ColorsModule {}
