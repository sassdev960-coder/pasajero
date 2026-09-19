import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { LatLng, PointOfInterest, RideRequest, Driver, PricingConfig, SupabaseDriver, SupabasePassenger, DriverViewInfo } from './types';
import { calculateRoute, calculateFare } from './services/routingService';
import { reverseGeocode, detectUserLocationViaIP } from './services/geocodingService';
import { POPULAR_LANDMARKS } from './data/landmarks';
import { MapComponent } from './components/MapComponent';
import { Header } from './components/Header';
import { BottomSheet } from './components/BottomSheet';
import { SearchOverlay } from './components/SearchOverlay';
import { DriverPanel } from './components/DriverPanel';
import { WaitingDriverPanel } from './components/WaitingDriverPanel';
import { PaymentModal } from './components/PaymentModal';
import { RatingModal } from './components/RatingModal';
import { HistoryModal } from './components/HistoryModal';
import { AnalysisModal } from './components/AnalysisModal';
import { CityPickerModal, CityOption } from './components/CityPickerModal';
import { SupabaseModal } from './components/SupabaseModal';
import { PassengerModal } from './components/PassengerModal';
import { DebugConsole } from './components/DebugConsole';
import { 
  isSupabaseConfigured, 
  createRideInSupabase, 
  subscribeToRideChanges, 
  updateRideStatusInSupabase, 
  getCurrentPassenger,
  fetchPricingConfigFromSupabase,
  subscribeToPricingConfig,
  getCachedPricingConfig,
  subscribeToOnlineDrivers,
  submitDriverRating,
  uploadCargoPhoto,
  findClosestOnlineDriver,
  getSupabase,
  createGhostPassengerIfNeeded
} from './services/supabaseClient';

const DEFAULT_CENTER: LatLng = { lat: -17.7833, lng: -63.1821 };
const ANDROID_PACKAGE_NAME = 'com.motomovil.pasajero';

