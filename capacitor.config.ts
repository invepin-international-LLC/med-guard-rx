import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.medguardrx.app',
  appName: 'Med Guard Rx',
  webDir: 'dist',
  server: {
    url: 'https://45501de0-0fa2-4819-8669-d3873eb1bd90.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
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
// - com.apple.developer.healthkit (HealthKit)
// - com.apple.developer.healthkit.background-delivery (Background health updates)
// - com.apple.developer.siri (Siri Shortcuts)
// 
// Add these to your Info.plist:
// - NSHealthShareUsageDescription: "Med Guard Rx syncs your medication adherence with Apple Health."
// - NSHealthUpdateUsageDescription: "Med Guard Rx can write medication adherence data to Apple Health."
// - NSSiriUsageDescription: "Use Siri to log medications and check your schedule."

export default config;
