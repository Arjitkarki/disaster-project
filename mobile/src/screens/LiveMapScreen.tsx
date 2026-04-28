import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { Incident } from '../types';
import { API_BASE_URL, MAPBOX_TOKEN } from '../constants/api';
import { SeverityColors } from '../constants/colors';

MapboxGL.setAccessToken(MAPBOX_TOKEN);

// Nepal center [longitude, latitude]
const NEPAL_CENTER: [number, number] = [84.124, 28.394];

type FeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: { id: string; severity: string; title: string };
  }>;
};

export default function LiveMapScreen() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/incidents`)
      .then(r => r.json())
      .then(setIncidents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
          zoomLevel={6}
          centerCoordinate={NEPAL_CENTER}
          animationMode="none"
        />

        {!loading && (
          <MapboxGL.ShapeSource id="incidents" shape={geojson as any}>
            {/* Heatmap visible at lower zoom */}
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
            {/* GeoPins visible when zoomed in */}
            <MapboxGL.CircleLayer
              id="incidents-points"
              sourceID="incidents"
              minZoomLevel={7}
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
