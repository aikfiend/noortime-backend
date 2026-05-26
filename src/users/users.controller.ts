import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { User, UsersService } from './users.service';
import { UpdateLocationDto, UpdatePreferencesDto } from './dto/update-preferences.dto';

@Controller('users')
@UseGuards(AuthenticatedGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getProfile(@Req() req: Request) {
    const user = req.user as User;
    return this.usersService.getProfile(user.id);
  }

  @Put('me/location')
  updateLocation(@Req() req: Request, @Body() dto: UpdateLocationDto) {
    const user = req.user as User;
    return this.usersService.upsertLocation(user.id, dto);
  }

  @Put('me/preferences')
  updatePreferences(@Req() req: Request, @Body() dto: UpdatePreferencesDto) {
    const user = req.user as User;
    return this.usersService.upsertPreferences(user.id, dto);
  }
}
