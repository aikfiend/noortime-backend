import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { IsDateString, IsIn } from 'class-validator';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { StreaksService } from './streaks.service';
import { User } from '../users/users.service';

const TRACKABLE = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
type TrackablePrayer = (typeof TRACKABLE)[number];

class MarkPrayerDto {
  @IsDateString()
  date!: string;

  @IsIn(TRACKABLE)
  prayer!: TrackablePrayer;
}

@Controller('streaks')
@UseGuards(AuthenticatedGuard)
export class StreaksController {
  constructor(private readonly streaksService: StreaksService) {}

  @Get('stats')
  getStats(@Req() req: Request) {
    const user = req.user as User;
    return this.streaksService.getStats(user.id);
  }

  @Get('heatmap')
  getHeatmap(@Req() req: Request, @Query('days') days?: string) {
    const user = req.user as User;
    return this.streaksService.getHeatmap(user.id, days ? parseInt(days, 10) : 365);
  }

  @Get(':date')
  getDayCompletion(@Req() req: Request, @Param('date') date: string) {
    const user = req.user as User;
    return this.streaksService.getDayCompletion(user.id, date);
  }

  @Post('mark')
  markPrayer(@Req() req: Request, @Body() dto: MarkPrayerDto) {
    const user = req.user as User;
    return this.streaksService.markPrayer(user.id, dto.date, dto.prayer);
  }

  @Delete('mark')
  unmarkPrayer(@Req() req: Request, @Body() dto: MarkPrayerDto) {
    const user = req.user as User;
    return this.streaksService.unmarkPrayer(user.id, dto.date, dto.prayer);
  }
}
