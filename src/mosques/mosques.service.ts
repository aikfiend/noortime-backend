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

interface PlacesResult {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: { location: { lat: number; lng: number } };
}

interface PlacesResponse {
  results: PlacesResult[];
  status: string;
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
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (apiKey) {
      return this.searchGooglePlaces(latitude, longitude, radiusM, apiKey);
    }

    // Fallback to OpenStreetMap Overpass API (no key required)
    return this.searchOverpass(latitude, longitude, radiusM / 1000);
  }

  private async searchGooglePlaces(
    lat: number,
    lng: number,
    radius: number,
    apiKey: string,
  ): Promise<Mosque[]> {
    const { data } = await axios.get<PlacesResponse>(
      'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
      {
        params: {
          location: `${lat},${lng}`,
          radius,
          type: 'mosque',
          key: apiKey,
        },
        timeout: 8_000,
      },
    );

    return data.results.map((place) => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      distance: Math.round(
        haversineKm(lat, lng, place.geometry.location.lat, place.geometry.location.lng) * 1000,
      ),
    }));
  }

  private async searchOverpass(lat: number, lng: number, radiusKm: number): Promise<Mosque[]> {
    const query = `
      [out:json][timeout:15];
      (
        node["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusKm * 1000},${lat},${lng});
        way["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusKm * 1000},${lat},${lng});
      );
      out center;
    `;

    const { data } = await axios.post<{
      elements: Array<{
        id: number;
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: { name?: string; 'addr:street'?: string; 'addr:city'?: string };
      }>;
    }>('https://overpass-api.de/api/interpreter', query, {
      headers: { 'Content-Type': 'text/plain' },
      timeout: 15_000,
    });

    return data.elements
      .map((el) => {
        const elLat = el.lat ?? el.center?.lat;
        const elLng = el.lon ?? el.center?.lon;
        if (!elLat || !elLng) return null;
        const tags = el.tags ?? {};
        const address = [tags['addr:street'], tags['addr:city']].filter(Boolean).join(', ');
        return {
          id: String(el.id),
          name: tags.name ?? 'Mosque',
          address: address || 'Address not available',
          lat: elLat,
          lng: elLng,
          distance: Math.round(haversineKm(lat, lng, elLat, elLng) * 1000),
        };
      })
      .filter((m): m is Mosque => m !== null)
      .sort((a, b) => a.distance - b.distance);
  }
}
