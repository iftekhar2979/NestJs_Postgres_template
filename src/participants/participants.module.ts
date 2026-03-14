import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConversationParticipant } from "./entities/participants.entity";
import { ParticipantsController } from "./participants.controller";
import { ParticipantsService } from "./participants.service";

@Module({
  imports: [TypeOrmModule.forFeature([ConversationParticipant])],
  controllers: [ParticipantsController],
  providers: [ParticipantsService],
  exports: [ParticipantsService],
})
export class ParticipantsModule {}
