The camera is not opening because the web barcode scanner is being called with an invalid camera constraint for the installed `html5-qrcode` package.

The current code passes:

```ts
{ facingMode: { ideal: 'environment' } }
```

But this library version only accepts:

```ts
{ facingMode: 'environment' }
```

or

```ts
{ facingMode: { exact: 'environment' } }
```

So the scanner throws before it ever reaches the browser/phone camera permission prompt.

Plan:

1. Fix the web scanner camera constraint
   - Replace `{ facingMode: { ideal: 'environment' } }` with a supported format.
   - Use `{ facingMode: 'environment' }` first so mobile browsers can choose the rear camera without failing if the exact rear camera is unavailable.

2. Add a safe fallback path
   - If the rear-camera request fails because of constraints, retry once with a generic camera request.
   - This prevents the scanner from failing on devices/browsers that do not label cameras consistently.

3. Clean up the misleading camera error
   - Stop showing the generic “Camera access is needed” message for this validation error.
   - Show real permission guidance only when the browser or iPhone actually reports a permission denial.

4. Keep the native iPhone path intact
   - Do not change the native ML Kit scanner flow, permission prompt logic, or Info.plist setup.
   - The native scanner should still call the iOS camera permission request when running inside the built app.

5. Validate with a build/type check
   - Run the project checks after the code change to make sure the scanner component still compiles.

After this change, tapping “Open Barcode Scanner” should actually trigger the camera request instead of immediately showing the Camera Issue screen.