import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface QiblaResult {
  latitude: number;
  longitude: number;
  direction: number;
}

@Injectable()
export class QiblaService {
  async getDirection(latitude: number, longitude: number): Promise<QiblaResult> {
    const { data } = await axios.get<{ data: QiblaResult }>(
      `https://api.aladhan.com/v1/qibla/${latitude}/${longitude}`,
      { timeout: 6_000 },
    );
    return data.data;
  }
}
