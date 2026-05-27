import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, StyleSheet, ActivityIndicator,
  TouchableOpacity, TextInput, ScrollView,
} from 'react-native';
import { AppText } from '../components/AppText';
import MapboxGL from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAPBOX_TOKEN } from '../constants/api';
import { SeverityColors, LifecycleColors, LightTheme, DarkTheme, AppTheme } from '../constants/colors';
import { Incident, Severity } from '../types';
import { RootTabParamList } from '../navigation/AppNavigator';
import { useIncidents } from '../context/IncidentsContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

MapboxGL.setAccessToken(MAPBOX_TOKEN);

const NEPAL_CENTER: [number, number] = [84.124, 28.394];
const INITIAL_ZOOM = 6;

type LiveMapRoute = RouteProp<RootTabParamList, 'LiveMap'>;
type TimeWindow = 'all' | '24hr' | '7d';

type FeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: { id: string; severity: string; title: string };
  }>;
};

type PlaceResult = {
  name: string;
  place: string;
  coordinates: [number, number];
};

const SEVERITY_CHIP_DEFS: { key: Severity; color: string }[] = [
  { key: 'CRITICAL', color: '#DC2626' },
  { key: 'HIGH',     color: '#EA580C' },
  { key: 'LOW',      color: '#16A34A' },
];

const TYPE_CHIP_DEFS: { key: string; color: string }[] = [
  { key: 'earthquake',     color: '#7C3AED' },
  { key: 'flood',          color: '#0EA5E9' },
  { key: 'landslide',      color: '#92400E' },
  { key: 'forest fire',    color: '#B45309' },
  { key: 'heavy rainfall', color: '#0369A1' },
  { key: 'road closed',    color: '#6B7280' },
  { key: 'heatwave',       color: '#F59E0B' },
  { key: 'fire',           color: '#EA580C' },
];

const TIME_CHIP_DEFS: { key: TimeWindow }[] = [
  { key: 'all'  },
  { key: '24hr' },
  { key: '7d'   },
];
const TIME_ACTIVE_COLOR = '#7C3AED';
type MapStyle = 'default' | 'satellite';


function detectType(incident: Incident): string | null {
  const text = (incident.title + ' ' + incident.description).toLowerCase();
  if (text.includes('earthquake') || text.includes('tremor') || text.includes('quake')) return 'earthquake';
  if (text.includes('flood')) return 'flood';
  if (text.includes('landslide') || text.includes('land slide')) return 'landslide';
  if (text.includes('forest fire') || text.includes('wildfire')) return 'forest fire';
  if (text.includes('road') && (text.includes('closed') || text.includes('block'))) return 'road closed';
  if (text.includes('heavy rain') || text.includes('rainfall')) return 'heavy rainfall';
  if (text.includes('fire')) return 'fire';
  if (text.includes('heat') || text.includes('heatwave')) return 'heatwave';
  return null;
}

function withinWindow(incident: Incident, window: TimeWindow): boolean {
  if (window === 'all') return true;
  const ms = window === '24hr' ? 86_400_000 : 7 * 86_400_000;
  return Date.now() - new Date(incident.reported_at).getTime() <= ms;
}

function lngLatDist(lng1: number, lat1: number, lng2: number, lat2: number) {
  return Math.sqrt((lng2 - lng1) ** 2 + (lat2 - lat1) ** 2);
}


