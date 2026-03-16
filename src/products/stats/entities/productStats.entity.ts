import { Product } from "src/products/entities/products.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("product_stats")
export class ProductStats {
    
    @PrimaryGeneratedColumn('uuid')
    id: string;
    @Column({ type: "int" })
    product_id: number;
    @Column({type:'int',default:0})
    average_rating: number;
    @Column({type:'int',default:0})
    total_views: number;
    @Column({type:'int',default:0})
    total_reviews: number;
    @Column({type:'int',default:0})
    total_sales: number;
    @Column({type:'decimal', precision: 12, scale: 2, default: 0})
    total_revenue: number;
    @Column({type:'timestamp with time zone', nullable: true})
    last_purchased_at: Date;
    @OneToOne(()=>Product,(prod)=>prod.stats ,  { onDelete: "CASCADE" })
    @JoinColumn({name:'product_id'})
    product: Product;

    @CreateDateColumn({ type: "timestamp with time zone" })
    created_at: Date;

    @UpdateDateColumn({ type: "timestamp with time zone" })
    updated_at: Date;
      
}