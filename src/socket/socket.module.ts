import { Global, Module } from "@nestjs/common";
import { SocketService } from "./socket.service";
import { SocketController } from "./socket.controller";
import { AuthModule } from "src/auth/auth.module";
import { UserModule } from "src/user/user.module";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { SocketGateway } from "./socket.gateway";
import { ParticipantsModule } from "src/participants/participants.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Messages } from "src/messages/entities/messages.entity";
import { Conversations } from "src/conversations/entities/conversations.entity";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Messages, Conversations]),
    AuthModule,
    UserModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.get<string>("JWT_SECRET"),
          signOptions: {
            expiresIn: configService.get<string>("EXPIRES_IN"),
          },
        };
      },
    }),
    //  forwardRef(() => MessagesModule),
    // MessagesModule,
    // ConversationsModule,
    ParticipantsModule,
  ],
  providers: [SocketGateway, SocketService],
  controllers: [SocketController],
  exports: [SocketGateway, SocketService],
})
export class SocketModule {}
