import { MailerModule } from "@nestjs-modules/mailer";
import { PugAdapter } from "@nestjs-modules/mailer/dist/adapters/pug.adapter";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { join } from "path";
import { FROM_EMAIL } from "./constants";
import { MailService } from "./mail.service";

/**
 * It is a feature module where we keep the service and code related to mails. we import the nestjs mailer module and configure it to work with templates using pugAdapter.
 */

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        if (configService.get<string>("NODE_ENV") === "PROD") {
          return {
            transport: {
              host: configService.get<string>("EMAIL_HOST"),
              port: +configService.get<string>("EMAIL_PORT"),
              auth: {
                user: configService.get<string>("EMAIL_USERNAME"),
                pass: configService.get<string>("EMAIL_PASSWORD"),
              },
            },
            defaults: {
              from: `'no-reply' <${FROM_EMAIL}>`,
            },
            template: {
              dir: join(__dirname, "templates"),
              adapter: new PugAdapter(), // NOTE: change to your preferable adapter
              options: {
                strict: true,
              },
            },
          };
        }
      },
    }),

    // MailerModule.forRootAsync({
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: (configService: ConfigService) => {
    //     if (configService.get<string>("NODE_ENV") === "DEV") {
    //       return {
    //         transport: {
    //           host: "smtp.sendgrid.net",
    //           port: 587,
    //           auth: {
    //             user: "apikey", // <-- must be exactly this
    //             pass: configService.get("SENDGRID_API_KEY"), // <-- your API key
    //           },
    //         },
    //         defaults: {
    //           from: '"Pet Attix" <support@petattix.com>',
    //         },
    //         template: {
    //           dir: join(__dirname, "templates"),
    //           adapter: new PugAdapter(),
    //           options: {
    //             strict: true,
    //           },
    //         },
    //       };
    //     }
    //   },
    // }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
