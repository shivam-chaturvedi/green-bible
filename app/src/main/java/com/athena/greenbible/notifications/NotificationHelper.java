package com.athena.greenbible.notifications;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.athena.greenbible.R;

public final class NotificationHelper {

    public static final String WEATHER_CHANNEL_ID = "weather-alerts";
    public static final String WEATHER_CHANNEL_NAME = "Weather Alerts";
    public static final String WEATHER_CHANNEL_DESC = "Updates about local weather for sustainable gardening";

    public static final String DIAGNOSIS_CHANNEL_ID = "diagnosis-alerts";
    public static final String DIAGNOSIS_CHANNEL_NAME = "Diagnosis Updates";
    public static final String DIAGNOSIS_CHANNEL_DESC = "Important plant diagnosis and treatment updates";

    public static final String TASK_CHANNEL_ID = "task-reminders";
    public static final String TASK_CHANNEL_NAME = "Task Reminders";
    public static final String TASK_CHANNEL_DESC = "Upcoming calendar task reminders";

    public static final int REQUEST_NOTIFICATION_PERMISSION = 600;

    private NotificationHelper() {}

    public static void requestPermissionIfNeeded(@NonNull Activity activity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ActivityCompat.checkSelfPermission(activity, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(activity,
                        new String[]{Manifest.permission.POST_NOTIFICATIONS},
                        REQUEST_NOTIFICATION_PERMISSION);
            }
        }
    }

    public static void ensureChannel(@NonNull Context context,
                                     @NonNull String channelId,
                                     @NonNull String channelName,
                                     @NonNull String channelDescription) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    channelName,
                    NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription(channelDescription);
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    public static void showNotification(@NonNull Context context,
                                        @NonNull String channelId,
                                        @NonNull String channelName,
                                        @NonNull String channelDescription,
                                        @NonNull String title,
                                        @NonNull String content,
                                        int notificationId) {

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        ensureChannel(context, channelId, channelName, channelDescription);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.drawable.ic_leaf)
                .setContentTitle(title)
                .setContentText(content)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(content))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true);

        NotificationManagerCompat.from(context).notify(notificationId, builder.build());
    }
}
