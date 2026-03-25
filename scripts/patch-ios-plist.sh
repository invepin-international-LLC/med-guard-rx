#!/bin/bash
# Patches iOS Info.plist with required privacy usage descriptions
# Run this after: npx cap sync ios

PLIST_PATH="ios/App/App/Info.plist"

if [ ! -f "$PLIST_PATH" ]; then
  echo "❌ Info.plist not found at $PLIST_PATH"
  echo "   Make sure you've run: npx cap add ios"
  exit 1
fi

add_plist_key() {
  local key="$1"
  local value="$2"
  
  if /usr/libexec/PlistBuddy -c "Print :$key" "$PLIST_PATH" 2>/dev/null; then
    echo "✅ $key already exists, updating..."
    /usr/libexec/PlistBuddy -c "Set :$key $value" "$PLIST_PATH"
  else
    echo "➕ Adding $key..."
    /usr/libexec/PlistBuddy -c "Add :$key string $value" "$PLIST_PATH"
  fi
}

# HealthKit
add_plist_key "NSHealthShareUsageDescription" "Med Guard Rx syncs your medication adherence with Apple Health to give you a complete picture of your health."
add_plist_key "NSHealthUpdateUsageDescription" "Med Guard Rx can write medication adherence data to Apple Health to help track your wellness."

# Camera (required for prescription barcode scanner)
add_plist_key "NSCameraUsageDescription" "Med Guard Rx uses your camera to scan prescription barcodes and identify medications."

# Siri (required for Siri Shortcuts integration)
add_plist_key "NSSiriUsageDescription" "Use Siri to log medications, check your schedule, and manage doses hands-free."

echo ""
echo "✅ Info.plist patched successfully with all required privacy strings!"
echo "   - NSHealthShareUsageDescription"
echo "   - NSHealthUpdateUsageDescription"
echo "   - NSCameraUsageDescription"
echo "   - NSSiriUsageDescription"
echo ""
echo "   You can now archive and distribute from Xcode."