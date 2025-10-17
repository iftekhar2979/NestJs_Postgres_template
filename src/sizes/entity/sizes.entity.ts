// src/sizes/entities/size.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

@Entity("sizes")
export class Size {
  @ApiProperty({ example: 1, description: "Unique ID" })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: "XXL", description: "Size name" })
  @Column()
  size: string;

  @ApiProperty({ example: "64*22 MM", description: "Size description" })
  @Column()
  description: string;
}
