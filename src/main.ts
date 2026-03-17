// import configuration from "./configs/app.config";
import { ClassSerializerInterceptor, ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory, Reflector } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import compression from "compression";
import cookieParser from "cookie-parser";
import csurf from "csurf";
import { json, urlencoded } from "express";
import helmet from "helmet";
import hpp from "hpp";
import xssClean from "xss-clean";
import { AppModule } from "./app.module";
// FIXME: have it if you are using secret manager
// import { loadSecretsFromAWS } from "./configs/app.config";
import { join } from "path";
import { createDataSource } from "./configs/ormconfig";
import { runMigrations } from "./migration-runner";
import { SeederService } from "./seeder/seeder.service";
import { RedisIoAdapter } from "./socket/redis-io.adapter";

/**
 * function for bootstraping the nest application
 */
async function bootstrap() {
  // Load AWS secrets before anything else
  // FIXME: have it if you are using secret manager
  // await loadSecretsFromAWS();

  // Create the data source after secrets are loaded
  const dataSource = createDataSource();
  // Run Auto Migrations
  await runMigrations(dataSource, false); // Set to true to exit on migration failure
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    logger: ["error", "fatal", "log", "verbose", "warn", "debug"],
    rawBody: true,
  });
  const configService = app.get<ConfigService>(ConfigService);

  // const { order, parcelInfo, pricingInfo } = await import("./emailmock");
  // await emailService.sendMail({
  //   to: "salminrashid556@gmail.com",
  //   subject: "Test Email from NestJS App",
  //   text: "This is a test email sent from sendgrid",
  //   template: "welcome",
  //   context: {
  //     firstName: "Joo",
  //     lastName: "Dani & perl",
  //   },
  // });

  const seederService = app.get(SeederService);
  // await seederService.runSeed();
  // await seederService.seedAdminUser();
  // await seederService.seedSettings();
  // await seederService.seedCategories();
  app.setGlobalPrefix("/api");

  app.enableVersioning({
    defaultVersion: "1",
    type: VersioningType.URI,
  });

  app.setBaseViewsDir(join(__dirname, "..", "..", "src", "views"));
  app.setViewEngine("ejs");

  // const corsOptions: CorsOptions = {
  //   origin: '*', // ✅ frontend origin
  //   methods: ["GET", "POST", "PATCH", "DELETE"],
  //   allowedHeaders: ["Content-Type", "Authorization"],
  //   credentials: true,
  //   optionsSuccessStatus: 204,
  //   maxAge: 86400,
  // };
  app.useStaticAssets(join(__dirname, "..", "..", "public"));
  app.enableCors({
    origin: "*",
    // credentials: true,
  });
  app.use(cookieParser());
  app.use(compression());

  // Exclude Stripe webhook from global body parsers to prevent "Stream is not readable"
  app.use((req, res, next) => {
    if (req.originalUrl === "/api/v1/stripe/webhook") {
      return next();
    }
    json({ limit: "500kb" })(req, res, next);
  });
  app.use((req, res, next) => {
    if (req.originalUrl === "/api/v1/stripe/webhook") {
      return next();
    }
    urlencoded({ extended: true, limit: "500kb" })(req, res, next);
  });

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  const ignoreMethods =
    configService.get<string>("STAGE") == "dev"
      ? ["GET", "HEAD", "OPTIONS", "DELETE", "POST", "PATCH", "PUT"]
      : ["GET", "HEAD", "OPTIONS"];

  // Apply CSRF but exclude Stripe webhook
  app.use((req, res, next) => {
    if (req.originalUrl === "/api/v1/stripe/webhook") {
      return next();
    }
    csurf({
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "PROD",
        sameSite: "strict",
      },
      ignoreMethods,
    })(req, res, next);
  });
  app.use(
    helmet({
      hsts: {
        includeSubDomains: true,
        preload: true,
        maxAge: 63072000, // 2 years in seconds
      },
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'", "https://polyfill.io", "https://*.cloudflare.com", "http://127.0.0.1:3000/"],
          baseUri: ["'self'"],
          scriptSrc: [
            "'self'",
            "http://127.0.0.1:3000/",
            "https://*.cloudflare.com",
            "https://polyfill.io",
            `https: 'unsafe-inline'`, // FIXME: use script-src CSP NONCES
            /* 
              CSP NONCES https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src#unsafe_inline
             */
          ],
          styleSrc: ["'self'", "https:", "http:", "'unsafe-inline'"],
          imgSrc: ["'self'", "blob:", "validator.swagger.io", "*"],
          fontSrc: ["'self'", "https:", "data:"],
          childSrc: ["'self'", "blob:"],
          styleSrcAttr: ["'self'", "'unsafe-inline'", "http:"],
          frameSrc: ["'self'"],
        },
      },
      // you don't control the link on the pages, or know that you don't want to leak information to other domains
      dnsPrefetchControl: { allow: false }, // Changed based on the last middleware to disable DNS prefetching
      frameguard: { action: "deny" }, // Disable clickjacking
      hidePoweredBy: true, // Hides the X-Powered-By header to make the server less identifiable.
      ieNoOpen: true, // Prevents Internet Explorer from executing downloads in the site’s context.
      noSniff: true, // Prevents browsers from MIME type sniffing, reducing exposure to certain attacks.
      permittedCrossDomainPolicies: { permittedPolicies: "none" }, // Prevents Adobe Flash and Acrobat from loading cross-domain data.
      referrerPolicy: { policy: "no-referrer" }, // Protects against referrer leakage.
      xssFilter: true, // Enables the basic XSS protection in older browsers.

      // Configures Cross-Origin settings to strengthen resource isolation and mitigate certain side-channel attacks.  crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
      crossOriginResourcePolicy: { policy: "same-site" },
      originAgentCluster: true,
    })
  );

  app.use((req: any, res: any, next: any) => {
    res.setHeader(
      "Permissions-Policy",
      'fullscreen=(self), camera=(), geolocation=(self "https://*example.com"), autoplay=(), payment=(), microphone=()'
    );
    next();
  });

  app.use(xssClean());
  app.use(hpp());

  app.useGlobalPipes(new ValidationPipe({ transform: true, stopAtFirstError: true }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  /* FIXME:
    ########################## 
    ##### Set-up Swagger #####
    ##########################
  */
  if (!["prod", "production"].includes(configService.get<string>("STAGE").toLowerCase())) {
    const config = new DocumentBuilder()
      .addBearerAuth()
      .setTitle(configService.get<string>("npm_package_name").replaceAll("-", " ").toUpperCase())
      .setDescription("DESCRIPTION")
      .setVersion(configService.get<string>("npm_package_version"))
      .build();

    const document = SwaggerModule.createDocument(app, config, { ignoreGlobalPrefix: false });
    SwaggerModule.setup("api", app, document, {
      swaggerOptions: {
        tagsSorter: "alpha",
      },
    });
  }

  // FIXME:
  // expressSession(app);

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  const port = configService.get<string>("PORT") || 3000;

  await app.listen(port, () => {
    console.log("Server started on port: " + port);
  });
}
bootstrap();
