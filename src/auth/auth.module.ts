import { forwardRef, Global, Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { LocalStrategy } from "./strategies/local.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { MailModule } from "../mail/mail.module";
import { GoogleStrategy } from "./strategies/google.strategy";
import { User } from "../user/entities/user.entity";
import { UserModule } from "../user/user.module";
import { Verification } from "src/user/entities/verification.entity";
import { OtpModule } from "src/otp/otp.module";
import { Otp } from "src/otp/entities/otp.entity";
import { Wallets } from "src/wallets/entity/wallets.entity";

/**
 * It is a feature module where we keep the controller, service and other code related to authentication and  we import other modules and configure modules and packages that are being used in this module.
 *
 * Here, feature modules imported are - DatabaseModule, AuthModule, MailModule and UserModule.
 * other modules are :
 *      {@link TypeOrmModule} - it is an ORM and enables easy access to database.
 *      {@link PassportModule} - it enables us to setup multiple types of authentication.
 *      {@link JwtModule} - it is used for token creation for authentication.
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, Verification, Wallets]),
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
    forwardRef(() => UserModule),
    MailModule,
    OtpModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, GoogleStrategy],
  exports: [AuthService, PassportModule, JwtStrategy, JwtModule],
})
export class AuthModule {}
