import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { LatLng, MapTileLayer, Driver, SupabaseDriver, DriverViewInfo } from '../types';
import { Layers, Crosshair, MapPin, Maximize2, Bike } from 'lucide-react';

interface MapComponentProps {
  origin: LatLng | null;
  destination: LatLng | null;
  userLocation: LatLng | null;
  flyToTarget: LatLng | null;
  routeCoords: [number, number][];
  distanceKm?: number;
  durationMins?: number;
  isSelectingPickup: boolean;
  isSelectingDestination: boolean;
  centerAddress: string;
  isGeocodingCenter: boolean;
  selectedCategory: string | null;
  assignedDriver?: Driver | null;
  driverLocation?: LatLng | null;
  driverRouteCoords?: [number, number][];
  driverDistanceMeters?: number;
  driverEtaMins?: number;
  rideStatus?: string;
  isSheetMinimized?: boolean;
  onlineDrivers?: SupabaseDriver[];
  viewedDrivers?: DriverViewInfo[];
  onMapMoved: (center: LatLng) => void;
  onConfirmPinLocation: () => void;
  onCancelPinSelection?: () => void;
  onSelectPOIAsTarget: (poi: any, asOrigin: boolean) => void;
  onLocateUser: () => void;
}

const TILE_LAYERS: Record<MapTileLayer, { url: string; attribution: string; name: string }> = {
  'google-roads': {
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    name: 'Google Maps (POIs y Referencias)'
  },
  'google-hybrid': {
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Satellite',
    name: 'Google Híbrido (Satélite + Calles)'
  },
  'carto-dark': {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    name: 'Modo Oscuro (Carto)'
  },
  'osm-streets': {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    name: 'OpenStreetMap'
  }
};

// Coordinate safety helpers to prevent "Invalid LatLng object: (NaN, NaN)" crashes
const isValidNum = (v: any): v is number => typeof v === 'number' && !isNaN(v) && isFinite(v);
const isValidLoc = (loc: any): loc is LatLng => 
  loc != null && isValidNum(loc.lat) && isValidNum(loc.lng) && loc.lat >= -90 && loc.lat <= 90 && loc.lng >= -180 && loc.lng <= 180;
const isValidTuple = (c: any): c is [number, number] => 
  Array.isArray(c) && c.length >= 2 && isValidNum(c[0]) && isValidNum(c[1]);

