import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { IncidentsProvider } from './src/context/IncidentsContext';

export default function App() {
  return (
    <IncidentsProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </IncidentsProvider>
  );
}
