import { ProductVariant } from "src/products/varients/entities/productVarient.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity("product_colors")
export class ProductColor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "varchar", nullable: true })
  image: string;

  // Inverse side of ProductVariant.color
  // lazy: true avoids circular eager-load issues
  @OneToMany(() => ProductVariant, (variant) => variant.color, { lazy: true })
  variants: Promise<ProductVariant[]>;
}
