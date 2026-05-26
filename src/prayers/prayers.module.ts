import { Module } from '@nestjs/common';
import { PrayersController } from './prayers.controller';
import { PrayersService } from './prayers.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [PrayersController],
  providers: [PrayersService],
})
export class PrayersModule {}