export default function App() {
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<LatLng | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'locating' | 'gps' | 'ip' | 'default'>('locating');
  const [statusNotification, setStatusNotification] = useState<string | null>('Obteniendo tu ubicación actual...');

  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [originAddress, setOriginAddress] = useState<string>('');
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [destinationAddress, setDestinationAddress] = useState<string>('');

  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [durationMins, setDurationMins] = useState<number>(0);
  const [routeSummary, setRouteSummary] = useState<string>('Ruta calculada en tiempo real');

  const [isSelectingPickup, setIsSelectingPickup] = useState(false);
  const [isSelectingDestination, setIsSelectingDestination] = useState(false);
  const [currentCenter, setCurrentCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [centerAddress, setCenterAddress] = useState<string>('Buscando dirección...');
  const [isGeocodingCenter, setIsGeocodingCenter] = useState(false);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPickingOriginInSearch, setIsPickingOriginInSearch] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<Array<{ name: string; address: string; lat: number; lng: number }>>([]);

  const [hasCargo, setHasCargo] = useState(false);
  const [cargoDescription, setCargoDescription] = useState('');
  const [cargoPhotoUrl, setCargoPhotoUrl] = useState<string | null>(null);
  const [cargoPhotoFile, setCargoPhotoFile] = useState<File | null>(null);

  const [activeRide, setActiveRide] = useState<RideRequest | null>(null);
  const [isSubmittingRide, setIsSubmittingRide] = useState(false);
  const [rideStatus, setRideStatus] = useState<'draft' | 'solicitando' | 'asignado' | 'en_camino' | 'llegado_origen' | 'en_curso' | 'completado'>('draft');
  const [etaMinutes, setEtaMinutes] = useState(3);
  const [assignedDriver, setAssignedDriver] = useState<Driver | null>(null);
  const [driverLocation, setDriverLocation] = useState<LatLng | null>(null);
  const [driverRouteCoords, setDriverRouteCoords] = useState<[number, number][]>([]);
  const [driverDistanceMeters, setDriverDistanceMeters] = useState<number>(0);

  const [panelExpanded, setPanelExpanded] = useState(false);

  const [onlineDrivers, setOnlineDrivers] = useState<SupabaseDriver[]>([]);
  const [viewedDrivers, setViewedDrivers] = useState<DriverViewInfo[]>([]);

  // 🔔 Estado de notificaciones
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isCityPickerOpen, setIsCityPickerOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isPassengerModalOpen, setIsPassengerModalOpen] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [currentPassenger, setCurrentPassenger] = useState<SupabasePassenger | null>(null);
  const [history, setHistory] = useState<RideRequest[]>([]);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(getCachedPricingConfig());

  const rideSubRef = useRef<(() => void) | null>(null);
  const geocodeTimerRef = useRef<any>(null);
  const hasCenteredInitialRef = useRef(false);
  const pushSetupDoneRef = useRef(false);
  const ghostCreationStartedRef = useRef(false);

  // ═══════════════════════════════════════════════════════════════
  //  NOTIFICACIONES PUSH
  // ═══════════════════════════════════════════════════════════════
  const checkNotificationPermission = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const result = await PushNotifications.checkPermissions();
      setNotificationsEnabled(result.receive === 'granted');
    } catch (e) {
      console.warn('Error verificando permisos:', e);
    }
  }, []);

  const setupPushNotificationsForPassenger = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log('ℹ️ PushNotifications: modo web, no se configura');
      return;
    }

    try {
      await PushNotifications.createChannel({
        id: 'passenger_updates',
        name: 'Actualizaciones de Viaje',
        description: 'Estado de tus viajes (conductor asignado, llegada, etc.)',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#ff7a00'
      });
      console.log('📢 Canal passenger_updates creado');
    } catch (e) {
      console.warn('⚠️ Error creando canal push:', e);
    }

    // Verificar estado actual sin forzar diálogo
    await checkNotificationPermission();

    if (pushSetupDoneRef.current) {
      console.log('ℹ️ Listeners ya configurados');
      return;
    }
    pushSetupDoneRef.current = true;

    // Pedir permiso
    try {
      const checkResult = await PushNotifications.checkPermissions();
      let perm = checkResult;

      if (checkResult.receive !== 'granted') {
        console.log('🔔 Solicitando permiso de notificaciones...');
        perm = await PushNotifications.requestPermissions();
      }

      setNotificationsEnabled(perm.receive === 'granted');

      if (perm.receive !== 'granted') {
        console.warn('❌ Permiso denegado');
        return;
      }

      console.log('✅ Permiso concedido, registrando dispositivo...');
      await PushNotifications.register();
    } catch (e) {
      console.error('❌ Error en registro push:', e);
      return;
    }

    PushNotifications.addListener('registration', async (token) => {
      console.log('📱 Token FCM:', token.value.substring(0, 25) + '...');
      const passenger = getCurrentPassenger();
      if (!passenger?.id) {
        localStorage.setItem('motocampeon_passenger_fcm_token', token.value);
        return;
      }
      try {
        const client = getSupabase();
        if (client) {
          const { error } = await client.rpc('save_passenger_fcm_token', {
            p_passenger_id: passenger.id,
            p_fcm_token: token.value
          });
          if (!error) console.log('✅ Token guardado en Supabase');
        }
      } catch (e) { console.error('❌ Error guardando token:', e); }
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('❌ Error FCM:', JSON.stringify(error));
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('👆 Notificación tocada:', notification);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('🔔 Push en foreground:', notification.title);
    });
  }, [checkNotificationPermission]);

  // ═══════════════════════════════════════════════════════════════
  //  🔔 TOGGLE / REACTIVAR PERMISOS DE NOTIFICACIÓN
  // ═══════════════════════════════════════════════════════════════
  const handleToggleNotifications = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      setStatusNotification('Solo disponible en la app');
      setTimeout(() => setStatusNotification(null), 2000);
      return;
    }

    try {
      // 1. Verificar estado actual
      const current = await PushNotifications.checkPermissions();
      console.log('📋 Estado actual:', current.receive);

      // 2. Si ya está concedido → toast informativo
      if (current.receive === 'granted') {
        setStatusNotification('✅ Notificaciones ya activadas');
        setTimeout(() => setStatusNotification(null), 2500);
        setNotificationsEnabled(true);
        return;
      }

      // 3. Si está denegado → intentar pedir de nuevo
      console.log('🔔 Re-solicitando permiso...');
      const result = await PushNotifications.requestPermissions();
      console.log('📋 Resultado:', result.receive);

      if (result.receive === 'granted') {
        setNotificationsEnabled(true);
        setStatusNotification('✅ ¡Notificaciones activadas!');
        setTimeout(() => setStatusNotification(null), 2500);
        // Registrar de nuevo
        await PushNotifications.register();
      } else {
        // 4. Si Android no muestra el diálogo (denegado permanente) → abrir ajustes
        setNotificationsEnabled(false);
        const shouldOpenSettings = confirm(
          '🔔 Notificaciones desactivadas\n\n' +
          'Android ya no puede mostrar el diálogo porque las denegaste antes.\n\n' +
          'Para activarlas:\n' +
          '1. Ve a Ajustes del celular\n' +
          '2. Aplicaciones → Moto Móvil Pasajero\n' +
          '3. Notificaciones → Permitir\n\n' +
          '¿Quieres que intente abrir los ajustes ahora?'
        );
        if (shouldOpenSettings) {
          try {
            // Intento abrir ajustes de la app vía intent scheme (Android)
            window.location.href = `intent:#Intent;action=android.settings.APP_NOTIFICATION_SETTINGS;` +
              `S.package=${ANDROID_PACKAGE_NAME};end`;
          } catch (e) {
            alert(
              '📱 Abre manualmente:\n\n' +
              'Ajustes → Aplicaciones → Moto Móvil Pasajero → Notificaciones'
            );
          }
        }
      }
    } catch (e) {
      console.error('Error toggling notificaciones:', e);
      setStatusNotification('❌ Error al gestionar permisos');
      setTimeout(() => setStatusNotification(null), 2500);
    }
  }, []);

  const savePendingPushToken = useCallback(async (passengerId: string) => {
    const pendingToken = localStorage.getItem('motocampeon_passenger_fcm_token');
    if (!pendingToken) return;
    try {
      const client = getSupabase();
      if (client) {
        const { error } = await client.rpc('save_passenger_fcm_token', {
          p_passenger_id: passengerId,
          p_fcm_token: pendingToken
        });
        if (!error) {
          console.log('✅ Token pendiente guardado');
          localStorage.removeItem('motocampeon_passenger_fcm_token');
        }
      }
    } catch (e) { console.warn('Error guardando token pendiente:', e); }
  }, []);

  const applyOriginLocation = useCallback(async (coords: LatLng, fly = true) => {
    const lat = Number(coords?.lat);
    const lng = Number(coords?.lng);
    if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) return;
    const safeCoords: LatLng = { lat, lng };
    setOrigin(safeCoords);
    setCurrentCenter(safeCoords);
    if (fly) setFlyToTarget({ ...safeCoords });
    const geo = await reverseGeocode(safeCoords.lat, safeCoords.lng);
    setOriginAddress(geo.address);
  }, []);

  useEffect(() => {
    const activePassenger = getCurrentPassenger();
    if (activePassenger) setCurrentPassenger(activePassenger);

    try {
      const saved = localStorage.getItem('motocampeon_history');
      if (saved) setHistory(JSON.parse(saved));
    } catch {}

    setIsSupabaseConnected(isSupabaseConfigured());

    // 👻 Auto-crear cuenta fantasma
    if (!activePassenger && !ghostCreationStartedRef.current && isSupabaseConfigured()) {
      ghostCreationStartedRef.current = true;
      createGhostPassengerIfNeeded().then(p => {
        if (p) {
          setCurrentPassenger(p);
          savePendingPushToken(p.id);
          setTimeout(() => { setupPushNotificationsForPassenger(); }, 300);
        } else setTimeout(() => setupPushNotificationsForPassenger(), 500);
      });
    } else if (activePassenger) {
      savePendingPushToken(activePassenger.id);
      setTimeout(() => setupPushNotificationsForPassenger(), 500);
    } else {
      setTimeout(() => setupPushNotificationsForPassenger(), 800);
    }

    let watchId: number | null = null;

    const onLocationResolved = async (coords: LatLng, method: 'gps' | 'ip') => {
      const lat = Number(coords?.lat);
      const lng = Number(coords?.lng);
      if (isNaN(lat) || isNaN(lng)) return;
      const safeCoords: LatLng = { lat, lng };
      setUserLocation(safeCoords);
      setGpsStatus(method);
      if (!hasCenteredInitialRef.current) {
        hasCenteredInitialRef.current = true;
        setFlyToTarget(safeCoords);
        await applyOriginLocation(safeCoords, true);
        setStatusNotification(method === 'gps' ? '📍 Ubicación GPS detectada' : '📍 Ubicación detectada');
        setTimeout(() => setStatusNotification(null), 4500);
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => onLocationResolved({ lat: pos.coords.latitude, lng: pos.coords.longitude }, 'gps'),
        async () => {
          const ipLoc = await detectUserLocationViaIP();
          if (ipLoc) onLocationResolved({ lat: ipLoc.lat, lng: ipLoc.lng }, 'ip');
          else if (!hasCenteredInitialRef.current) {
            hasCenteredInitialRef.current = true;
            setGpsStatus('default');
            applyOriginLocation(DEFAULT_CENTER, true);
          }
        },
        { enableHighAccuracy: true, timeout: 4000 }
      );
      try {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const lat = Number(pos?.coords?.latitude);
            const lng = Number(pos?.coords?.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
              const fresh = { lat, lng };
              setUserLocation(fresh);
              if (!hasCenteredInitialRef.current) onLocationResolved(fresh, 'gps');
            }
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 8000 }
        );
      } catch {}
    }

    const fallbackTimer = setTimeout(async () => {
      if (!hasCenteredInitialRef.current) {
        const ipLoc = await detectUserLocationViaIP();
        if (ipLoc) onLocationResolved({ lat: ipLoc.lat, lng: ipLoc.lng }, 'ip');
        else if (!hasCenteredInitialRef.current) {
          hasCenteredInitialRef.current = true;
          setGpsStatus('default');
          applyOriginLocation(DEFAULT_CENTER, true);
        }
      }
    }, 2200);

    return () => {
      clearTimeout(fallbackTimer);
      if (watchId !== null && 'geolocation' in navigator) navigator.geolocation.clearWatch(watchId);
    };
  }, [applyOriginLocation, setupPushNotificationsForPassenger, savePendingPushToken]);

  useEffect(() => {
    fetchPricingConfigFromSupabase().then(setPricingConfig);
    const unsubPricing = subscribeToPricingConfig((newCfg) => setPricingConfig(newCfg));
    return () => unsubPricing();
  }, []);

  useEffect(() => {
    const centerPoint = origin || userLocation || DEFAULT_CENTER;
    const unsubDrivers = subscribeToOnlineDrivers((drivers) => setOnlineDrivers(drivers), centerPoint);
    return () => unsubDrivers();
  }, [origin, userLocation]);

  useEffect(() => {
    if (!origin || !destination) {
      setRouteCoords([]); setDistanceKm(0); setDurationMins(0);
      return;
    }
    let isMounted = true;
    const compute = async () => {
      const route = await calculateRoute(origin, destination);
      if (isMounted) {
        setRouteCoords(route.coordinates);
        setDistanceKm(route.distanceKm);
        setDurationMins(route.durationMinutes);
        setRouteSummary(route.summary);
      }
    };
    compute();
    return () => { isMounted = false; };
  }, [origin, destination]);

  const handleMapMoved = useCallback((newCenter: LatLng) => {
    const lat = Number(newCenter?.lat);
    const lng = Number(newCenter?.lng);
    if (isNaN(lat) || isNaN(lng)) return;
    const safeCenter: LatLng = { lat, lng };
    setCurrentCenter(safeCenter);
    if (!isSelectingPickup && !isSelectingDestination) return;
    clearTimeout(geocodeTimerRef.current);
    setIsGeocodingCenter(true);
    geocodeTimerRef.current = setTimeout(async () => {
      const res = await reverseGeocode(safeCenter.lat, safeCenter.lng);
      setCenterAddress(res.address);
      setIsGeocodingCenter(false);
    }, 400);
  }, [isSelectingPickup, isSelectingDestination]);

  const handleConfirmPinLocation = async () => {
    const lat = Number(currentCenter?.lat);
    const lng = Number(currentCenter?.lng);
    if (isNaN(lat) || isNaN(lng)) return;
    const safeCenter: LatLng = { lat, lng };
    const geo = await reverseGeocode(safeCenter.lat, safeCenter.lng);
    if (isSelectingPickup) {
      setOrigin(safeCenter); setOriginAddress(geo.address); setIsSelectingPickup(false);
      if (!destination) setTimeout(() => setIsSearchOpen(true), 300);
    } else if (isSelectingDestination) {
      setDestination(safeCenter); setDestinationAddress(geo.address); setIsSelectingDestination(false);
    }
  };

  const handleSelectPOIAsTarget = (poi: PointOfInterest, asOrigin: boolean) => {
    const lat = Number(poi?.lat);
    const lng = Number(poi?.lng);
    if (isNaN(lat) || isNaN(lng)) return;
    const coords: LatLng = { lat, lng };
    const label = `${poi.name}, ${poi.address}`;
    if (asOrigin) { setOrigin(coords); setOriginAddress(label); setFlyToTarget(coords); }
    else { setDestination(coords); setDestinationAddress(label); setFlyToTarget(coords); }
    addRecentSearch({ name: poi.name, address: poi.address, lat, lng });
  };

  const addRecentSearch = (item: { name: string; address: string; lat: number; lng: number }) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(p => p.name !== item.name);
      return [item, ...filtered].slice(0, 5);
    });
  };

  const handleLocateUser = () => {
    setStatusNotification('Buscando señal GPS...');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = Number(pos?.coords?.latitude);
          const lng = Number(pos?.coords?.longitude);
          if (isNaN(lat) || isNaN(lng)) return;
          const userCoords: LatLng = { lat, lng };
          setUserLocation(userCoords);
          setFlyToTarget({ ...userCoords });
          setGpsStatus('gps');
          if (isSelectingPickup || !origin) await applyOriginLocation(userCoords, false);
          setStatusNotification('📍 Centrado');
          setTimeout(() => setStatusNotification(null), 3000);
        },
        async () => {
          if (userLocation) setFlyToTarget({ ...userLocation });
          else {
            const ipLoc = await detectUserLocationViaIP();
            if (ipLoc) {
              const c: LatLng = { lat: ipLoc.lat, lng: ipLoc.lng };
              setUserLocation(c); setFlyToTarget(c);
              await applyOriginLocation(c, false);
            } else setIsCityPickerOpen(true);
          }
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      if (userLocation) setFlyToTarget({ ...userLocation });
      else setIsCityPickerOpen(true);
    }
  };

  const handleSelectCity = async (city: CityOption) => {
    setUserLocation(city.coords); setFlyToTarget(city.coords);
    await applyOriginLocation(city.coords, true);
    setDestination(null); setDestinationAddress('');
    setStatusNotification(`📍 ${city.name}`);
    setTimeout(() => setStatusNotification(null), 3000);
  };

  const handleSwapLocations = () => {
    const tempCoords = origin, tempAddr = originAddress;
    setOrigin(destination); setOriginAddress(destinationAddress);
    setDestination(tempCoords); setDestinationAddress(tempAddr);
    if (destination) setFlyToTarget(destination);
  };

  const handleClearDestination = () => {
    setDestination(null); setDestinationAddress('');
    setRouteCoords([]); setDistanceKm(0); setDurationMins(0);
    setStatusNotification('Ruta cancelada');
    setTimeout(() => setStatusNotification(null), 2000);
  };

  const handleCenterOnlineDrivers = () => {
    // Placeholder — el botón "Ver en mapa" del panel
  };

  const handleRequestRide = async (rideType: 'moto' | 'express' = 'moto', customPrice?: number) => {
    if (!origin || !destination) return;
    setIsSubmittingRide(true);
    const fare = calculateFare(distanceKm, hasCargo, pricingConfig);
    const finalPrice = customPrice !== undefined ? customPrice : fare.motoFare;

    let targetDriverId: string | null = null;
    if (isSupabaseConfigured()) {
      setStatusNotification('🔍 Buscando conductor...');
      try {
        const closest = await findClosestOnlineDriver(origin, 3.0);
        if (closest.found && closest.driver_id) targetDriverId = closest.driver_id;
      } catch (err) { console.warn(err); }
      setTimeout(() => setStatusNotification(null), 2500);
    }

    let rideId = 'ride-' + Date.now();
    let finalCargoPhotoUrl: string | undefined;
    if (hasCargo && cargoPhotoFile && isSupabaseConfigured()) {
      const uploaded = await uploadCargoPhoto(cargoPhotoFile, rideId);
      if (uploaded) finalCargoPhotoUrl = uploaded;
    } else if (hasCargo && cargoPhotoUrl && !cargoPhotoUrl.startsWith('blob:')) {
      finalCargoPhotoUrl = cargoPhotoUrl;
    }

    const newRide: RideRequest = {
      id: rideId, origin, originAddress, destination, destinationAddress,
      price: finalPrice, distanceKm, durationMins,
      status: 'solicitando', hasCargo,
      cargoDescription: hasCargo ? cargoDescription : undefined,
      cargoPhotoUrl: finalCargoPhotoUrl,
      createdAt: new Date().toISOString()
    };

    setViewedDrivers([]);
    setPanelExpanded(false);

    if (isSupabaseConfigured()) {
      const { ride: dbRide, error } = await createRideInSupabase({
        origin, originAddress, destination, destinationAddress,
        price: finalPrice, distanceKm, durationMins,
        hasCargo, cargoDescription, cargoPhotoUrl: finalCargoPhotoUrl,
        passengerName: currentPassenger?.full_name || undefined,
        passengerPhone: currentPassenger?.phone || undefined,
        targetDriverId
      });

      if (dbRide) {
        newRide.id = dbRide.id;
        setStatusNotification('✅ Solicitud enviada');
        setTimeout(() => setStatusNotification(null), 2500);
        if (rideSubRef.current) rideSubRef.current();

        const unsub = subscribeToRideChanges(dbRide.id, (updatedRide, driverInfo, newViewedDrivers) => {
          if (newViewedDrivers) setViewedDrivers(newViewedDrivers);
          if (updatedRide.status === 'aceptado') {
            setRideStatus(prev => {
              if (prev !== 'solicitando' && prev !== 'asignado') return prev;
              const dLat = Number(driverInfo?.lat);
              const dLng = Number(driverInfo?.lng);
              const hasRealLoc = !isNaN(dLat) && isFinite(dLat) && !isNaN(dLng) && isFinite(dLng) && dLat !== 0 && dLng !== 0;
              const mappedDriver: Driver = {
                id: driverInfo?.id || updatedRide.driver_id || 'drv-assigned',
                name: driverInfo?.full_name || 'Conductor',
                rating: 5.0, ridesCount: 150,
                vehicle: driverInfo?.vehicle_model || 'Motocicleta',
                plate: driverInfo?.vehicle_plate || 'SCZ',
                phone: driverInfo?.phone || '',
                currentLocation: hasRealLoc ? { lat: dLat, lng: dLng } : (origin || DEFAULT_CENTER),
                photoUrl: driverInfo?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
              };
              setAssignedDriver(mappedDriver);
              if (hasRealLoc) {
                setDriverLocation({ lat: dLat, lng: dLng });
                if (origin) {
                  calculateRoute({ lat: dLat, lng: dLng }, origin).then(r => {
                    setDriverRouteCoords(r.coordinates);
                    setDriverDistanceMeters(Math.max(50, Math.round(r.distanceKm * 1000)));
                    setEtaMinutes(Math.max(1, r.durationMinutes));
                  }).catch(() => {});
                }
              }
              return 'en_camino';
            });
          } else if (updatedRide.status === 'llegado_origen') setRideStatus('llegado_origen');
          else if (updatedRide.status === 'en_curso') setRideStatus('en_curso');
          else if (updatedRide.status === 'completado') handleCompleteRide();
          else if (updatedRide.status === 'cancelado' || updatedRide.status === 'no_completado') handleCancelRide();
        });
        rideSubRef.current = unsub;
      }
    }

    setActiveRide(newRide);
    setRideStatus('solicitando');
    setIsSubmittingRide(false);
  };

  const handleCancelRide = () => {
    setDriverLocation(null);
    setDriverRouteCoords([]);
    setDriverDistanceMeters(0);
    if (activeRide && isSupabaseConfigured()) {
      updateRideStatusInSupabase(activeRide.id, 'cancelado', 'Cancelado por el usuario', currentPassenger?.id);
    }
    if (rideSubRef.current) { rideSubRef.current(); rideSubRef.current = null; }
    setActiveRide(null);
    setAssignedDriver(null);
    setViewedDrivers([]);
    setRideStatus('draft');
    setPanelExpanded(false);
    setStatusNotification('Carrera cancelada');
    setTimeout(() => setStatusNotification(null), 2500);
  };

  const handleCompleteRide = () => {
    setDriverRouteCoords([]);
    setDriverDistanceMeters(0);
    if (rideSubRef.current) { rideSubRef.current(); rideSubRef.current = null; }
    setRideStatus('completado');
    setPanelExpanded(false);
    setIsPaymentOpen(true);
  };

  const handleConfirmPayment = (method: 'qr' | 'efectivo') => {
    setIsPaymentOpen(false);
    if (activeRide) {
      const updatedHistory = [activeRide, ...history].slice(0, 25);
      setHistory(updatedHistory);
      try { localStorage.setItem('motocampeon_history', JSON.stringify(updatedHistory)); } catch {}
    }
    setIsRatingOpen(true);
  };

  const handleSubmitRating = async (rating: number) => {
    setIsRatingOpen(false);
    if (activeRide && assignedDriver && isSupabaseConfigured()) {
      await submitDriverRating(activeRide.id, assignedDriver.id, currentPassenger?.id || null, rating);
    }
    setActiveRide(null); setAssignedDriver(null); setViewedDrivers([]);
    setRideStatus('draft'); setHasCargo(false); setCargoDescription('');
    setCargoPhotoUrl(null); setCargoPhotoFile(null);
  };

  const handleRepeatRide = (ride: RideRequest) => {
    setOrigin(ride.origin); setOriginAddress(ride.originAddress);
    setDestination(ride.destination); setDestinationAddress(ride.destinationAddress);
    setHasCargo(ride.hasCargo); setFlyToTarget(ride.origin);
  };

  const hasActiveTrip = Boolean(activeRide && (rideStatus !== 'draft'));

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      <Header
        selectedCategory={selectedCategory}
        userLocation={userLocation}
        isSupabaseConnected={isSupabaseConnected}
        currentPassenger={currentPassenger}
        notificationsEnabled={notificationsEnabled}
        onSelectCategory={setSelectedCategory}
        onOpenAnalysis={() => setIsAnalysisOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onCenterUserLocation={handleLocateUser}
        onOpenCityPicker={() => setIsCityPickerOpen(true)}
        onOpenSupabase={() => setIsSupabaseModalOpen(true)}
        onOpenPassengerModal={() => setIsPassengerModalOpen(true)}
        onToggleNotifications={handleToggleNotifications}
      />

      {statusNotification && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-slate-900/95 border border-slate-700 text-slate-100 text-xs px-3.5 py-2 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
            <span className="font-medium">{statusNotification}</span>
          </div>
        </div>
      )}

      <MapComponent
        origin={origin}
        destination={destination}
        userLocation={userLocation}
        flyToTarget={flyToTarget}
        routeCoords={routeCoords}
        distanceKm={distanceKm}
        durationMins={durationMins}
        isSelectingPickup={isSelectingPickup}
        isSelectingDestination={isSelectingDestination}
        centerAddress={centerAddress}
        isGeocodingCenter={isGeocodingCenter}
        selectedCategory={selectedCategory}
        assignedDriver={assignedDriver}
        driverLocation={driverLocation}
        driverRouteCoords={driverRouteCoords}
        driverDistanceMeters={driverDistanceMeters}
        driverEtaMins={etaMinutes}
        rideStatus={rideStatus}
        isSheetMinimized={!panelExpanded}
        onlineDrivers={onlineDrivers}
        viewedDrivers={viewedDrivers}
        onMapMoved={handleMapMoved}
        onConfirmPinLocation={handleConfirmPinLocation}
        onCancelPinSelection={() => { setIsSelectingPickup(false); setIsSelectingDestination(false); }}
        onSelectPOIAsTarget={handleSelectPOIAsTarget}
        onLocateUser={handleLocateUser}
      />

      {!hasActiveTrip && !isSelectingPickup && !isSelectingDestination && (
        <BottomSheet
          originAddress={originAddress}
          destinationAddress={destinationAddress}
          origin={origin}
          destination={destination}
          distanceKm={distanceKm}
          durationMins={durationMins}
          routeSummary={routeSummary}
          hasCargo={hasCargo}
          cargoDescription={cargoDescription}
          cargoPhotoUrl={cargoPhotoUrl}
          isSubmitting={isSubmittingRide}
          pricingConfig={pricingConfig}
          panelExpanded={panelExpanded}
          onToggleExpanded={setPanelExpanded}
          onlineDrivers={onlineDrivers}
          viewedDrivers={viewedDrivers}
          onCenterOnlineDrivers={handleCenterOnlineDrivers}
          onOpenSearch={(isOrigin) => { setIsPickingOriginInSearch(isOrigin); setIsSearchOpen(true); }}
          onSwapLocations={handleSwapLocations}
          onClearDestination={handleClearDestination}
          onPickOnMap={(isOrigin) => {
            if (isOrigin) { setIsSelectingPickup(true); setIsSelectingDestination(false); }
            else { setIsSelectingDestination(true); setIsSelectingPickup(false); }
          }}
          onToggleCargo={setHasCargo}
          onChangeCargoDesc={setCargoDescription}
          onUploadCargoPhoto={(file) => { setCargoPhotoFile(file); setCargoPhotoUrl(URL.createObjectURL(file)); }}
          onRequestRide={handleRequestRide}
          motoImageUrl="/moto-campeon.png"
        />
      )}

      {hasActiveTrip && rideStatus === 'solicitando' && activeRide && (
        <WaitingDriverPanel
          rideId={activeRide.id}
          origin={origin}
          originAddress={activeRide.originAddress}
          destinationAddress={activeRide.destinationAddress}
          price={activeRide.price}
          hasCargo={activeRide.hasCargo}
          onlineDrivers={onlineDrivers}
          viewedDrivers={viewedDrivers}
          panelExpanded={panelExpanded}
          onToggleExpanded={setPanelExpanded}
          onCenterOnlineDrivers={handleCenterOnlineDrivers}
          onCancel={handleCancelRide}
        />
      )}

      {hasActiveTrip && assignedDriver && activeRide && (
        rideStatus === 'asignado' || rideStatus === 'en_camino' || rideStatus === 'llegado_origen' || rideStatus === 'en_curso'
      ) && (
        <DriverPanel
          driver={assignedDriver}
          status={rideStatus as 'asignado' | 'en_camino' | 'llegado_origen' | 'en_curso'}
          etaMinutes={etaMinutes}
          driverDistanceMeters={driverDistanceMeters}
          panelExpanded={panelExpanded}
          onToggleExpanded={setPanelExpanded}
          onCancelRide={handleCancelRide}
          onCompleteRide={handleCompleteRide}
          onCenterDriver={() => { if (driverLocation) setFlyToTarget({ ...driverLocation }); }}
        />
      )}

      <SearchOverlay
        isOpen={isSearchOpen}
        isPickingOrigin={isPickingOriginInSearch}
        currentCoords={origin}
        recentSearches={recentSearches}
        onClose={() => setIsSearchOpen(false)}
        onSelectLocation={(loc) => {
          const lat = Number(loc?.lat);
          const lng = Number(loc?.lng);
          if (isNaN(lat) || isNaN(lng)) return;
          const targetCoords = { lat, lng };
          if (isPickingOriginInSearch) {
            setOrigin(targetCoords);
            setOriginAddress(`${loc.name}, ${loc.address}`);
            setFlyToTarget(targetCoords);
          } else {
            setDestination(targetCoords);
            setDestinationAddress(`${loc.name}, ${loc.address}`);
            setFlyToTarget(targetCoords);
          }
          addRecentSearch({ ...loc, lat, lng });
          setIsSearchOpen(false);
        }}
        onPickOnMap={() => {
          setIsSearchOpen(false);
          if (isPickingOriginInSearch) { setIsSelectingPickup(true); setIsSelectingDestination(false); }
          else { setIsSelectingDestination(true); setIsSelectingPickup(false); }
        }}
      />

      <CityPickerModal isOpen={isCityPickerOpen} onClose={() => setIsCityPickerOpen(false)} onSelectCity={handleSelectCity} currentCoords={origin} />
      <PaymentModal isOpen={isPaymentOpen} price={activeRide?.price || 0} onConfirmPayment={handleConfirmPayment} />
      <RatingModal isOpen={isRatingOpen} driverName={assignedDriver?.name || 'Tu conductor'} onSubmitRating={handleSubmitRating} />
      <HistoryModal isOpen={isHistoryOpen} history={history} onClose={() => setIsHistoryOpen(false)} onRepeatRide={handleRepeatRide} onOpenPassengerModal={() => setIsPassengerModalOpen(true)} />
      <AnalysisModal isOpen={isAnalysisOpen} onClose={() => setIsAnalysisOpen(false)} />
      <SupabaseModal isOpen={isSupabaseModalOpen} onClose={() => setIsSupabaseModalOpen(false)} onConfigSaved={() => setIsSupabaseConnected(isSupabaseConfigured())} />
      <PassengerModal
        isOpen={isPassengerModalOpen}
        onClose={() => setIsPassengerModalOpen(false)}
        currentPassenger={currentPassenger}
        onPassengerChanged={(p) => {
          setCurrentPassenger(p);
          if (p) {
            savePendingPushToken(p.id);
            setTimeout(() => { setupPushNotificationsForPassenger(); }, 500);
          }
        }}
        onRepeatRide={handleRepeatRide}
        localHistory={history}
      />
      <DebugConsole />
    </div>
  );
}
