import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import {AppTab, WeatherSnapshot} from '../types';
import {colors} from '../theme/colors';
import {BottomNavigation} from '../components/BottomNavigation';
import {fetchWeatherSnapshot} from '../services/weatherService';
import {loadTasks} from '../services/taskService';
import {ensureLocationPermission} from '../services/permissionService';
import {
  capitalize,
  formatPercent,
  formatPrecip,
  formatTemp,
} from '../utils/formatters';

let locationIntroShownOnce = false;

const HERO_SUBTITLE =
  'Your garden snapshot is ready — watering, health, and schedule insights tailored for today.';
const TIP_TITLE = 'Water pre-dawn for a stronger root system';
const TIP_DESCRIPTION =
  'Early watering minimises evaporation and keeps foliage dry, reducing fungal risk.';

const quickActions = [
  {
    id: 'ai',
    title: 'AI Plant Identifier',
    description: 'Send a photo or question to get instant plant care tips.',
    icon: '🤖',
    tab: 'ai' as AppTab,
  },
  {
    id: 'health',
    title: 'Health Diagnosis',
    description: 'Log quick symptoms for an instant recovery plan.',
    icon: '🩺',
    tab: 'health' as AppTab,
  },
  {
    id: 'calendar',
    title: 'Smart Calendar',
    description: 'Plan sowing, pruning, harvests, and automate reminders.',
    icon: '🗓️',
    tab: 'calendar' as AppTab,
  },
  {
    id: 'sustain',
    title: 'Eco Playbooks',
    description: 'Pick quick eco routines for compost, water, and pests.',
    icon: '♻️',
    tab: 'sustain' as AppTab,
  },
];

const locationFallbackMessage =
  'Enable location services to see personalised watering reminders, pest alerts, and seasonal guides.';

