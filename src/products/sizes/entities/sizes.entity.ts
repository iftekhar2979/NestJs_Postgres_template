import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";
@Entity("sizes")
export class Size {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar" })
  type: string;

  @Column({ type: "varchar" })
  name: string;

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt: Date;

  // Relationships
  // @OneToMany(() => Product, (product) => product.size)
  // products: Product[];
}
