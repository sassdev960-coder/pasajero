// src/services/supabaseClient.ts — VERSIÓN v7 (delete passenger account)
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseRide, SupabaseDriver, SupabasePassenger, LatLng, PricingConfig, DriverViewInfo } from '../types';

const DEFAULT_SUPABASE_URL = 'https://uwdojchfwmaczgdthtfr.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3ZG9qY2hmd21hY3pnZHRodGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNDQ4NDEsImV4cCI6MjEwMjcyMDg0MX0.jafGOwlItnzSoZ6yYlpaae16S2nlSDpPIS2316ZPJak';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseCredentials(): { url: string; key: string } {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
  const localUrl = localStorage.getItem('motocampeon_supabase_url') || '';
  const localKey = localStorage.getItem('motocampeon_supabase_key') || '';
  return {
    url: localUrl || envUrl || DEFAULT_SUPABASE_URL,
    key: localKey || envKey || DEFAULT_SUPABASE_ANON_KEY
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseCredentials();
  return Boolean(url && key && url.startsWith('http') && key.length > 10);
}

export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) return null;
  try {
    supabaseInstance = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true },
      realtime: { params: { eventsPerSecond: 10 } }
    });
    return supabaseInstance;
  } catch (err) {
    console.error('Error initializing Supabase client:', err);
    return null;
  }
}

export function updateSupabaseCredentials(url: string, key: string): boolean {
  try {
    localStorage.setItem('motocampeon_supabase_url', url.trim());
    localStorage.setItem('motocampeon_supabase_key', key.trim());
    supabaseInstance = null;
    return true;
  } catch (e) {
    console.error('Failed to save Supabase credentials:', e);
    return false;
  }
}

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; driversCount?: number }> {
  const client = getSupabase();
  if (!client) return { success: false, message: 'URL o Clave anónima no configuradas.' };
  try {
    const { error: rpcError } = await client.rpc('get_online_drivers_for_passenger');
    if (rpcError) {
      const { error: pricingError } = await client.from('pricing_config').select('id').limit(1);
      if (pricingError) return { success: false, message: `Error de conexión: ${pricingError.message}` };
    }
    return { success: true, message: '¡Conexión exitosa a Supabase!', driversCount: 0 };
  } catch (err: any) {
    return { success: false, message: err.message || 'Error desconocido.' };
  }
}

// ═══════════════════════════════════════════════════════════════
// PASAJERO — SESIÓN Y PERFIL
// ═══════════════════════════════════════════════════════════════

const PASSENGER_SESSION_KEY = 'motocampeon_passenger_session';
const DEVICE_ID_KEY = 'motocampeon_device_id';

export function getCurrentPassenger(): SupabasePassenger | null {
  try {
    const raw = localStorage.getItem(PASSENGER_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SupabasePassenger;
  } catch { return null; }
}

export function setCurrentPassenger(passenger: SupabasePassenger | null): void {
  try {
    if (passenger) {
      localStorage.setItem(PASSENGER_SESSION_KEY, JSON.stringify(passenger));
      localStorage.setItem('motocampeon_passenger_id', passenger.id);
      if (passenger.full_name) localStorage.setItem('motocampeon_passenger_name', passenger.full_name);
      if (passenger.phone) localStorage.setItem('motocampeon_passenger_phone', passenger.phone);
      if (passenger.ci) localStorage.setItem('motocampeon_passenger_ci', passenger.ci);
    } else {
      localStorage.removeItem(PASSENGER_SESSION_KEY);
      localStorage.removeItem('motocampeon_passenger_id');
      localStorage.removeItem('motocampeon_passenger_name');
      localStorage.removeItem('motocampeon_passenger_phone');
      localStorage.removeItem('motocampeon_passenger_ci');
    }
  } catch (e) { console.warn('Error writing passenger session:', e); }
}

// ═══════════════════════════════════════════════════════════════
// 👻 CUENTA FANTASMA AUTOMÁTICA
// ═══════════════════════════════════════════════════════════════

export function getOrCreateDeviceId(): string {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      const rand = (typeof crypto !== 'undefined' && (crypto as any)?.randomUUID)
        ? (crypto as any).randomUUID()
        : (Date.now().toString(36) + Math.random().toString(36).substring(2, 10));
      deviceId = 'dev-' + String(rand).replace(/-/g, '').substring(0, 20);
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
      console.log('🆔 Device ID generado:', deviceId);
    }
    return deviceId;
  } catch {
    return 'dev-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }
}

