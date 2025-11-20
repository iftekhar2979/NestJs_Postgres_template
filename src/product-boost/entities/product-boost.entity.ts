import { Product } from "src/products/entities/products.entity";
import { User } from "src/user/entities/user.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { BOOSTSTATUS } from "../enum/Boosts.enum";

@Entity("product_boosts")
export class ProductBoosts {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.boosts, { eager: true })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Product, (product) => product.favorites, { eager: true })
  @JoinColumn({ name: "product_id" })
  product: Product;
  @Column("varchar", { default: BOOSTSTATUS.PENDING })
  status: BOOSTSTATUS;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;
}
