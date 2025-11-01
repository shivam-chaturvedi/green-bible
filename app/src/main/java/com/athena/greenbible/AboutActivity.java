package com.athena.greenbible;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import android.widget.LinearLayout;

public class AboutActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_about);

        BottomNavigationView nav = findViewById(R.id.bottom_navigation);
        nav.setSelectedItemId(R.id.nav_about);
        nav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_home) { startActivity(new Intent(this, MainActivity.class)); finish(); return true; }
            if (id == R.id.nav_ai) { startActivity(new Intent(this, PlantAIActivity.class)); finish(); return true; }
            if (id == R.id.nav_health) { startActivity(new Intent(this, PlantHealthActivity.class)); finish(); return true; }
            if (id == R.id.nav_sustain) { startActivity(new Intent(this, SustainabilityActivity.class)); finish(); return true; }
            if (id == R.id.nav_calendar) { startActivity(new Intent(this, CalendarActivity.class)); finish(); return true; }
            if (id == R.id.nav_about) return true;
            return false;
        });

        findViewById(R.id.btnEmail).setOnClickListener(v ->
                startActivity(new Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:agasthya.shukla@gmail.com"))));
        findViewById(R.id.btnWebsite).setOnClickListener(v ->
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://greenbible.example.com"))));
    }
}
