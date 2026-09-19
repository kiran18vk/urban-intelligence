export interface LocationSearchResult {
  label: string;
  address: string;
  lat: number;
  lng: number;
}

/**
 * Parses coordinate string in format "lat, lng" or "lat lng"
 */
export function parseCoordinates(query: string): LocationSearchResult | null {
  const trimmed = query.trim();
  const match = trimmed.match(/^([-+]?\d+(\.\d+)?)[,\s]+([-+]?\d+(\.\d+)?)$/);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[3]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return {
        label: `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        address: `Latitude: ${lat.toFixed(5)}, Longitude: ${lng.toFixed(5)}`,
        lat,
        lng,
      };
    }
  }
  return null;
}

// Simple in-memory cache to respect Nominatim rate limits & reduce redundant requests
const geocodeCache = new Map<string, LocationSearchResult[]>();

/**
 * Geocodes a search string using OpenStreetMap Nominatim API.
 * Triggered strictly on explicit user search action (Enter key or Search click).
 */
export async function searchLocations(query: string): Promise<LocationSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const cleanQuery = query.trim().toLowerCase();

  // Check if direct coordinates were provided
  const coordResult = parseCoordinates(query);
  if (coordResult) {
    return [coordResult];
  }

  // Return cached result if available
  if (geocodeCache.has(cleanQuery)) {
    return geocodeCache.get(cleanQuery)!;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query.trim()
    )}&limit=5`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'UrbanIntelligencePlatform-SIH2026/1.0',
        'Accept-Language': 'en',
      },
    });

    if (!res.ok) {
      throw new Error(`Nominatim API returned HTTP ${res.status}`);
    }

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const results: LocationSearchResult[] = data.map((item: any) => ({
        label: item.display_name ? item.display_name.split(',')[0] : query,
        address: item.display_name || query,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }));

      geocodeCache.set(cleanQuery, results);
      return results;
    }
  } catch (err) {
    console.warn('[LocationSearch] Geocoding request notice:', err instanceof Error ? err.message : err);
  }

  return [];
}
