import { Controller, Get, Query } from '@nestjs/common';
import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { HolidaysService } from './holidays.service';

class HolidaysQuery {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(2020)
  @Max(2100)
  year?: number;
}

@Controller('holidays')
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}

  @Get()
  getHolidays(@Query() query: HolidaysQuery) {
    return this.holidaysService.getHolidays(query.year ?? new Date().getFullYear());
  }
}
