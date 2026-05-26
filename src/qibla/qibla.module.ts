import { Module } from '@nestjs/common';
import { QiblaController } from './qibla.controller';
import { QiblaService } from './qibla.service';

@Module({
  controllers: [QiblaController],
  providers: [QiblaService],
})
export class QiblaModule {}
