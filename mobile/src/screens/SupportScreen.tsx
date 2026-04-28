import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type Category = 'emergency' | 'government' | 'ngo';

interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
  category: Category;
}

const CONTACTS: Contact[] = [
  { id: '1', name: 'Nepal Police',            role: 'Emergency',                          phone: '100',              category: 'emergency'  },
  { id: '2', name: 'Fire Department',          role: 'Emergency',                          phone: '101',              category: 'emergency'  },
  { id: '3', name: 'Ambulance',               role: 'Emergency',                          phone: '102',              category: 'emergency'  },
  { id: '4', name: 'Nepal Army',              role: 'Disaster Response',                  phone: '115',              category: 'government' },
  { id: '5', name: 'NDRRMA',                  role: 'National Disaster Risk Reduction',   phone: '+977-1-4200045',   category: 'government' },
  { id: '6', name: 'Nepal Red Cross Society', role: 'Humanitarian Response',              phone: '+977-1-4270650',   category: 'ngo'        },
  { id: '7', name: 'UNICEF Nepal',            role: 'Child Protection & Relief',          phone: '+977-1-5537333',   category: 'ngo'        },
  { id: '8', name: 'Oxfam Nepal',             role: 'Disaster Relief & WASH',            phone: '+977-1-5547465',   category: 'ngo'        },
];

const CATEGORY_COLOR: Record<Category, string> = {
  emergency:  '#DC2626',
  government: '#2563EB',
  ngo:        '#16A34A',
};

const CATEGORY_ICON: Record<Category, string> = {
  emergency:  'alert-circle',
  government: 'shield',
  ngo:        'people',
};

export default function SupportScreen() {
  const call = (phone: string) => Linking.openURL(`tel:${phone}`);

  return (
    <SafeAreaView style={s.container}>
      <Text style={s.heading}>Support</Text>
      <Text style={s.subheading}>Tap any contact to call directly.</Text>
      <FlatList
        data={CONTACTS}
        keyExtractor={c => c.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        renderItem={({ item }) => {
          const color = CATEGORY_COLOR[item.category];
          return (
            <TouchableOpacity style={s.card} onPress={() => call(item.phone)}>
              <View style={[s.iconWrap, { backgroundColor: color + '18' }]}>
                <Ionicons name={CATEGORY_ICON[item.category] as any} size={22} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.name}</Text>
                <Text style={s.role}>{item.role}</Text>
              </View>
              <View style={s.phoneWrap}>
                <Text style={[s.phone, { color }]}>{item.phone}</Text>
                <Ionicons name="call-outline" size={16} color={color} />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F9FAFB' },
  heading:    { fontSize: 24, fontWeight: '700', color: '#111827', padding: 16, paddingBottom: 4 },
  subheading: { fontSize: 13, color: '#6B7280', paddingHorizontal: 16, marginBottom: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 10, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  iconWrap:  { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  name:      { fontSize: 15, fontWeight: '700', color: '#111827' },
  role:      { fontSize: 12, color: '#6B7280', marginTop: 2 },
  phoneWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  phone:     { fontSize: 14, fontWeight: '700' },
});
