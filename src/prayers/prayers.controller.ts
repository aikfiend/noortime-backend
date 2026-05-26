import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { PrayersService } from './prayers.service';
import { UsersService, User } from '../users/users.service';
import { BadRequestException } from '@nestjs/common';

class LocationQuery {
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  lat!: number;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  lng!: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  method?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  school?: number;
}

class MonthQuery extends LocationQuery {
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(2020)
  @Max(2100)
  year!: number;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}

async function resolveLocation(
  req: Request,
  usersService: UsersService,
  query: LocationQuery,
): Promise<{ lat: number; lng: number; method: number; school: number }> {
  // Query params override saved location
  if (query.lat !== undefined && query.lng !== undefined) {
    return {
      lat: query.lat,
      lng: query.lng,
      method: query.method ?? 2,
      school: query.school ?? 0,
    };
  }

  const user = req.user as User | undefined;
  if (user) {
    const [location, prefs] = await Promise.all([
      usersService.getLocation(user.id),
      usersService.getPreferences(user.id),
    ]);
    if (location) {
      return {
        lat: Number(location.latitude),
        lng: Number(location.longitude),
        method: prefs?.calculation_method ?? 2,
        school: prefs?.madhab ?? 0,
      };
    }
  }

  throw new BadRequestException('Provide lat/lng query parameters or save a location first');
}

@Controller('prayers')
export class PrayersController {
  constructor(
    private readonly prayersService: PrayersService,
    private readonly usersService: UsersService,
  ) {}

  @Get('today')
  async today(@Req() req: Request, @Query() query: LocationQuery) {
    const { lat, lng, method, school } = await resolveLocation(req, this.usersService, query);
    return this.prayersService.getToday(lat, lng, method, school);
  }

  @Get('week')
  async week(@Req() req: Request, @Query() query: LocationQuery) {
    const { lat, lng, method, school } = await resolveLocation(req, this.usersService, query);
    return this.prayersService.getWeek(lat, lng, method, school);
  }

  @Get('month')
  @UseGuards(AuthenticatedGuard)
  async month(@Req() req: Request, @Query() query: MonthQuery) {
    const { lat, lng, method, school } = await resolveLocation(req, this.usersService, query);
    return this.prayersService.getMonth(lat, lng, method, school, query.year, query.month);
  }
}
