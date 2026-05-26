import { Controller, Get, Query } from '@nestjs/common';
import { IsNumber, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { MosquesService } from './mosques.service';

class MosquesQuery {
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  lat!: number;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  lng!: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  radius?: number;
}

@Controller('mosques')
export class MosquesController {
  constructor(private readonly mosquesService: MosquesService) {}

  @Get()
  findNearby(@Query() query: MosquesQuery) {
    return this.mosquesService.findNearby(query.lat, query.lng, query.radius ?? 5000);
  }
}
