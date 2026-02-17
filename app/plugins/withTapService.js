"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Expo config plugin: withTapService
 *
 * Adds an Android Accessibility Service that can dispatch real taps
 * via dispatchGesture(). Runs automatically during `npx expo prebuild`.
 */
const config_plugins_1 = require("expo/config-plugins");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// ──────────────────────────────────────────────
// Kotlin source files (embedded so everything lives in one plugin)
// ──────────────────────────────────────────────
const KOTLIN_PACKAGE_DIR = 'ai/futurebuddy/app';
const TAP_ACCESSIBILITY_SERVICE_KT = `package ai.futurebuddy.app

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Color
import android.graphics.Path
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Build
import android.util.Log
import android.view.Gravity
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.widget.FrameLayout
import android.widget.TextView

data class GridDot(val label: String, val x: Float, val y: Float)

class TapAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "TapAccessibilityService"

        @Volatile
        var instance: TapAccessibilityService? = null
            private set

        val isActive: Boolean
            get() = instance != null
    }

    private var gridOverlay: FrameLayout? = null

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        Log.i(TAG, "Accessibility service connected")
    }

    override fun onDestroy() {
        hideGrid()
        instance = null
        Log.i(TAG, "Accessibility service destroyed")
        super.onDestroy()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Minimal processing — we only need gesture dispatch + overlay
    }

    override fun onInterrupt() {
        Log.w(TAG, "Accessibility service interrupted")
    }

    fun showGrid(dots: List<GridDot>) {
        hideGrid()

        val wm = getSystemService(WINDOW_SERVICE) as WindowManager

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        )
        params.gravity = Gravity.TOP or Gravity.START

        val container = FrameLayout(this)

        for (dot in dots) {
            val tv = TextView(this).apply {
                text = dot.label
                textSize = 10f
                setTextColor(Color.WHITE)
                setBackgroundColor(Color.argb(100, 0, 0, 0))
                setPadding(8, 4, 8, 4)
                typeface = Typeface.DEFAULT_BOLD
            }
            val lp = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            )
            lp.leftMargin = dot.x.toInt()
            lp.topMargin = dot.y.toInt()
            container.addView(tv, lp)
        }

        wm.addView(container, params)
        gridOverlay = container
        Log.d(TAG, "Grid overlay shown with \\\${dots.size} dots")
    }

    fun hideGrid() {
        gridOverlay?.let {
            try {
                val wm = getSystemService(WINDOW_SERVICE) as WindowManager
                wm.removeView(it)
                Log.d(TAG, "Grid overlay hidden")
            } catch (e: Exception) {
                Log.w(TAG, "Error removing grid overlay", e)
            }
            gridOverlay = null
        }
    }

    fun tap(x: Float, y: Float, callback: GestureResultCallback? = null) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
            Log.w(TAG, "dispatchGesture requires API 24+")
            callback?.onCancelled(null)
            return
        }

        val clickPath = Path().apply {
            moveTo(x, y)
        }

        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(clickPath, 0, 50))
            .build()

        val dispatched = dispatchGesture(gesture, object : GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) {
                Log.d(TAG, "Tap dispatched at (\$x, \$y)")
                callback?.onCompleted(gestureDescription)
            }

            override fun onCancelled(gestureDescription: GestureDescription?) {
                Log.w(TAG, "Tap cancelled at (\$x, \$y)")
                callback?.onCancelled(gestureDescription)
            }
        }, null)

        if (!dispatched) {
            Log.e(TAG, "dispatchGesture returned false")
        }
    }
}
`;
const TAP_SERVICE_MODULE_KT = `package ai.futurebuddy.app

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

class TapServiceModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "TapServiceModule"
        private const val TAG = "TapServiceModule"
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun simulateTap(x: Double, y: Double, promise: Promise) {
        val service = TapAccessibilityService.instance
        if (service == null) {
            Log.w(TAG, "Accessibility service not active, skipping tap")
            promise.resolve(false)
            return
        }

        try {
            service.tap(x.toFloat(), y.toFloat(), object : AccessibilityService.GestureResultCallback() {
                override fun onCompleted(gestureDescription: GestureDescription?) {
                    Log.d(TAG, "Tap dispatched at (\$x, \$y)")
                    promise.resolve(true)
                }

                override fun onCancelled(gestureDescription: GestureDescription?) {
                    Log.w(TAG, "Tap cancelled at (\$x, \$y)")
                    promise.resolve(false)
                }
            })
        } catch (e: Exception) {
            Log.e(TAG, "Error dispatching tap", e)
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun minimizeApp(promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity
            if (activity != null) {
                activity.moveTaskToBack(true)
                promise.resolve(true)
            } else {
                Log.w(TAG, "No current activity to minimize")
                promise.resolve(false)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error minimizing app", e)
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun showGrid(dots: ReadableArray, promise: Promise) {
        val service = TapAccessibilityService.instance
        if (service == null) {
            Log.w(TAG, "Accessibility service not active, can't show grid")
            promise.resolve(false)
            return
        }

        val gridDots = mutableListOf<GridDot>()
        for (i in 0 until dots.size()) {
            val map = dots.getMap(i)
            gridDots.add(GridDot(
                label = map.getString("label") ?: "",
                x = map.getDouble("x").toFloat(),
                y = map.getDouble("y").toFloat()
            ))
        }

        Handler(Looper.getMainLooper()).post {
            service.showGrid(gridDots)
        }
        promise.resolve(true)
    }

    @ReactMethod
    fun hideGrid(promise: Promise) {
        val service = TapAccessibilityService.instance
        if (service == null) {
            promise.resolve(false)
            return
        }

        Handler(Looper.getMainLooper()).post {
            service.hideGrid()
        }
        promise.resolve(true)
    }

    @ReactMethod
    fun isEnabled(promise: Promise) {
        promise.resolve(TapAccessibilityService.isActive)
    }

    @ReactMethod
    fun openAccessibilitySettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error opening accessibility settings", e)
            promise.resolve(false)
        }
    }
}
`;
const TAP_SERVICE_PACKAGE_KT = `package ai.futurebuddy.app

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class TapServicePackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return if (name == TapServiceModule.NAME) {
            TapServiceModule(reactContext)
        } else {
            null
        }
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider {
            mapOf(
                TapServiceModule.NAME to ReactModuleInfo(
                    TapServiceModule.NAME,
                    TapServiceModule::class.java.name,
                    false, // canOverrideExistingModule
                    false, // needsEagerInit
                    false, // isCxxModule
                    false  // isTurboModule
                )
            )
        }
    }
}
`;
const TAP_SERVICE_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/tap_service_description"
    android:accessibilityEventTypes="typeWindowStateChanged"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:accessibilityFlags="flagRequestShortcutWarningDialogSpokenFeedback"
    android:canPerformGestures="true"
    android:notificationTimeout="100"
    android:summary="@string/tap_service_description" />
