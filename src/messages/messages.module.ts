import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AttachmentModule } from "src/attachment/attachment.module";
import { MessageAttachment } from "src/attachment/entiies/attachments.entity";
import { AuthModule } from "src/auth/auth.module";
import { ConversationsModule } from "src/conversations/conversations.module";
import { Conversations } from "src/conversations/entities/conversations.entity";
import { ParticipantsModule } from "src/participants/participants.module";
import { User } from "src/user/entities/user.entity";
import { UserModule } from "src/user/user.module";
import { Messages } from "./entities/messages.entity";
import { MessagesController } from "./messages.controller";
import { MessagesService } from "./messages.service";
// import { ConversationsModule } from 'src/conversations/conversations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Messages, Conversations, User, MessageAttachment]),
    AuthModule,
    //  forwardRef(() => SocketModule),
    // SocketModule,
    ConversationsModule,
    UserModule,
    AttachmentModule,
    ParticipantsModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