export async function createGhostPassengerIfNeeded(): Promise<SupabasePassenger | null> {
  const existing = getCurrentPassenger();
  if (existing?.id) {
    console.log('👤 Pasajero ya existente:', existing.full_name);
    return existing;
  }

  const client = getSupabase();
  if (!client) return null;

  try {
    const deviceId = getOrCreateDeviceId();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const ghostName = `Pasajero ${randomNum}`;

    console.log('👻 Creando cuenta fantasma:', ghostName);

    const { data, error } = await client.rpc('register_or_update_passenger', {
      p_full_name: ghostName,
      p_phone: '',
      p_ci: deviceId
    });

    if (error || !data || (data as any).error) {
      console.warn('[Ghost] Error:', error?.message || (data as any)?.error);
      return null;
    }

    const passenger = data as SupabasePassenger;
    setCurrentPassenger(passenger);
    console.log('✅ Cuenta fantasma creada:', passenger.full_name, '| id:', passenger.id);
    return passenger;
  } catch (err) {
    console.warn('[Ghost] Excepción:', err);
    return null;
  }
}

export async function registerPassenger(
  fullName: string, phone: string, ci: string
): Promise<{ passenger: SupabasePassenger | null; error: string | null }> {
  const client = getSupabase();
  const cleanName = fullName.trim();
  const cleanPhone = phone.trim();
  const cleanCi = ci.trim();

  if (!cleanName || !cleanPhone || !cleanCi) {
    return { passenger: null, error: 'Por favor completa todos los campos.' };
  }

  if (!client) {
    const localPassenger: SupabasePassenger = {
      id: 'local-pass-' + Date.now(), phone: cleanPhone,
      full_name: cleanName, ci: cleanCi, created_at: new Date().toISOString()
    };
    setCurrentPassenger(localPassenger);
    return { passenger: localPassenger, error: null };
  }

  try {
    const { data, error } = await client.rpc('register_or_update_passenger', {
      p_full_name: cleanName, p_phone: cleanPhone, p_ci: cleanCi
    });
    if (error) return { passenger: null, error: error.message };
    if ((data as any)?.error) return { passenger: null, error: (data as any).error };
    const passenger = data as SupabasePassenger;
    setCurrentPassenger(passenger);
    return { passenger, error: null };
  } catch (err: any) {
    return { passenger: null, error: err.message || 'Error al registrar.' };
  }
}

export async function loginPassenger(
  name: string, ci: string
): Promise<{ passenger: SupabasePassenger | null; error: string | null }> {
  const client = getSupabase();
  const cleanName = name.trim();
  const cleanCi = ci.trim();

  if (!cleanName || !cleanCi) return { passenger: null, error: 'Ingresa Nombre y CI.' };

  if (!client) {
    const current = getCurrentPassenger();
    if (current && current.ci === cleanCi) return { passenger: current, error: null };
    const local: SupabasePassenger = {
      id: 'pass-' + Date.now(), phone: '+591 70000000',
      full_name: cleanName, ci: cleanCi, created_at: new Date().toISOString()
    };
    setCurrentPassenger(local);
    return { passenger: local, error: null };
  }

  try {
    const { data, error } = await client.rpc('login_passenger_by_ci', {
      p_name: cleanName, p_ci: cleanCi
    });
    if (error) return { passenger: null, error: error.message };
    if (!(data as any)?.found || !(data as any)?.passenger) {
      return { passenger: null, error: `No encontramos cuenta con CI "${cleanCi}".` };
    }
    const passenger = (data as any).passenger as SupabasePassenger;
    setCurrentPassenger(passenger);
    return { passenger, error: null };
  } catch (err: any) {
    return { passenger: null, error: err.message };
  }
}

