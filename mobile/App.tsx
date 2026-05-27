import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_600SemiBold,
  NotoSansDevanagari_700Bold,
  NotoSansDevanagari_800ExtraBold,
} from '@expo-google-fonts/noto-sans-devanagari';
import AppNavigator from './src/navigation/AppNavigator';
import { IncidentsProvider } from './src/context/IncidentsContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { registerForPushNotifications } from './src/utils/notifications';

function Root() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSansDevanagari_400Regular,
    NotoSansDevanagari_600SemiBold,
    NotoSansDevanagari_700Bold,
    NotoSansDevanagari_800ExtraBold,
  });

  useEffect(() => { registerForPushNotifications(); }, []);

  // Hold on splash screen until fonts are ready.
  // If font loading errors, proceed anyway with system font fallback.
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <LanguageProvider>
          <IncidentsProvider>
            <Root />
          </IncidentsProvider>
        </LanguageProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