function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1 },
    map:       { flex: 1 },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'center',
      alignItems: 'center',
    },

    searchShadow: {
      position: 'absolute',
      left: 16,
      right: 16,
      zIndex: 10,
      borderRadius: 14,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 8,
    },
    searchPanel: {
      borderRadius: 14,
      overflow: 'hidden',
    },

    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.searchBg,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: t.inputText,
      paddingVertical: 0,
    },

    filterRow: {
      backgroundColor: t.searchBg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.border,
    },
    filterRowContent: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      alignItems: 'center',
      gap: 5,
    },
    chip: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.pillBorder,
    },
    chipText: {
      fontSize: 11,
      fontWeight: '600',
      color: t.subtext,
    },
    chipDivider: {
      width: StyleSheet.hairlineWidth,
      height: 14,
      backgroundColor: t.border,
      marginHorizontal: 3,
    },

    dropdown: {
      backgroundColor: t.searchBg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.border,
      maxHeight: 230,
    },
    suggestionLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: t.muted,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 4,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 11,
      gap: 10,
    },
    resultRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    severityDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      flexShrink: 0,
    },
    resultTextCol: { flex: 1 },
    resultTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: t.text,
    },
    resultMeta: {
      fontSize: 11,
      color: t.subtext,
      marginTop: 1,
    },
    noResults: {
      paddingVertical: 16,
      alignItems: 'center',
    },
    noResultsText: { fontSize: 13, color: t.muted },

    sheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      maxHeight: '55%',
      backgroundColor: t.sheetBg,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingTop: 20,
      paddingHorizontal: 20,
      paddingBottom: 36,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    sheetScroll: { flex: 1 },
    sheetClose: {
      position: 'absolute',
      top: 16,
      right: 16,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: t.sheetCloseBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetBadgeRow:    { flexDirection: 'row', gap: 8, marginBottom: 12 },
    severityBadge:    { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
    severityText:     { color: '#fff', fontSize: 11, fontWeight: '700' },
    lifecycleBadge:   { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
    lifecycleText:    { fontSize: 11, fontWeight: '600' },
    sheetTitle:       { fontSize: 17, fontWeight: '700', color: t.text, marginBottom: 6 },
    sheetDesc:        { fontSize: 14, color: t.subtext, lineHeight: 20, marginBottom: 12 },
    sheetLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    sheetLocationText:{ fontSize: 13, color: t.sectionTitle, fontWeight: '600' },
    sheetCoords:      { fontSize: 12, color: t.muted },
    sheetDate:        { fontSize: 12, color: t.muted, marginTop: 4 },
    sheetResetBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, marginTop: 16, paddingVertical: 10, borderRadius: 10,
      borderWidth: 1.5, borderColor: t.pillBorder, backgroundColor: t.card,
    },
    sheetResetText: { fontSize: 13, fontWeight: '600', color: t.sectionTitle },

    zoomControls: {
      position: 'absolute',
      bottom: 24,
      right: 16,
      gap: 8,
    },
    zoomBtn: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: t.zoomBtnBg,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    zoomBtnText: {
      fontSize: 22,
      fontWeight: '400',
      color: t.zoomBtnText,
      lineHeight: 26,
    },
    layersBtn: {
      width: 44,
      height: 44,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
  });
}