export async function updatePassengerProfile(
  passengerId: string, fullName: string, phone: string, ci: string
): Promise<{ success: boolean; passenger?: SupabasePassenger; error?: string }> {
  const client = getSupabase();
  const cleanName = fullName.trim();
  const cleanPhone = phone.trim();
  const cleanCi = ci.trim();

  if (!cleanName) return { success: false, error: 'El nombre es obligatorio.' };

  const current = getCurrentPassenger();
  const updated: SupabasePassenger = {
    id: passengerId, full_name: cleanName, phone: cleanPhone,
    ci: cleanCi || current?.ci || '',
    created_at: current?.created_at || new Date().toISOString()
  };

  if (!client) {
    setCurrentPassenger(updated);
    return { success: true, passenger: updated };
  }

  try {
    const { data, error } = await client.rpc('update_passenger_profile_by_id', {
      p_id: passengerId, p_full_name: cleanName,
      p_phone: cleanPhone, p_ci: cleanCi || current?.ci || ''
    });
    if (error) return { success: false, error: error.message };
    if (!(data as any)?.success) return { success: false, error: (data as any)?.error || 'Error' };
    const final = (data as any).passenger as SupabasePassenger;
    setCurrentPassenger(final);
    return { success: true, passenger: final };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de red.' };
  }
}

// ═══════════════════════════════════════════════════════════════
// 🗑️ ELIMINAR CUENTA DE PASAJERO
// ═══════════════════════════════════════════════════════════════
export async function deletePassengerAccount(
  passengerId: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) return { success: false, error: 'Supabase no configurado' };
  if (!passengerId) return { success: false, error: 'ID de pasajero inválido' };

  try {
    const { data, error } = await client.rpc('delete_passenger_account', {
      p_passenger_id: passengerId
    });

    if (error) {
      console.error('Error eliminando cuenta:', error.message);
      return { success: false, error: error.message };
    }

    if ((data as any)?.success === false) {
      return { success: false, error: (data as any)?.error || 'No se pudo eliminar la cuenta.' };
    }

    console.log('✅ Cuenta eliminada correctamente');
    return { success: true };
  } catch (err: any) {
    console.error('Excepción eliminando cuenta:', err);
    return { success: false, error: err.message || 'Error de red.' };
  }
}

export async function getPassengerRidesHistory(passengerId: string): Promise<SupabaseRide[]> {
  const client = getSupabase();
  if (!client) return [];
  try {
    const { data, error } = await client.rpc('get_passenger_rides_history', {
      p_passenger_id: passengerId
    });
    if (error) return [];
    return (data as SupabaseRide[]) || [];
  } catch { return []; }
}

export async function getPassengerStats(passengerId: string): Promise<{
  totalRides: number; completedRides: number; totalKm: number; totalSpent: number;
}> {
  const rides = await getPassengerRidesHistory(passengerId);
  let completedRides = 0, totalKm = 0, totalSpent = 0;
  for (const r of rides) {
    if (r.status === 'completado') {
      completedRides++;
      totalSpent += Number(r.price || 0);
    }
    totalKm += Number(r.distance_km || 0);
  }
  return {
    totalRides: rides.length, completedRides,
    totalKm: Math.round(totalKm * 10) / 10,
    totalSpent: Math.round(totalSpent * 100) / 100
  };
}

