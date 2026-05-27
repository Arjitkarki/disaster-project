import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import DashboardScreen from '../screens/DashboardScreen';
import FeedScreen from '../screens/FeedScreen';
import LiveMapScreen from '../screens/LiveMapScreen';
import CitizenReportScreen from '../screens/CitizenReportScreen';
import SupportScreen from '../screens/SupportScreen';
import { useTheme } from '../context/ThemeContext';
import { DarkTheme, LightTheme } from '../constants/colors';
import { useLanguage } from '../context/LanguageContext';

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
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const theme = isDark ? DarkTheme : LightTheme;

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
          tabBarInactiveTintColor: theme.muted,
          tabBarStyle: {
            borderTopColor: theme.border,
            backgroundColor: theme.bg,
          },
          tabBarLabelStyle: lang === 'ne'
            ? { fontFamily: 'NotoSansDevanagari_400Regular', fontSize: 10 }
            : undefined,
          headerShown: false,
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: t.nav.dashboard }} />
        <Tab.Screen name="Feed" component={FeedScreen} options={{ title: t.nav.feed }} />
        <Tab.Screen name="LiveMap" component={LiveMapScreen} options={{ title: t.nav.liveMap }} />
        <Tab.Screen name="CitizenReport" component={CitizenReportScreen} options={{ title: t.nav.report }} />
        <Tab.Screen name="Support" component={SupportScreen} options={{ title: t.nav.support }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
