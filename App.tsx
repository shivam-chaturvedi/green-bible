import React, {useState} from 'react';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {Platform, StatusBar, StyleSheet, Text, useColorScheme} from 'react-native';
import Geolocation, {
  GeolocationConfiguration,
} from '@react-native-community/geolocation';
import {SustainabilityScreen} from './src/screens/SustainabilityScreen';
import {PlantAIScreen} from './src/screens/PlantAIScreen';
import {HomeScreen} from './src/screens/HomeScreen';
import {PlantHealthScreen} from './src/screens/PlantHealthScreen';
import {CalendarScreen} from './src/screens/CalendarScreen';
import {AboutScreen} from './src/screens/AboutScreen';
import {colors} from './src/theme/colors';
import {AppTab} from './src/types';
import {AppErrorBoundary} from './src/components/AppErrorBoundary';
import {registerGlobalErrorHandlers} from './src/utils/errorHandling';

const geolocationConfig: GeolocationConfiguration = {
  skipPermissionRequests: false,
  authorizationLevel: 'whenInUse',
  locationProvider: Platform.select({
    android: 'auto',
    default: 'auto',
  }) as GeolocationConfiguration['locationProvider'],
};

Geolocation.setRNConfiguration(geolocationConfig);
registerGlobalErrorHandlers();

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [activeTab, setActiveTab] = useState<AppTab>('home');

  const renderScreen = () => {
    try {
      if (activeTab === 'home') {
        return <HomeScreen activeTab={activeTab} onNavigate={setActiveTab} />;
      }
      if (activeTab === 'health') {
        return <PlantHealthScreen activeTab={activeTab} onNavigate={setActiveTab} />;
      }
      if (activeTab === 'calendar') {
        return <CalendarScreen activeTab={activeTab} onNavigate={setActiveTab} />;
      }
      if (activeTab === 'sustain') {
        return <SustainabilityScreen activeTab={activeTab} onNavigate={setActiveTab} />;
      }
      if (activeTab === 'ai') {
        return <PlantAIScreen activeTab={activeTab} onNavigate={setActiveTab} />;
      }
      if (activeTab === 'about') {
        return <AboutScreen activeTab={activeTab} onNavigate={setActiveTab} />;
      }
    } catch (error) {
      console.error('Screen render error', error);
      return (
        <SafeAreaView style={styles.safeArea}>
          <Text>Something went wrong. Please restart the app.</Text>
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text>Unknown tab.</Text>
      </SafeAreaView>
    );
  };

  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={colors.greenLight}
        />
        <SafeAreaView style={styles.safeArea}>{renderScreen()}</SafeAreaView>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}

export default App;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.greenLight,
  },
});