`;
// ──────────────────────────────────────────────
// Plugin modifiers
// ──────────────────────────────────────────────
/**
 * Add the accessibility service declaration to AndroidManifest.xml
 */
const withAccessibilityServiceManifest = (config) => {
    return (0, config_plugins_1.withAndroidManifest)(config, (mod) => {
        const mainApp = mod.modResults.manifest.application?.[0];
        if (!mainApp)
            return mod;
        // Ensure service array exists
        if (!mainApp.service) {
            mainApp.service = [];
        }
        // Check if already added
        const exists = mainApp.service.some((s) => s.$?.['android:name'] === '.TapAccessibilityService');
        if (exists)
            return mod;
        mainApp.service.push({
            $: {
                'android:name': '.TapAccessibilityService',
                'android:exported': 'false',
                'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE',
            },
            'intent-filter': [
                {
                    action: [
                        {
                            $: {
                                'android:name': 'android.accessibilityservice.AccessibilityService',
                            },
                        },
                    ],
                },
            ],
            'meta-data': [
                {
                    $: {
                        'android:name': 'android.accessibilityservice',
                        'android:resource': '@xml/tap_service_config',
                    },
                },
            ],
        });
        return mod;
    });
};
/**
 * Add the tap_service_description string resource
 */
const withTapServiceStrings = (config) => {
    return (0, config_plugins_1.withStringsXml)(config, (mod) => {
        const existing = mod.modResults.resources.string?.find((s) => s.$?.name === 'tap_service_description');
        if (!existing) {
            if (!mod.modResults.resources.string) {
                mod.modResults.resources.string = [];
            }
            mod.modResults.resources.string.push({
                $: { name: 'tap_service_description' },
                _: 'FutureBuddy Tap Service allows voice-commanded taps on screen elements.',
            });
        }
        return mod;
    });
};
/**
 * Write Kotlin source files and XML config into the android project
 */
const withTapServiceFiles = (config) => {
    return (0, config_plugins_1.withDangerousMod)(config, [
        'android',
        async (mod) => {
            const projectRoot = mod.modRequest.projectRoot;
            const androidDir = path_1.default.join(projectRoot, 'android');
            // Write Kotlin files
            const kotlinDir = path_1.default.join(androidDir, 'app/src/main/java', KOTLIN_PACKAGE_DIR);
            const kotlinFiles = {
                'TapAccessibilityService.kt': TAP_ACCESSIBILITY_SERVICE_KT,
                'TapServiceModule.kt': TAP_SERVICE_MODULE_KT,
                'TapServicePackage.kt': TAP_SERVICE_PACKAGE_KT,
            };
            for (const [filename, content] of Object.entries(kotlinFiles)) {
                const filePath = path_1.default.join(kotlinDir, filename);
                // Only write if not already present (don't overwrite user edits)
                if (!fs_1.default.existsSync(filePath)) {
                    fs_1.default.mkdirSync(path_1.default.dirname(filePath), { recursive: true });
                    fs_1.default.writeFileSync(filePath, content, 'utf-8');
                }
            }
            // Write XML config
            const xmlDir = path_1.default.join(androidDir, 'app/src/main/res/xml');
            const xmlPath = path_1.default.join(xmlDir, 'tap_service_config.xml');
            if (!fs_1.default.existsSync(xmlPath)) {
                fs_1.default.mkdirSync(xmlDir, { recursive: true });
                fs_1.default.writeFileSync(xmlPath, TAP_SERVICE_CONFIG_XML, 'utf-8');
            }
            return mod;
        },
    ]);
};
/**
 * Register TapServicePackage in MainApplication.kt
 */
const withTapServicePackageRegistration = (config) => {
    return (0, config_plugins_1.withMainApplication)(config, (mod) => {
        const contents = mod.modResults.contents;
        const marker = 'TapServicePackage';
        // Don't add if already registered
        if (contents.includes(marker))
            return mod;
        // Expo generates: PackageList(this).packages.apply { ... }
        // Inside `apply`, the receiver is the MutableList, so we use add() directly
        const addPackageLine = '              add(TapServicePackage())';
        // Look for the .packages.apply { block
        if (contents.includes('.packages.apply {')) {
            const applyIndex = contents.indexOf('.packages.apply {');
            const afterBrace = contents.indexOf('\n', applyIndex);
            mod.modResults.contents =
                contents.slice(0, afterBrace + 1) +
                    addPackageLine +
                    '\n' +
                    contents.slice(afterBrace + 1);
        }
        else if (contents.includes('PackageList(this)')) {
            // Fallback: add after the PackageList line
            const packageListIndex = contents.indexOf('PackageList(this)');
            const afterPackageList = contents.indexOf('\n', packageListIndex);
            mod.modResults.contents =
                contents.slice(0, afterPackageList + 1) +
                    addPackageLine +
                    '\n' +
                    contents.slice(afterPackageList + 1);
        }
        return mod;
    });
};
// ──────────────────────────────────────────────
// Main plugin
// ──────────────────────────────────────────────
const withTapService = (config) => {
    config = withAccessibilityServiceManifest(config);
    config = withTapServiceStrings(config);
    config = withTapServiceFiles(config);
    config = withTapServicePackageRegistration(config);
    return config;
};
exports.default = withTapService;
