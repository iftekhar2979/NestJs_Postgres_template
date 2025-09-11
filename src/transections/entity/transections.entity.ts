import { ApiProperty } from "@nestjs/swagger";
import { Order } from "src/orders/entities/order.entity";
import { PaymentStatus } from "src/orders/enums/orderStatus";
import { User } from "src/user/entities/user.entity";
import { Wallets } from "src/wallets/entity/wallets.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { TransectionType } from "../enums/transectionTypes";
import { Product } from "src/products/entities/products.entity";

@Entity("transections") 
export class Transections {
     @ApiProperty({ example: 1, description: 'Unique ID of the offer' })
      @PrimaryGeneratedColumn()
      id: number;
      @ApiProperty({ example: 'uuid-of-user', description: ' user ID' })
      @Column()
      user_id: string;
      @ApiProperty({ example: 'Id of Order', description: ' Order Id' })
      @Column({nullable:true})
      order_id: number;
      @ApiProperty({ example: 'Id of Order', description: ' Order Id' })
       @Column({nullable:true})
      product_id: number;
      @ApiProperty({ example: 'wallet Id of user', description: ' Wallet Id' })
      @Column()
      wallet_id: number; 
      @ApiProperty({ example: 99.99, description: 'Amount ' })
      @Column('decimal', { precision: 10, scale: 2 })
      amount: number;
      @ApiProperty({ example: 'CREDIT', description: 'Type of transection', enum: TransectionType })
      @Column({ type: 'enum', enum: TransectionType })
      transection_type: TransectionType;
      @ApiProperty({ example: 'Transection id', description: ' Transection Id Of Payments' })
      @Column()
      paymentId:string;
      @ApiProperty({ example: 'Payment Methods ', description: ' Payments Methods' })
      @Column()
      paymentMethod:string;
      @ApiProperty({ example: PaymentStatus.COMPLETED, description: ' Payments Methods' })
      @Column()
      status:PaymentStatus;
       @ManyToOne(() => User, { onDelete:'CASCADE'})
       @JoinColumn({ name: 'user_id' }) 
        user: User;
       @ManyToOne(() => Wallets, { onDelete: 'CASCADE' })
       @JoinColumn({ name: 'wallet_id' })
        wallet: Wallets;
      @ManyToOne(() => Order, { onDelete: 'CASCADE', nullable: true })
      @JoinColumn({ name: 'order_id' })
      order: Order;
      @ManyToOne(() => Product, { onDelete: 'CASCADE', nullable: true })
      @JoinColumn({ name: 'product_id' })
      product: Product;
      @ApiProperty({ description: 'Timestamp when the offer was created' })
       @CreateDateColumn({ type: 'timestamp with time zone' })
      created_at: Date;    
      @ApiProperty({ description: 'Timestamp when the offer was last updated' })
      @UpdateDateColumn({ type: 'timestamp with time zone' })
      updated_at: Date;

        
} 