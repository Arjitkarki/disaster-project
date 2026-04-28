import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Incident } from '../types';
import { API_BASE_URL } from '../constants/api';
import { SeverityColors, LifecycleColors } from '../constants/colors';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function FeedScreen() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    fetch(`${API_BASE_URL}/api/v1/incidents`)
      .then(r => r.json())
      .then(setIncidents)
      .catch(console.error)
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={s.container}>
      <Text style={s.heading}>Feed</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#DC2626" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={incidents}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          ListEmptyComponent={<Text style={s.empty}>No incidents in the feed.</Text>}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={[s.severityBadge, { backgroundColor: SeverityColors[item.severity] }]}>
                  <Text style={s.severityText}>{item.severity}</Text>
                </View>
                <View style={[
                  s.lifecycleBadge,
                  { borderColor: LifecycleColors[item.lifecycle] },
                ]}>
                  <Text style={[s.lifecycleText, { color: LifecycleColors[item.lifecycle] }]}>
                    {item.lifecycle}
                  </Text>
                </View>
                <Text style={s.timeAgo}>{timeAgo(item.reported_at)}</Text>
              </View>
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.description} numberOfLines={2}>{item.description}</Text>
              <Text style={s.zone}>
                {item.zone.district}
                {item.zone.municipality ? ` · ${item.zone.municipality}` : ''}
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#F9FAFB' },
  heading:        { fontSize: 24, fontWeight: '700', color: '#111827', padding: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  severityBadge:  { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  severityText:   { color: '#fff', fontSize: 11, fontWeight: '700' },
  lifecycleBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  lifecycleText:  { fontSize: 11, fontWeight: '600' },
  timeAgo:        { marginLeft: 'auto', fontSize: 12, color: '#9CA3AF' },
  title:          { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  description:    { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 6 },
  zone:           { fontSize: 12, color: '#9CA3AF' },
  empty:          { textAlign: 'center', color: '#6B7280', marginTop: 40 },
});