const todayKey = () => {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

type Props = {
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
};

export function HomeScreen({activeTab, onNavigate}: Props) {
  const [locationLabel, setLocationLabel] = useState('Location not shared yet');
  const [weatherHeadline, setWeatherHeadline] = useState(
    'Enable location to see live weather insights.',
  );
  const [weatherTip, setWeatherTip] = useState(
    'Weather data unavailable. Enable location to see live insights.',
  );
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [tasksLabel, setTasksLabel] = useState('No tasks today');
  const [refreshing, setRefreshing] = useState(false);
  const [hasRequestedLocation, setHasRequestedLocation] = useState(false);

  const updateTasksSummary = useCallback(async () => {
    const tasks = await loadTasks();
    const key = todayKey();
    const count = tasks.filter(task => task.date === key).length;
    if (count === 0) {
      setTasksLabel('No tasks today');
    } else if (count === 1) {
      setTasksLabel('1 task today');
    } else {
      setTasksLabel(`${count} tasks today`);
    }
  }, []);

  const applyWeatherSnapshot = useCallback((snapshot: WeatherSnapshot) => {
    setWeather(snapshot);
    setLocationLabel(snapshot.locationName);
    const summary = capitalize(snapshot.summary || '');
    setWeatherHeadline(
      `${snapshot.locationName} • ${formatTemp(snapshot.temperature)} • ${summary}`,
    );
    const pauseIrrigation =
      snapshot.precipitation >= 1 ||
      snapshot.humidity > 85 ||
      (snapshot.summary || '').toLowerCase().includes('rain');
    setWeatherTip(
      pauseIrrigation
        ? 'Tip: Pause irrigation today — precipitation or high humidity detected. Natural moisture should suffice.'
        : 'Tip: Weather conditions look good for watering. Consider early morning irrigation for best results.',
    );
  }, []);

  const fetchWeatherForCoords = useCallback(
    async (latitude: number, longitude: number) => {
      try {
        const snapshot = await fetchWeatherSnapshot(latitude, longitude);
        applyWeatherSnapshot(snapshot);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Weather data unavailable';
        setWeather(null);
        setWeatherHeadline(message);
        setWeatherTip('Weather data unavailable. Enable location to see live weather.');
      } finally {
        setWeatherLoading(false);
      }
    },
    [applyWeatherSnapshot],
  );

  const openLocationSettings = useCallback(() => {
    if (Platform.OS === 'android' && typeof Linking.sendIntent === 'function') {
      Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() => {
        Linking.openSettings().catch(() => {
          Alert.alert('Location', 'Please enable location services in Settings.');
        });
      });
      return;
    }

    Linking.openSettings().catch(() => {
      Alert.alert('Location', 'Please enable location services in Settings.');
    });
  }, []);

  const requestPermissionAndLocate = useCallback(async () => {
    setHasRequestedLocation(true);
    setWeatherLoading(true);
    const allowed = await ensureLocationPermission({
      title: 'Location permission',
      message:
        'GreenGarden uses your location to personalise watering reminders and pest alerts.',
    });
    setPermissionDenied(!allowed);
    if (!allowed) {
      setLocationLabel('Location permission required');
      setWeatherHeadline('Weather unavailable');
      setWeatherTip(locationFallbackMessage);
      setWeatherLoading(false);
      return;
    }
    if (Platform.OS === 'ios') {
      Geolocation.requestAuthorization();
    }

    setLocationLabel('Fetching location...');
    await new Promise<void>(resolve => {
      Geolocation.getCurrentPosition(
        position => {
          const {latitude, longitude} = position.coords;
          setLocationLabel(
            `Lat ${latitude.toFixed(2)}, Lon ${longitude.toFixed(2)}`,
          );
          fetchWeatherForCoords(latitude, longitude).finally(resolve);
        },
        error => {
          setLocationLabel(error?.message ?? 'Location unavailable');
          if (error?.code === 1) {
            setPermissionDenied(true);
          }
          if (error?.code === 2) {
            openLocationSettings();
          }
          setWeather(null);
          setWeatherHeadline('Weather unavailable');
          setWeatherTip(locationFallbackMessage);
          setWeatherLoading(false);
          resolve();
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        },
      );
    });
  }, [fetchWeatherForCoords, openLocationSettings]);

  useEffect(() => {
    if (!locationIntroShownOnce) {
      Alert.alert(
        'Enable location services',
        'Please turn on location services to unlock live weather-based tips. Tap "Share location" when you are ready.',
      );
      locationIntroShownOnce = true;
    }
  }, []);

  useEffect(() => {
    updateTasksSummary();
  }, [updateTasksSummary]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    const tasksPromise = updateTasksSummary();
    const locationPromise = hasRequestedLocation
      ? requestPermissionAndLocate()
      : Promise.resolve();
    Promise.all([tasksPromise, locationPromise]).finally(() => setRefreshing(false));
  }, [hasRequestedLocation, requestPermissionAndLocate, updateTasksSummary]);

  const detailsText = weather
    ? `🌧️ Precip: ${formatPrecip(weather.precipitation)}   💧 Humidity: ${formatPercent(weather.humidity)}`
    : '🌧️ Precip: --   💧 Humidity: --';

  const summaryText = weather ? capitalize(weather.summary) : '--';

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollArea}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.greenPrimary]}
          />
        }>
        <HeroCard
          tasksLabel={tasksLabel}
          onHealthPress={() => onNavigate('health')}
          onCalendarPress={() => onNavigate('calendar')}
        />

        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <Text style={styles.locationTitle}>Location & Weather</Text>
            {weatherLoading && <ActivityIndicator color={colors.greenPrimary} />}
          </View>
          <Text style={styles.locationLabel}>{locationLabel}</Text>
          <Text style={styles.locationDescription}>{locationFallbackMessage}</Text>
          <Text style={styles.weatherSummaryLabel}>{weatherHeadline}</Text>
          {permissionDenied && (
            <Text style={styles.permissionWarning}>
              Location permission denied — enable it to unlock live insights.
            </Text>
          )}
          <TouchableOpacity
            style={styles.shareLocationButton}
            onPress={requestPermissionAndLocate}
            disabled={weatherLoading}>
            <Text style={styles.shareLocationText}>Share location</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <Text style={styles.sectionSubtitle}>
          Jump straight into the tools you use the most.
        </Text>
        <View style={styles.quickActionsContainer}>
          {quickActions.map(action => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickActionCard}
              onPress={() => {
                if (action.tab) {
                  onNavigate(action.tab);
                } else {
                  Alert.alert(action.title, 'This feature is coming soon in React Native.');
                }
              }}>
              <View style={styles.quickActionInner}>
                <Text style={styles.quickActionIcon}>{action.icon}</Text>
                <Text style={styles.quickActionTitle}>{action.title}</Text>
                <Text style={styles.quickActionDescription}>{action.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Today's Garden Tip</Text>
        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>💡</Text>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>{TIP_TITLE}</Text>
            <Text style={styles.tipDescription}>{TIP_DESCRIPTION}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Garden Weather</Text>
        <View style={styles.weatherCard}>
          <View style={styles.weatherRowTop}>
            <Text style={styles.weatherTemp}>
              {weather ? formatTemp(weather.temperature) : 'Loading...'}
            </Text>
            <Text style={styles.weatherSummary}>{summaryText}</Text>
          </View>
          <Text style={styles.weatherDetails}>{detailsText}</Text>
          <View style={styles.weatherDivider} />
          <Text style={styles.weatherTip}>{weatherTip}</Text>
        </View>
      </ScrollView>

      <BottomNavigation activeTab={activeTab} onSelect={onNavigate} />
    </View>
  );
}

