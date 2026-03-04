import { Product } from "src/products/entities/products.entity";
import { User } from "src/user/entities/user.entity";
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("reviews")
export class Review {
     @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    user_id: string;
    @OneToMany(() => User, (user) => user.reviews)
    user: User;

    @Column()
    product_id: string;
    @OneToMany(() => Product, (product) => product.reviews)
    product: Product;

    @Column({type:'int'})
    rating: number;

    @Column({type:'varchar'})
    comment: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}