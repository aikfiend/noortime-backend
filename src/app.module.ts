import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrayersModule } from './prayers/prayers.module';
import { StreaksModule } from './streaks/streaks.module';
import { MosquesModule } from './mosques/mosques.module';
import { QiblaModule } from './qibla/qibla.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    PrayersModule,
    StreaksModule,
    MosquesModule,
    QiblaModule,
  ],
})
export class AppModule {}
