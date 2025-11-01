package com.athena.greenbible;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.LinearLayout;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.bottomnavigation.BottomNavigationView;

public class SustainabilityActivity extends AppCompatActivity {

    private BottomNavigationView nav;

    // Guide card containers
    private LinearLayout cardComposting, cardOrganic, cardWater, cardMulching, cardRainwater;

    // Chip buttons
    private LinearLayout chipAll, chipComposting, chipOrganic, chipWater, chipTips;

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
}
