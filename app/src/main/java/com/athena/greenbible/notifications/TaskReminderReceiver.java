package com.athena.greenbible.notifications;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class TaskReminderReceiver extends BroadcastReceiver {

    public static final String EXTRA_TASK_TITLE = "extra_task_title";
    public static final String EXTRA_TASK_TIME = "extra_task_time";

    @Override
    public void onReceive(Context context, Intent intent) {
        String title = intent.getStringExtra(EXTRA_TASK_TITLE);
        String time = intent.getStringExtra(EXTRA_TASK_TIME);

        if (title == null) title = "Garden Task";
        if (time == null) time = "Soon";

        String content = "Starts at " + time;

        NotificationHelper.showNotification(
                context,
                NotificationHelper.TASK_CHANNEL_ID,
                NotificationHelper.TASK_CHANNEL_NAME,
                NotificationHelper.TASK_CHANNEL_DESC,
                title,
                content,
                (title + time).hashCode());
    }
}
