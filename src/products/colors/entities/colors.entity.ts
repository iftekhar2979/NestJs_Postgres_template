import { Product } from "src/products/entities/products.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity("product_colors")
export class ProductColor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "varchar", nullable: true })
  image: string;

  // Relationships
  @OneToMany(() => Product, (product) => product.color)
  products: Product[];
}
