import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { User } from "src/user/entities/user.entity"; // Adjust the import path to your actual User entity
import { Product } from "src/products/entities/products.entity";

@Entity("favorites")
export class Favorite {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.favorites, { eager: true })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Product, (product) => product.favorites, { eager: true })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;
}
