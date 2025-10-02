import { Module } from "@nestjs/common";
import { SeederService } from "./seeder.service";
import { UserModule } from "src/user/user.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Setting } from "src/settings/entity/settings.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Setting]), UserModule],
  providers: [SeederService],
})
export class SeederModule {}
