// src/sizes/dto/update-size.dto.ts
import { PartialType } from "@nestjs/swagger";
import { CreateSizeDto } from "./create-sizes.dto";

export class UpdateSizeDto extends PartialType(CreateSizeDto) {}
