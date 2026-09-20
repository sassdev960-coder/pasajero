import { LatLng, RouteGeometry, PricingConfig } from '../types';
import { calculateRideFare } from './supabaseClient';

// ═══════════════════════════════════════════════════════════════
//  🔑 API KEY DE GEOAPIFY
//  Plan FREE: 3,000 requests/día
//  Soporta perfil 'motorcycle' que respeta sentidos de circulación
// ═══════════════════════════════════════════════════════════════
const GEOAPIFY_API_KEY = '9a279217b21c42ecb86c263aa94de872';

/**
 * Calcula rutas con cascada de intentos:
 *  1. Geoapify con perfil MOTORCYCLE (respeta sentidos, ideal para motos)
 *  2. Geoapify con perfil DRIVE (respaldo)
 *  3. OSRM con alternativas (respaldo gratis e ilimitado)
 *  4. Ruta interpolada (emergencia)
 */
export async function calculateRoute(origin: LatLng, destination: LatLng): Promise<RouteGeometry> {
  const isOriginValid = origin && typeof origin.lat === 'number' && !isNaN(origin.lat) && isFinite(origin.lat) &&
    typeof origin.lng === 'number' && !isNaN(origin.lng) && isFinite(origin.lng);
  const isDestValid = destination && typeof destination.lat === 'number' && !isNaN(destination.lat) && isFinite(destination.lat) &&
    typeof destination.lng === 'number' && !isNaN(destination.lng) && isFinite(destination.lng);

  if (!isOriginValid || !isDestValid) {
    return { coordinates: [], distanceKm: 0, durationMinutes: 0, summary: 'Ruta no disponible', steps: [] };
  }

  // ═══════════════════════════════════════════════════════════════
  //  1️⃣ GEOAPIFY — Perfil MOTORCYCLE (respeta sentidos de calles)
  // ═══════════════════════════════════════════════════════════════
  try {
    const geoMotoResult = await calculateRouteWithGeoapify(origin, destination, 'motorcycle');
    if (geoMotoResult && geoMotoResult.coordinates.length >= 2) {
      console.log('✅ Ruta calculada con Geoapify (motorcycle)');
      return geoMotoResult;
    }
  } catch (err) {
    console.warn('⚠️ Geoapify motorcycle falló:', err);
  }

  // ═══════════════════════════════════════════════════════════════
  //  2️⃣ GEOAPIFY — Perfil DRIVE (respaldo)
  // ═══════════════════════════════════════════════════════════════
  try {
    const geoDriveResult = await calculateRouteWithGeoapify(origin, destination, 'drive');
    if (geoDriveResult && geoDriveResult.coordinates.length >= 2) {
      console.log('✅ Ruta calculada con Geoapify (drive)');
      return geoDriveResult;
    }
  } catch (err) {
    console.warn('⚠️ Geoapify drive falló:', err);
  }

  // ═══════════════════════════════════════════════════════════════
  //  3️⃣ FALLBACK: OSRM con alternativas
  // ═══════════════════════════════════════════════════════════════
  try {
    const osrmResult = await calculateRouteWithOSRM(origin, destination);
    if (osrmResult && osrmResult.coordinates.length >= 2) {
      console.log('✅ Ruta calculada con OSRM (fallback)');
      return osrmResult;
    }
  } catch (err) {
    console.warn('⚠️ OSRM también falló:', err);
  }

  // ═══════════════════════════════════════════════════════════════
  //  4️⃣ ÚLTIMO RECURSO
  // ═══════════════════════════════════════════════════════════════
  console.log('⚠️ Usando ruta interpolada de emergencia');
  return generateInterpolatedRoadRoute(origin, destination);
}