export const MapComponent: React.FC<MapComponentProps> = ({
  origin,
  destination,
  userLocation,
  flyToTarget,
  routeCoords,
  distanceKm,
  durationMins,
  isSelectingPickup,
  isSelectingDestination,
  centerAddress,
  isGeocodingCenter,
  assignedDriver,
  driverLocation,
  driverRouteCoords,
  driverDistanceMeters,
  driverEtaMins,
  rideStatus,
  isSheetMinimized,
  onlineDrivers,
  viewedDrivers,
  onMapMoved,
  onConfirmPinLocation,
  onCancelPinSelection,
  onLocateUser
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);
  const originMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const routeBackgroundRef = useRef<L.Polyline | null>(null);
  const routeBadgeMarkerRef = useRef<L.Marker | null>(null);
  const onlineDriversLayerRef = useRef<L.LayerGroup | null>(null);

  // Driver approaching refs
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const driverRoutePolylineRef = useRef<L.Polyline | null>(null);
  const driverRouteBackgroundRef = useRef<L.Polyline | null>(null);
  const driverBadgeMarkerRef = useRef<L.Marker | null>(null);

  const [currentLayer, setCurrentLayer] = useState<MapTileLayer>('google-roads');
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter: [number, number] = (userLocation && isValidLoc(userLocation))
      ? [userLocation.lat, userLocation.lng]
      : (origin && isValidLoc(origin) ? [origin.lat, origin.lng] : [-17.7833, -63.1821]);

    const map = L.map(mapContainerRef.current, {
      center: initialCenter as L.LatLngExpression,
      zoom: 15,
      zoomControl: false
    });

    const tileConfig = TILE_LAYERS[currentLayer];
    const tileLayer = L.tileLayer(tileConfig.url, {
      maxZoom: 20,
      subdomains: currentLayer === 'carto-dark' ? 'abcd' : 'abc',
      attribution: tileConfig.attribution
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Layer group for Online Drivers on Map
    const onlineGroup = L.layerGroup().addTo(map);
    onlineDriversLayerRef.current = onlineGroup;

    mapInstanceRef.current = map;

    // Handle map movement
    let moveTimeout: any = null;
    const handleMove = () => {
      clearTimeout(moveTimeout);
      moveTimeout = setTimeout(() => {
        if (!mapInstanceRef.current) return;
        const c = map.getCenter();
        if (c && isValidNum(c.lat) && isValidNum(c.lng)) {
          onMapMoved({ lat: c.lat, lng: c.lng });
        }
      }, 250);
    };

    map.on('move', handleMove);

    // Responsive resize listener for mobile viewports
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      map.off('move', handleMove);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const config = TILE_LAYERS[currentLayer];
    const newLayer = L.tileLayer(config.url, {
      maxZoom: 20,
      subdomains: currentLayer === 'carto-dark' ? 'abcd' : 'abc',
      attribution: config.attribution
    }).addTo(map);

    newLayer.bringToBack();
    tileLayerRef.current = newLayer;
  }, [currentLayer]);

  // Fly to Target effect
  useEffect(() => {
    if (!mapInstanceRef.current || !flyToTarget) return;
    if (!isValidLoc(flyToTarget)) return;
    mapInstanceRef.current.flyTo([flyToTarget.lat, flyToTarget.lng], 16, {
      animate: true,
      duration: 1.2
    });
  }, [flyToTarget]);

  // Render Blue Pulsing User Location Marker & Accuracy Circle
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (!userLocation || !isValidLoc(userLocation)) {
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }
      if (userCircleRef.current) {
        userCircleRef.current.remove();
        userCircleRef.current = null;
      }
      return;
    }

    const userHtml = `
      <div class="relative flex items-center justify-center pointer-events-none">
        <div class="absolute w-10 h-10 rounded-full bg-blue-500/30 animate-ping"></div>
        <div class="absolute w-6 h-6 rounded-full bg-blue-400/40"></div>
        <div class="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-xl flex items-center justify-center">
          <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
      </div>
    `;

    const icon = L.divIcon({
      html: userHtml,
      className: 'custom-user-location-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
      userLocationMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
        icon,
        zIndexOffset: 1500
      }).addTo(map);
    }

    if (userCircleRef.current) {
      userCircleRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
      userCircleRef.current = L.circle([userLocation.lat, userLocation.lng], {
        radius: 45,
        color: '#3b82f6',
        fillColor: '#60a5fa',
        fillOpacity: 0.12,
        weight: 1.5
      }).addTo(map);
    }
  }, [userLocation]);

  // Update Pickup (Origin) Marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (!origin || !isValidLoc(origin)) {
      if (originMarkerRef.current) {
        originMarkerRef.current.remove();
        originMarkerRef.current = null;
      }
      return;
    }

    const pickupHtml = `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-8 h-8 rounded-full bg-emerald-500/30 animate-ping"></div>
        <div class="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-[11px] font-bold">
          A
        </div>
      </div>
    `;

    const icon = L.divIcon({
      html: pickupHtml,
      className: 'custom-pickup-marker',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    if (originMarkerRef.current) {
      originMarkerRef.current.setLatLng([origin.lat, origin.lng]);
    } else {
      originMarkerRef.current = L.marker([origin.lat, origin.lng], { icon, zIndexOffset: 1000 }).addTo(map);
    }
  }, [origin]);

  // Update Destination Marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (!destination || !isValidLoc(destination)) {
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
      return;
    }

    const destHtml = `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-8 h-8 rounded-full bg-orange-500/30 animate-ping"></div>
        <div class="w-6 h-6 rounded-full bg-orange-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-[11px] font-bold">
          B
        </div>
      </div>
    `;

    const icon = L.divIcon({
      html: destHtml,
      className: 'custom-dest-marker',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    if (destMarkerRef.current) {
      destMarkerRef.current.setLatLng([destination.lat, destination.lng]);
    } else {
      destMarkerRef.current = L.marker([destination.lat, destination.lng], { icon, zIndexOffset: 1000 }).addTo(map);
    }
  }, [destination]);

  // Update Main Passenger Route Polyline (Origin -> Destination)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Clear existing
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }
    if (routeBackgroundRef.current) {
      routeBackgroundRef.current.remove();
      routeBackgroundRef.current = null;
    }
    if (routeBadgeMarkerRef.current) {
      routeBadgeMarkerRef.current.remove();
      routeBadgeMarkerRef.current = null;
    }

    if (!Array.isArray(routeCoords)) return;
    const validCoords = routeCoords.filter(isValidTuple);
    if (validCoords.length < 2) return;

    const latLngs: L.LatLngExpression[] = validCoords.map(c => [c[0], c[1]]);

    // Background casing border for crisp contrast
    routeBackgroundRef.current = L.polyline(latLngs, {
      color: '#0f172a',
      weight: 8,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Glowing vibrant cyan foreground route line
    routePolylineRef.current = L.polyline(latLngs, {
      color: '#06b6d4',
      weight: 5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Midpoint floating route badge (ETA bubble)
    if (durationMins && distanceKm) {
      const midPoint = latLngs[Math.floor(latLngs.length / 2)] as [number, number];
      if (isValidTuple(midPoint)) {
        const badgeHtml = `
          <div class="px-2.5 py-1 rounded-full bg-slate-950/95 border border-cyan-400/80 shadow-2xl backdrop-blur-md flex items-center gap-1.5 whitespace-nowrap pointer-events-none transform -translate-y-2 select-none">
            <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span class="text-xs font-black text-cyan-300 tracking-tight">${durationMins} min</span>
            <span class="text-[10px] text-slate-300 font-semibold">• ${distanceKm} km</span>
          </div>
        `;
        const badgeIcon = L.divIcon({
          html: badgeHtml,
          className: 'route-midpoint-badge',
          iconSize: [110, 26],
          iconAnchor: [55, 13]
        });
        routeBadgeMarkerRef.current = L.marker(midPoint, { icon: badgeIcon, zIndexOffset: 950 }).addTo(map);
      }
    }

    // Auto-fit bounds ensuring full route is visible on mobile & desktop
    if (!isSelectingPickup && !isSelectingDestination && (!rideStatus || rideStatus === 'draft' || rideStatus === 'solicitando')) {
      const isMobile = window.innerWidth < 768;
      const bounds = L.latLngBounds(latLngs);
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          paddingTopLeft: isMobile ? [16, 75] : [40, 80],
          paddingBottomRight: isMobile ? [16, isSheetMinimized ? 80 : 210] : [40, 310],
          maxZoom: 16
        });
      }
    }
  }, [routeCoords, distanceKm, durationMins, isSelectingPickup, isSelectingDestination, isSheetMinimized, rideStatus]);

  // Update Driver Approaching Route Polyline (Driver -> Origin)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Clear previous driver route
    if (driverRoutePolylineRef.current) {
      driverRoutePolylineRef.current.remove();
      driverRoutePolylineRef.current = null;
    }
    if (driverRouteBackgroundRef.current) {
      driverRouteBackgroundRef.current.remove();
      driverRouteBackgroundRef.current = null;
    }
    if (driverBadgeMarkerRef.current) {
      driverBadgeMarkerRef.current.remove();
      driverBadgeMarkerRef.current = null;
    }

    if (!Array.isArray(driverRouteCoords)) return;
    const validDriverCoords = driverRouteCoords.filter(isValidTuple);
    if (validDriverCoords.length < 2) return;

    const latLngs: L.LatLngExpression[] = validDriverCoords.map(c => [c[0], c[1]]);

    // Casing border
    driverRouteBackgroundRef.current = L.polyline(latLngs, {
      color: '#0f172a',
      weight: 8,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Glowing vibrant amber approach route line (dashed to indicate approaching)
    driverRoutePolylineRef.current = L.polyline(latLngs, {
      color: '#f59e0b',
      weight: 5,
      opacity: 0.95,
      dashArray: '8, 8',
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Midpoint floating driver approach badge
    if (driverDistanceMeters && driverDistanceMeters > 40) {
      const midPoint = latLngs[Math.floor(latLngs.length / 2)] as [number, number];
      if (isValidTuple(midPoint)) {
        const distStr = driverDistanceMeters >= 1000 
          ? `${(driverDistanceMeters / 1000).toFixed(1)} km` 
          : `${driverDistanceMeters} m`;
        const badgeHtml = `
          <div class="px-2.5 py-1 rounded-full bg-slate-950/95 border border-amber-400/80 shadow-2xl backdrop-blur-md flex items-center gap-1.5 whitespace-nowrap pointer-events-none transform -translate-y-2 select-none">
            <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span class="text-xs font-black text-amber-300 tracking-tight">Moto acercándose</span>
            <span class="text-[10px] text-slate-300 font-semibold">• ${distStr}</span>
          </div>
        `;
        const badgeIcon = L.divIcon({
          html: badgeHtml,
          className: 'driver-route-badge',
          iconSize: [160, 26],
          iconAnchor: [80, 13]
        });
        driverBadgeMarkerRef.current = L.marker(midPoint, { icon: badgeIcon, zIndexOffset: 960 }).addTo(map);
      }
    }
  }, [driverRouteCoords, driverDistanceMeters, driverEtaMins]);

  // Update Driver Marker on Map (Motorcycle icon with live position and radar ring)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (!driverLocation || !isValidLoc(driverLocation)) {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.remove();
        driverMarkerRef.current = null;
      }
      return;
    }

    const distLabel = driverDistanceMeters !== undefined && driverDistanceMeters > 0
      ? (driverDistanceMeters >= 1000 ? `${(driverDistanceMeters / 1000).toFixed(1)} km` : `${driverDistanceMeters} m`)
      : 'En camino';

    const driverHtml = `
      <div class="relative flex flex-col items-center select-none">
        <!-- Pulsing radar ring -->
        <div class="absolute -top-1 w-10 h-10 rounded-full bg-amber-400/35 animate-ping"></div>
        <!-- Motorbike Icon Badge -->
        <div class="w-9 h-9 rounded-full bg-amber-500 border-2 border-slate-900 shadow-2xl flex items-center justify-center text-slate-950 font-black text-sm z-10">
          🏍️
        </div>
        <!-- Floating Driver Tag -->
        <div class="bg-slate-950/95 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xl border border-amber-500/60 whitespace-nowrap mt-1 flex items-center gap-1 backdrop-blur-md">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>${assignedDriver?.name?.split(' ')[0] || 'Conductor'}</span>
          <span class="text-slate-300 font-semibold">• ${distLabel}</span>
        </div>
      </div>
    `;

    const icon = L.divIcon({
      html: driverHtml,
      className: 'custom-driver-marker',
      iconSize: [120, 50],
      iconAnchor: [60, 18]
    });

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([driverLocation.lat, driverLocation.lng]);
      driverMarkerRef.current.setIcon(icon);
    } else {
      driverMarkerRef.current = L.marker([driverLocation.lat, driverLocation.lng], {
        icon,
        zIndexOffset: 1200
      }).addTo(map);
    }
  }, [driverLocation, driverDistanceMeters, assignedDriver]);

  // Center full route helper (Origin -> Destination)
  const handleCenterFullRoute = useCallback(() => {
    if (!mapInstanceRef.current || !Array.isArray(routeCoords)) return;
    const validCoords = routeCoords.filter(isValidTuple);
    if (validCoords.length < 2) return;
    const isMobile = window.innerWidth < 768;
    const latLngs: L.LatLngExpression[] = validCoords.map(c => [c[0], c[1]]);
    const bounds = L.latLngBounds(latLngs);
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, {
        paddingTopLeft: isMobile ? [16, 75] : [40, 80],
        paddingBottomRight: isMobile ? [16, isSheetMinimized ? 80 : 210] : [40, 310],
        maxZoom: 16
      });
    }
  }, [routeCoords, isSheetMinimized]);

  // Center driver approach helper (Driver + Origin)
  const handleCenterDriver = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const pts: L.LatLngTuple[] = [];
    if (driverLocation && isValidLoc(driverLocation)) pts.push([driverLocation.lat, driverLocation.lng]);
    if (origin && isValidLoc(origin)) pts.push([origin.lat, origin.lng]);
    if (pts.length < 1) return;

    const isMobile = window.innerWidth < 768;
    if (pts.length === 1) {
      mapInstanceRef.current.flyTo(pts[0], 16, { animate: true, duration: 1 });
      return;
    }

    const bounds = L.latLngBounds(pts);
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, {
        paddingTopLeft: isMobile ? [20, 80] : [50, 80],
        paddingBottomRight: isMobile ? [20, 200] : [50, 240],
        maxZoom: 17
      });
    }
  }, [driverLocation, origin]);

  // Render Online Drivers on Map
  useEffect(() => {
    if (!mapInstanceRef.current || !onlineDriversLayerRef.current) return;
    const layerGroup = onlineDriversLayerRef.current;
    layerGroup.clearLayers();

    if (!Array.isArray(onlineDrivers) || onlineDrivers.length === 0) return;

    onlineDrivers.forEach(driver => {
      if (!driver || !isValidNum(driver.lat) || !isValidNum(driver.lng)) return;
      if (!isValidLoc({ lat: driver.lat, lng: driver.lng })) return;

      // Don't render as generic online driver if this driver is currently the assigned approaching driver
      if (assignedDriver && driver.id === assignedDriver.id) return;

      const hasViewed = viewedDrivers?.some(v => 
        (typeof v === 'string' && v === driver.id) || 
        (typeof v === 'object' && v?.driver_id === driver.id)
      );

      const firstName = (driver.full_name || 'Conductor').split(' ')[0];

      const driverHtml = `
        <div class="relative flex flex-col items-center select-none cursor-pointer group">
          <!-- Pulse animation aura -->
          <div class="absolute -top-1 w-9 h-9 rounded-full ${hasViewed ? 'bg-amber-400/40 animate-ping' : 'bg-emerald-400/30 animate-ping'}"></div>
          
          <!-- Motorcycle Icon Circle Badge -->
          <div class="w-8 h-8 rounded-full ${
            hasViewed 
              ? 'bg-amber-500 border-2 border-slate-900 shadow-amber-500/50 shadow-lg text-slate-950 scale-110' 
              : 'bg-slate-900 border-2 border-emerald-400 shadow-emerald-500/30 shadow-lg text-emerald-400'
          } flex items-center justify-center text-sm font-bold transition-all duration-200 group-hover:scale-125 z-10">
            ${hasViewed ? '👀' : '🏍️'}
          </div>

          <!-- Driver name and viewed status floating tag -->
          <div class="mt-1 px-1.5 py-0.5 rounded-full ${
            hasViewed 
              ? 'bg-amber-950/95 border-amber-400 text-amber-300 shadow-amber-950/80 shadow-lg' 
              : 'bg-slate-950/90 border-emerald-500/70 text-emerald-300'
          } text-[9px] font-black tracking-tight shadow-md border backdrop-blur-md flex items-center gap-1 whitespace-nowrap">
            <span class="w-1.5 h-1.5 rounded-full ${hasViewed ? 'bg-amber-400 animate-bounce' : 'bg-emerald-400 animate-pulse'}"></span>
            <span>${firstName}</span>
            ${hasViewed ? '<span class="text-amber-200 font-bold">• Vio tu pedido</span>' : ''}
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: driverHtml,
        className: 'custom-online-driver-marker',
        iconSize: [110, 48],
        iconAnchor: [55, 16]
      });

      const marker = L.marker([driver.lat!, driver.lng!], {
        icon,
        zIndexOffset: hasViewed ? 950 : 800
      });

      const popupHtml = `
        <div style="font-family: inherit;" class="p-1 text-slate-100 min-w-[200px]">
          <div class="flex items-center gap-2 pb-1.5 border-b border-slate-700">
            <img src="${driver.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'}" class="w-9 h-9 rounded-full object-cover border border-amber-400 shrink-0" />
            <div style="overflow: hidden;">
              <div style="font-weight: 700; font-size: 12px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${driver.full_name}</div>
              <div style="font-size: 10px; color: #34d399; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                <span style="display:inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: #34d399;"></span>
                Conductor en Línea
              </div>
            </div>
          </div>
          <div style="margin-top: 6px; font-size: 11px; color: #cbd5e1; line-height: 1.4;">
            <div>🏍️ <span style="font-weight: 600; color: #f8fafc;">${driver.vehicle_model || 'Motocicleta Campeón'}</span></div>
            <div>🏷️ Placa: <span style="font-family: monospace; font-weight: 700; color: #fbbf24;">${driver.vehicle_plate || 'SCZ'}</span></div>
            ${hasViewed ? '<div style="margin-top: 6px; padding: 3px 8px; border-radius: 6px; background-color: rgba(245, 158, 11, 0.25); color: #fbbf24; font-weight: 700; font-size: 10px; border: 1px solid rgba(245, 158, 11, 0.5);">👀 Ha visto tu solicitud de viaje</div>' : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: 'driver-popup-card',
        closeButton: false,
        offset: [0, -10]
      });

      marker.addTo(layerGroup);
    });
  }, [onlineDrivers, viewedDrivers, assignedDriver, rideStatus]);

  // Center online drivers helper
  const handleCenterOnlineDrivers = useCallback(() => {
    if (!mapInstanceRef.current || !Array.isArray(onlineDrivers) || onlineDrivers.length === 0) return;
    const pts: L.LatLngTuple[] = [];
    if (origin && isValidLoc(origin)) pts.push([origin.lat, origin.lng]);
    onlineDrivers.forEach(d => {
      if (d.lat && d.lng && isValidLoc({ lat: d.lat, lng: d.lng })) {
        pts.push([d.lat, d.lng]);
      }
    });
    if (pts.length === 0) return;

    const bounds = L.latLngBounds(pts);
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, {
        paddingTopLeft: [40, 80],
        paddingBottomRight: [40, 200],
        maxZoom: 16
      });
    }
  }, [onlineDrivers, origin]);

  return (
    <div className="relative w-full h-full">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full bg-slate-900 z-0" />

      {/* Floating Center Pin for Precision Selection */}
      {(isSelectingPickup || isSelectingDestination) && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-20 pb-16">
          {/* Address Tooltip Bubble */}
          <div className="bg-slate-900/95 border border-slate-700 text-white px-3.5 py-2 rounded-xl shadow-2xl flex flex-col items-center mb-2 animate-bounce max-w-[260px] text-center backdrop-blur-md">
            <span className="text-[11px] font-medium tracking-wide uppercase text-slate-400">
              {isSelectingPickup ? '🟢 Fijar Punto de Partida' : '🟠 Fijar Punto de Destino'}
            </span>
            <span className="text-xs font-bold text-slate-100 truncate w-full">
              {isGeocodingCenter ? 'Localizando dirección...' : centerAddress}
            </span>
          </div>

          {/* Central Target Pin */}
          <div className="relative flex items-center justify-center">
            <div className={`w-8 h-8 rounded-full ${isSelectingPickup ? 'bg-emerald-500' : 'bg-orange-500'} border-2 border-white shadow-2xl flex items-center justify-center text-white`}>
              <MapPin className="w-5 h-5 drop-shadow" />
            </div>
            <div className="absolute -bottom-2 w-2 h-2 rounded-full bg-black/60 shadow" />
          </div>
        </div>
      )}

      {/* Center Confirmation Button (Appears while selecting on map) */}
      {(isSelectingPickup || isSelectingDestination) && (
        <div className="absolute bottom-28 left-0 right-0 z-30 flex items-center justify-center gap-2 px-4 pointer-events-auto">
          {onCancelPinSelection && (
            <button
              onClick={onCancelPinSelection}
              className="py-3 px-4 rounded-2xl font-bold text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700 shadow-2xl transition active:scale-95 text-xs backdrop-blur-md"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={onConfirmPinLocation}
            className={`flex-1 max-w-xs py-3.5 px-5 rounded-2xl font-bold text-white shadow-2xl flex items-center justify-center gap-2 transform active:scale-95 transition-all text-xs sm:text-sm ${
              isSelectingPickup 
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40 ring-2 ring-emerald-400/50' 
                : 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/40 ring-2 ring-orange-400/50'
            }`}
          >
            <MapPin className="w-4 h-4" />
            {isSelectingPickup ? 'Confirmar Punto de Partida' : 'Confirmar Destino'}
          </button>
        </div>
      )}

      {/* Top Floating Route Badge (Quick tap to center full route on mobile) */}
      {routeCoords.length >= 2 && distanceKm !== undefined && !isSelectingPickup && !isSelectingDestination && (
        <div className="absolute top-32 sm:top-36 left-1/2 -translate-x-1/2 z-15 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-300 max-w-[92vw]">
          <button
            onClick={handleCenterFullRoute}
            className="bg-slate-950/95 hover:bg-slate-900 border border-cyan-500/70 hover:border-cyan-400 text-white px-3.5 py-1.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 transition active:scale-95"
            title="Toca para ver la ruta completa de origen a destino"
          >
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <span className="text-xs font-black text-cyan-300 truncate">
              Ruta: {distanceKm} km • ~{durationMins} min
            </span>
            <span className="text-[10px] text-amber-400 font-bold underline shrink-0 ml-1">
              Ver completa
            </span>
          </button>
        </div>
      )}

      {/* Top Floating Active Drivers / Viewed Indicator */}
      {onlineDrivers && onlineDrivers.length > 0 && !isSelectingPickup && !isSelectingDestination && (
        <div className="absolute top-20 sm:top-24 left-4 z-15 pointer-events-auto flex flex-wrap items-center gap-2 max-w-[90vw]">
          <button
            onClick={handleCenterOnlineDrivers}
            className="bg-slate-950/95 hover:bg-slate-900 border border-emerald-500/60 text-white px-3 py-1.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 transition active:scale-95 text-xs font-bold"
            title="Toca para centrar conductores en línea en el mapa"
          >
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-300 font-extrabold">{onlineDrivers.length} Motos en línea</span>
            <span className="text-[10px] text-slate-400 underline">Ver en mapa</span>
          </button>

          {viewedDrivers && viewedDrivers.length > 0 && rideStatus === 'solicitando' && (
            <div className="bg-amber-950/95 border border-amber-500/80 text-white px-3 py-1.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 animate-bounce text-xs font-bold">
              <span className="text-sm">👀</span>
              <span className="text-amber-300 font-black">
                {viewedDrivers.length} {viewedDrivers.length === 1 ? 'conductor vio tu solicitud' : 'conductores vieron tu solicitud'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Centered Floating Map Controls Dock (Right Side - Vertically Centered) */}
      <div className="absolute top-1/2 -translate-y-1/2 right-3 sm:right-4 z-20 flex flex-col items-end gap-2.5 pointer-events-auto select-none">
        {/* Locate Exact GPS Button */}
        <button
          onClick={onLocateUser}
          className="group relative flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900/95 hover:bg-slate-850 text-white border-2 border-emerald-500/70 hover:border-emerald-400 shadow-2xl backdrop-blur-md transition-all active:scale-95"
          title="Mi Ubicación Exacta (GPS)"
          aria-label="Centrar en mi ubicación GPS"
        >
          <Crosshair className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
          {userLocation && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          )}
          <span className="absolute right-14 bg-slate-950/95 text-slate-100 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-700 whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity hidden md:block">
            Mi Ubicación Exacta
          </span>
        </button>

        {/* Map Types / Layer Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(prev => !prev)}
            className={`group relative flex flex-col items-center justify-center w-12 h-12 rounded-2xl bg-slate-900/95 hover:bg-slate-850 text-white border-2 shadow-2xl backdrop-blur-md transition-all active:scale-95 ${
              showLayerMenu ? 'border-amber-400 bg-slate-800 ring-2 ring-amber-400/40' : 'border-amber-500/70 hover:border-amber-400'
            }`}
            title="Tipos de Mapa (Google Maps, Satélite, Modo Oscuro)"
            aria-label="Seleccionar tipo de mapa"
          >
            <Layers className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-black uppercase text-amber-300 leading-none mt-0.5 tracking-tight">
              {currentLayer === 'google-roads' ? 'Google' : currentLayer === 'google-hybrid' ? 'Satélite' : currentLayer === 'carto-dark' ? 'Oscuro' : 'OSM'}
            </span>
            <span className="absolute right-14 bg-slate-950/95 text-slate-100 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-700 whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity hidden md:block">
              Tipos de Mapa
            </span>
          </button>

          {/* Layer selector popover menu */}
          {showLayerMenu && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowLayerMenu(false)}
              />
              <div className="absolute right-14 top-1/2 -translate-y-1/2 bg-slate-900/95 border border-slate-700 rounded-2xl p-2.5 shadow-2xl min-w-[240px] flex flex-col gap-1.5 z-30 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 px-1">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                    Tipos de Mapa
                  </span>
                  <span className="text-[10px] text-amber-400 font-bold">
                    4 Estilos
                  </span>
                </div>
                {(Object.keys(TILE_LAYERS) as MapTileLayer[]).map(key => (
                  <button
                    key={key}
                    onClick={() => {
                      setCurrentLayer(key);
                      setShowLayerMenu(false);
                    }}
                    className={`text-left text-xs p-2 rounded-xl flex items-center justify-between transition border ${
                      currentLayer === key
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md'
                        : 'text-slate-200 hover:bg-slate-800 border-transparent'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{TILE_LAYERS[key].name}</div>
                      <div className={`text-[10px] ${currentLayer === key ? 'text-slate-900' : 'text-slate-400'}`}>
                        {key === 'google-roads' && 'Calles, avenidas y negocios de Google'}
                        {key === 'google-hybrid' && 'Foto satelital real + calles'}
                        {key === 'carto-dark' && 'Estilo nocturno minimalista'}
                        {key === 'osm-streets' && 'OpenStreetMap estándar'}
                      </div>
                    </div>
                    {currentLayer === key && (
                      <span className="w-5 h-5 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center text-xs font-black shrink-0 ml-2">
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Full Route Centering Button */}
        {routeCoords.length >= 2 && (
          <button
            onClick={handleCenterFullRoute}
            className="group relative flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900/95 hover:bg-slate-850 text-white border-2 border-cyan-500/70 hover:border-cyan-400 shadow-2xl backdrop-blur-md transition-all active:scale-95"
            title="Centrar y ver toda la ruta (Origen a Destino)"
            aria-label="Ver ruta completa"
          >
            <Maximize2 className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="absolute right-14 bg-slate-950/95 text-slate-100 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-700 whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity hidden md:block">
              Ver Ruta Completa
            </span>
          </button>
        )}

        {/* Center Online Drivers Button */}
        {onlineDrivers && onlineDrivers.length > 0 && !driverLocation && (
          <button
            onClick={handleCenterOnlineDrivers}
            className="group relative flex flex-col items-center justify-center w-12 h-12 rounded-2xl bg-slate-900/95 hover:bg-slate-850 text-white border-2 border-emerald-500/70 hover:border-emerald-400 shadow-2xl backdrop-blur-md transition-all active:scale-95"
            title="Ver conductores en línea en el mapa"
            aria-label="Ver conductores en línea"
          >
            <span className="text-base leading-none">🏍️</span>
            <span className="text-[9px] font-black text-emerald-400 leading-none mt-0.5">{onlineDrivers.length}</span>
            <span className="absolute right-14 bg-slate-950/95 text-slate-100 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-700 whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity hidden md:block">
              Ver Motos en Línea ({onlineDrivers.length})
            </span>
          </button>
        )}

        {/* Center Driver Button */}
        {driverLocation && (
          <button
            onClick={handleCenterDriver}
            className="group relative flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900/95 hover:bg-slate-850 text-white border-2 border-amber-500/70 hover:border-amber-400 shadow-2xl backdrop-blur-md transition-all active:scale-95 animate-pulse"
            title="Ver al conductor acercándose en el mapa"
            aria-label="Ver conductor en mapa"
          >
            <Bike className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="absolute right-14 bg-slate-950/95 text-slate-100 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-700 whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity hidden md:block">
              Ver Conductor
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
