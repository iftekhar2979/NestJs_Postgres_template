import { IsString, IsBoolean, IsDecimal, IsArray, IsOptional, IsNumber } from "class-validator";

export class CreateServiceDto {
  @IsNumber()
  serviceID: number;
  @IsNumber()
  quoteID: number;
  @IsNumber()
  order_id: number;

  @IsString()
  serviceName: string;

  @IsString()
  carrierName: string;

  @IsNumber()
  chargeableWeight: number;

  @IsString()
  transitTimeEstimate: string;

  @IsString()
  sameDayCollectionCutOffTime: string;

  @IsBoolean()
  isWarehouseService: boolean;

  @IsNumber()
  totalCostNetWithCollection: number;

  @IsNumber()
  totalCostNetWithoutCollection: number;

  @IsNumber()
  totalCostGrossWithCollection: number;

  @IsNumber()
  totalCostGrossWithoutCollection: number;

  @IsArray()
  servicePriceBreakdown: {
    code: string;
    description: string;
    cost: number;
  }[];

  @IsArray()
  collectionOptions: {
    collectionOptionTitle: string;
    collectionCharge: number;
    sameDayCollectionCutOffTime: string;
  }[];

  @IsBoolean()
  signatureRequiredAvailable: boolean;

  @IsString()
  serviceType: string;

  @IsOptional()
  @IsArray()
  optionalExtras?: { [key: string]: any };
}
