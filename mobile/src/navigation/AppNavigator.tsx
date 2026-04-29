import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import DashboardScreen from '../screens/DashboardScreen';
import FeedScreen from '../screens/FeedScreen';
import LiveMapScreen from '../screens/LiveMapScreen';
import CitizenReportScreen from '../screens/CitizenReportScreen';
import SupportScreen from '../screens/SupportScreen';

export type RootTabParamList = {
  Dashboard: undefined;
  Feed: undefined;
  LiveMap: { focusLat: number; focusLng: number; focusId: string } | undefined;
  CitizenReport: undefined;
  Support: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICONS: Record<string, [string, string]> = {
  Dashboard:     ['grid',        'grid-outline'],
  Feed:          ['list',        'list-outline'],
  LiveMap:       ['map',         'map-outline'],
  CitizenReport: ['add-circle',  'add-circle-outline'],
  Support:       ['call',        'call-outline'],
};

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            const [active, inactive] = TAB_ICONS[route.name] ?? ['help', 'help-outline'];
            return (
              <Ionicons
                name={(focused ? active : inactive) as any}
                size={size}
                color={color}
              />
            );
          },
          tabBarActiveTintColor: '#DC2626',
          tabBarInactiveTintColor: '#6B7280',
          tabBarStyle: { borderTopColor: '#E5E7EB' },
          headerShown: false,
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Feed" component={FeedScreen} />
        <Tab.Screen
          name="LiveMap"
          component={LiveMapScreen}
          options={{ title: 'Live Map' }}
        />
        <Tab.Screen
          name="CitizenReport"
          component={CitizenReportScreen}
          options={{ title: 'Report' }}
        />
        <Tab.Screen name="Support" component={SupportScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
