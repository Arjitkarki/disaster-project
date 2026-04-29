import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useRoute, RouteProp } from '@react-navigation/native';
import { MAPBOX_TOKEN } from '../constants/api';
import { SeverityColors } from '../constants/colors';
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

  return (
    <View style={s.container}>
      <MapboxGL.MapView style={s.map} styleURL={MapboxGL.StyleURL.Dark}>
        <MapboxGL.Camera
          zoomLevel={zoom}
          centerCoordinate={center}
          animationMode={animMode}
          animationDuration={animMode === 'flyTo' ? 1000 : 0}
        />

        {!loading && (
          <MapboxGL.ShapeSource id="incidents" shape={geojson as any}>
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

            {/* Glow ring around focused incident (hidden when no focus via empty-string filter) */}
            <MapboxGL.CircleLayer
              id="focus-glow"
              sourceID="incidents"
              minZoomLevel={5}
              filter={['==', ['get', 'id'], focusId]}
              style={{
                circleRadius: 20,
                circleColor: 'rgba(255,255,255,0.2)',
                circleStrokeWidth: 2,
                circleStrokeColor: 'rgba(255,255,255,0.6)',
              }}
            />

            {/* Focused incident pin on top */}
            <MapboxGL.CircleLayer
              id="focus-pin"
              sourceID="incidents"
              minZoomLevel={5}
              filter={['==', ['get', 'id'], focusId]}
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
});
