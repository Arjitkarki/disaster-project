import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
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
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const focusLat = route.params?.focusLat;
  const focusLng = route.params?.focusLng;
  const focusId  = route.params?.focusId ?? '';

  const [center, setCenter] = useState<[number, number]>(NEPAL_CENTER);
  const [zoom, setZoom] = useState(6);
  const [animMode, setAnimMode] = useState<'flyTo' | 'moveTo'>('moveTo');

  useEffect(() => {
    if (focusLat != null && focusLng != null) {
      setCenter([focusLng, focusLat]);
      setZoom(12);
      setAnimMode('flyTo');
    }
  }, [focusLat, focusLng]);

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
        styleURL={MapboxGL.StyleURL.Dark}
        onPress={() => setSelectedIncident(null)}
      >
        <MapboxGL.Camera
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
            {/* Heatmap at low zoom */}
            <MapboxGL.HeatmapLayer
              id="incidents-heat"
              sourceID="incidents"
              maxZoomLevel={8}
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

            {/* All incident pins */}
            <MapboxGL.CircleLayer
              id="incidents-points"
              sourceID="incidents"
              minZoomLevel={5}
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
  sheetBadgeRow:   { flexDirection: 'row', gap: 8, marginBottom: 12 },
  severityBadge:   { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  severityText:    { color: '#fff', fontSize: 11, fontWeight: '700' },
  lifecycleBadge:  { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  lifecycleText:   { fontSize: 11, fontWeight: '600' },
  sheetTitle:      { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  sheetDesc:       { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 12 },
  sheetLocationRow:{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  sheetLocationText:{ fontSize: 13, color: '#374151', fontWeight: '600' },
  sheetCoords:     { fontSize: 12, color: '#9CA3AF' },
});
