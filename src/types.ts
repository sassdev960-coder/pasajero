export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteGeometry {
  coordinates: [number, number][]; // [lat, lng]
  distanceKm: number;
  durationMinutes: number;
  summary: string;
  steps?: {
    instruction: string;
    distanceMeters: number;
    durationSeconds: number;
  }[];
}

export type MapTileLayer = 'google-roads' | 'google-hybrid' | 'osm-streets' | 'carto-dark';

export interface PointOfInterest {
  id: string;
  name: string;
  category: 'mercado' | 'hospital' | 'banco' | 'gasolinera' | 'mall' | 'plaza' | 'transporte';
  lat: number;
  lng: number;
  address: string;
  icon: string;
}

export interface RideRequest {
  id: string;
  origin: LatLng;
  originAddress: string;
  destination: LatLng;
  destinationAddress: string;
  price: number;
  distanceKm: number;
  durationMins: number;
  status: 'draft' | 'solicitando' | 'asignado' | 'en_camino' | 'llegado_origen' | 'en_curso' | 'completado' | 'cancelado';
  hasCargo: boolean;
  cargoDescription?: string;
  cargoPhotoUrl?: string;
  driver?: Driver;
  createdAt: string;
}

export interface Driver {
  id: string;
  name: string;
  rating: number;
  ridesCount: number;
  vehicle: string;
  plate: string;
  phone: string;
  currentLocation: LatLng;
  photoUrl: string;
}

export interface SavedPlace {
  title: string;
  address: string;
  lat: number;
  lng: number;
}

// Supabase Database Row Types based on User Schema
export interface SupabaseRide {
  id: string;
  driver_id: string | null;
  passenger_id: string | null;
  origin_lat: number | null;
  origin_lng: number | null;
  origin_address: string | null;
  destination_lat: number | null;
  destination_lng: number | null;
  destination_address: string | null;
  status: 'pendiente' | 'aceptado' | 'llegado_origen' | 'en_curso' | 'completado' | 'no_completado' | 'cancelado' | 'rechazado';
  price: number | null;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  distance_km: number | null;
  duration_minutes: number | null;
  has_cargo: boolean;
  cargo_description: string | null;
  cargo_photo_url: string | null;
  is_queued: boolean;
  queued_after_ride: string | null;
  viewed_by_drivers?: string[] | DriverViewInfo[] | null;
  seen_by?: string[] | null;
}

export interface DriverViewInfo {
  driver_id: string;
  driver_name: string;
  driver_photo?: string | null;
  vehicle_model?: string | null;
  distance_km?: number;
  eta_mins?: number;
  viewed_at: string;
}

export interface SupabaseDriver {
  id: string;
  phone: string;
  full_name: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at?: string;
  approved_by?: string | null;
  notes?: string | null;
  identity_card?: string | null;
  vehicle_model?: string | null;
  vehicle_plate?: string | null;
  home_address?: string | null;
  home_lat?: number | null;
  home_lng?: number | null;
  utility_bill_url?: string | null;
  profile_completed?: boolean;
  lat?: number | null;
  lng?: number | null;
  is_online?: boolean;
  last_location_update?: string | null;
}

export interface SupabasePassenger {
  id: string;
  phone: string;
  full_name: string | null;
  ci: string | null;
  created_at: string;
}

export interface SupabaseDriverStatus {
  driver_id: string;
  is_online: boolean;
  latitude: number | null;
  longitude: number | null;
  battery_level: number | null;
  last_updated: string;
  is_busy_manual?: boolean;
}

export interface PricingConfig {
  id?: string;
  base_radius_meters: number;
  base_price: number;
  extra_distance_meters: number;
  extra_price: number;
  cargo_extra: number;
  minimum_price: number;
  is_active?: boolean;
  updated_at?: string;
  created_at?: string;
  updated_by?: string | null;
}
