import { Module } from "@nestjs/common";
import { UserBehaviourService } from "./user-behaviour.service";
import { UserBehaviourController } from "./user-behaviour.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserBehaviours } from "./entities/userBehaviour.entity";

@Module({
  imports: [TypeOrmModule.forFeature([UserBehaviours])],
  providers: [UserBehaviourService],
  controllers: [UserBehaviourController],
  exports: [UserBehaviourService],
})
export class UserBehaviourModule {}
