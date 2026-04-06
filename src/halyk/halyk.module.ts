import { Module } from '@nestjs/common';
import { HalykService } from './halyk.service';
import { HalykController } from './halyk.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [HalykService],
  controllers: [HalykController],
  exports: [HalykService],
})
export class HalykModule {}
