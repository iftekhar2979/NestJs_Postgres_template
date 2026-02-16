import { ApiProperty } from "@nestjs/swagger";
import { Exclude } from "class-transformer";
import { Favorite } from "src/favourites/entities/favourite.entity";
import { ProductBoosts } from "src/product-boost/entities/product-boost.entity";
import { Product } from "src/products/entities/products.entity";
import { Reviews } from "src/reviews/entity/reviews.entity";
import { UserBehaviours } from "src/user-behaviour/entities/userBehaviour.entity";
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { UserRoles } from "../enums/role.enum";
import { UserAddress } from "./userAddresses.entity";
// import { Verification } from "./verification.entity";

export enum USERSTATUS {
  VERIFIED = "verified",
  NOT_VERIFIED = "not_verified",
}
@Entity({ name: "users" })
@Index(["email"], { unique: true })
export class User {
  @PrimaryGeneratedColumn("uuid")
  @ApiProperty()
  id: string;

  @Column({ unique: true, default: null })
  @Exclude({ toPlainOnly: true })
  googleID: string;

  @Column({ length: 50 })
  @ApiProperty()
  firstName: string;

  @Column({ length: 50 })
  @ApiProperty()
  lastName: string;

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
  @Column({ nullable: true })
  @Exclude({ toPlainOnly: true })
  password: string;

  @Column({ nullable: true, type: "varchar" })
  address: string;
  @Column({ nullable: true, type: "varchar" })
  currency: string;
  @Column({ nullable: true, type: "varchar" })
  fcm: string;
  @Column({ nullable: true, type: "varchar" })
  phone: string;

  @Column("enum", { array: true, enum: UserRoles, default: `{${UserRoles.USER}}` })
  @ApiProperty({
    enum: UserRoles,
    default: [UserRoles.USER],
    description: `String array, containing enum values, either ${UserRoles.USER} or ${UserRoles.ADMIN}`,
  })
  roles: UserRoles[];

  @Column({ type: "boolean", default: false })
  @ApiProperty({ default: false })
  isActive: boolean;

  @CreateDateColumn()
  @ApiProperty()
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt: Date;

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
  @OneToOne(() => UserAddress, (address) => address.user, { cascade: true })
  addressDetails: UserAddress;
}
