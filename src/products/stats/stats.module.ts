import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductStats } from './entities/productStats.entity';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports:[TypeOrmModule.forFeature([ProductStats])],
  controllers: [StatsController],
  providers: [StatsService],
  exports:[StatsService]
})
export class StatsModule {}
