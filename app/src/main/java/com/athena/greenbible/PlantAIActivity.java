package com.athena.greenbible;

import android.content.Intent;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.bottomnavigation.BottomNavigationView;

public class PlantAIActivity extends AppCompatActivity {

    private EditText inputMessage;
    private ImageButton sendButton;
    private LinearLayout chatContainer;
    private ScrollView chatScrollView;
    private BottomNavigationView bottomNavigationView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_plant_ai);

        inputMessage = findViewById(R.id.inputMessage);
        sendButton = findViewById(R.id.sendButton);
        chatContainer = findViewById(R.id.chatContainer);
        chatScrollView = findViewById(R.id.chatScrollView);
        bottomNavigationView = findViewById(R.id.bottom_navigation);

        bottomNavigationView.setSelectedItemId(R.id.nav_ai);
        setupNavigation();

        sendButton.setOnClickListener(v -> {
            String userText = inputMessage.getText().toString().trim();
            if (!userText.isEmpty()) {
                addUserMessage(userText);
                inputMessage.setText("");
                chatScrollView.post(() -> chatScrollView.fullScroll(ScrollView.FOCUS_DOWN));
            }
        });
    }

    private void setupNavigation() {
        bottomNavigationView.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_home) {
                startActivity(new Intent(this, MainActivity.class));
                overridePendingTransition(0, 0);
                finish();
                return true;
            }
            if (id == R.id.nav_ai) return true;
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

    private void addUserMessage(String text) {
        TextView userMessage = new TextView(this);
        userMessage.setText(text);
        userMessage.setTextColor(0xFF000000);
        userMessage.setBackgroundResource(R.drawable.bg_bot_bubble);
        userMessage.setPadding(20, 15, 20, 15);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        params.setMargins(0, 10, 0, 10);
        params.gravity = Gravity.END;
        userMessage.setLayoutParams(params);
        chatContainer.addView(userMessage);
    }
}
