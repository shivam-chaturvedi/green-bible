package com.athena.greenbible;

import android.content.Intent;
import android.os.Bundle;
import android.widget.ImageButton;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.bottomnavigation.BottomNavigationView;

public class CalendarActivity extends AppCompatActivity {

    private BottomNavigationView nav;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_calendar);

        nav = findViewById(R.id.bottom_navigation);
        nav.setSelectedItemId(R.id.nav_calendar);
        nav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_home)     { startActivity(new Intent(this, MainActivity.class)); finish(); return true; }
            if (id == R.id.nav_ai)       { startActivity(new Intent(this, PlantAIActivity.class)); finish(); return true; }
            if (id == R.id.nav_health)   { startActivity(new Intent(this, PlantHealthActivity.class)); finish(); return true; }
            if (id == R.id.nav_sustain)  { startActivity(new Intent(this, SustainabilityActivity.class)); finish(); return true; }
            if (id == R.id.nav_calendar) { return true; }
            if (id == R.id.nav_about)    { startActivity(new Intent(this, AboutActivity.class)); finish(); return true; }
            return false;
        });

        ImageButton fab = findViewById(R.id.fabAdd);
        if (fab != null) fab.setOnClickListener(v -> {
            // show dialog in future; placeholder
        });
    }
}
