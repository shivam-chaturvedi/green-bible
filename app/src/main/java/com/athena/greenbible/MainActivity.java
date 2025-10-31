package com.athena.greenbible;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.card.MaterialCardView;

public class MainActivity extends AppCompatActivity {

    private FusedLocationProviderClient fusedLocationClient;
    private TextView locationText;
    private BottomNavigationView bottomNavigationView;
    private MaterialButton heroHealthButton;
    private MaterialButton heroCalendarButton;
    private MaterialCardView quickActionAi;
    private MaterialCardView quickActionHealth;
    private MaterialCardView quickActionCalendar;
    private MaterialCardView quickActionSustainability;

    private static final int LOCATION_REQUEST_CODE = 100;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        locationText = findViewById(R.id.location_text);
        bottomNavigationView = findViewById(R.id.bottom_navigation);

        bottomNavigationView.setSelectedItemId(R.id.nav_home);
        setupNavigation();
        setupEntryPoints();

        requestLocationPermission();
    }

    // 🌍 Ask for location permission
    private void requestLocationPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, LOCATION_REQUEST_CODE);
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

        fusedLocationClient.getLastLocation().addOnSuccessListener(this, location -> {
            if (location != null) {
                String loc = "Lat: " + location.getLatitude() + ", Lon: " + location.getLongitude();
                locationText.setText(loc);
            } else {
                locationText.setText("Unable to get location");
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

        if (requestCode == LOCATION_REQUEST_CODE && grantResults.length > 0 &&
                grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            getLastLocation();
        } else {
            Toast.makeText(this, "Location permission denied", Toast.LENGTH_SHORT).show();
        }
    }
}
