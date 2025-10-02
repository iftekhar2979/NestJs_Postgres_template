import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";
import { AuthModule } from "../auth/auth.module";
import { MailModule } from "../mail/mail.module";
import { User } from "./entities/user.entity";
import { Verification } from "./entities/verification.entity";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule } from "@nestjs/config";
import { ConfigService } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";
/**
 * It is a feature module where we keep the controller, service and other code related to user entity and  we import other modules and configure modules and packages that are being used in this module.
 *
 * Here, feature modules imported are -  DatabaseModule, AuthModule, MailModule and UserModule.
 * other modules are :
 *      TypeOrmModule - it is an ORM and enables easy access to database.
 */
@Module({
  imports: [
    forwardRef(() => AuthModule),
    TypeOrmModule.forFeature([User, Verification]),
    MailModule,
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
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
