import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAPBOX_TOKEN } from '../constants/api';
import { SeverityColors, LifecycleColors } from '../constants/colors';
import { Incident } from '../types';
import { RootTabParamList } from '../navigation/AppNavigator';
import { useIncidents } from '../context/IncidentsContext';

MapboxGL.setAccessToken(MAPBOX_TOKEN);

const NEPAL_CENTER: [number, number] = [84.124, 28.394];

type LiveMapRoute = RouteProp<RootTabParamList, 'LiveMap'>;

type FeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: { id: string; severity: string; title: string };
  }>;
};

export default function LiveMapScreen() {
  const route = useRoute<LiveMapRoute>();
  const { incidents, loading } = useIncidents();
  const insets = useSafeAreaInsets();

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [searchText, setSearchText] = useState('');

  const focusLat = route.params?.focusLat;
  const focusLng = route.params?.focusLng;
  const focusId  = route.params?.focusId ?? '';

  const cameraRef = useRef<MapboxGL.Camera>(null);

  const [center, setCenter] = useState<[number, number]>(NEPAL_CENTER);
  const [zoom, setZoom] = useState(6);
  const [animMode, setAnimMode] = useState<'flyTo' | 'moveTo'>('moveTo');

  // useFocusEffect fires when the screen is actually visible (not just mounted),
  // which ensures the Mapbox camera is ready to receive the animation command.
  useFocusEffect(
    useCallback(() => {
      if (focusLat != null && focusLng != null) {
        setCenter([focusLng, focusLat]);
        setZoom(12);
        setAnimMode('flyTo');
        cameraRef.current?.setCamera({
          centerCoordinate: [focusLng, focusLat],
          zoomLevel: 12,
          animationDuration: 900,
          animationMode: 'flyTo',
        });
        if (focusId) {
          const found = incidents.find(i => i.id === focusId);
          if (found) setSelectedIncident(found);
        }
      }
    }, [focusLat, focusLng, focusId, incidents])
  );

  // Derive matching incidents from already-loaded data — no API calls
  const filteredIncidents = useMemo(() => {
    if (!searchText.trim()) return null;
    const q = searchText.trim().toLowerCase();
    return incidents.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.zone.district.toLowerCase().includes(q)
    );
  }, [incidents, searchText]);

  const filteredIds = useMemo(
    () => filteredIncidents?.map(i => i.id) ?? null,
    [filteredIncidents],
  );

  const handleResultPress = (incident: Incident) => {
    setSelectedIncident(incident);
    setCenter([incident.longitude, incident.latitude]);
    setZoom(12);
    setAnimMode('flyTo');
    setSearchText('');
  };

  // Mapbox GL filter expression applied to layers — reliable native filtering
  // GeoJSON source stays stable; only the layer visibility changes
  const pinFilter: any = filteredIds
    ? ['in', ['get', 'id'], ['literal', filteredIds]]
    : ['has', 'id'];

  // Full GeoJSON is always passed; filtering is done via layer expressions above
  const geojson: FeatureCollection = {
    type: 'FeatureCollection',
    features: incidents.map(i => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [i.longitude, i.latitude] },
      properties: { id: i.id, severity: i.severity, title: i.title },
    })),
  };

  const handlePinPress = (e: any) => {
    const feature = e.features?.[0];
    if (!feature) return;
    const id = feature.properties?.id;
    const found = incidents.find(i => i.id === id);
    if (found) {
      setSelectedIncident(found);
      setCenter([found.longitude, found.latitude]);
      setZoom(12);
      setAnimMode('flyTo');
    }
  };

  return (
    <View style={s.container}>
      <MapboxGL.MapView
        style={s.map}
        styleURL={MapboxGL.StyleURL.Light}
        scaleBarPosition={{ bottom: 8, left: 8 }}
        onPress={() => setSelectedIncident(null)}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={zoom}
          centerCoordinate={center}
          animationMode={animMode}
          animationDuration={animMode === 'flyTo' ? 1000 : 0}
        />

        {!loading && (
          <MapboxGL.ShapeSource
            id="incidents"
            shape={geojson as any}
            onPress={handlePinPress}
          >
            {/* Heatmap filtered by search */}
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

            {/* All incident pins, filtered by search */}
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

            {/* Glow ring around focused/selected incident */}
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

            {/* Focused/selected incident pin on top */}
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

      {/* Search bar + results dropdown */}
      <View style={[s.searchContainer, { top: insets.top + 10 }]}>
        <View style={s.searchBar}>
          <Ionicons name="search" size={16} color="#9CA3AF" />
          <TextInput
            style={s.searchInput}
            placeholder="Search incidents or districts…"
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {filteredIncidents !== null && filteredIncidents.length === 0 && (
          <View style={s.noResults}>
            <Text style={s.noResultsText}>No results</Text>
          </View>
        )}

        {filteredIncidents !== null && filteredIncidents.length > 0 && (
          <ScrollView
            style={s.resultsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {filteredIncidents.map((incident, idx) => (
              <TouchableOpacity
                key={incident.id}
                style={[
                  s.resultRow,
                  idx < filteredIncidents.length - 1 && s.resultRowBorder,
                ]}
                onPress={() => handleResultPress(incident)}
                activeOpacity={0.7}
              >
                <View
                  style={[s.severityDot, { backgroundColor: SeverityColors[incident.severity] }]}
                />
                <View style={s.resultTextCol}>
                  <Text style={s.resultTitle} numberOfLines={1}>{incident.title}</Text>
                  <Text style={s.resultDistrict}>{incident.zone.district}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Zoom controls */}
      <View style={s.zoomControls}>
        <TouchableOpacity style={s.zoomBtn} onPress={() => setZoom(z => Math.min(z + 1, 20))}>
          <Text style={s.zoomBtnText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.zoomBtn} onPress={() => setZoom(z => Math.max(z - 1, 1))}>
          <Text style={s.zoomBtnText}>−</Text>
        </TouchableOpacity>
      </View>

      {/* Incident detail bottom sheet */}
      {selectedIncident && (
        <View style={s.sheet}>
          <TouchableOpacity style={s.sheetClose} onPress={() => setSelectedIncident(null)}>
            <Ionicons name="close" size={20} color="#374151" />
          </TouchableOpacity>

          <View style={s.sheetBadgeRow}>
            <View style={[s.severityBadge, { backgroundColor: SeverityColors[selectedIncident.severity] }]}>
              <Text style={s.severityText}>{selectedIncident.severity}</Text>
            </View>
            <View style={[s.lifecycleBadge, { borderColor: LifecycleColors[selectedIncident.lifecycle] }]}>
              <Text style={[s.lifecycleText, { color: LifecycleColors[selectedIncident.lifecycle] }]}>
                {selectedIncident.lifecycle}
              </Text>
            </View>
          </View>

          <Text style={s.sheetTitle}>{selectedIncident.title}</Text>
          <Text style={s.sheetDesc}>{selectedIncident.description}</Text>

          <View style={s.sheetLocationRow}>
            <Ionicons name="location-sharp" size={13} color="#DC2626" />
            <Text style={s.sheetLocationText}>
              {selectedIncident.zone.district}
              {selectedIncident.zone.municipality ? ` · ${selectedIncident.zone.municipality}` : ''}
            </Text>
          </View>

          <Text style={s.sheetCoords}>
            {selectedIncident.latitude.toFixed(4)}°N, {selectedIncident.longitude.toFixed(4)}°E
          </Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  map:       { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  searchContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
    borderRadius: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 0,
  },

  noResults: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 13,
    color: '#9CA3AF',
  },

  resultsList: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    maxHeight: 220,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  resultRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  resultTextCol: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  resultDistrict: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },

  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBadgeRow:    { flexDirection: 'row', gap: 8, marginBottom: 12 },
  severityBadge:    { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  severityText:     { color: '#fff', fontSize: 11, fontWeight: '700' },
  lifecycleBadge:   { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  lifecycleText:    { fontSize: 11, fontWeight: '600' },
  sheetTitle:       { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  sheetDesc:        { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 12 },
  sheetLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  sheetLocationText:{ fontSize: 13, color: '#374151', fontWeight: '600' },
  sheetCoords:      { fontSize: 12, color: '#9CA3AF' },

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
    backgroundColor: '#fff',
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
    color: '#374151',
    lineHeight: 26,
  },
});
