package com.athena.greenbible;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.LayoutInflater;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.athena.greenbible.network.LeafApi;
import com.athena.greenbible.network.LeafApiClient;
import com.athena.greenbible.network.model.PredictionResponse;
import com.google.android.material.bottomnavigation.BottomNavigationView;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class PlantHealthActivity extends AppCompatActivity {

    private static final int REQ_CAMERA = 101;
    private static final int REQ_GALLERY = 102;
    private static final int PERMISSION_CODE = 200;

    private ImageView previewImage;
    private LinearLayout btnAnalyze;
    private File selectedImageFile;
    private androidx.appcompat.app.AlertDialog progressDialog;

    private final LeafApi leafApi = LeafApiClient.getApi();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_plant_health);

        previewImage = findViewById(R.id.previewImage);
        btnAnalyze = findViewById(R.id.btnAnalyze);

        LinearLayout btnCamera = findViewById(R.id.btnCamera);
        LinearLayout btnGallery = findViewById(R.id.btnGallery);
        BottomNavigationView nav = findViewById(R.id.bottom_navigation);
        nav.setSelectedItemId(R.id.nav_health);
        setupNav(nav);

        btnCamera.setOnClickListener(v -> openCamera());
        btnGallery.setOnClickListener(v -> openGallery());
        btnAnalyze.setOnClickListener(v -> startAnalysis());
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
            if (requestCode == REQ_CAMERA && data.getExtras() != null) {
                Bitmap bitmap = (Bitmap) data.getExtras().get("data");
                if (bitmap != null) {
                    selectedImageFile = createFileFromBitmap(bitmap, "camera_capture");
                    previewImage.setImageBitmap(bitmap);
                    previewImage.setVisibility(ImageView.VISIBLE);
                }
            } else if (requestCode == REQ_GALLERY) {
                Uri uri = data.getData();
                if (uri != null) {
                    try {
                        selectedImageFile = copyUriToFile(uri);
                        Bitmap bitmap = MediaStore.Images.Media.getBitmap(getContentResolver(), uri);
                        previewImage.setImageBitmap(bitmap);
                        previewImage.setVisibility(ImageView.VISIBLE);
                    } catch (IOException e) {
                        Toast.makeText(this, "Failed to load image", Toast.LENGTH_SHORT).show();
                    }
                }
            }
        }
    }

    private void startAnalysis() {
        if (selectedImageFile == null || !selectedImageFile.exists()) {
            Toast.makeText(this, "Please capture or select a leaf photo first.", Toast.LENGTH_SHORT).show();
            return;
        }
        showLoading(true);
        
        // Create request body with proper MediaType
        MediaType mediaType = MediaType.parse("image/jpeg");
        RequestBody requestFile = RequestBody.create(selectedImageFile, mediaType);
        // Use a standard filename to ensure API compatibility
        String filename = selectedImageFile.getName();
        if (filename == null || !filename.toLowerCase().endsWith(".jpg") && !filename.toLowerCase().endsWith(".jpeg")) {
            filename = "image.jpg";
        }
        MultipartBody.Part body = MultipartBody.Part.createFormData("file", filename, requestFile);

        leafApi.uploadLeaf(body).enqueue(new Callback<PredictionResponse>() {
            @Override
            public void onResponse(Call<PredictionResponse> call, Response<PredictionResponse> response) {
                showLoading(false);
                if (response.isSuccessful() && response.body() != null) {
                    PredictionResponse prediction = response.body();
                    if (prediction.getPredictedLabel() != null) {
                        navigateToResult(prediction);
                    } else {
                        android.util.Log.e("PlantHealth", "Response body missing predicted_label");
                        Toast.makeText(PlantHealthActivity.this, "Invalid response from server.", Toast.LENGTH_SHORT).show();
                    }
                } else {
                    String errorMsg = "Couldn't analyze image right now.";
                    try {
                        if (response.errorBody() != null) {
                            String errorBody = response.errorBody().string();
                            android.util.Log.e("PlantHealth", "API Error: " + response.code() + " - " + errorBody);
                            errorMsg = "Server error: " + response.code();
                        } else {
                            android.util.Log.e("PlantHealth", "API Error: " + response.code() + " - No error body");
                        }
                    } catch (Exception e) {
                        android.util.Log.e("PlantHealth", "Error reading error body", e);
                    }
                    Toast.makeText(PlantHealthActivity.this, errorMsg, Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<PredictionResponse> call, Throwable t) {
                showLoading(false);
                android.util.Log.e("PlantHealth", "Network failure", t);
                String errorMsg = "Analysis failed. ";
                if (t.getMessage() != null) {
                    errorMsg += t.getMessage();
                } else {
                    errorMsg += "Check your connection.";
                }
                Toast.makeText(PlantHealthActivity.this, errorMsg, Toast.LENGTH_LONG).show();
            }
        });
    }

    private void navigateToResult(PredictionResponse prediction) {
        Intent intent = new Intent(this, DiagnosisResultActivity.class);
        intent.putExtra(DiagnosisResultActivity.EXTRA_IMAGE_PATH, selectedImageFile != null ? selectedImageFile.getAbsolutePath() : null);
        intent.putExtra(DiagnosisResultActivity.EXTRA_LABEL, prediction.getPredictedLabel());
        intent.putExtra(DiagnosisResultActivity.EXTRA_CONFIDENCE, prediction.getConfidence());
        if (prediction.getAllConfidences() != null) {
            intent.putExtra(DiagnosisResultActivity.EXTRA_BREAKDOWN, GsonHolder.get().toJson(prediction.getAllConfidences()));
        }
        startActivity(intent);
    }

    private void showLoading(boolean show) {
        if (show) {
            if (progressDialog == null) {
                androidx.appcompat.app.AlertDialog.Builder builder = new androidx.appcompat.app.AlertDialog.Builder(this);
                builder.setView(LayoutInflater.from(this).inflate(R.layout.dialog_loading, null));
                builder.setCancelable(false);
                progressDialog = builder.create();
            }
            progressDialog.show();
        } else if (progressDialog != null && progressDialog.isShowing()) {
            progressDialog.dismiss();
        }
    }

    private File createFileFromBitmap(Bitmap bitmap, String prefix) {
        try {
            File file = File.createTempFile(prefix, ".jpg", getCacheDir());
            FileOutputStream out = new FileOutputStream(file);
            bitmap.compress(Bitmap.CompressFormat.JPEG, 90, out);
            out.flush();
            out.close();
            return file;
        } catch (IOException e) {
            return null;
        }
    }

    private File copyUriToFile(Uri uri) throws IOException {
        InputStream inputStream = getContentResolver().openInputStream(uri);
        if (inputStream == null) return null;
        File file = File.createTempFile("gallery_selection", ".jpg", getCacheDir());
        FileOutputStream outputStream = new FileOutputStream(file);
        byte[] buffer = new byte[4096];
        int length;
        while ((length = inputStream.read(buffer)) > 0) {
            outputStream.write(buffer, 0, length);
        }
        outputStream.flush();
        outputStream.close();
        inputStream.close();
        return file;
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
