import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface Mosque {
  id: string;
  name: string;
  address: string;
  distance: number;
  lat: number;
  lng: number;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Round coords to ~1km grid so nearby searches share a cache entry
function cacheKey(lat: number, lng: number, radiusM: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)},${radiusM}`;
}

// Mirrors tried in order; first to respond wins. AWS blocks some mirrors
// intermittently so the fallback chain keeps the feature alive.
const OVERPASS_MIRRORS = [
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const TTL_MS = 10 * 60 * 1000; // 10 minutes

type OverpassResponse = {
  elements: Array<{
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: {
      name?: string;
      'name:en'?: string;
      'addr:street'?: string;
      'addr:city'?: string;
      'addr:housenumber'?: string;
    };
  }>;
};

@Injectable()
export class MosquesService {
  private readonly cache = new Map<string, { ts: number; data: Mosque[] }>();

  async findNearby(latitude: number, longitude: number, radiusM = 5000): Promise<Mosque[]> {
    const key = cacheKey(latitude, longitude, radiusM);
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.ts < TTL_MS) {
      return cached.data;
    }

    const query = `
      [out:json][timeout:20];
      (
        node["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM},${latitude},${longitude});
        way["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM},${latitude},${longitude});
        relation["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM},${latitude},${longitude});
      );
      out center;
    `;

    const headers = {
      'Content-Type': 'text/plain',
      'User-Agent': 'NoorTime/1.0 (https://noortime.fiend.services)',
    };

    let data: OverpassResponse | null = null;
    for (const mirror of OVERPASS_MIRRORS) {
      try {
        const res = await axios.post<OverpassResponse>(mirror, query, {
          headers,
          timeout: 10_000,
        });
        data = res.data;
        break;
      } catch {
        // try next mirror
      }
    }

    if (!data) {
      throw new Error('All Overpass mirrors failed');
    }

    const mosques = data.elements
      .map((el) => {
        const elLat = el.lat ?? el.center?.lat;
        const elLng = el.lon ?? el.center?.lon;
        if (!elLat || !elLng) return null;
        const tags = el.tags ?? {};
        const name = tags['name:en'] ?? tags.name ?? 'Mosque';
        const addressParts = [
          tags['addr:housenumber'],
          tags['addr:street'],
          tags['addr:city'],
        ].filter(Boolean);
        return {
          id: String(el.id),
          name,
          address: addressParts.length ? addressParts.join(', ') : 'Address not available',
          lat: elLat,
          lng: elLng,
          distance: Math.round(haversineKm(latitude, longitude, elLat, elLng) * 1000),
        };
      })
      .filter((m): m is Mosque => m !== null)
      .sort((a, b) => a.distance - b.distance);

    this.cache.set(key, { ts: Date.now(), data: mosques });
    return mosques;
  }
}
