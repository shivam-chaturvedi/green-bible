package com.athena.greenbible;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Address;
import android.location.Geocoder;
import android.location.Location;
import android.os.Bundle;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.athena.greenbible.notifications.NotificationHelper;
import com.athena.greenbible.weather.WeatherData;
import com.athena.greenbible.weather.WeatherService;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;
import com.google.android.material.bottomnavigation.BottomNavigationView;

import java.io.IOException;
import java.util.List;
import java.util.Locale;

public class SustainabilityActivity extends AppCompatActivity {

    private static final int REQUEST_LOCATION_PERMISSION = 300;
    private BottomNavigationView nav;

    // Guide card containers
    private LinearLayout cardComposting, cardOrganic, cardWater, cardMulching, cardRainwater;

    // Chip buttons
    private LinearLayout chipAll, chipComposting, chipOrganic, chipWater, chipTips;

    // Weather views
    private TextView weatherLocationText, weatherTemperatureText, weatherHumidityText,
            weatherPrecipText, weatherSummaryText, irrigationStatusText;
    private Switch irrigationSwitch;
    private ProgressBar weatherLoading;

    private FusedLocationProviderClient fusedLocationClient;
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_sustainability);

        // --- Bottom navigation setup ---
        nav = findViewById(R.id.bottom_navigation);
        nav.setSelectedItemId(R.id.nav_sustain);
        nav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_home)     { startActivity(new Intent(this, MainActivity.class)); finish(); return true; }
            if (id == R.id.nav_ai)       { startActivity(new Intent(this, PlantAIActivity.class)); finish(); return true; }
            if (id == R.id.nav_health)   { startActivity(new Intent(this, PlantHealthActivity.class)); finish(); return true; }
            if (id == R.id.nav_sustain)  { return true; }
            if (id == R.id.nav_calendar) { startActivity(new Intent(this, CalendarActivity.class)); finish(); return true; }
            if (id == R.id.nav_about)    { startActivity(new Intent(this, AboutActivity.class)); finish(); return true; }
            return false;
        });

        // --- Initialize guide cards ---
        cardComposting = findViewById(R.id.item_guide_card_1); // composting
        cardOrganic = findViewById(R.id.item_guide_card_2);    // organic weed
        cardWater = findViewById(R.id.item_guide_card_3);      // drip irrigation
        cardMulching = findViewById(R.id.item_guide_card_4);   // mulching
        cardRainwater = findViewById(R.id.item_guide_card_5);  // rainwater

        // --- Initialize filter chips ---
        chipAll = findViewById(R.id.chip_all);
        chipComposting = findViewById(R.id.chip_composting);
        chipOrganic = findViewById(R.id.chip_organic);
        chipWater = findViewById(R.id.chip_water);
        chipTips = findViewById(R.id.chip_tips);

        // --- Set onClick listeners for chips ---
        chipAll.setOnClickListener(v -> showAll());
        chipComposting.setOnClickListener(v -> showComposting());
        chipOrganic.setOnClickListener(v -> showOrganic());
        chipWater.setOnClickListener(v -> showWater());
        chipTips.setOnClickListener(v -> showTips());

        initWeatherViews();
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        NotificationHelper.requestPermissionIfNeeded(this);
        NotificationHelper.ensureChannel(
                this,
                NotificationHelper.WEATHER_CHANNEL_ID,
                NotificationHelper.WEATHER_CHANNEL_NAME,
                NotificationHelper.WEATHER_CHANNEL_DESC);
        requestLocationAndFetchWeather();
    }

    private void initWeatherViews() {
        weatherLocationText = findViewById(R.id.weatherLocation);
        weatherTemperatureText = findViewById(R.id.weatherTemperature);
        weatherHumidityText = findViewById(R.id.weatherHumidity);
        weatherPrecipText = findViewById(R.id.weatherPrecip);
        weatherSummaryText = findViewById(R.id.weatherSummary);
        irrigationStatusText = findViewById(R.id.irrigationStatus);
        irrigationSwitch = findViewById(R.id.irrigationSwitch);
        weatherLoading = findViewById(R.id.weatherLoading);
    }

    private void requestLocationAndFetchWeather() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED
                && ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.ACCESS_FINE_LOCATION},
                    REQUEST_LOCATION_PERMISSION);
            updateWeatherUnavailable("Location permission required");
            return;
        }
        weatherLoading.setVisibility(View.VISIBLE);
        fusedLocationClient.getLastLocation()
                .addOnSuccessListener(this::handleLocation)
                .addOnFailureListener(e -> {
                    weatherLoading.setVisibility(View.GONE);
                    updateWeatherUnavailable("Unable to get location");
                });
    }

    private void handleLocation(Location location) {
        if (location == null) {
            weatherLoading.setVisibility(View.GONE);
            updateWeatherUnavailable("Location unavailable");
            return;
        }
        fetchWeather(location);
    }

    private void fetchWeather(Location location) {
        weatherLoading.setVisibility(View.VISIBLE);
        WeatherService.fetchWeather(location.getLatitude(), location.getLongitude(), new WeatherService.Callback() {
            @Override
            public void onSuccess(WeatherData data) {
                weatherLoading.setVisibility(View.GONE);
                bindWeather(data, location);
            }

            @Override
            public void onError(String message) {
                weatherLoading.setVisibility(View.GONE);
                updateWeatherUnavailable(message != null ? message : "Weather data unavailable");
            }
        });
    }

    private void bindWeather(WeatherData data, Location location) {
        weatherTemperatureText.setText(data.formatTemp());
        weatherHumidityText.setText(String.format(Locale.getDefault(), "%.0f%%", data.getHumidity()));
        weatherPrecipText.setText(String.format(Locale.getDefault(), "%.1f mm", data.getPrecipitation()));
        String summary = capitalize(data.getSummary());
        weatherSummaryText.setText(summary);

        String locationName = data.getResolvedAddress() != null && !data.getResolvedAddress().isEmpty()
                ? data.getResolvedAddress()
                : resolveLocationName(location);
        weatherLocationText.setText(locationName);

        boolean pauseIrrigation = data.getPrecipitation() >= 1.0
                || data.getHumidity() > 85
                || data.getSummary().toLowerCase(Locale.getDefault()).contains("rain");
        irrigationStatusText.setText(pauseIrrigation ? "Pause watering" : "Active");
        irrigationSwitch.setChecked(!pauseIrrigation);

        showWeatherNotification(locationName, summary, data.getTemperature());
    }

    private void updateWeatherUnavailable(String message) {
        weatherLocationText.setText(message);
        weatherTemperatureText.setText("--");
        weatherHumidityText.setText("--");
        weatherPrecipText.setText("--");
        weatherSummaryText.setText("Enable location to see local weather tips.");
        irrigationStatusText.setText("--");
        irrigationSwitch.setChecked(false);
    }

    private String resolveLocationName(Location location) {
        try {
            Geocoder geocoder = new Geocoder(this, Locale.getDefault());
            List<Address> addresses = geocoder.getFromLocation(location.getLatitude(), location.getLongitude(), 1);
            if (addresses != null && !addresses.isEmpty()) {
                Address address = addresses.get(0);
                StringBuilder builder = new StringBuilder();
                if (address.getLocality() != null) {
                    builder.append(address.getLocality());
                }
                if (address.getAdminArea() != null) {
                    if (builder.length() > 0) builder.append(", ");
                    builder.append(address.getAdminArea());
                }
                if (builder.length() > 0) {
                    return builder.toString();
                }
            }
        } catch (IOException ignored) {
        }
        return String.format(Locale.getDefault(), "Lat %.2f, Lon %.2f", location.getLatitude(), location.getLongitude());
    }

    private void showWeatherNotification(String location, String summary, double temperature) {
        String tempText = Double.isNaN(temperature)
                ? "--"
                : String.format(Locale.getDefault(), "%.1f°C", temperature);
        String content = String.format(Locale.getDefault(), "%s • %s • %s", location, tempText, summary);
        NotificationHelper.showNotification(
                this,
                NotificationHelper.WEATHER_CHANNEL_ID,
                NotificationHelper.WEATHER_CHANNEL_NAME,
                NotificationHelper.WEATHER_CHANNEL_DESC,
                "Garden Weather Update",
                content,
                NotificationHelper.WEATHER_CHANNEL_ID.hashCode());
    }

    private String capitalize(String text) {
        if (text == null || text.isEmpty()) return "";
        return text.substring(0, 1).toUpperCase(Locale.getDefault()) + text.substring(1);
    }

    // --- Filter methods ---
    private void showAll() {
        cardComposting.setVisibility(View.VISIBLE);
        cardOrganic.setVisibility(View.VISIBLE);
        cardWater.setVisibility(View.VISIBLE);
        cardMulching.setVisibility(View.VISIBLE);
        cardRainwater.setVisibility(View.VISIBLE);
    }

    private void showComposting() {
        cardComposting.setVisibility(View.VISIBLE);
        cardOrganic.setVisibility(View.GONE);
        cardWater.setVisibility(View.GONE);
        cardMulching.setVisibility(View.GONE);
        cardRainwater.setVisibility(View.GONE);
    }

    private void showOrganic() {
        cardComposting.setVisibility(View.GONE);
        cardOrganic.setVisibility(View.VISIBLE);
        cardWater.setVisibility(View.GONE);
        cardMulching.setVisibility(View.GONE);
        cardRainwater.setVisibility(View.GONE);
    }

    private void showWater() {
        cardComposting.setVisibility(View.GONE);
        cardOrganic.setVisibility(View.GONE);
        cardWater.setVisibility(View.VISIBLE);
        cardMulching.setVisibility(View.VISIBLE);
        cardRainwater.setVisibility(View.VISIBLE);
    }

    private void showTips() {
        cardComposting.setVisibility(View.GONE);
        cardOrganic.setVisibility(View.GONE);
        cardWater.setVisibility(View.GONE);
        cardMulching.setVisibility(View.VISIBLE);
        cardRainwater.setVisibility(View.VISIBLE);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_LOCATION_PERMISSION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                requestLocationAndFetchWeather();
            } else {
                Toast.makeText(this, "Location permission required for weather tips", Toast.LENGTH_SHORT).show();
                updateWeatherUnavailable("Location permission denied");
            }
        }
    }
}
