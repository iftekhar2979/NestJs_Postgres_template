import { ApiProperty } from "@nestjs/swagger";
import { Exclude } from "class-transformer";
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { UserRoles } from "../enums/role.enum";
import { Product } from "src/products/entities/products.entity";
import { Favorite } from "src/favourites/entities/favourite.entity";
import { ProductBoosts } from "src/product-boost/entities/product-boost.entity";
import { UserBehaviours } from "src/user-behaviour/entities/userBehaviour.entity";
import { Reviews } from "src/reviews/entity/reviews.entity";
// import { Verification } from "./verification.entity";

export enum USERSTATUS {
  VERIFIED = "verified",
  NOT_VERIFIED = "not_verified",
}
/**
 * It describes the schema for user table in database.
 */
@Entity({ name: "users" })
export class User {
  /**
   * auto-generated unique uuid primary key for the table.
   */
  @PrimaryGeneratedColumn("uuid")
  @ApiProperty()
  id: string;

  /**
   * googleId of the user user for google auth.
   */
  @Column({ unique: true, default: null })
  @Exclude({ toPlainOnly: true })
  googleID: string;

  /**
   * firstName of user.
   */
  @Column({ length: 50 })
  @ApiProperty()
  firstName: string;

  /**
   * lastName of user.
   */
  @Column({ length: 50 })
  @ApiProperty()
  lastName: string;

  /**
   * email address of user.
   */
  @Column({ unique: true, length: 100 })
  @ApiProperty()
  email: string;
  @Column({ type: "varchar", nullable: true })
  @ApiProperty()
  image: string;
  @Column({ type: "varchar", nullable: true, default: "not_verified" })
  @ApiProperty()
  status: USERSTATUS.NOT_VERIFIED;
  @Column({ type: "int", default: 0 })
  @ApiProperty()
  rating: 0;
  /**
   * hashed password of user.
   */
  @Column({ nullable: true })
  @Exclude({ toPlainOnly: true })
  password: string;

  @Column({ nullable: true, type: "varchar" })
  address: string;
  @Column({ nullable: true, type: "varchar" })
  currency: string;
  @Column({ nullable: true, type: "varchar" })
  phone: string;

  /**
   * role of user. default is UserRoles.USER.
   */
  @Column("enum", { array: true, enum: UserRoles, default: `{${UserRoles.USER}}` })
  @ApiProperty({
    enum: UserRoles,
    default: [UserRoles.USER],
    description: `String array, containing enum values, either ${UserRoles.USER} or ${UserRoles.ADMIN}`,
  })
  roles: UserRoles[]; // NOTE: You can change the size to assign multiple roles to a single user.

  @Column({ type: "boolean", default: false })
  @ApiProperty({ default: false })
  isActive: boolean;

  @CreateDateColumn()
  @ApiProperty()
  createdAt: Date;

  /**
   * timestamp for date of user information updation.
   */
  @UpdateDateColumn()
  @ApiProperty()
  updatedAt: Date;

  /**
   * timestamp for date of user soft-delete
   */
  @DeleteDateColumn()
  @ApiProperty()
  deletedAt: Date;

  @OneToMany(() => Product, (product) => product.user)
  products: Product[];

  @OneToMany(() => Favorite, (favorite) => favorite.user)
  favorites: Favorite[];
  @OneToMany(() => UserBehaviours, (behaviour) => behaviour.user)
  behaviours: UserBehaviours[];
  @OneToMany(() => Reviews, (reviews) => reviews.user)
  reviews: UserBehaviours[];

  @OneToMany(() => ProductBoosts, (boost) => boost.user)
  boosts: ProductBoosts[];
}
