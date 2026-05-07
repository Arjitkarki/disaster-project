import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { IncidentsProvider } from './src/context/IncidentsContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

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
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <IncidentsProvider>
          <Root />
        </IncidentsProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
