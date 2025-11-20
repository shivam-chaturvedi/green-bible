import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import {AppTab, ChipId, WeatherSnapshot} from '../types';
import {chipFilters} from '../constants/chipFilters';
import {guideCards, guideVisibilityMap} from '../constants/guideCards';
import {colors} from '../theme/colors';
import {BottomNavigation} from '../components/BottomNavigation';
import {ChipButton} from '../components/ChipButton';
import {GuideCard} from '../components/GuideCard';
import {WeatherRow} from '../components/WeatherRow';
import {
  capitalize,
  formatPercent,
  formatPrecip,
  formatTemp,
  placeholder,
} from '../utils/formatters';
import {fetchWeatherSnapshot} from '../services/weatherService';

type Props = {
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
};

export function SustainabilityScreen({activeTab, onNavigate}: Props) {
  const [selectedFilter, setSelectedFilter] = useState<ChipId>('all');
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [locationLabel, setLocationLabel] = useState('Fetching location…');
  const [summaryMessage, setSummaryMessage] = useState(
    'Fetching sustainability tips based on your weather...',
  );
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [notificationPreview, setNotificationPreview] = useState<string | null>(
    null,
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const updateUnavailable = useCallback((message: string) => {
    if (!mountedRef.current) {
      return;
    }
    setWeather(null);
    setLocationLabel(message);
    setSummaryMessage('Enable location to see local weather tips.');
    setNotificationPreview(null);
  }, []);

  const bindWeather = useCallback((snapshot: WeatherSnapshot) => {
    if (!mountedRef.current) {
      return;
    }
    setWeather(snapshot);
    setLocationLabel(snapshot.locationName);
    setSummaryMessage(capitalize(snapshot.summary));
    setNotificationPreview(
      `${snapshot.locationName} • ${formatTemp(snapshot.temperature)} • ${capitalize(snapshot.summary)}`,
    );
  }, []);

  const loadWeather = useCallback(
    async (latitude: number, longitude: number) => {
      setLoadingWeather(true);
      try {
        const snapshot = await fetchWeatherSnapshot(latitude, longitude);
        bindWeather(snapshot);
      } catch (error) {
        updateUnavailable(
          error instanceof Error ? error.message : 'Weather data unavailable',
        );
      } finally {
        if (mountedRef.current) {
          setLoadingWeather(false);
          setRefreshing(false);
        }
      }
    },
    [bindWeather, updateUnavailable],
  );

  const requestPermissionAndLocate = useCallback(async () => {
    setRefreshing(true);
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location permission',
            message:
              'GreenGarden needs access to your location to tailor weather-based sustainability tips.',
            buttonPositive: 'Allow',
          },
        );
        const allowed =
          granted === PermissionsAndroid.RESULTS.GRANTED ||
          granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
        if (!allowed) {
          setPermissionDenied(true);
          updateUnavailable('Location permission required');
          setRefreshing(false);
          return;
        }
        setPermissionDenied(false);
      } catch {
        setPermissionDenied(true);
        updateUnavailable('Unable to request location permission');
        setRefreshing(false);
        return;
      }
    } else {
      Geolocation.requestAuthorization();
    }

    Geolocation.getCurrentPosition(
      position => {
        loadWeather(position.coords.latitude, position.coords.longitude);
      },
      error => {
        setRefreshing(false);
        updateUnavailable(error?.message ?? 'Location unavailable');
        if (error?.code === 1) {
          setPermissionDenied(true);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      },
    );
  }, [loadWeather, updateUnavailable]);

  useEffect(() => {
    requestPermissionAndLocate();
  }, [requestPermissionAndLocate]);

  const onRefresh = useCallback(() => {
    requestPermissionAndLocate();
  }, [requestPermissionAndLocate]);

  const visibleGuideCards = useMemo(() => {
    const allowedIds = guideVisibilityMap[selectedFilter];
    return guideCards.filter(card => allowedIds.includes(card.id));
  }, [selectedFilter]);

  const shouldPauseIrrigation = useMemo(() => {
    if (!weather) {
      return true;
    }
    return (
      weather.precipitation >= 1 ||
      weather.humidity > 85 ||
      weather.summary.toLowerCase().includes('rain')
    );
  }, [weather]);

  const irrigationStatus = shouldPauseIrrigation ? 'Pause watering' : 'Active';

  const locationBadgeText = weather
    ? weather.locationName
    : permissionDenied
    ? 'Location permission required'
    : locationLabel;

  const summaryText = weather ? capitalize(weather.summary) : summaryMessage;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollArea}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.greenPrimary]}
          />
        }>
        <Text style={styles.title}>Sustainability Strategies</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderIcon}>🌦️</Text>
            <Text style={styles.cardHeaderText}>Weather-Based Recommendations</Text>
            <View style={styles.locationBadge}>
              <Text style={styles.locationBadgeText} numberOfLines={1}>
                {locationBadgeText}
              </Text>
            </View>
          </View>
          <View style={styles.weatherBody}>
            {loadingWeather && (
              <ActivityIndicator
                size="small"
                color={colors.greenPrimary}
                style={styles.loader}
              />
            )}
            <WeatherRow
              label="Temperature"
              value={
                weather ? formatTemp(weather.temperature) : placeholder('°C')
              }
            />
            <WeatherRow
              label="Humidity"
              value={
                weather ? formatPercent(weather.humidity) : placeholder('%')
              }
            />
            <WeatherRow
              label="Precipitation"
              value={
                weather ? formatPrecip(weather.precipitation) : placeholder('mm')
              }
            />
            <Text style={styles.weatherSummary}>{summaryText}</Text>
            <View style={styles.divider} />
            <View style={styles.irrigationRow}>
              <Text style={styles.irrigationLabel}>Irrigation Status</Text>
              <Text style={styles.irrigationStatus}>{irrigationStatus}</Text>
              <Switch value={!shouldPauseIrrigation && Boolean(weather)} disabled />
            </View>
          </View>
        </View>

        <View style={styles.cardRow}>
          <Text style={styles.cardRowTitle}>Smart Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={value => {
              setNotificationsEnabled(value);
              if (!value) {
                setNotificationPreview(null);
              } else if (weather) {
                setNotificationPreview(
                  `${weather.locationName} • ${formatTemp(weather.temperature)} • ${capitalize(weather.summary)}`,
                );
              }
            }}
          />
        </View>
        {notificationPreview && (
          <View style={styles.notificationBanner}>
            <Text style={styles.notificationTitle}>Garden Weather Update</Text>
            <Text style={styles.notificationBody}>{notificationPreview}</Text>
          </View>
        )}

        <ScrollView
          style={styles.chipScroll}
          horizontal
          showsHorizontalScrollIndicator={false}>
          {chipFilters.map(chip => (
            <ChipButton
              key={chip.id}
              label={chip.label}
              icon={chip.icon}
              active={selectedFilter === chip.id}
              onPress={() => setSelectedFilter(chip.id)}
            />
          ))}
        </ScrollView>

        <Text style={styles.sectionHeading}>Educational Guides</Text>
        {visibleGuideCards.map(card => (
          <GuideCard key={card.id} card={card} />
        ))}
      </ScrollView>

      <BottomNavigation activeTab={activeTab} onSelect={onNavigate} />
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
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.greenPrimary,
    marginTop: 12,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  cardHeaderText: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.greenPrimary,
  },
  locationBadge: {
    backgroundColor: colors.orangeBadge,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: 140,
  },
  locationBadgeText: {
    fontSize: 12,
    color: colors.orangeText,
  },
  weatherBody: {
    marginTop: 12,
  },
  loader: {
    marginBottom: 8,
  },
  weatherSummary: {
    marginTop: 6,
    fontStyle: 'italic',
    color: colors.textGray,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 12,
  },
  irrigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  irrigationLabel: {
    flex: 1,
    color: colors.textDark,
  },
  irrigationStatus: {
    color: colors.greenPrimary,
    fontWeight: 'bold',
    marginRight: 8,
  },
  cardRow: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardRowTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.greenPrimary,
  },
  notificationBanner: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: colors.greenPrimary,
  },
  notificationBody: {
    color: colors.textDark,
  },
  chipScroll: {
    marginTop: 16,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.greenPrimary,
    marginTop: 20,
    marginBottom: 8,
  },
});
