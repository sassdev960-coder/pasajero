import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  uploadCargoPhoto
} from './services/supabaseClient';

const DEFAULT_CENTER: LatLng = { lat: -17.7833, lng: -63.1821 };

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
  const [isSheetMinimized, setIsSheetMinimized] = useState(false);

  const [onlineDrivers, setOnlineDrivers] = useState<SupabaseDriver[]>([]);
  const [viewedDrivers, setViewedDrivers] = useState<DriverViewInfo[]>([]);

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

    let watchId: number | null = null;

    const onLocationResolved = async (coords: LatLng, method: 'gps' | 'ip') => {
      const lat = Number(coords?.lat);
      const lng = Number(coords?.lng);
      if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) return;
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
        (pos) => {
          const lat = Number(pos?.coords?.latitude);
          const lng = Number(pos?.coords?.longitude);
          if (!isNaN(lat) && !isNaN(lng)) onLocationResolved({ lat, lng }, 'gps');
        },
        async () => {
          const ipLoc = await detectUserLocationViaIP();
          if (ipLoc && !isNaN(ipLoc.lat) && !isNaN(ipLoc.lng)) {
            onLocationResolved({ lat: ipLoc.lat, lng: ipLoc.lng }, 'ip');
          } else if (!hasCenteredInitialRef.current) {
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
        if (ipLoc && !isNaN(ipLoc.lat) && !isNaN(ipLoc.lng) && !hasCenteredInitialRef.current) {
          onLocationResolved({ lat: ipLoc.lat, lng: ipLoc.lng }, 'ip');
        } else if (!hasCenteredInitialRef.current) {
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
  }, [applyOriginLocation]);

  useEffect(() => {
    fetchPricingConfigFromSupabase().then(setPricingConfig);
    const unsubPricing = subscribeToPricingConfig((newCfg) => {
      setPricingConfig(newCfg);
      setStatusNotification(`⚡ Tarifa actualizada (Base: Bs ${newCfg.base_price.toFixed(2)})`);
      setTimeout(() => setStatusNotification(null), 3500);
    });
    return () => unsubPricing();
  }, []);

  useEffect(() => {
    const centerPoint = origin || userLocation || DEFAULT_CENTER;
    const unsubDrivers = subscribeToOnlineDrivers((drivers) => setOnlineDrivers(drivers), centerPoint);
    return () => unsubDrivers();
  }, [origin, userLocation]);

  useEffect(() => {
    if (!origin || !destination) {
      setRouteCoords([]);
      setDistanceKm(0);
      setDurationMins(0);
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
    const finalAddress = geo.address;

    if (isSelectingPickup) {
      setOrigin(safeCenter);
      setOriginAddress(finalAddress);
      setIsSelectingPickup(false);
      if (!destination) setTimeout(() => setIsSearchOpen(true), 300);
    } else if (isSelectingDestination) {
      setDestination(safeCenter);
      setDestinationAddress(finalAddress);
      setIsSelectingDestination(false);
    }
  };

  const handleSelectPOIAsTarget = (poi: PointOfInterest, asOrigin: boolean) => {
    const lat = Number(poi?.lat);
    const lng = Number(poi?.lng);
    if (isNaN(lat) || isNaN(lng)) return;
    const coords: LatLng = { lat, lng };
    const label = `${poi.name}, ${poi.address}`;

    if (asOrigin) {
      setOrigin(coords);
      setOriginAddress(label);
      setFlyToTarget(coords);
    } else {
      setDestination(coords);
      setDestinationAddress(label);
      setFlyToTarget(coords);
    }
    addRecentSearch({ name: poi.name, address: poi.address, lat, lng });
  };

  const addRecentSearch = (item: { name: string; address: string; lat: number; lng: number }) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(p => p.name !== item.name);
      return [item, ...filtered].slice(0, 5);
    });
  };

  const handleLocateUser = () => {
    setStatusNotification('Buscando tu señal GPS...');
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
          setStatusNotification('📍 Centrado en tu ubicación');
          setTimeout(() => setStatusNotification(null), 3000);
        },
        async () => {
          if (userLocation && !isNaN(userLocation.lat) && !isNaN(userLocation.lng)) {
            setFlyToTarget({ ...userLocation });
          } else {
            const ipLoc = await detectUserLocationViaIP();
            if (ipLoc) {
              const ipCoords: LatLng = { lat: ipLoc.lat, lng: ipLoc.lng };
              setUserLocation(ipCoords);
              setFlyToTarget(ipCoords);
              await applyOriginLocation(ipCoords, false);
            } else {
              setIsCityPickerOpen(true);
            }
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
    setUserLocation(city.coords);
    setFlyToTarget(city.coords);
    await applyOriginLocation(city.coords, true);
    setDestination(null);
    setDestinationAddress('');
    setStatusNotification(`📍 Ciudad cambiada a ${city.name}`);
    setTimeout(() => setStatusNotification(null), 3000);
  };

  const handleSwapLocations = () => {
    const tempCoords = origin, tempAddr = originAddress;
    setOrigin(destination); setOriginAddress(destinationAddress);
    setDestination(tempCoords); setDestinationAddress(tempAddr);
    if (destination) setFlyToTarget(destination);
  };

  const handleClearDestination = () => {
    setDestination(null);
    setDestinationAddress('');
    setRouteCoords([]);
    setDistanceKm(0);
    setDurationMins(0);
    setStatusNotification('Destino quitado');
    setTimeout(() => setStatusNotification(null), 3000);
  };

  // ═══════════════════════════════════════════════════════════════
  // CREAR RIDE
  // ═══════════════════════════════════════════════════════════════
  const handleRequestRide = async (rideType: 'moto' | 'express' = 'moto', customPrice?: number) => {
    if (!origin || !destination) return;

    setIsSubmittingRide(true);
    const fare = calculateFare(distanceKm, hasCargo, pricingConfig);
    const finalPrice = customPrice !== undefined 
      ? customPrice 
      : (rideType === 'express' ? fare.expressFare : fare.motoFare);

    let rideId = 'ride-' + Date.now();

    let finalCargoPhotoUrl: string | undefined = undefined;
    if (hasCargo && cargoPhotoFile && isSupabaseConfigured()) {
      const tempId = rideId;
      const uploaded = await uploadCargoPhoto(cargoPhotoFile, tempId);
      if (uploaded) finalCargoPhotoUrl = uploaded;
    } else if (hasCargo && cargoPhotoUrl && !cargoPhotoUrl.startsWith('blob:')) {
      finalCargoPhotoUrl = cargoPhotoUrl;
    }

    const newRide: RideRequest = {
      id: rideId,
      origin, originAddress,
      destination, destinationAddress,
      price: finalPrice,
      distanceKm, durationMins,
      status: 'solicitando',
      hasCargo,
      cargoDescription: hasCargo ? cargoDescription : undefined,
      cargoPhotoUrl: finalCargoPhotoUrl,
      createdAt: new Date().toISOString()
    };

    setViewedDrivers([]);

    if (isSupabaseConfigured()) {
      setStatusNotification('Enviando solicitud a Supabase...');
      const { ride: dbRide, error } = await createRideInSupabase({
        origin, originAddress,
        destination, destinationAddress,
        price: finalPrice,
        distanceKm, durationMins,
        hasCargo,
        cargoDescription,
        cargoPhotoUrl: finalCargoPhotoUrl,
        passengerName: currentPassenger?.full_name || undefined,
        passengerPhone: currentPassenger?.phone || undefined
      });

      if (dbRide) {
        newRide.id = dbRide.id;
        setStatusNotification('✅ Solicitud registrada. Esperando conductor...');
        setTimeout(() => setStatusNotification(null), 3500);

        if (rideSubRef.current) rideSubRef.current();

        const unsub = subscribeToRideChanges(dbRide.id, (updatedRide, driverInfo, newViewedDrivers) => {
          if (newViewedDrivers) setViewedDrivers(newViewedDrivers);

          if (updatedRide.status === 'aceptado') {
            setRideStatus(prev => {
              // Solo procesar si no estamos ya en camino
              if (prev !== 'solicitando' && prev !== 'asignado') return prev;

              const driverLat = Number(driverInfo?.lat);
              const driverLng = Number(driverInfo?.lng);
              const hasRealLocation =
                !isNaN(driverLat) && isFinite(driverLat) &&
                !isNaN(driverLng) && isFinite(driverLng) &&
                driverLat !== 0 && driverLng !== 0;

              const mappedDriver: Driver = {
                id: driverInfo?.id || updatedRide.driver_id || 'drv-assigned',
                name: driverInfo?.full_name || 'Conductor Moto Móvil',
                rating: 5.0,
                ridesCount: 150,
                vehicle: driverInfo?.vehicle_model || 'Motocicleta',
                plate: driverInfo?.vehicle_plate || 'SCZ',
                phone: driverInfo?.phone || '',
                currentLocation: hasRealLocation
                  ? { lat: driverLat, lng: driverLng }
                  : (origin || DEFAULT_CENTER),
                photoUrl: driverInfo?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
              };

              setAssignedDriver(mappedDriver);

              // Posición REAL del conductor (sin simulación)
              if (hasRealLocation) {
                setDriverLocation({ lat: driverLat, lng: driverLng });

                // Ruta de aproximación real: conductor → origen
                if (origin) {
                  calculateRoute({ lat: driverLat, lng: driverLng }, origin).then(r => {
                    setDriverRouteCoords(r.coordinates);
                    const distM = Math.max(50, Math.round(r.distanceKm * 1000));
                    setDriverDistanceMeters(distM);
                    setEtaMinutes(Math.max(1, r.durationMinutes));
                  }).catch(() => {});
                }
              }

              // Solo mostrar notificación la primera vez
              const isFirstTime = prev === 'solicitando';
              if (isFirstTime) {
                setStatusNotification(`🎉 ¡${mappedDriver.name} aceptó tu carrera!`);
                setTimeout(() => setStatusNotification(null), 4000);
              }
              return 'en_camino';
            });
          } else if (updatedRide.status === 'llegado_origen') {
            setRideStatus('llegado_origen');
            setStatusNotification('🏍️ ¡El conductor ha llegado!');
            setTimeout(() => setStatusNotification(null), 4000);
          } else if (updatedRide.status === 'en_curso') {
            setRideStatus('en_curso');
            setStatusNotification('🚀 ¡Viaje en curso!');
            setTimeout(() => setStatusNotification(null), 3000);
          } else if (updatedRide.status === 'completado') {
            handleCompleteRide();
          } else if (updatedRide.status === 'cancelado' || updatedRide.status === 'no_completado') {
            handleCancelRide();
          }
        });

        rideSubRef.current = unsub;
      } else {
        console.warn('Supabase ride insertion notice:', error);
      }
    }

    setActiveRide(newRide);
    setRideStatus('solicitando');
    setIsSubmittingRide(false);
  };

  const handleStartTripToDestination = useCallback(() => {
    // El botón "Iniciar viaje" ya no existe en la UI.
    // El conductor controla el inicio del viaje desde su app.
    // Solo actualizamos el estado visual local por si acaso.
    setRideStatus('en_curso');
    setStatusNotification('🚀 ¡Viaje en curso!');
    setTimeout(() => setStatusNotification(null), 3500);
  }, []);

  const handleCancelRide = () => {
    setDriverLocation(null);
    setDriverRouteCoords([]);
    setDriverDistanceMeters(0);

    if (activeRide && isSupabaseConfigured()) {
      updateRideStatusInSupabase(
        activeRide.id,
        'cancelado',
        'Cancelado por el usuario',
        currentPassenger?.id
      );
    }
    if (rideSubRef.current) {
      rideSubRef.current();
      rideSubRef.current = null;
    }
    setActiveRide(null);
    setAssignedDriver(null);
    setViewedDrivers([]);
    setRideStatus('draft');
    setStatusNotification('Carrera cancelada');
    setTimeout(() => setStatusNotification(null), 2500);
  };

  const handleCompleteRide = () => {
    setDriverRouteCoords([]);
    setDriverDistanceMeters(0);

    if (rideSubRef.current) {
      rideSubRef.current();
      rideSubRef.current = null;
    }
    setRideStatus('completado');
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
      const result = await submitDriverRating(
        activeRide.id,
        assignedDriver.id,
        currentPassenger?.id || null,
        rating
      );
      if (result.success) {
        console.log('⭐ Rating guardado:', rating, 'estrellas para', assignedDriver.name);
        setStatusNotification(`⭐ ¡Gracias por calificar con ${rating} estrellas!`);
        setTimeout(() => setStatusNotification(null), 3000);
      } else {
        console.warn('No se pudo guardar rating:', result.error);
      }
    }

    setActiveRide(null);
    setAssignedDriver(null);
    setViewedDrivers([]);
    setRideStatus('draft');
    setHasCargo(false);
    setCargoDescription('');
    setCargoPhotoUrl(null);
    setCargoPhotoFile(null);
  };

  const handleRepeatRide = (ride: RideRequest) => {
    setOrigin(ride.origin);
    setOriginAddress(ride.originAddress);
    setDestination(ride.destination);
    setDestinationAddress(ride.destinationAddress);
    setHasCargo(ride.hasCargo);
    setFlyToTarget(ride.origin);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      <Header
        selectedCategory={selectedCategory}
        userLocation={userLocation}
        isSupabaseConnected={isSupabaseConnected}
        currentPassenger={currentPassenger}
        onSelectCategory={setSelectedCategory}
        onOpenAnalysis={() => setIsAnalysisOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onCenterUserLocation={handleLocateUser}
        onOpenCityPicker={() => setIsCityPickerOpen(true)}
        onOpenSupabase={() => setIsSupabaseModalOpen(true)}
        onOpenPassengerModal={() => setIsPassengerModalOpen(true)}
      />

      {statusNotification && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-slate-900/95 border border-slate-700 text-slate-100 text-xs px-3.5 py-2 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
            <span className="font-medium">{statusNotification}</span>
            <button onClick={handleLocateUser} className="ml-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 underline">
              Centrar
            </button>
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
        isSheetMinimized={isSheetMinimized}
        onlineDrivers={onlineDrivers}
        viewedDrivers={viewedDrivers}
        onMapMoved={handleMapMoved}
        onConfirmPinLocation={handleConfirmPinLocation}
        onCancelPinSelection={() => {
          setIsSelectingPickup(false);
          setIsSelectingDestination(false);
        }}
        onSelectPOIAsTarget={handleSelectPOIAsTarget}
        onLocateUser={handleLocateUser}
      />

      {rideStatus === 'solicitando' && activeRide && (
        <WaitingDriverPanel
          rideId={activeRide.id}
          origin={origin}
          originAddress={activeRide.originAddress}
          destinationAddress={activeRide.destinationAddress}
          price={activeRide.price}
          hasCargo={activeRide.hasCargo}
          onlineDrivers={onlineDrivers}
          viewedDrivers={viewedDrivers}
          onCancel={handleCancelRide}
        />
      )}

      {assignedDriver && activeRide && (rideStatus === 'asignado' || rideStatus === 'en_camino' || rideStatus === 'llegado_origen' || rideStatus === 'en_curso') && (
        <DriverPanel
          driver={assignedDriver}
          status={rideStatus as 'asignado' | 'en_camino' | 'llegado_origen' | 'en_curso'}
          etaMinutes={etaMinutes}
          driverDistanceMeters={driverDistanceMeters}
          onStartTrip={handleStartTripToDestination}
          onCancelRide={handleCancelRide}
          onCompleteRide={handleCompleteRide}
          onCenterDriver={() => { if (driverLocation) setFlyToTarget({ ...driverLocation }); }}
        />
      )}

      {!activeRide && !isSelectingPickup && !isSelectingDestination && (
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
          isMinimized={isSheetMinimized}
          onToggleMinimize={setIsSheetMinimized}
          onOpenSearch={(isOrigin) => {
            setIsPickingOriginInSearch(isOrigin);
            setIsSearchOpen(true);
          }}
          onSwapLocations={handleSwapLocations}
          onClearDestination={handleClearDestination}
          onPickOnMap={(isOrigin) => {
            if (isOrigin) { setIsSelectingPickup(true); setIsSelectingDestination(false); }
            else { setIsSelectingDestination(true); setIsSelectingPickup(false); }
          }}
          onToggleCargo={setHasCargo}
          onChangeCargoDesc={setCargoDescription}
          onUploadCargoPhoto={(file) => {
            setCargoPhotoFile(file);
            setCargoPhotoUrl(URL.createObjectURL(file));
          }}
          pricingConfig={pricingConfig}
          onRequestRide={handleRequestRide}
          motoImageUrl="/moto-campeon.png"
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

      <CityPickerModal
        isOpen={isCityPickerOpen}
        onClose={() => setIsCityPickerOpen(false)}
        onSelectCity={handleSelectCity}
        currentCoords={origin}
      />

      <PaymentModal
        isOpen={isPaymentOpen}
        price={activeRide?.price || 0}
        onConfirmPayment={handleConfirmPayment}
      />

      <RatingModal
        isOpen={isRatingOpen}
        driverName={assignedDriver?.name || 'Tu conductor'}
        onSubmitRating={handleSubmitRating}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        history={history}
        onClose={() => setIsHistoryOpen(false)}
        onRepeatRide={handleRepeatRide}
        onOpenPassengerModal={() => setIsPassengerModalOpen(true)}
      />

      <AnalysisModal isOpen={isAnalysisOpen} onClose={() => setIsAnalysisOpen(false)} />

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConfigSaved={() => setIsSupabaseConnected(isSupabaseConfigured())}
      />

      <PassengerModal
        isOpen={isPassengerModalOpen}
        onClose={() => setIsPassengerModalOpen(false)}
        currentPassenger={currentPassenger}
        onPassengerChanged={(p) => setCurrentPassenger(p)}
        onRepeatRide={handleRepeatRide}
        localHistory={history}
      />

      {/* Consola de debug — para ver logs en APK */}
      <DebugConsole />
    </div>
  );
}
