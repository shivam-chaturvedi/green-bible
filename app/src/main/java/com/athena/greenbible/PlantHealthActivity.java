package com.athena.greenbible;

import android.Manifest;
import android.app.Activity;
import android.app.Dialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.Window;
import android.widget.*;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import java.io.IOException;

public class PlantHealthActivity extends AppCompatActivity {

    private static final int REQ_CAMERA = 101;
    private static final int REQ_GALLERY = 102;
    private static final int PERMISSION_CODE = 200;

    private ImageView previewImage;
    private EditText symptomInput;
    private LinearLayout btnAnalyze;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_plant_health);

        previewImage = findViewById(R.id.previewImage);
        symptomInput = findViewById(R.id.symptomInput);
        btnAnalyze = findViewById(R.id.btnAnalyze);

        LinearLayout btnCamera = findViewById(R.id.btnCamera);
        LinearLayout btnGallery = findViewById(R.id.btnGallery);
        BottomNavigationView nav = findViewById(R.id.bottom_navigation);
        nav.setSelectedItemId(R.id.nav_health);
        setupNav(nav);

        btnCamera.setOnClickListener(v -> openCamera());
        btnGallery.setOnClickListener(v -> openGallery());
        btnAnalyze.setOnClickListener(v -> showDiagnosisDialog());
    }

    private void openCamera() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA}, PERMISSION_CODE);
        } else {
            Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            startActivityForResult(intent, REQ_CAMERA);
        }
    }

    private void openGallery() {
        Intent intent = new Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
        intent.setType("image/*");
        startActivityForResult(intent, REQ_GALLERY);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_CODE && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            openCamera();
        } else {
            Toast.makeText(this, "Camera permission denied", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (resultCode == Activity.RESULT_OK && data != null) {
            Bitmap bitmap = null;
            if (requestCode == REQ_CAMERA && data.getExtras() != null) {
                bitmap = (Bitmap) data.getExtras().get("data");
            } else if (requestCode == REQ_GALLERY) {
                Uri uri = data.getData();
                try {
                    bitmap = MediaStore.Images.Media.getBitmap(getContentResolver(), uri);
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
            if (bitmap != null) {
                previewImage.setImageBitmap(bitmap);
                previewImage.setVisibility(ImageView.VISIBLE);
            }
        }
    }

    private void showDiagnosisDialog() {
        Dialog dialog = new Dialog(this);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setContentView(R.layout.dialog_diagnosis_result);
        dialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        dialog.show();

        ImageView closeBtn = dialog.findViewById(R.id.closeDialog);
        closeBtn.setOnClickListener(v -> dialog.dismiss());
    }

    private void setupNav(BottomNavigationView nav) {
        nav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_home)     { startActivity(new Intent(this, MainActivity.class)); finish(); return true; }
            if (id == R.id.nav_ai)       { startActivity(new Intent(this, PlantAIActivity.class)); finish(); return true; }
            if (id == R.id.nav_health)   { return true; }
            if (id == R.id.nav_sustain)  { startActivity(new Intent(this, SustainabilityActivity.class)); finish(); return true; }
            if (id == R.id.nav_calendar) { startActivity(new Intent(this, CalendarActivity.class)); finish(); return true; }
            if (id == R.id.nav_about)    { startActivity(new Intent(this, AboutActivity.class)); finish(); return true; }
            return false;
        });
    }
}
