import { LatLng } from '../types';
import { POPULAR_LANDMARKS } from '../data/landmarks';
import { calculateHaversineDistance } from './routingService';

/**
 * Reverse geocodes a location into a human-friendly address and nearest reference point
 */
export async function reverseGeocode(lat: number, lng: number): Promise<{ address: string; landmark?: string }> {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
    return { address: 'Ubicación seleccionada' };
  }

  // First check if within 250 meters of any known famous landmark
  const closestLandmark = POPULAR_LANDMARKS.map(l => ({
    landmark: l,
    distKm: calculateHaversineDistance(lat, lng, l.lat, l.lng)
  })).sort((a, b) => a.distKm - b.distKm)[0];

  let landmarkRef = '';
  if (closestLandmark && closestLandmark.distKm < 0.35) {
    landmarkRef = closestLandmark.landmark.name;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'es',
        'User-Agent': 'MotoCampeonApp/1.0'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const road = addr.road || addr.pedestrian || addr.street || addr.neighbourhood || addr.suburb;
      const suburb = addr.suburb || addr.city_district || addr.district || addr.city || '';
      
      let formatted = road ? (suburb ? `${road}, ${suburb}` : road) : data.display_name?.split(',').slice(0, 2).join(',') || '';
      
      if (!formatted || formatted.length < 3) {
        formatted = `Ubicación (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      }

      return {
        address: formatted,
        landmark: landmarkRef || (addr.amenity || addr.shop || addr.building || undefined)
      };
    }
  } catch (err) {
    console.warn('Reverse geocode fallback:', err);
  }

  // Graceful fallback
  if (closestLandmark && closestLandmark.distKm < 1.0) {
    return {
      address: `Cerca de ${closestLandmark.landmark.name}`,
      landmark: closestLandmark.landmark.name
    };
  }

  return {
    address: `Calle en coordenadas ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    landmark: landmarkRef || undefined
  };
}

/**
 * Searches for places, addresses or reference points matching query text
 */
export async function searchPlaces(query: string, proximity?: LatLng): Promise<Array<{
  name: string;
  address: string;
  lat: number;
  lng: number;
  category?: string;
}>> {
  const cleanQ = query.toLowerCase().trim();
  if (!cleanQ) return [];

  // Match local landmarks first (instant response)
  const localMatches = POPULAR_LANDMARKS.filter(l => 
    l.name.toLowerCase().includes(cleanQ) || 
    l.address.toLowerCase().includes(cleanQ) ||
    l.category.toLowerCase().includes(cleanQ)
  ).map(l => ({
    name: l.name,
    address: l.address,
    lat: l.lat,
    lng: l.lng,
    category: l.category
  }));

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const viewbox = proximity 
      ? `&viewbox=${proximity.lng - 0.2},${proximity.lat + 0.2},${proximity.lng + 0.2},${proximity.lat - 0.2}&bounded=0`
      : '';
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1&countrycodes=bo${viewbox}`;

    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'es',
        'User-Agent': 'MotoCampeonApp/1.0'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const onlineResults = (Array.isArray(data) ? data : [])
        .map((item: any) => {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          return {
            name: item.name || (item.display_name ? item.display_name.split(',')[0] : 'Lugar'),
            address: item.display_name ? item.display_name.split(',').slice(1, 3).join(', ').trim() : '',
            lat,
            lng,
            category: item.type || 'lugar'
          };
        })
        .filter(item => !isNaN(item.lat) && !isNaN(item.lng) && isFinite(item.lat) && isFinite(item.lng));

      // Combine local landmarks + online results, avoiding exact coordinate duplicates
      const combined = [...localMatches];
      for (const online of onlineResults) {
        const alreadyExists = combined.some(c => 
          Math.abs(c.lat - online.lat) < 0.001 && Math.abs(c.lng - online.lng) < 0.001
        );
        if (!alreadyExists) {
          combined.push(online);
        }
      }

      return combined.slice(0, 8);
    }
  } catch (err) {
    console.warn('Online place search error, using local landmarks:', err);
  }

  return localMatches;
}

/**
 * Fallback to IP-based approximate location when browser geolocation is denied or slow
 */
export async function detectUserLocationViaIP(): Promise<{ lat: number; lng: number; city: string; country: string } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    // Free IP geolocation with SSL and high uptime
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const lat = Number(data.latitude);
      const lng = Number(data.longitude);
      if (
        typeof lat === 'number' && !isNaN(lat) && isFinite(lat) &&
        typeof lng === 'number' && !isNaN(lng) && isFinite(lng) &&
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
      ) {
        return {
          lat,
          lng,
          city: data.city || 'Tu Ciudad',
          country: data.country_name || ''
        };
      }
    }
  } catch (err) {
    console.warn('IP location fetch failed:', err);
  }
  return null;
}

