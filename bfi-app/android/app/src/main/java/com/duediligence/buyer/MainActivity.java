package com.duediligence.buyer;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/**
 * Force brand-night chrome behind Android 15/16 system bars.
 * Capacitor insets the WebView; without a dark window/parent, those gaps show white.
 */
public class MainActivity extends BridgeActivity {
    private static final int BFI_NIGHT = Color.parseColor("#2A1F20");

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyNightSystemChrome();
    }

    @Override
    public void onStart() {
        super.onStart();
        // Re-apply after Bridge/WebView layout settles.
        applyNightSystemChrome();
    }

    private void applyNightSystemChrome() {
        Window window = getWindow();
        if (window == null) {
            return;
        }

        window.setStatusBarColor(BFI_NIGHT);
        window.setNavigationBarColor(BFI_NIGHT);

        View decor = window.getDecorView();
        decor.setBackgroundColor(BFI_NIGHT);

        View content = findViewById(android.R.id.content);
        if (content != null) {
            content.setBackgroundColor(BFI_NIGHT);
            if (content instanceof ViewGroup) {
                ViewGroup group = (ViewGroup) content;
                for (int i = 0; i < group.getChildCount(); i++) {
                    group.getChildAt(i).setBackgroundColor(BFI_NIGHT);
                }
            }
        }

        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decor);
        if (controller != null) {
            controller.setAppearanceLightStatusBars(false);
            controller.setAppearanceLightNavigationBars(false);
        }
    }
}
