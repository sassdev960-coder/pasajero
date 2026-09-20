import { LatLng, RouteGeometry, PricingConfig } from '../types';
import { calculateRideFare } from './supabaseClient';

// ═══════════════════════════════════════════════════════════════
//  🔑 API KEY DE GRAPHHOPPER
//  IMPORTANTE: Cambiar por una nueva si esta se filtra
// ═══════════════════════════════════════════════════════════════
const GRAPHHOPPER_API_KEY = 'e27ed9b8-bf70-4eda-b69a-0127b801a78a';

/**
 * Calcula rutas usando GraphHopper (perfil moto) con fallback a OSRM.
 * GraphHopper respeta sentidos reales en Bolivia y tiene instrucciones en español.
 */
export async function calculateRoute(origin: LatLng, destination: LatLng): Promise<RouteGeometry> {
  const isOriginValid = origin && typeof origin.lat === 'number' && !isNaN(origin.lat) && isFinite(origin.lat) &&
    typeof origin.lng === 'number' && !isNaN(origin.lng) && isFinite(origin.lng);
  const isDestValid = destination && typeof destination.lat === 'number' && !isNaN(destination.lat) && isFinite(destination.lat) &&
    typeof destination.lng === 'number' && !isNaN(destination.lng) && isFinite(destination.lng);

  if (!isOriginValid || !isDestValid) {
    return {
      coordinates: [],
      distanceKm: 0,
      durationMinutes: 0,
      summary: 'Ruta no disponible',
      steps: []
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  1️⃣ INTENTO CON GRAPHHOPPER (perfil MOTORCYCLE)
  // ═══════════════════════════════════════════════════════════════
  try {
    const ghResult = await calculateRouteWithGraphHopper(origin, destination);
    if (ghResult && ghResult.coordinates.length >= 2) {
      console.log('✅ Ruta calculada con GraphHopper (moto)');
      return ghResult;
    }
  } catch (err) {
    console.warn('⚠️ GraphHopper falló, intentando con OSRM...', err);
  }

  // ═══════════════════════════════════════════════════════════════
  //  2️⃣ FALLBACK: OSRM con alternativas
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
  //  3️⃣ ÚLTIMO RECURSO: Ruta interpolada (línea recta)
  // ═══════════════════════════════════════════════════════════════
  console.log('⚠️ Usando ruta interpolada de emergencia');
  return generateInterpolatedRoadRoute(origin, destination);
}

// ═══════════════════════════════════════════════════════════════
//  GRAPHHOPPER — Motor principal (perfil MOTORCYCLE)
// ═══════════════════════════════════════════════════════════════
async function calculateRouteWithGraphHopper(origin: LatLng, destination: LatLng): Promise<RouteGeometry | null> {
  // GraphHopper usa formato LAT,LNG (no LNG,LAT como OSRM)
  const points = `${origin.lat},${origin.lng}&point=${destination.lat},${destination.lng}`;

  const url = `https://graphhopper.com/api/1/route?` +
    `point=${points}` +
    `&profile=motorcycle` +         // 🏍️ Perfil moto
    `&locale=es` +                   // Instrucciones en español
    `&instructions=true` +
    `&calc_points=true` +
    `&points_encoded=false` +        // Devolver GeoJSON plano
    `&algorithm=alternative_route` + // Pedir alternativas
    `&alternative_route.max_paths=3` +
    `&alternative_route.max_weight_factor=1.5` +
    `&alternative_route.max_share_factor=0.6` +
    `&key=${GRAPHHOPPER_API_KEY}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(timeoutId);

  if (!response.ok) {
    const errText = await response.text();
    console.warn('GraphHopper error:', response.status, errText.substring(0, 200));
    return null;
  }

  const data = await response.json();

  if (!data.paths || data.paths.length === 0) {
    console.warn('GraphHopper: sin rutas');
    return null;
  }

  // Log de rutas disponibles
  console.log(`🛣️ GraphHopper devolvió ${data.paths.length} ruta(s):`);
  data.paths.forEach((p: any, idx: number) => {
    console.log(`   Ruta ${idx + 1}: ${(p.distance / 1000).toFixed(2)} km, ${(p.time / 60000).toFixed(1)} min`);
  });

  // Elegir la de menor TIEMPO (ms) — GraphHopper ya prioriza la más rápida
  let bestPath = data.paths[0];
  let bestTime = Number(bestPath.time) || Infinity;

  for (const path of data.paths) {
    const time = Number(path.time);
    if (!isNaN(time) && time > 0 && time < bestTime) {
      bestTime = time;
      bestPath = path;
    }
  }

  console.log(`   ✅ Elegida: ${(bestPath.distance / 1000).toFixed(2)} km, ${(bestPath.time / 60000).toFixed(1)} min`);

  // Convertir coordenadas de [lng, lat] a [lat, lng] para Leaflet
  const rawCoords: [number, number][] = (bestPath.points?.coordinates || [])
    .filter((c: any) => Array.isArray(c) && c.length >= 2 && !isNaN(c[0]) && !isNaN(c[1]))
    .map((c: [number, number]) => [c[1], c[0]]);

  if (rawCoords.length < 2) return null;

  const distanceKm = Number((bestPath.distance / 1000).toFixed(2));
  const durationMinutes = Math.max(2, Math.round(bestPath.time / 60000));

  // GraphHopper ya devuelve las instrucciones en español, solo hay que mapearlas
  const steps = (bestPath.instructions || []).map((instr: any) => ({
    instruction: instr.text || 'Continuar',
    distanceMeters: Math.round(instr.distance || 0),
    durationSeconds: Math.round((instr.time || 0) / 1000)
  }));

  return {
    coordinates: rawCoords,
    distanceKm,
    durationMinutes,
    summary: `Ruta más rápida (${data.paths.length} opciones)`,
    steps
  };
}

// ═══════════════════════════════════════════════════════════════
//  OSRM — Fallback (con alternativas)
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

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
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
      }
    } catch (err) {
      console.warn('OSRM endpoint falló:', err);
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
//  Fallback final: interpolación en línea recta
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
