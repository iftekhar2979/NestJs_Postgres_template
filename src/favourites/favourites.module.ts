import { Module } from "@nestjs/common";
import { FavouritesController } from "./favourites.controller";
import { FavouritesService } from "./favourites.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Favorite } from "./entities/favourite.entity";
import { Product } from "src/products/entities/products.entity";
import { AuthModule } from "src/auth/auth.module";
import { UserModule } from "src/user/user.module";
import { ProductsModule } from "src/products/products.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Favorite, Product]),
    AuthModule,
    UserModule,

    // ProductsModule
  ],
  controllers: [FavouritesController],
  providers: [FavouritesService],
  exports: [FavouritesService],
})
export class FavouritesModule {}
