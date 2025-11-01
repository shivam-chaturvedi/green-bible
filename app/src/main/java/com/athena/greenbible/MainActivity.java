package com.athena.greenbible;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Bundle;
import android.os.Looper;
import android.provider.Settings;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.card.MaterialCardView;

import com.athena.greenbible.weather.WeatherData;
import com.athena.greenbible.weather.WeatherService;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    private FusedLocationProviderClient fusedLocationClient;
    private TextView locationText;
    private TextView weatherSummaryText;
    private TextView tasksTodayText;
    private TextView homeWeatherTemp;
    private TextView homeWeatherSummary;
    private TextView homeWeatherDetails;
    private TextView homeWeatherTip;
    private BottomNavigationView bottomNavigationView;
    private MaterialButton heroHealthButton;
    private MaterialButton heroCalendarButton;
    private MaterialButton shareLocationButton;
    private MaterialCardView quickActionAi;
    private MaterialCardView quickActionHealth;
    private MaterialCardView quickActionCalendar;
    private MaterialCardView quickActionSustainability;
    private Location lastFetchedLocation;
    private LocationCallback singleUpdateCallback;

    private static final int LOCATION_REQUEST_CODE = 100;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        locationText = findViewById(R.id.location_text);
        weatherSummaryText = findViewById(R.id.weather_summary_home);
        tasksTodayText = findViewById(R.id.tasks_today_text);
        homeWeatherTemp = findViewById(R.id.home_weather_temp);
        homeWeatherSummary = findViewById(R.id.home_weather_summary);
        homeWeatherDetails = findViewById(R.id.home_weather_details);
        homeWeatherTip = findViewById(R.id.home_weather_tip);
        bottomNavigationView = findViewById(R.id.bottom_navigation);
        shareLocationButton = findViewById(R.id.btn_share_location);

        bottomNavigationView.setSelectedItemId(R.id.nav_home);
        setupNavigation();
        setupEntryPoints();
        setupLocationButton();

        requestLocationPermission();
        updateTasksSummary();
    }

    // 🌍 Ask for location permission
    private void requestLocationPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION},
                    LOCATION_REQUEST_CODE);
        } else {
            getLastLocation();
        }
    }

    // 📍 Get user’s location
    private void getLastLocation() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED &&
                ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
                        != PackageManager.PERMISSION_GRANTED) {
            return;
        }
        locationText.setText("Fetching location...");

        fusedLocationClient.getLastLocation().addOnSuccessListener(this, location -> {
            if (location != null) {
                handleLocation(location);
            } else {
                requestFreshLocation();
            }
        }).addOnFailureListener(e -> {
            requestFreshLocation();
        });
    }

    private void setupLocationButton() {
        if (shareLocationButton == null) return;
        shareLocationButton.setOnClickListener(v -> {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                    != PackageManager.PERMISSION_GRANTED) {
                requestLocationPermission();
            } else {
                try {
                    startActivity(new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS));
                } catch (Exception ignored) {
                }
                getLastLocation();
            }
        });
    }

    // 🧭 Bottom navigation setup
    private void setupNavigation() {
        bottomNavigationView.setOnItemSelectedListener(item -> {
            int id = item.getItemId();

            if (id == R.id.nav_home) return true;

            if (id == R.id.nav_ai) {
                startActivity(new Intent(this, PlantAIActivity.class));
                overridePendingTransition(0, 0);
                finish();
                return true;
            }

            if (id == R.id.nav_health) {
                startActivity(new Intent(this, PlantHealthActivity.class));
                overridePendingTransition(0, 0);
                finish();
                return true;
            }

            if (id == R.id.nav_sustain) {
                startActivity(new Intent(this, SustainabilityActivity.class));
                overridePendingTransition(0, 0);
                finish();
                return true;
            }

            if (id == R.id.nav_calendar) {
                startActivity(new Intent(this, CalendarActivity.class));
                overridePendingTransition(0, 0);
                finish();
                return true;
            }

            if (id == R.id.nav_about) {
                startActivity(new Intent(this, AboutActivity.class));
                overridePendingTransition(0, 0);
                finish();
                return true;
            }

            return false;
        });
    }

    // ⚡ Hero buttons and quick actions
    private void setupEntryPoints() {
        heroHealthButton = findViewById(R.id.hero_btn_health);
        heroCalendarButton = findViewById(R.id.hero_btn_calendar);
        quickActionAi = findViewById(R.id.quick_action_ai);
        quickActionHealth = findViewById(R.id.quick_action_health);
        quickActionCalendar = findViewById(R.id.quick_action_calendar);
        quickActionSustainability = findViewById(R.id.quick_action_sustainability);

        heroHealthButton.setOnClickListener(v -> {
            startActivity(new Intent(this, PlantHealthActivity.class));
            overridePendingTransition(0, 0);
        });

        heroCalendarButton.setOnClickListener(v -> {
            startActivity(new Intent(this, CalendarActivity.class));
            overridePendingTransition(0, 0);
        });

        quickActionAi.setOnClickListener(v -> {
            startActivity(new Intent(this, PlantAIActivity.class));
            overridePendingTransition(0, 0);
        });

        quickActionHealth.setOnClickListener(v -> {
            startActivity(new Intent(this, PlantHealthActivity.class));
            overridePendingTransition(0, 0);
        });

        quickActionCalendar.setOnClickListener(v -> {
            startActivity(new Intent(this, CalendarActivity.class));
            overridePendingTransition(0, 0);
        });

        quickActionSustainability.setOnClickListener(v -> {
            startActivity(new Intent(this, SustainabilityActivity.class));
            overridePendingTransition(0, 0);
        });
    }

    // ✅ Handle permission result
    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == LOCATION_REQUEST_CODE) {
            boolean granted = false;
            for (int result : grantResults) {
                if (result == PackageManager.PERMISSION_GRANTED) {
                    granted = true;
                    break;
                }
            }
            if (granted) {
                getLastLocation();
            } else {
                Toast.makeText(this, "Location permission denied", Toast.LENGTH_SHORT).show();
                locationText.setText("Location permission denied");
                updateWeatherSummary("Weather unavailable");
            }
        }
    }

    private void fetchWeather(double lat, double lon) {
        WeatherService.fetchWeather(lat, lon, new WeatherService.Callback() {
            @Override
            public void onSuccess(WeatherData data) {
                updateWeatherSummary(data.buildHeadline());
                updateLocationDisplay(data.getResolvedAddress(), lastFetchedLocation);
                updateHomeWeatherCard(data);
            }

            @Override
            public void onError(String message) {
                updateWeatherSummary(message != null ? message : "Weather unavailable");
                updateHomeWeatherCardError(message);
            }
        });
    }

    private void updateHomeWeatherCard(WeatherData data) {
        if (homeWeatherTemp != null) {
            homeWeatherTemp.setText(data.formatTemp());
        }
        if (homeWeatherSummary != null) {
            String summary = data.getSummary();
            if (summary != null && !summary.isEmpty()) {
                summary = summary.substring(0, 1).toUpperCase(Locale.getDefault()) + 
                          (summary.length() > 1 ? summary.substring(1) : "");
            }
            homeWeatherSummary.setText(summary != null ? summary : "--");
        }
        if (homeWeatherDetails != null) {
            String precip = String.format(Locale.getDefault(), "%.1f mm", data.getPrecipitation());
            String humidity = String.format(Locale.getDefault(), "%.0f%%", data.getHumidity());
            homeWeatherDetails.setText("🌧️ Precip: " + precip + "   💧 Humidity: " + humidity);
        }
        if (homeWeatherTip != null) {
            boolean pauseIrrigation = data.getPrecipitation() >= 1.0
                    || data.getHumidity() > 85
                    || (data.getSummary() != null && data.getSummary().toLowerCase(Locale.getDefault()).contains("rain"));
            String tip = pauseIrrigation
                    ? "Tip: Pause irrigation today — precipitation or high humidity detected. Natural moisture should suffice."
                    : "Tip: Weather conditions look good for watering. Consider early morning irrigation for best results.";
            homeWeatherTip.setText(tip);
        }
    }

    private void updateHomeWeatherCardError(String message) {
        if (homeWeatherTemp != null) {
            homeWeatherTemp.setText("--");
        }
        if (homeWeatherSummary != null) {
            homeWeatherSummary.setText("--");
        }
        if (homeWeatherDetails != null) {
            homeWeatherDetails.setText("🌧️ Precip: --   💧 Humidity: --");
        }
        if (homeWeatherTip != null) {
            homeWeatherTip.setText("Weather data unavailable. Enable location services to see live weather information.");
        }
    }

    private void updateWeatherSummary(String text) {
        if (weatherSummaryText != null) {
            weatherSummaryText.setText(text != null ? text : "Weather unavailable");
        }
    }

    private void updateLocationDisplay(String resolvedAddress, Location fallback) {
        if (locationText == null) return;
        if (resolvedAddress != null && !resolvedAddress.isEmpty()) {
            locationText.setText(resolvedAddress);
        } else if (fallback != null) {
            locationText.setText(String.format(Locale.getDefault(), "Lat %.2f, Lon %.2f",
                    fallback.getLatitude(), fallback.getLongitude()));
        } else {
            locationText.setText("Location unavailable");
        }
    }

    private void updateTasksSummary() {
        List<CalendarActivity.Task> tasks = TaskRepository.loadTasks(this);
        int count = 0;
        LocalDate today = LocalDate.now();
        for (CalendarActivity.Task task : tasks) {
            if (today.equals(task.getDate())) {
                count++;
            }
        }
        if (tasksTodayText != null) {
            if (count == 0) {
                tasksTodayText.setText("No tasks today");
            } else if (count == 1) {
                tasksTodayText.setText("1 task today");
            } else {
                tasksTodayText.setText(count + " tasks today");
            }
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        getLastLocation();
        updateTasksSummary();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        clearSingleUpdateCallback();
    }

    private void handleLocation(Location location) {
        if (location == null) {
            updateLocationDisplay(null, null);
            updateWeatherSummary("Weather unavailable");
            return;
        }
        lastFetchedLocation = location;
        updateLocationDisplay(null, location);
        updateWeatherSummary("Loading weather...");
        fetchWeather(location.getLatitude(), location.getLongitude());
    }

    private void requestFreshLocation() {
        if (!hasLocationPermission()) {
            updateLocationDisplay(null, null);
            updateWeatherSummary("Weather unavailable");
            return;
        }
        clearSingleUpdateCallback();
        if (locationText != null) {
            locationText.setText("Fetching location...");
        }
        LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, 3000L)
                .setMinUpdateIntervalMillis(1500L)
                .setMaxUpdates(1)
                .build();

        singleUpdateCallback = new LocationCallback() {
            @Override
            public void onLocationResult(@NonNull LocationResult locationResult) {
                Location fresh = locationResult.getLastLocation();
                handleLocation(fresh);
                clearSingleUpdateCallback();
            }
        };

        try {
            fusedLocationClient.requestLocationUpdates(request, singleUpdateCallback, Looper.getMainLooper());
        } catch (SecurityException e) {
            clearSingleUpdateCallback();
            updateLocationDisplay(null, null);
            updateWeatherSummary("Weather unavailable");
        }
    }

    private boolean hasLocationPermission() {
        return ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void clearSingleUpdateCallback() {
        if (singleUpdateCallback != null) {
            fusedLocationClient.removeLocationUpdates(singleUpdateCallback);
            singleUpdateCallback = null;
        }
    }
}
