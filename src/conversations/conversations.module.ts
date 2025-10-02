import { Module } from "@nestjs/common";
import { ConversationsService } from "./conversations.service";
import { ConversationsController } from "./conversations.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Conversations } from "./entities/conversations.entity";
import { Messages } from "src/messages/entities/messages.entity";
import { ParticipantsModule } from "src/participants/participants.module";
import { ProductsModule } from "src/products/products.module";
import { UserModule } from "src/user/user.module";
import { AuthModule } from "src/auth/auth.module";
import { SocketModule } from "src/socket/socket.module";
// import { SocketService } from 'src/socket/socket.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversations, Messages]),
    ParticipantsModule,
    ProductsModule,
    UserModule,
    AuthModule,
    SocketModule,
  ],
  providers: [ConversationsService],
  controllers: [ConversationsController],
  exports: [ConversationsService],
})
export class ConversationsModule {}
