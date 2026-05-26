import { Controller, Get, Query } from '@nestjs/common';
import { IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { QiblaService } from './qibla.service';

class QiblaQuery {
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  lat!: number;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  lng!: number;
}

@Controller('qibla')
export class QiblaController {
  constructor(private readonly qiblaService: QiblaService) {}

  @Get()
  getDirection(@Query() query: QiblaQuery) {
    return this.qiblaService.getDirection(query.lat, query.lng);
  }
}