// ═══════════════════════════════════════════════════════════════
//  GEOAPIFY — Perfiles motorcycle / drive / scooter
// ═══════════════════════════════════════════════════════════════
async function calculateRouteWithGeoapify(
  origin: LatLng,
  destination: LatLng,
  mode: 'motorcycle' | 'drive' | 'scooter' = 'motorcycle'
): Promise<RouteGeometry | null> {
  // Geoapify usa formato: waypoints=lat,lng|lat,lng
  const waypoints = `${origin.lat},${origin.lng}|${destination.lat},${destination.lng}`;

  const url = `https://api.geoapify.com/v1/routing?` +
    `waypoints=${waypoints}` +
    `&mode=${mode}` +
    `&units=metric` +
    `&lang=es` +
    `&type=balanced` +
    `&format=geojson` +
    `&apiKey=${GEOAPIFY_API_KEY}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`Geoapify [${mode}] error:`, response.status, errText.substring(0, 200));
      return null;
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      console.warn(`Geoapify [${mode}]: sin rutas`);
      return null;
    }

    const feature = data.features[0];
    const props = feature.properties || {};
    const geometry = feature.geometry;

    // Geoapify devuelve distance en metros y time en segundos
    const distanceMeters = Number(props.distance) || 0;
    const durationSeconds = Number(props.time) || 0;

    const distanceKm = Number((distanceMeters / 1000).toFixed(2));
    const durationMinutes = Math.max(2, Math.round(durationSeconds / 60));

    console.log(`🛣️ Geoapify [${mode}]: ${distanceKm} km, ${durationMinutes} min`);

    // Convertir coordenadas de [lng, lat] a [lat, lng] para Leaflet
    let rawCoords: [number, number][] = [];

    if (geometry.type === 'LineString') {
      rawCoords = (geometry.coordinates || [])
        .filter((c: any) => Array.isArray(c) && c.length >= 2 && !isNaN(c[0]) && !isNaN(c[1]))
        .map((c: [number, number]) => [c[1], c[0]]);
    } else if (geometry.type === 'MultiLineString') {
      // Aplanar todos los segmentos en una sola línea
      (geometry.coordinates || []).forEach((segment: any) => {
        if (Array.isArray(segment)) {
          segment.forEach((c: any) => {
            if (Array.isArray(c) && c.length >= 2 && !isNaN(c[0]) && !isNaN(c[1])) {
              rawCoords.push([c[1], c[0]]);
            }
          });
        }
      });
    }

    if (rawCoords.length < 2) return null;

    // Extraer instrucciones de navegación
    const steps: Array<{ instruction: string; distanceMeters: number; durationSeconds: number }> = [];

    if (props.legs && Array.isArray(props.legs)) {
      props.legs.forEach((leg: any) => {
        if (leg.steps && Array.isArray(leg.steps)) {
          leg.steps.forEach((step: any) => {
            const instructionText = 
              step.instruction?.text || 
              step.name || 
              'Continuar';
            
            steps.push({
              instruction: instructionText,
              distanceMeters: Math.round(Number(step.distance) || 0),
              durationSeconds: Math.round(Number(step.time) || 0)
            });
          });
        }
      });
    }

    // Si no hay steps, generar uno simple
    if (steps.length === 0) {
      steps.push({
        instruction: 'Continúa por la ruta indicada',
        distanceMeters: Math.round(distanceMeters),
        durationSeconds: Math.round(durationSeconds)
      });
    }

    return {
      coordinates: rawCoords,
      distanceKm,
      durationMinutes,
      summary: `Ruta moto más rápida (${mode === 'motorcycle' ? 'moto' : 'auto'})`,
      steps
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════
//  OSRM — Fallback
// ═══════════════════════════════════════════════════════════════
async function calculateRouteWithOSRM(origin: LatLng, destination: LatLng): Promise<RouteGeometry | null> {
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;

  const endpoints = [
    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true&annotations=true&alternatives=3&continue_straight=false`,
    `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true&alternatives=3&continue_straight=false`
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) continue;

      const data = await response.json();
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) continue;

      let bestRoute = data.routes[0];
      let bestDuration = Number(bestRoute.duration) || Infinity;
      for (const route of data.routes) {
        const dur = Number(route.duration);
        if (!isNaN(dur) && dur > 0 && dur < bestDuration) {
          bestDuration = dur;
          bestRoute = route;
        }
      }

      const rawCoords: [number, number][] = (bestRoute.geometry?.coordinates || [])
        .filter((c: any) => Array.isArray(c) && c.length >= 2 && !isNaN(c[0]) && !isNaN(c[1]))
        .map((c: [number, number]) => [c[1], c[0]]);

      if (rawCoords.length < 2) continue;

      const distanceKm = Number((bestRoute.distance / 1000).toFixed(2));
      const durationMinutes = Math.max(2, Math.round(bestRoute.duration / 60));

      const steps = bestRoute.legs?.[0]?.steps?.map((s: any) => {
        const maneuver = s.maneuver?.type || 'turn';
        const modifier = s.maneuver?.modifier || '';
        let actionText = 'Continuar por la vía';
        if (maneuver === 'depart') actionText = s.name ? `Salir por ${s.name}` : 'Iniciar recorrido';
        else if (maneuver === 'arrive') actionText = 'Llegada a tu destino';
        else if (maneuver === 'roundabout' || maneuver === 'rotary') actionText = `Entrar a la rotonda hacia ${s.name || 'vía'}`;
        else if (modifier.includes('right')) actionText = `Girar a la derecha ${s.name ? 'por ' + s.name : ''}`;
        else if (modifier.includes('left')) actionText = `Girar a la izquierda ${s.name ? 'por ' + s.name : ''}`;
        else if (modifier.includes('uturn')) actionText = `Retorno en U ${s.name ? 'por ' + s.name : ''}`;
        else if (s.name) actionText = `Continuar por ${s.name}`;
        return {
          instruction: actionText,
          distanceMeters: Math.round(s.distance),
          durationSeconds: Math.round(s.duration)
        };
      }) || [];

      return {
        coordinates: rawCoords,
        distanceKm,
        durationMinutes,
        summary: `Ruta OSRM (${data.routes.length} opciones)`,
        steps
      };
    } catch (err) {
      console.warn('OSRM endpoint falló:', err);
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
//  Fallback final
// ═══════════════════════════════════════════════════════════════
function generateInterpolatedRoadRoute(origin: LatLng, destination: LatLng): RouteGeometry {
  if (
    !origin || !destination ||
    isNaN(origin.lat) || isNaN(origin.lng) || !isFinite(origin.lat) || !isFinite(origin.lng) ||
    isNaN(destination.lat) || isNaN(destination.lng) || !isFinite(destination.lat) || !isFinite(destination.lng)
  ) {
    return { coordinates: [], distanceKm: 0, durationMinutes: 0, summary: 'Coordenadas no válidas', steps: [] };
  }

  const points: [number, number][] = [];
  const stepsCount = 18;
  const dLat = destination.lat - origin.lat;
  const dLng = destination.lng - origin.lng;

  for (let i = 0; i <= stepsCount; i++) {
    const t = i / stepsCount;
    const curveOffset = Math.sin(t * Math.PI) * 0.003;
    const lat = origin.lat + dLat * t + (t < 0.5 ? curveOffset : -curveOffset * 0.5);
    const lng = origin.lng + dLng * t + (t > 0.5 ? curveOffset * 0.7 : 0);
    points.push([lat, lng]);
  }

  const linearDistKm = calculateHaversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
  const roadFactor = 1.32;
  const distanceKm = Number((linearDistKm * roadFactor).toFixed(2));
  const durationMinutes = Math.max(3, Math.round((distanceKm / 26) * 60));

  return {
    coordinates: points,
    distanceKm,
    durationMinutes,
    summary: 'Ruta estimada (sin conexión)',
    steps: [
      { instruction: 'Iniciar recorrido en dirección al destino', distanceMeters: Math.round(distanceKm * 300), durationSeconds: 120 },
      { instruction: 'Continuar por la avenida principal', distanceMeters: Math.round(distanceKm * 400), durationSeconds: 180 },
      { instruction: 'Llegada al punto de destino', distanceMeters: Math.round(distanceKm * 300), durationSeconds: 120 }
    ]
  };
}

export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateFare(
  distanceKm: number,
  hasCargo: boolean,
  config?: PricingConfig
): {
  motoFare: number;
  expressFare: number;
  cargoExtra: number;
  total: number;
  breakdown: string;
} {
  const result = calculateRideFare(distanceKm, hasCargo, config);
  return {
    motoFare: result.motoFare,
    expressFare: result.expressFare,
    cargoExtra: result.cargoExtra,
    total: result.total,
    breakdown: result.breakdown
  };
}
