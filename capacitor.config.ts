import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.medguardrx.app',
  appName: 'Med Guard Rx',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    backgroundColor: '#f5f7fa',
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
// - NSHealthShareUsageDescription
// - NSHealthUpdateUsageDescription
// - NSCameraUsageDescription
// - NSSiriUsageDescription
// - NSMicrophoneUsageDescription

export default config;
