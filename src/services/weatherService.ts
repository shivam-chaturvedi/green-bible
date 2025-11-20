import {WeatherSnapshot} from '../types';

const WEATHER_API_KEY = '2RMQ5RB9QYXUC9VLKW6S6MRBU';

export async function fetchWeatherSnapshot(
  latitude: number,
  longitude: number,
): Promise<WeatherSnapshot> {
  const encodedLocation = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(
    encodedLocation,
  )}?unitGroup=metric&key=${WEATHER_API_KEY}&contentType=json`;
  const response = await fetch(url, {method: 'GET'});
  if (!response.ok) {
    throw new Error(`Weather request failed: ${response.status}`);
  }
  const payload = await response.json();
  const current = payload?.currentConditions ?? {};
  const resolvedAddress =
    typeof payload?.resolvedAddress === 'string' &&
    payload.resolvedAddress.length > 0
      ? payload.resolvedAddress
      : `Lat ${latitude.toFixed(2)}, Lon ${longitude.toFixed(2)}`;
  return {
    locationName: resolvedAddress,
    temperature: Number.isFinite(current?.temp) ? current.temp : Number.NaN,
    humidity: Number.isFinite(current?.humidity) ? current.humidity : Number.NaN,
    precipitation: Number.isFinite(current?.precip) ? current.precip : 0,
    summary:
      typeof current?.conditions === 'string' && current.conditions.length
        ? current.conditions
        : 'Calm conditions',
  };
}
