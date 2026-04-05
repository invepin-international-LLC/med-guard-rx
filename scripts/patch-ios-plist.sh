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


# Camera (required for prescription barcode scanner)
add_plist_key "NSCameraUsageDescription" "Med Guard Rx uses your camera to scan prescription barcodes and identify medications."

# Siri (required for Siri Shortcuts integration)
add_plist_key "NSSiriUsageDescription" "Use Siri to log medications, check your schedule, and manage doses hands-free."

# Microphone (required for appointment recorder transcription)
add_plist_key "NSMicrophoneUsageDescription" "Med Guard Rx uses your microphone to transcribe doctor appointment conversations so you can review them later."

echo ""
echo "✅ Info.plist patched successfully with all required privacy strings!"
echo "   - NSHealthShareUsageDescription"
echo "   - NSHealthUpdateUsageDescription"
echo "   - NSCameraUsageDescription"
echo "   - NSSiriUsageDescription"
echo "   - NSMicrophoneUsageDescription"
echo ""
echo "   You can now archive and distribute from Xcode."