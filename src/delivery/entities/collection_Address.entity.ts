import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from "typeorm";

import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { Product } from "src/products/entities/products.entity";
//       "name": "John Doe",
//       "company_name": "Bloom & Petal Florists",
// "email": "emily.thompson@example.co.uk",
// "telephone": "+447911123456",
// "address": "221B Baker Street",
// "house_number": "221B",
// "address_2": "",
// "city": "London",
// "country": "GB",
// "postal_code": "NW1 6XE",
@Entity("collection_address")
export class CollectionAddress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("varchar", { nullable: true })
  name: string;

  @Column("varchar", { nullable: true })
  company_name: string;

  @Column("varchar")
  email: string;

  @Column("varchar")
  telephone: string;

  @Column("varchar")
  address: string;

  @Column("varchar")
  house_number: string;

  @Column("varchar")
  address_2: string;
  @Column("varchar")
  city: string;

  @ApiProperty({ example: "Bangladesh", description: "County" })
  @IsString()
  @Column("varchar", { nullable: true })
  country: string;
  @ApiProperty({ example: "", description: "Postal code" })
  @IsString()
  @Column("varchar", { nullable: true })
  postal_code: string;

  // 🧩 One-to-one relation with Product
  @OneToOne(() => Product, (product) => product.collectionAddress, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "product_id" }) // creates `product_id` FK column
  product: Product;
}
