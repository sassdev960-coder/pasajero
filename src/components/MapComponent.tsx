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
    name: 'Google Maps'
  },
  'google-hybrid': {
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Satellite',
    name: 'Google Híbrido'
  },
  'carto-dark': {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OSM &copy; CARTO',
    name: 'Modo Oscuro'
  },
  'osm-streets': {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OSM',
    name: 'OpenStreetMap'
  }
};

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

  const driverMarkerRef = useRef<L.Marker | null>(null);
  const driverRoutePolylineRef = useRef<L.Polyline | null>(null);
  const driverRouteBackgroundRef = useRef<L.Polyline | null>(null);
  const driverBadgeMarkerRef = useRef<L.Marker | null>(null);

  const [currentLayer, setCurrentLayer] = useState<MapTileLayer>('google-roads');
  const [showLayerMenu, setShowLayerMenu] = useState(false);

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

    const onlineGroup = L.layerGroup().addTo(map);
    onlineDriversLayerRef.current = onlineGroup;

    mapInstanceRef.current = map;

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
    const handleResize = () => { map.invalidateSize(); };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      map.off('move', handleMove);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    const config = TILE_LAYERS[currentLayer];
    const newLayer = L.tileLayer(config.url, {
      maxZoom: 20,
      subdomains: currentLayer === 'carto-dark' ? 'abcd' : 'abc',
      attribution: config.attribution
    }).addTo(map);
    newLayer.bringToBack();
    tileLayerRef.current = newLayer;
  }, [currentLayer]);

  useEffect(() => {
    if (!mapInstanceRef.current || !flyToTarget) return;
    if (!isValidLoc(flyToTarget)) return;
    mapInstanceRef.current.flyTo([flyToTarget.lat, flyToTarget.lng], 16, { animate: true, duration: 1.2 });
  }, [flyToTarget]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (!userLocation || !isValidLoc(userLocation)) {
      if (userLocationMarkerRef.current) { userLocationMarkerRef.current.remove(); userLocationMarkerRef.current = null; }
      if (userCircleRef.current) { userCircleRef.current.remove(); userCircleRef.current = null; }
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
    const icon = L.divIcon({ html: userHtml, className: 'custom-user-location-marker', iconSize: [40, 40], iconAnchor: [20, 20] });

    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
      userLocationMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon, zIndexOffset: 1500 }).addTo(map);
    }

    if (userCircleRef.current) {
      userCircleRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
      userCircleRef.current = L.circle([userLocation.lat, userLocation.lng], {
        radius: 45, color: '#3b82f6', fillColor: '#60a5fa', fillOpacity: 0.12, weight: 1.5
      }).addTo(map);
    }
  }, [userLocation]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    if (!origin || !isValidLoc(origin)) {
      if (originMarkerRef.current) { originMarkerRef.current.remove(); originMarkerRef.current = null; }
      return;
    }
    const pickupHtml = `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-8 h-8 rounded-full bg-emerald-500/30 animate-ping"></div>
        <div class="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-[11px] font-bold">A</div>
      </div>
    `;
    const icon = L.divIcon({ html: pickupHtml, className: 'custom-pickup-marker', iconSize: [28, 28], iconAnchor: [14, 14] });
    if (originMarkerRef.current) originMarkerRef.current.setLatLng([origin.lat, origin.lng]);
    else originMarkerRef.current = L.marker([origin.lat, origin.lng], { icon, zIndexOffset: 1000 }).addTo(map);
  }, [origin]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    if (!destination || !isValidLoc(destination)) {
      if (destMarkerRef.current) { destMarkerRef.current.remove(); destMarkerRef.current = null; }
      return;
    }
    const destHtml = `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-8 h-8 rounded-full bg-orange-500/30 animate-ping"></div>
        <div class="w-6 h-6 rounded-full bg-orange-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-[11px] font-bold">B</div>
      </div>
    `;
    const icon = L.divIcon({ html: destHtml, className: 'custom-dest-marker', iconSize: [28, 28], iconAnchor: [14, 14] });
    if (destMarkerRef.current) destMarkerRef.current.setLatLng([destination.lat, destination.lng]);
    else destMarkerRef.current = L.marker([destination.lat, destination.lng], { icon, zIndexOffset: 1000 }).addTo(map);
  }, [destination]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (routePolylineRef.current) { routePolylineRef.current.remove(); routePolylineRef.current = null; }
    if (routeBackgroundRef.current) { routeBackgroundRef.current.remove(); routeBackgroundRef.current = null; }
    if (routeBadgeMarkerRef.current) { routeBadgeMarkerRef.current.remove(); routeBadgeMarkerRef.current = null; }

    if (!Array.isArray(routeCoords)) return;
    const validCoords = routeCoords.filter(isValidTuple);
    if (validCoords.length < 2) return;

    const latLngs: L.LatLngExpression[] = validCoords.map(c => [c[0], c[1]]);

    routeBackgroundRef.current = L.polyline(latLngs, {
      color: '#0f172a', weight: 8, opacity: 0.85, lineCap: 'round', lineJoin: 'round'
    }).addTo(map);

    routePolylineRef.current = L.polyline(latLngs, {
      color: '#06b6d4', weight: 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round'
    }).addTo(map);

    // Badge de ETA en midpoint (opcional, sutil)
    if (durationMins && distanceKm) {
      const midPoint = latLngs[Math.floor(latLngs.length / 2)] as [number, number];
      if (isValidTuple(midPoint)) {
        const badgeHtml = `
          <div class="px-2 py-0.5 rounded-full bg-slate-950/90 border border-cyan-400/60 shadow-xl backdrop-blur-md flex items-center gap-1 whitespace-nowrap pointer-events-none transform -translate-y-2 select-none">
            <span class="text-[10px] font-black text-cyan-300 tracking-tight">${durationMins} min</span>
          </div>
        `;
        const badgeIcon = L.divIcon({ html: badgeHtml, className: 'route-midpoint-badge', iconSize: [60, 20], iconAnchor: [30, 10] });
        routeBadgeMarkerRef.current = L.marker(midPoint, { icon: badgeIcon, zIndexOffset: 950 }).addTo(map);
      }
    }

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

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    if (driverRoutePolylineRef.current) { driverRoutePolylineRef.current.remove(); driverRoutePolylineRef.current = null; }
    if (driverRouteBackgroundRef.current) { driverRouteBackgroundRef.current.remove(); driverRouteBackgroundRef.current = null; }
    if (driverBadgeMarkerRef.current) { driverBadgeMarkerRef.current.remove(); driverBadgeMarkerRef.current = null; }

    if (!Array.isArray(driverRouteCoords)) return;
    const validDriverCoords = driverRouteCoords.filter(isValidTuple);
    if (validDriverCoords.length < 2) return;

    const latLngs: L.LatLngExpression[] = validDriverCoords.map(c => [c[0], c[1]]);

    driverRouteBackgroundRef.current = L.polyline(latLngs, {
      color: '#0f172a', weight: 8, opacity: 0.85, lineCap: 'round', lineJoin: 'round'
    }).addTo(map);

    driverRoutePolylineRef.current = L.polyline(latLngs, {
      color: '#f59e0b', weight: 5, opacity: 0.95, dashArray: '8, 8', lineCap: 'round', lineJoin: 'round'
    }).addTo(map);
  }, [driverRouteCoords, driverDistanceMeters]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    if (!driverLocation || !isValidLoc(driverLocation)) {
      if (driverMarkerRef.current) { driverMarkerRef.current.remove(); driverMarkerRef.current = null; }
      return;
    }

    const driverHtml = `
      <div class="relative flex flex-col items-center select-none">
        <div class="absolute -top-1 w-10 h-10 rounded-full bg-amber-400/35 animate-ping"></div>
        <div class="w-9 h-9 rounded-full bg-amber-500 border-2 border-slate-900 shadow-2xl flex items-center justify-center text-slate-950 font-black text-sm z-10">🏍️</div>
      </div>
    `;
    const icon = L.divIcon({ html: driverHtml, className: 'custom-driver-marker', iconSize: [60, 40], iconAnchor: [30, 18] });

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([driverLocation.lat, driverLocation.lng]);
      driverMarkerRef.current.setIcon(icon);
    } else {
      driverMarkerRef.current = L.marker([driverLocation.lat, driverLocation.lng], { icon, zIndexOffset: 1200 }).addTo(map);
    }
  }, [driverLocation, assignedDriver]);

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

  const handleCenterDriver = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const pts: L.LatLngTuple[] = [];
    if (driverLocation && isValidLoc(driverLocation)) pts.push([driverLocation.lat, driverLocation.lng]);
    if (origin && isValidLoc(origin)) pts.push([origin.lat, origin.lng]);
    if (pts.length < 1) return;
    const isMobile = window.innerWidth < 768;
    if (pts.length === 1) { mapInstanceRef.current.flyTo(pts[0], 16, { animate: true, duration: 1 }); return; }
    const bounds = L.latLngBounds(pts);
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, {
        paddingTopLeft: isMobile ? [20, 80] : [50, 80],
        paddingBottomRight: isMobile ? [20, 200] : [50, 240],
        maxZoom: 17
      });
    }
  }, [driverLocation, origin]);

  // ── Render conductores online con efecto "en vivo" ──
  useEffect(() => {
    if (!mapInstanceRef.current || !onlineDriversLayerRef.current) return;
    const layerGroup = onlineDriversLayerRef.current;
    layerGroup.clearLayers();

    if (!Array.isArray(onlineDrivers) || onlineDrivers.length === 0) return;

    onlineDrivers.forEach(driver => {
      if (!driver || !isValidNum(driver.lat) || !isValidNum(driver.lng)) return;
      if (!isValidLoc({ lat: driver.lat, lng: driver.lng })) return;
      if (assignedDriver && driver.id === assignedDriver.id) return;

      const hasViewed = viewedDrivers?.some(v =>
        (typeof v === 'string' && v === driver.id) ||
        (typeof v === 'object' && v?.driver_id === driver.id)
      );

      const firstName = (driver.full_name || 'Conductor').split(' ')[0];

      const driverHtml = `
        <div class="relative flex flex-col items-center select-none cursor-pointer group">
          <div class="absolute -top-1 w-10 h-10 rounded-full ${hasViewed ? 'bg-amber-400/50 animate-ping' : 'bg-emerald-400/30 animate-ping'}"></div>
          <div class="w-9 h-9 rounded-full ${
            hasViewed
              ? 'bg-amber-500 border-2 border-slate-900 shadow-amber-500/50 shadow-lg text-slate-950 scale-110'
              : 'bg-slate-900 border-2 border-emerald-400 shadow-emerald-500/30 shadow-lg text-emerald-400'
          } flex items-center justify-center text-base font-bold transition-all duration-200 group-hover:scale-125 z-10">
            ${hasViewed ? '👀' : '🏍️'}
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: driverHtml,
        className: 'custom-online-driver-marker',
        iconSize: [60, 48],
        iconAnchor: [30, 18]
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
              <div style="font-weight: 700; font-size: 12px; color: #fff;">${driver.full_name}</div>
              <div style="font-size: 10px; color: #34d399; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                <span style="display:inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: #34d399;"></span>
                ${hasViewed ? 'Viendo tu solicitud' : 'En línea'}
              </div>
            </div>
          </div>
          <div style="margin-top: 6px; font-size: 11px; color: #cbd5e1; line-height: 1.4;">
            <div>🏍️ <span style="font-weight: 600; color: #f8fafc;">${driver.vehicle_model || 'Motocicleta'}</span></div>
            <div>🏷️ Placa: <span style="font-family: monospace; font-weight: 700; color: #fbbf24;">${driver.vehicle_plate || 'SCZ'}</span></div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { className: 'driver-popup-card', closeButton: false, offset: [0, -10] });
      marker.addTo(layerGroup);
    });
  }, [onlineDrivers, viewedDrivers, assignedDriver, rideStatus]);

  const handleCenterOnlineDrivers = useCallback(() => {
    if (!mapInstanceRef.current || !Array.isArray(onlineDrivers) || onlineDrivers.length === 0) return;
    const pts: L.LatLngTuple[] = [];
    if (origin && isValidLoc(origin)) pts.push([origin.lat, origin.lng]);
    onlineDrivers.forEach(d => {
      if (d.lat && d.lng && isValidLoc({ lat: d.lat, lng: d.lng })) pts.push([d.lat, d.lng]);
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
      <div ref={mapContainerRef} className="w-full h-full bg-slate-900 z-0" />

      {/* Pin central para selección */}
      {(isSelectingPickup || isSelectingDestination) && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-20 pb-16">
          <div className="bg-slate-900/95 border border-slate-700 text-white px-3.5 py-2 rounded-xl shadow-2xl flex flex-col items-center mb-2 animate-bounce max-w-[260px] text-center backdrop-blur-md">
            <span className="text-[11px] font-medium tracking-wide uppercase text-slate-400">
              {isSelectingPickup ? '🟢 Fijar Punto de Partida' : '🟠 Fijar Punto de Destino'}
            </span>
            <span className="text-xs font-bold text-slate-100 truncate w-full">
              {isGeocodingCenter ? 'Localizando dirección...' : centerAddress}
            </span>
          </div>
          <div className="relative flex items-center justify-center">
            <div className={`w-8 h-8 rounded-full ${isSelectingPickup ? 'bg-emerald-500' : 'bg-orange-500'} border-2 border-white shadow-2xl flex items-center justify-center text-white`}>
              <MapPin className="w-5 h-5 drop-shadow" />
            </div>
            <div className="absolute -bottom-2 w-2 h-2 rounded-full bg-black/60 shadow" />
          </div>
        </div>
      )}

      {(isSelectingPickup || isSelectingDestination) && (
        <div className="absolute bottom-28 left-0 right-0 z-30 flex items-center justify-center gap-2 px-4 pointer-events-auto">
          {onCancelPinSelection && (
            <button
              onClick={onCancelPinSelection}
              className="py-3 px-4 rounded-2xl font-bold text-slate-300 bg-slate-900/90 border border-slate-700 shadow-2xl text-xs backdrop-blur-md"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={onConfirmPinLocation}
            className={`flex-1 max-w-xs py-3.5 px-5 rounded-2xl font-bold text-white shadow-2xl flex items-center justify-center gap-2 text-xs sm:text-sm ${
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

      {/* Controles del mapa (compactos, sin badges flotantes) */}
      <div className="absolute top-1/2 -translate-y-1/2 right-3 z-20 flex flex-col items-end gap-2.5 pointer-events-auto select-none">
        {/* GPS */}
        <button
          onClick={onLocateUser}
          className="group relative flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900/95 hover:bg-slate-850 text-white border-2 border-emerald-500/70 shadow-2xl backdrop-blur-md transition-all active:scale-95"
          title="Mi Ubicación Exacta"
        >
          <Crosshair className="w-6 h-6 text-emerald-400" />
        </button>

        {/* Capas */}
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(prev => !prev)}
            className={`group relative flex flex-col items-center justify-center w-12 h-12 rounded-2xl bg-slate-900/95 text-white border-2 shadow-2xl backdrop-blur-md transition-all active:scale-95 ${
              showLayerMenu ? 'border-amber-400 bg-slate-800' : 'border-amber-500/70'
            }`}
            title="Tipos de Mapa"
          >
            <Layers className="w-5 h-5 text-amber-400" />
            <span className="text-[9px] font-black uppercase text-amber-300 leading-none mt-0.5">
              {currentLayer === 'google-roads' ? 'Google' : currentLayer === 'google-hybrid' ? 'Satélite' : currentLayer === 'carto-dark' ? 'Oscuro' : 'OSM'}
            </span>
          </button>

          {showLayerMenu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowLayerMenu(false)} />
              <div className="absolute right-14 top-1/2 -translate-y-1/2 bg-slate-900/95 border border-slate-700 rounded-2xl p-2.5 shadow-2xl min-w-[240px] flex flex-col gap-1.5 z-30 backdrop-blur-md">
                <div className="text-xs font-black uppercase tracking-wider text-slate-300 px-1 pb-1.5 border-b border-slate-800">
                  Tipos de Mapa
                </div>
                {(Object.keys(TILE_LAYERS) as MapTileLayer[]).map(key => (
                  <button
                    key={key}
                    onClick={() => { setCurrentLayer(key); setShowLayerMenu(false); }}
                    className={`text-left text-xs p-2 rounded-xl flex items-center justify-between transition border ${
                      currentLayer === key
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                        : 'text-slate-200 hover:bg-slate-800 border-transparent'
                    }`}
                  >
                    <span className="font-bold">{TILE_LAYERS[key].name}</span>
                    {currentLayer === key && <span className="w-4 h-4 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center text-xs font-black">✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Ver ruta completa */}
        {routeCoords.length >= 2 && (
          <button
            onClick={handleCenterFullRoute}
            className="group relative flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900/95 text-white border-2 border-cyan-500/70 shadow-2xl backdrop-blur-md transition-all active:scale-95"
            title="Ver ruta completa"
          >
            <Maximize2 className="w-6 h-6 text-cyan-400" />
          </button>
        )}

        {/* Centrar motos online */}
        {onlineDrivers && onlineDrivers.length > 0 && !driverLocation && (
          <button
            onClick={handleCenterOnlineDrivers}
            className="group relative flex flex-col items-center justify-center w-12 h-12 rounded-2xl bg-slate-900/95 text-white border-2 border-emerald-500/70 shadow-2xl backdrop-blur-md transition-all active:scale-95"
            title="Ver motos en línea"
          >
            <span className="text-base leading-none">🏍️</span>
            <span className="text-[9px] font-black text-emerald-400 leading-none mt-0.5">{onlineDrivers.length}</span>
          </button>
        )}

        {/* Centrar conductor asignado */}
        {driverLocation && (
          <button
            onClick={handleCenterDriver}
            className="group relative flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900/95 text-white border-2 border-amber-500/70 shadow-2xl backdrop-blur-md transition-all active:scale-95 animate-pulse"
            title="Ver conductor"
          >
            <Bike className="w-6 h-6 text-amber-400" />
          </button>
        )}
      </div>
    </div>
  );
};
