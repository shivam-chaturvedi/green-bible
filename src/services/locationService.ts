import {geminiUserAgent} from './geminiService';

export async function buildLocationSummary(lat: number, lon: number) {
  try {
    const label = await reverseGeocode(lat, lon);
    if (label) {
      return `${label} (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
    }
  } catch {
    // ignore and fall back
  }
  return `Lat ${lat.toFixed(4)}, Lon ${lon.toFixed(4)}`;
}

async function reverseGeocode(lat: number, lon: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': geminiUserAgent,
    },
  });
  if (!response.ok) {
    throw new Error(`Reverse geocode failed ${response.status}`);
  }
  const payload = await response.json();
  const address = payload?.address;
  if (!address) {
    return null;
  }
  const locality =
    address.city ||
    address.town ||
    address.village ||
    address.hamlet ||
    address.suburb;
  const admin = address.state || address.region;
  const country = address.country;
  const parts = [locality, admin, country].filter(Boolean);
  return parts.join(', ');
}