function HeroCard({
  tasksLabel,
  onHealthPress,
  onCalendarPress,
}: {
  tasksLabel: string;
  onHealthPress: () => void;
  onCalendarPress: () => void;
}) {
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroContent}>
        <View style={styles.heroLogo}>
          <Text style={styles.heroLogoText}>🌱</Text>
        </View>
        <Text style={styles.heroTitle}>Welcome back, Gardener!</Text>
        <Text style={styles.heroSubtitle}>{HERO_SUBTITLE}</Text>
        <View style={styles.heroChip}>
          <Text style={styles.heroChipText}>{tasksLabel}</Text>
        </View>
        <View style={styles.heroButtonsRow}>
          <TouchableOpacity style={styles.heroSecondaryButton} onPress={onHealthPress}>
            <Text style={styles.heroSecondaryText}>Plant Check</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.heroPrimaryButton} onPress={onCalendarPress}>
            <Text style={styles.heroPrimaryText}>Open Calendar</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.heroImageBubble}>
        <Text style={styles.heroImageEmoji}>🌿</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.greenLight,
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  heroCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginTop: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  heroContent: {
    flex: 1,
    marginRight: 16,
  },
  heroLogo: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heroLogoText: {
    fontSize: 28,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.greenPrimary,
  },
  heroSubtitle: {
    marginTop: 6,
    color: colors.textDark,
    fontSize: 14,
  },
  heroChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.chipBackground,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 12,
  },
  heroChipText: {
    color: colors.greenPrimary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  heroButtonsRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  heroSecondaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.greenPrimary,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  heroPrimaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.greenPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 3},
    elevation: 4,
  },
  heroSecondaryText: {
    color: colors.greenPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  heroPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  heroImageBubble: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImageEmoji: {
    fontSize: 40,
  },
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.greenPrimary,
  },
  locationLabel: {
    marginTop: 8,
    color: colors.textDark,
    fontWeight: '600',
  },
  locationDescription: {
    marginTop: 4,
    color: colors.textGray,
    fontSize: 12,
  },
  weatherSummaryLabel: {
    marginTop: 12,
    color: colors.greenPrimary,
    fontWeight: '600',
  },
  permissionWarning: {
    marginTop: 8,
    color: '#C62828',
    fontSize: 12,
  },
  shareLocationButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: colors.greenPrimary,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  shareLocationText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.greenPrimary,
    marginBottom: 6,
  },
  sectionSubtitle: {
    color: colors.textGray,
    fontSize: 14,
    marginBottom: 16,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 24,
  },
  quickActionCard: {
    width: '50%',
    padding: 8,
  },
  quickActionInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    minHeight: 160,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.chipBackground,
  },
  quickActionIcon: {
    fontSize: 28,
    textAlign: 'center',
  },
  quickActionTitle: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.greenPrimary,
    marginTop: 8,
  },
  quickActionDescription: {
    textAlign: 'center',
    color: colors.textGray,
    fontSize: 13,
    marginTop: 6,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  tipIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.greenPrimary,
  },
  tipDescription: {
    marginTop: 6,
    color: colors.textDark,
    fontSize: 13,
  },
  weatherCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  weatherRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weatherTemp: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.greenPrimary,
  },
  weatherSummary: {
    color: colors.textGray,
    fontSize: 14,
  },
  weatherDetails: {
    marginTop: 8,
    color: colors.textGray,
    fontSize: 13,
  },
  weatherDivider: {
    height: 1,
    backgroundColor: colors.greenLight,
    marginVertical: 14,
  },
  weatherTip: {
    color: colors.textDark,
    fontSize: 13,
  },
});
