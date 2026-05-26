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

@Injectable()
export class MosquesService {
  async findNearby(latitude: number, longitude: number, radiusM = 5000): Promise<Mosque[]> {
    const radiusM_ = radiusM;
    const query = `
      [out:json][timeout:20];
      (
        node["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM_},${latitude},${longitude});
        way["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM_},${latitude},${longitude});
        relation["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM_},${latitude},${longitude});
      );
      out center;
    `;

    const { data } = await axios.post<{
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
    }>('https://overpass-api.de/api/interpreter', query, {
      headers: { 'Content-Type': 'text/plain' },
      timeout: 25_000,
    });

    return data.elements
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
  }
}
