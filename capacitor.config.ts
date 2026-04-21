import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.medguardrx.app',
  appName: 'Med Guard Rx',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    // IMPORTANT: keep the WKWebView background TRANSPARENT so the native
    // ML Kit barcode scanner can render the camera preview behind the
    // webview. Setting an opaque color here makes the camera feed
    // invisible during scanning, and users see only the app UI.
    backgroundColor: '#00000000',
    preferredContentMode: 'mobile'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#f5f7fa',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#f5f7fa'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    }
  }
};

// iOS Entitlements needed for native build:
// - com.apple.developer.siri (Siri Shortcuts)
// 
// Run scripts/patch-ios-plist.sh after `npx cap sync ios` to inject:
// - NSCameraUsageDescription
// - NSSiriUsageDescription
// - NSMicrophoneUsageDescription

export default config;
