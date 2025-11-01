package com.athena.greenbible.notifications;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.AlarmManagerCompat;

import com.athena.greenbible.CalendarActivity;

import java.time.LocalDateTime;
import java.time.LocalTime;

public final class TaskReminderScheduler {

    private TaskReminderScheduler() {}

    public static void scheduleTaskReminders(Context context, CalendarActivity.Task task) {
        if (task == null || task.getTime() == null || task.getDate() == null) return;
        LocalDateTime due = LocalDateTime.of(task.getDate(), task.getTime());
        schedule(context, task, due.minusMinutes(5), task.getReminderRequestCode(5));
        schedule(context, task, due.minusMinutes(1), task.getReminderRequestCode(1));
    }

    public static void cancelTaskReminders(Context context, CalendarActivity.Task task) {
        if (task == null) return;
        cancel(context, task.getReminderRequestCode(5));
        cancel(context, task.getReminderRequestCode(1));
    }

    private static void schedule(Context context, CalendarActivity.Task task, LocalDateTime triggerTime, int requestCode) {
        if (triggerTime.isBefore(LocalDateTime.now())) return;
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        Intent intent = new Intent(context, TaskReminderReceiver.class);
        intent.putExtra(TaskReminderReceiver.EXTRA_TASK_TITLE, task.getText());
        intent.putExtra(TaskReminderReceiver.EXTRA_TASK_TIME, task.getTime().format(CalendarActivity.TIME_FMT_DISPLAY));

        PendingIntent pi = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        long triggerAt = triggerTime.atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pi);
            }
        } else {
            AlarmManagerCompat.setExactAndAllowWhileIdle(alarmManager, AlarmManager.RTC_WAKEUP, triggerAt, pi);
        }
    }

    private static void cancel(Context context, int requestCode) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;
        Intent intent = new Intent(context, TaskReminderReceiver.class);
        PendingIntent pi = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        alarmManager.cancel(pi);
    }
}