export async function getOrCreatePassenger(passengerInfo?: {
  phone?: string; fullName?: string; ci?: string;
}): Promise<string | null> {
  const activeSession = getCurrentPassenger();
  if (activeSession?.id) return activeSession.id;

  const client = getSupabase();
  if (!client) return null;

  try {
    const phone = passengerInfo?.phone || localStorage.getItem('motocampeon_passenger_phone') || '';
    const fullName = passengerInfo?.fullName || localStorage.getItem('motocampeon_passenger_name') || `Pasajero ${Math.floor(1000 + Math.random() * 9000)}`;
    const ci = passengerInfo?.ci || localStorage.getItem('motocampeon_passenger_ci') || getOrCreateDeviceId();

    const { data, error } = await client.rpc('register_or_update_passenger', {
      p_full_name: fullName, p_phone: phone, p_ci: ci
    });
    if (error || !data || (data as any).error) return null;
    const passenger = data as SupabasePassenger;
    localStorage.setItem('motocampeon_passenger_id', passenger.id);
    return passenger.id;
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════
// 🎯 ASIGNACIÓN AUTOMÁTICA — Buscar conductor más cercano
// ═══════════════════════════════════════════════════════════════
export async function findClosestOnlineDriver(
  origin: LatLng,
  maxRadiusKm: number = 3.0
): Promise<{
  found: boolean;
  driver_id?: string;
  driver_name?: string;
  vehicle_model?: string;
  vehicle_plate?: string;
  avatar_url?: string | null;
  phone?: string;
  lat?: number;
  lng?: number;
  distance_km?: number;
  error?: string;
}> {
  const client = getSupabase();
  if (!client) return { found: false, error: 'Supabase no configurado' };

  try {
    const { data, error } = await client.rpc('find_closest_online_driver', {
      p_origin_lat: origin.lat,
      p_origin_lng: origin.lng,
      p_max_radius_km: maxRadiusKm
    });
    if (error) return { found: false, error: error.message };
    return data as any;
  } catch (err: any) {
    return { found: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// 🗺️ GUARDAR RUTA CALCULADA (para que el conductor la use igual)
// ═══════════════════════════════════════════════════════════════
export async function saveRideRoute(
  rideId: string,
  routeCoords: [number, number][],
  distanceKm: number,
  durationMins: number,
  summary: string
): Promise<boolean> {
  const client = getSupabase();
  if (!client || !rideId || routeCoords.length < 2) return false;

  try {
    const geojson = {
      type: 'LineString',
      coordinates: routeCoords.map(([lat, lng]) => [lng, lat])
    };

    const { data, error } = await client.rpc('save_ride_route', {
      p_ride_id: rideId,
      p_route_geometry: geojson,
      p_distance_km: distanceKm,
      p_duration_min: Math.round(durationMins),
      p_summary: summary
    });

    if (error) {
      console.warn('⚠️ No se pudo guardar la ruta:', error.message);
      return false;
    }

    console.log('✅ Ruta guardada en Supabase para el viaje', rideId.substring(0, 8));
    return !!(data as any)?.success;
  } catch (e) {
    console.warn('Error guardando ruta:', e);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// CREAR RIDE
// ═══════════════════════════════════════════════════════════════
export async function createRideInSupabase(rideData: {
  origin: LatLng; originAddress: string;
  destination: LatLng; destinationAddress: string;
  price: number; distanceKm: number; durationMins: number;
  hasCargo: boolean; cargoDescription?: string; cargoPhotoUrl?: string;
  passengerName?: string; passengerPhone?: string;
  targetDriverId?: string | null;
}): Promise<{ ride: SupabaseRide | null; error: string | null }> {
  const client = getSupabase();
  if (!client) return { ride: null, error: 'Supabase no está configurado.' };

  try {
    const passengerId = await getOrCreatePassenger({
      fullName: rideData.passengerName,
      phone: rideData.passengerPhone
    });

    console.log('📤 [RIDE] Creando vía RPC, passengerId:', passengerId);
    if (rideData.targetDriverId) {
      console.log('🎯 [RIDE] Con asignación automática a driver:', rideData.targetDriverId);
    } else {
      console.log('📢 [RIDE] Sin asignación → modo pool abierto');
    }

    const { data, error } = await client.rpc('create_ride_for_passenger', {
      p_passenger_id: passengerId,
      p_origin_lat: rideData.origin.lat,
      p_origin_lng: rideData.origin.lng,
      p_origin_address: rideData.originAddress,
      p_destination_lat: rideData.destination.lat,
      p_destination_lng: rideData.destination.lng,
      p_destination_address: rideData.destinationAddress,
      p_distance_km: rideData.distanceKm,
      p_duration_minutes: Math.round(rideData.durationMins),
      p_price: rideData.price,
      p_has_cargo: rideData.hasCargo,
      p_cargo_description: rideData.cargoDescription || null,
      p_cargo_photo_url: rideData.cargoPhotoUrl || null,
      p_passenger_name: rideData.passengerName || null,
      p_passenger_phone: rideData.passengerPhone || null
    });

    if (error) {
      console.error('❌ [RIDE] Error en RPC:', error);
      return { ride: null, error: error.message };
    }

    const createdRide = data as SupabaseRide;

    if (rideData.targetDriverId && createdRide?.id) {
      const { error: assignErr } = await client
        .from('rides')
        .update({ driver_id: rideData.targetDriverId })
        .eq('id', createdRide.id);

      if (!assignErr) {
        createdRide.driver_id = rideData.targetDriverId;
        console.log('✅ [RIDE] Asignado automáticamente a:', rideData.targetDriverId);
      } else {
        console.warn('⚠️ [RIDE] No se pudo asignar automáticamente:', assignErr.message);
      }
    }

    console.log('✅ [RIDE] Creado:', createdRide?.id);
    return { ride: createdRide, error: null };
  } catch (err: any) {
    console.error('❌ [RIDE] Excepción:', err);
    return { ride: null, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// CONDUCTORES — Consultas vía RPC
// ═══════════════════════════════════════════════════════════════

export function calculateStraightDistanceKm(p1: LatLng, p2: LatLng): number {
  const R = 6371;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(p1.lat*Math.PI/180) * Math.cos(p2.lat*Math.PI/180) * Math.sin(dLng/2)**2;
  return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(2));
}

export async function getOnlineDrivers(_refCenter?: LatLng): Promise<SupabaseDriver[]> {
  const client = getSupabase();
  if (!client) return [];

  try {
    const { data, error } = await client.rpc('get_online_drivers_for_passenger');
    if (error) return [];
    const drivers = (data as SupabaseDriver[]) || [];
    if (drivers.length > 0) {
      console.log(`✅ [getOnlineDrivers] ${drivers.length} conductores en línea`);
    }
    return drivers;
  } catch { return []; }
}

export function subscribeToOnlineDrivers(
  onUpdate: (drivers: SupabaseDriver[]) => void,
  refCenter?: LatLng
): () => void {
  const client = getSupabase();
  if (!client) { onUpdate([]); return () => {}; }

  getOnlineDrivers(refCenter).then(onUpdate);
  const pollTimer = setInterval(() => { getOnlineDrivers(refCenter).then(onUpdate); }, 3000);
  return () => { clearInterval(pollTimer); };
}

export async function markRideAsViewedInSupabase(
  rideId: string,
  driver: { id: string; full_name: string; avatar_url?: string | null; vehicle_model?: string | null; lat?: number | null; lng?: number | null },
  origin?: LatLng
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { data: ride } = await client.from('rides').select('viewed_by_drivers').eq('id', rideId).maybeSingle();
    let distKm = 0.8;
    if (origin && driver.lat && driver.lng) {
      distKm = calculateStraightDistanceKm(origin, { lat: driver.lat, lng: driver.lng });
    }
    const newViewEntry: DriverViewInfo = {
      driver_id: driver.id, driver_name: driver.full_name,
      driver_photo: driver.avatar_url || null,
      vehicle_model: driver.vehicle_model || 'Motocicleta Campeón',
      distance_km: distKm,
      eta_mins: Math.max(1, Math.round(distKm / 0.4)),
      viewed_at: new Date().toISOString()
    };
    let existingViews: any[] = [];
    if (Array.isArray(ride?.viewed_by_drivers)) existingViews = [...ride.viewed_by_drivers];
    const alreadyViewed = existingViews.some(v => 
      (typeof v === 'string' && v === driver.id) ||
      (typeof v === 'object' && v?.driver_id === driver.id)
    );
    if (!alreadyViewed) {
      existingViews.push(newViewEntry);
      await client.from('rides').update({ viewed_by_drivers: existingViews }).eq('id', rideId);
    }
    return true;
  } catch { return false; }
}

export async function fetchRideInterestedDrivers(rideId: string): Promise<DriverViewInfo[]> {
  const client = getSupabase();
  if (!client) return [];
  try {
    const { data, error } = await client.rpc('get_ride_interested_drivers', { p_ride_id: rideId });
    if (error || !data) return [];
    return (data as DriverViewInfo[]) || [];
  } catch { return []; }
}

export function subscribeToRideChanges(
  rideId: string,
  onUpdate: (ride: SupabaseRide, driver: SupabaseDriver | null, viewedDrivers?: DriverViewInfo[]) => void
): () => void {
  const client = getSupabase();
  if (!client || !rideId) return () => {};

  let isPolling = false;
  let lastRideJson = '';

  const refreshRide = async () => {
    if (isPolling) return;
    isPolling = true;
    try {
      const { data, error } = await client.rpc('get_passenger_ride_status', { p_ride_id: rideId });
      if (error || !data || (data as any).error) return;
      const ride = (data as any).ride as SupabaseRide;
      const driver = (data as any).driver as SupabaseDriver | null;
      const viewersRaw = (data as any).viewed_by_drivers || [];
      const viewers = Array.isArray(viewersRaw)
        ? viewersRaw.filter((v: any) => v && typeof v === 'object' && v.driver_id)
        : [];
      const currentJson = JSON.stringify({ status: ride.status, driver_id: ride.driver_id, viewers: viewers.length });
      if (currentJson !== lastRideJson) {
        lastRideJson = currentJson;
        onUpdate(ride, driver, viewers);
      }
    } catch (err) {
      console.warn('Error in refreshRide polling:', err);
    } finally {
      isPolling = false;
    }
  };

  refreshRide();
  const pollInterval = setInterval(refreshRide, 2000);
  return () => { clearInterval(pollInterval); };
}

export async function updateRideStatusInSupabase(
  rideId: string,
  status: SupabaseRide['status'],
  cancellationReason?: string,
  passengerId?: string
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  if (status !== 'cancelado') return true;

  let pid = passengerId;
  if (!pid) { const p = getCurrentPassenger(); pid = p?.id; }
  if (!pid) return false;

  try {
    const { data, error } = await client.rpc('cancel_ride_by_passenger', {
      p_ride_id: rideId, p_passenger_id: pid,
      p_reason: cancellationReason || 'Cancelado por el pasajero'
    });
    if (error) return false;
    return !!(data as any)?.success;
  } catch { return false; }
}

export async function acceptRideAsDriverInSupabase(
  rideId: string, driverId: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) return { success: false, error: 'Supabase no configurado' };
  try {
    const { data, error } = await client
      .from('rides')
      .update({ status: 'aceptado', driver_id: driverId, accepted_at: new Date().toISOString() })
      .eq('id', rideId).eq('status', 'pendiente').select().maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: 'Ya fue aceptado por otro' };
    return { success: true };
  } catch (err: any) { return { success: false, error: err.message }; }
}

export async function submitDriverRating(
  rideId: string, driverId: string, passengerId: string | null,
  rating: number, comment?: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) return { success: false, error: 'Supabase no configurado' };
  try {
    const { error } = await client.from('driver_ratings').insert({
      ride_id: rideId, driver_id: driverId, passenger_id: passengerId,
      rating: Math.max(1, Math.min(5, Math.round(rating))),
      comment: comment || null
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) { return { success: false, error: err.message }; }
}

export async function uploadCargoPhoto(file: File, rideId: string): Promise<string | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${rideId}/${Date.now()}.${ext}`;
    const { data, error } = await client.storage.from('ride-photos').upload(path, file, { upsert: true });
    if (error) return null;
    const { data: urlData } = client.storage.from('ride-photos').getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════
// PRICING CONFIG
// ═══════════════════════════════════════════════════════════════
export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  base_radius_meters: 1300, base_price: 4.00,
  extra_distance_meters: 500, extra_price: 1.00,
  cargo_extra: 4.00, minimum_price: 0, is_active: true
};

const PRICING_STORAGE_KEY = 'motocampeon_pricing_config';
let cachedPricingConfig: PricingConfig = DEFAULT_PRICING_CONFIG;

try {
  const savedConfig = localStorage.getItem(PRICING_STORAGE_KEY);
  if (savedConfig) cachedPricingConfig = { ...DEFAULT_PRICING_CONFIG, ...JSON.parse(savedConfig) };
} catch {}

export function getCachedPricingConfig(): PricingConfig { return cachedPricingConfig; }

export function setCachedPricingConfig(config: PricingConfig): void {
  cachedPricingConfig = config;
  try { localStorage.setItem(PRICING_STORAGE_KEY, JSON.stringify(config)); } catch {}
}

export async function fetchPricingConfigFromSupabase(): Promise<PricingConfig> {
  const client = getSupabase();
  if (!client) return getCachedPricingConfig();
  try {
    const { data, error } = await client
      .from('pricing_config').select('*').eq('is_active', true)
      .order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (error) return getCachedPricingConfig();
    if (data) {
      const sanitized: PricingConfig = {
        id: data.id,
        base_radius_meters: Number(data.base_radius_meters) || 1300,
        base_price: Number(data.base_price) || 4.0,
        extra_distance_meters: Number(data.extra_distance_meters) || 500,
        extra_price: Number(data.extra_price) || 1.0,
        cargo_extra: Number(data.cargo_extra) || 4.0,
        minimum_price: Number(data.minimum_price) || 0,
        is_active: data.is_active ?? true,
        updated_at: data.updated_at, created_at: data.created_at
      };
      setCachedPricingConfig(sanitized);
      return sanitized;
    }
    return getCachedPricingConfig();
  } catch { return getCachedPricingConfig(); }
}

export function subscribeToPricingConfig(onUpdate: (config: PricingConfig) => void): () => void {
  const client = getSupabase();
  if (!client) return () => {};
  try {
    const channel = client
      .channel('public:pricing_config:realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pricing_config' }, (payload) => {
        if (payload.new && (payload.new as any).is_active !== false) {
          const row = payload.new as any;
          const updated: PricingConfig = {
            id: row.id,
            base_radius_meters: Number(row.base_radius_meters) || 1300,
            base_price: Number(row.base_price) || 4.0,
            extra_distance_meters: Number(row.extra_distance_meters) || 500,
            extra_price: Number(row.extra_price) || 1.0,
            cargo_extra: Number(row.cargo_extra) || 4.0,
            minimum_price: Number(row.minimum_price) || 0,
            is_active: row.is_active ?? true, updated_at: row.updated_at
          };
          setCachedPricingConfig(updated);
          onUpdate(updated);
        }
      })
      .subscribe();
    return () => { client.removeChannel(channel); };
  } catch { return () => {}; }
}

export function calculateRideFare(
  distanceKm: number, hasCargo: boolean, customConfig?: PricingConfig
): {
  basePrice: number; baseRadiusMeters: number; extraDistanceMeters: number;
  extraPrice: number; distanceMeters: number; extraMeters: number;
  extraSteps: number; extraCost: number; cargoExtra: number;
  motoFare: number; expressFare: number; total: number; breakdown: string;
} {
  const config = customConfig || getCachedPricingConfig();
  const baseRadius = Number(config.base_radius_meters) || 1300;
  const basePrice = Number(config.base_price) || 4.0;
  const extraDistanceUnit = Number(config.extra_distance_meters) || 500;
  const extraPriceUnit = Number(config.extra_price) || 1.0;
  const cargoExtraCost = hasCargo ? (Number(config.cargo_extra) || 4.0) : 0;
  const minimumPrice = Number(config.minimum_price) || 0;

  const distanceMeters = Math.max(0, Math.round(distanceKm * 1000));
  let extraMeters = 0, extraSteps = 0, extraCost = 0;
  if (distanceMeters > baseRadius) {
    extraMeters = distanceMeters - baseRadius;
    extraSteps = Math.ceil(extraMeters / extraDistanceUnit);
    extraCost = extraSteps * extraPriceUnit;
  }
  let calculatedMoto = basePrice + extraCost;
  if (minimumPrice > 0 && calculatedMoto < minimumPrice) calculatedMoto = minimumPrice;

  const motoFare = Number(calculatedMoto.toFixed(1));
  const expressFare = Number((calculatedMoto * 1.35).toFixed(1));
  const total = Number((motoFare + cargoExtraCost).toFixed(1));

  let breakdown = `Base: Bs ${basePrice.toFixed(2)} (hasta ${(baseRadius / 1000).toFixed(1)} km)`;
  if (extraSteps > 0) breakdown += ` + ${extraSteps} tramo(s) (${extraSteps * extraDistanceUnit}m = +Bs ${extraCost.toFixed(2)})`;
  if (cargoExtraCost > 0) breakdown += ` + Carga Bs ${cargoExtraCost.toFixed(2)}`;

  return {
    basePrice, baseRadiusMeters: baseRadius,
    extraDistanceMeters: extraDistanceUnit, extraPrice: extraPriceUnit,
    distanceMeters, extraMeters, extraSteps, extraCost,
    cargoExtra: cargoExtraCost, motoFare, expressFare, total, breakdown
  };
}
