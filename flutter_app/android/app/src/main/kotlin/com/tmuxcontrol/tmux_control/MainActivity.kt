package com.tmuxcontrol.tmux_control

import android.graphics.Rect
import android.os.Build
import io.flutter.embedding.android.FlutterActivity

class MainActivity: FlutterActivity() {
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            excludeLeftEdgeFromSystemGesture()
        }
    }

    /// Tell Android not to intercept left-edge swipes for the system back
    /// gesture, so Flutter's Scaffold drawer edge-drag works.
    /// Android limits exclusion to 200dp per edge; we center the zone
    /// vertically to cover the most common swipe area.
    private fun excludeLeftEdgeFromSystemGesture() {
        val decorView = window.decorView
        val height = decorView.height
        if (height <= 0) return
        val density = resources.displayMetrics.density
        val maxHeightPx = (200 * density).toInt()
        val zonePx = maxHeightPx.coerceAtMost(height)
        val top = ((height - zonePx) / 2).coerceAtLeast(0)
        val bottom = (top + zonePx).coerceAtMost(height)
        val widthPx = (80 * density).toInt()
        decorView.systemGestureExclusionRects = listOf(
            Rect(0, top, widthPx, bottom)
        )
    }
}