export default function LiveMapScreen() {
  const route = useRoute<LiveMapRoute>();
  const navigation = useNavigation();
  const { incidents, loading } = useIncidents();
  const { isDark } = useTheme();
  const { lang, t } = useLanguage();
  const theme = isDark ? DarkTheme : LightTheme;
  const s = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [searchText, setSearchText]             = useState('');
  const [searchFocused, setSearchFocused]       = useState(false);
  const [placeResults, setPlaceResults]         = useState<PlaceResult[]>([]);

  const [severityFilters, setSeverityFilters] = useState<Severity[]>([]);
  const [typeFilters, setTypeFilters]         = useState<string[]>([]);
  const [timeFilter, setTimeFilter]           = useState<TimeWindow>('all');
  const [mapStyle, setMapStyle]               = useState<MapStyle>('default');

  const activeStyleURL = mapStyle === 'satellite'
    ? MapboxGL.StyleURL.SatelliteStreet
    : isDark ? MapboxGL.StyleURL.Dark : MapboxGL.StyleURL.Light;

  const focusLat = route.params?.focusLat;
  const focusLng = route.params?.focusLng;
  const focusId  = route.params?.focusId ?? '';

  const cameraRef = useRef<MapboxGL.Camera>(null);
  // center is only used for nearbySuggestions sorting, not passed to Camera
  const [center, setCenter] = useState<[number, number]>(NEPAL_CENTER);
  const zoomRef = useRef(INITIAL_ZOOM);

  const flyTo = useCallback((coords: [number, number], zoom = 12) => {
    zoomRef.current = zoom;
    setCenter(coords);
    cameraRef.current?.setCamera({
      centerCoordinate: coords,
      zoomLevel: zoom,
      animationDuration: 900,
      animationMode: 'flyTo',
    });
  }, []);

  const resetView = useCallback(() => {
    flyTo(NEPAL_CENTER, INITIAL_ZOOM);
    setSelectedIncident(null);
  }, [flyTo]);

  useFocusEffect(
    useCallback(() => {
      if (focusLat != null && focusLng != null) {
        flyTo([focusLng, focusLat], 12);
        if (focusId) {
          const found = incidents.find(i => i.id === focusId);
          if (found) setSelectedIncident(found);
        }
        navigation.setParams({ focusLat: undefined, focusLng: undefined, focusId: undefined } as any);
      }
    }, [focusLat, focusLng, focusId, incidents, flyTo, navigation])
  );

  // Tapping the LiveMap tab while already on it resets the view
  useEffect(() => {
    return navigation.addListener('tabPress' as any, () => {
      if (navigation.isFocused()) resetView();
    });
  }, [navigation, resetView]);

  // Mapbox geocoding for place search
  useEffect(() => {
    const q = searchText.trim();
    if (!q) { setPlaceResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?country=NP&access_token=${MAPBOX_TOKEN}&limit=5`;
        const res = await fetch(url);
        const json = await res.json();
        const places: PlaceResult[] = (json.features ?? []).map((f: any) => ({
          name: f.text,
          place: f.place_name,
          coordinates: f.geometry.coordinates as [number, number],
        }));
        setPlaceResults(places);
      } catch {
        setPlaceResults([]);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  const activeIncidents = useMemo(() => {
    return incidents.filter(i => {
      if (severityFilters.length > 0 && !severityFilters.includes(i.severity)) return false;
      if (typeFilters.length > 0) {
        const type = detectType(i);
        if (!type || !typeFilters.includes(type)) return false;
      }
      if (!withinWindow(i, timeFilter)) return false;
      return true;
    });
  }, [incidents, severityFilters, typeFilters, timeFilter]);

  const searchResults = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return null;
    return activeIncidents.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.zone.district.toLowerCase().includes(q)
    );
  }, [activeIncidents, searchText]);

  const nearbySuggestions = useMemo(() => {
    return activeIncidents
      .filter(i => i.severity === 'HIGH' || i.severity === 'CRITICAL')
      .map(i => ({
        ...i,
        _dist: lngLatDist(center[0], center[1], i.longitude, i.latitude),
      }))
      .sort((a, b) => a._dist - b._dist)
      .slice(0, 5);
  }, [activeIncidents, center]);

  const visibleIds = useMemo(() => {
    const list = searchResults ?? activeIncidents;
    return list.map(i => i.id);
  }, [searchResults, activeIncidents]);

  const pinFilter: any = useMemo(
    () => ['in', ['get', 'id'], ['literal', visibleIds]],
    [visibleIds]
  );

  const geojson: FeatureCollection = useMemo(() => ({
    type: 'FeatureCollection',
    features: incidents.map(i => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [i.longitude, i.latitude] },
      properties: { id: i.id, severity: i.severity, title: i.title },
    })),
  }), [incidents]);


  const handlePinPress = (e: any) => {
    const feature = e.features?.[0];
    if (!feature) return;
    const found = incidents.find(i => i.id === feature.properties?.id);
    if (found) {
      setSelectedIncident(found);
      flyTo([found.longitude, found.latitude], 12);
    }
  };

  const handleResultPress = (incident: Incident) => {
    setSelectedIncident(incident);
    flyTo([incident.longitude, incident.latitude], 12);
    setSearchText('');
    setSearchFocused(false);
  };

  const handlePlacePress = (place: PlaceResult) => {
    flyTo(place.coordinates, 12);
    setSearchText('');
    setSearchFocused(false);
    setPlaceResults([]);
  };

  const toggleSeverity = (key: Severity) =>
    setSeverityFilters(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );

  const toggleType = (key: string) =>
    setTypeFilters(prev =>
      prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key]
    );


  const showDropdown    = searchFocused || searchText.length > 0;
  const showSuggestions = showDropdown && !searchText && nearbySuggestions.length > 0;
  const showResults     = showDropdown && !!searchText;


  const typeChipLabel: Record<string, string> = {
    'earthquake':     t.common.earthquake,
    'flood':          t.common.flood,
    'landslide':      t.common.landslide,
    'forest fire':    t.common.forestFire,
    'heavy rainfall': t.common.heavyRain,
    'road closed':    t.common.roadClosed,
    'heatwave':       t.common.heatwave,
    'fire':           t.common.fire,
  };

  function renderFilterChips() {
    return (
      <View style={s.filterRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRowContent}
          keyboardShouldPersistTaps="handled"
        >
          {SEVERITY_CHIP_DEFS.map(chip => {
            const active = severityFilters.includes(chip.key);
            const label = chip.key === 'CRITICAL' ? t.common.critical : chip.key === 'HIGH' ? t.common.high : t.common.low;
            return (
              <TouchableOpacity
                key={chip.key}
                onPress={() => toggleSeverity(chip.key)}
                style={[s.chip, active && { backgroundColor: chip.color, borderColor: chip.color }]}
                activeOpacity={0.7}
              >
                <AppText style={[s.chipText, active && { color: '#fff' }]}>{label}</AppText>
              </TouchableOpacity>
            );
          })}

          <View style={s.chipDivider} />

          {TYPE_CHIP_DEFS.map(chip => {
            const active = typeFilters.includes(chip.key);
            return (
              <TouchableOpacity
                key={chip.key}
                onPress={() => toggleType(chip.key)}
                style={[s.chip, active && { backgroundColor: chip.color, borderColor: chip.color }]}
                activeOpacity={0.7}
              >
                <AppText style={[s.chipText, active && { color: '#fff' }]}>{typeChipLabel[chip.key] ?? chip.key}</AppText>
              </TouchableOpacity>
            );
          })}

          <View style={s.chipDivider} />

          {TIME_CHIP_DEFS.map(chip => {
            const active = timeFilter === chip.key;
            const label = chip.key === 'all' ? t.map.all : chip.key;
            return (
              <TouchableOpacity
                key={chip.key}
                onPress={() => setTimeFilter(chip.key)}
                style={[s.chip, active && { backgroundColor: TIME_ACTIVE_COLOR, borderColor: TIME_ACTIVE_COLOR }]}
                activeOpacity={0.7}
              >
                <AppText style={[s.chipText, active && { color: '#fff' }]}>{label}</AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  function renderDropdown() {
    if (!showDropdown) return null;

    if (showSuggestions) {
      return (
        <ScrollView
          style={s.dropdown}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppText style={s.suggestionLabel}>{t.map.nearbyHighRisk}</AppText>
          {nearbySuggestions.map((incident, idx) => (
            <TouchableOpacity
              key={incident.id}
              style={[s.resultRow, idx < nearbySuggestions.length - 1 && s.resultRowBorder]}
              onPress={() => handleResultPress(incident)}
              activeOpacity={0.7}
            >
              <View style={[s.severityDot, { backgroundColor: SeverityColors[incident.severity] }]} />
              <View style={s.resultTextCol}>
                <AppText style={s.resultTitle} numberOfLines={1}>{incident.title}</AppText>
                <AppText style={s.resultMeta}>{incident.zone.district}</AppText>
              </View>
              <Ionicons name="chevron-forward" size={14} color={theme.muted} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      );
    }

    if (showResults) {
      const hasIncidents = searchResults && searchResults.length > 0;
      const hasPlaces = placeResults.length > 0;

      if (!hasIncidents && !hasPlaces) {
        return (
          <View style={[s.dropdown, s.noResults]}>
            <AppText style={s.noResultsText}>{t.map.noResults}</AppText>
          </View>
        );
      }

      return (
        <ScrollView
          style={s.dropdown}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {hasIncidents && (
            <>
              <AppText style={s.suggestionLabel}>{t.map.incidents}</AppText>
              {searchResults!.map((incident, idx) => (
                <TouchableOpacity
                  key={incident.id}
                  style={[s.resultRow, (idx < searchResults!.length - 1 || hasPlaces) && s.resultRowBorder]}
                  onPress={() => handleResultPress(incident)}
                  activeOpacity={0.7}
                >
                  <View style={[s.severityDot, { backgroundColor: SeverityColors[incident.severity] }]} />
                  <View style={s.resultTextCol}>
                    <AppText style={s.resultTitle} numberOfLines={1}>{incident.title}</AppText>
                    <AppText style={s.resultMeta}>{incident.zone.district}</AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={theme.muted} />
                </TouchableOpacity>
              ))}
            </>
          )}

          {hasPlaces && (
            <>
              <AppText style={s.suggestionLabel}>{t.map.placesInNepal}</AppText>
              {placeResults.map((place, idx) => (
                <TouchableOpacity
                  key={place.place}
                  style={[s.resultRow, idx < placeResults.length - 1 && s.resultRowBorder]}
                  onPress={() => handlePlacePress(place)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="location-outline" size={14} color={theme.muted} />
                  <View style={s.resultTextCol}>
                    <AppText style={s.resultTitle} numberOfLines={1}>{place.name}</AppText>
                    <AppText style={s.resultMeta} numberOfLines={1}>{place.place}</AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={theme.muted} />
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      );
    }

    return null;
  }



  return (
    <View style={s.container}>
      <MapboxGL.MapView
        style={s.map}
        styleURL={activeStyleURL}
        scaleBarPosition={{ bottom: 8, left: 8 }}
        onPress={() => { setSelectedIncident(null); setSearchFocused(false); }}
        zoomEnabled
        scrollEnabled
        rotateEnabled
        pitchEnabled
      >
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: NEPAL_CENTER,
            zoomLevel: INITIAL_ZOOM,
          }}
        />

        {!loading && (
          <MapboxGL.ShapeSource
            id="incidents"
            shape={geojson as any}
            onPress={handlePinPress}
          >
            <MapboxGL.HeatmapLayer
              id="incidents-heat"
              sourceID="incidents"
              maxZoomLevel={8}
              filter={pinFilter}
              style={{
                heatmapColor: [
                  'interpolate', ['linear'], ['heatmap-density'],
                  0,   'rgba(0,0,255,0)',
                  0.5, 'rgba(255,165,0,0.8)',
                  1,   'rgba(220,38,38,1)',
                ],
                heatmapRadius: 30,
                heatmapOpacity: 0.8,
              }}
            />

            <MapboxGL.CircleLayer
              id="incidents-points"
              sourceID="incidents"
              minZoomLevel={5}
              filter={pinFilter}
              style={{
                circleRadius: 8,
                circleColor: [
                  'match', ['get', 'severity'],
                  'CRITICAL', SeverityColors.CRITICAL,
                  'HIGH',     SeverityColors.HIGH,
                  'MODERATE', SeverityColors.MODERATE,
                  SeverityColors.LOW,
                ],
                circleStrokeWidth: 2,
                circleStrokeColor: '#fff',
              }}
            />

            <MapboxGL.CircleLayer
              id="focus-glow"
              sourceID="incidents"
              minZoomLevel={5}
              filter={['==', ['get', 'id'], selectedIncident?.id ?? focusId]}
              style={{
                circleRadius: 20,
                circleColor: 'rgba(255,255,255,0.2)',
                circleStrokeWidth: 2,
                circleStrokeColor: 'rgba(255,255,255,0.6)',
              }}
            />

            <MapboxGL.CircleLayer
              id="focus-pin"
              sourceID="incidents"
              minZoomLevel={5}
              filter={['==', ['get', 'id'], selectedIncident?.id ?? focusId]}
              style={{
                circleRadius: 10,
                circleColor: [
                  'match', ['get', 'severity'],
                  'CRITICAL', SeverityColors.CRITICAL,
                  'HIGH',     SeverityColors.HIGH,
                  'MODERATE', SeverityColors.MODERATE,
                  SeverityColors.LOW,
                ],
                circleStrokeWidth: 3,
                circleStrokeColor: '#fff',
              }}
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>

      {loading && (
        <View style={s.overlay}>
          <ActivityIndicator size="large" color="#DC2626" />
        </View>
      )}

      {/* Search panel */}
      <View style={[s.searchShadow, { top: insets.top + 10 }]}>
        <View style={s.searchPanel}>
          <View style={s.searchBar}>
            <Ionicons name="search" size={16} color={theme.muted} />
            <TextInput
              style={s.searchInput}
              placeholder={t.map.searchPlaceholder}
              placeholderTextColor={theme.muted}
              value={searchText}
              onChangeText={setSearchText}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchText.length > 0 && (
              <TouchableOpacity
                onPress={() => { setSearchText(''); setPlaceResults([]); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color={theme.muted} />
              </TouchableOpacity>
            )}
          </View>

          {renderFilterChips()}
          {renderDropdown()}
        </View>
      </View>

      {/* Zoom + layers controls */}
      <View style={s.zoomControls}>
        <TouchableOpacity
          style={s.zoomBtn}
          onPress={() => {
            zoomRef.current = Math.min(zoomRef.current + 1, 20);
            cameraRef.current?.setCamera({ zoomLevel: zoomRef.current, animationDuration: 200 });
          }}
        >
          <AppText style={s.zoomBtnText}>+</AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.zoomBtn}
          onPress={() => {
            zoomRef.current = Math.max(zoomRef.current - 1, 1);
            cameraRef.current?.setCamera({ zoomLevel: zoomRef.current, animationDuration: 200 });
          }}
        >
          <AppText style={s.zoomBtnText}>−</AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            s.layersBtn,
            mapStyle === 'satellite'
              ? { backgroundColor: '#2563EB' }
              : { backgroundColor: theme.zoomBtnBg },
          ]}
          onPress={() => setMapStyle(m => m === 'default' ? 'satellite' : 'default')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="layers"
            size={20}
            color={mapStyle === 'satellite' ? '#fff' : theme.zoomBtnText}
          />
        </TouchableOpacity>
      </View>

      {/* Incident detail bottom sheet */}
      {selectedIncident && (
        <View style={s.sheet}>
          <TouchableOpacity style={s.sheetClose} onPress={() => setSelectedIncident(null)}>
            <Ionicons name="close" size={20} color={theme.sectionTitle} />
          </TouchableOpacity>

          <ScrollView
            style={s.sheetScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={s.sheetBadgeRow}>
              <View style={[s.severityBadge, { backgroundColor: SeverityColors[selectedIncident.severity] }]}>
                <AppText style={s.severityText}>{selectedIncident.severity}</AppText>
              </View>
              <View style={[s.lifecycleBadge, { borderColor: LifecycleColors[selectedIncident.lifecycle] }]}>
                <AppText style={[s.lifecycleText, { color: LifecycleColors[selectedIncident.lifecycle] }]}>
                  {selectedIncident.lifecycle}
                </AppText>
              </View>
            </View>

            <AppText style={s.sheetTitle}>{lang === 'ne' && selectedIncident.title_ne ? selectedIncident.title_ne : selectedIncident.title}</AppText>
            <AppText style={s.sheetDesc}>{selectedIncident.description}</AppText>

            <View style={s.sheetLocationRow}>
              <Ionicons name="location-sharp" size={13} color="#DC2626" />
              <AppText style={s.sheetLocationText}>
                {selectedIncident.zone.district}
                {selectedIncident.zone.municipality ? ` · ${selectedIncident.zone.municipality}` : ''}
              </AppText>
            </View>

            <AppText style={s.sheetCoords}>
              {selectedIncident.latitude.toFixed(4)}°N, {selectedIncident.longitude.toFixed(4)}°E
            </AppText>
            <AppText style={s.sheetDate}>
              {new Date(selectedIncident.reported_at).toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </AppText>

            <TouchableOpacity style={s.sheetResetBtn} onPress={resetView} activeOpacity={0.75}>
              <Ionicons name="earth-outline" size={15} color={theme.sectionTitle} />
              <AppText style={s.sheetResetText}>{t.map.showAll}</AppText>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </View>
  );
}
