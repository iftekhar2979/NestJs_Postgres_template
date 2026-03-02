// src/sizes/entities/size.entity.ts
import { ApiProperty } from "@nestjs/swagger";
import { Product } from "src/products/entities/products.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity("sizes")
export class Size {
  @ApiProperty({ example: 1, description: "Unique ID" })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: "XXL", description: "Size name" })
  @Column()
  type: string;

  @ApiProperty({ example: "64*22 MM", description: "Size description" })
  @Column()
  name: string;

  @OneToMany(() => Product, (variant) => variant.size)
  products: Product[];
}
