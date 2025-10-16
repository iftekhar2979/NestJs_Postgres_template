import { Module } from "@nestjs/common";
import { ConverterService } from "./currency-converter.service";

@Module({
  imports: [],

  providers: [ConverterService],
  exports: [ConverterService],
})
export class CurrencyConverterModule {}
