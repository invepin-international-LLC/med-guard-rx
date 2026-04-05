import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3 shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Privacy Policy</h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 prose prose-sm dark:prose-invert">
        <p className="text-muted-foreground text-sm">Last updated: March 25, 2026</p>

        <h2>1. Information We Collect</h2>
        <p>
          Med Guard Rx ("we," "our," or "us") collects the following types of information to provide our medication management services:
        </p>
        <ul>
          <li><strong>Account Information:</strong> Email address, name, and authentication credentials (encrypted PIN hash).</li>
          <li><strong>Health Data:</strong> Medications, dosage schedules, adherence history, symptom logs, allergies, medical conditions, HIPAA health records, and emergency contacts.</li>
          <li><strong>Device Information:</strong> Device type, operating system version, and push notification tokens.</li>
          
          <li><strong>Camera Data:</strong> When you grant camera permission, images are processed locally or sent to the FDA database to identify medications via barcode scanning and pill identification. Photos are not stored permanently on our servers.</li>
          <li><strong>Siri &amp; Voice Data:</strong> When you enable Siri Shortcuts, voice commands are processed by Apple's Siri framework on-device. We receive only the structured intent (e.g., "log morning meds") — we do not receive, store, or process raw audio recordings.</li>
          <li><strong>Push Notification Tokens:</strong> When you enable notifications, we store a device token to deliver medication reminders, missed-dose alerts, and refill warnings. See Section 6 for full details.</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To provide medication tracking, reminders, and adherence monitoring.</li>
          <li>To power the Dr. Bombay AI assistant with context about your medications.</li>
          <li>To send dose reminders, missed-dose alerts, and refill warnings via push notifications.</li>
          <li>To notify designated caregivers when you miss a dose (only with your explicit permission).</li>
          <li>To generate adherence reports and health insights.</li>
          <li>To sync medication adherence data with Apple Health when you grant permission.</li>
          <li>To identify medications by scanning prescription barcodes or pill images using the FDA's public database.</li>
          <li>To enable hands-free medication management via Siri voice commands.</li>
        </ul>

        <h2>3. Data Storage &amp; Security</h2>
        <p>
          Your data is stored securely using industry-standard encryption (TLS in transit, AES-256 at rest). Health records are protected with HIPAA-grade security measures, including:
        </p>
        <ul>
          <li>Row-level security policies ensuring users can only access their own data.</li>
          <li>PIN and biometric (Face ID / Touch ID) authentication.</li>
          <li>Immutable access audit logs for HIPAA health records.</li>
          <li>Leaked password protection on authentication.</li>
          <li>Caregiver access controlled via secure invite codes with email verification.</li>
        </ul>

        <h2>4. Data Sharing</h2>
        <p>
          We do not sell, rent, or trade your personal or health data. Data is shared only in the following circumstances:
        </p>
        <ul>
          <li><strong>Caregivers:</strong> Only when you explicitly invite a caregiver and grant them specific permissions (view medications, view schedule, receive alerts).</li>
          <li><strong>AI Processing:</strong> Medication names and general queries are sent to AI language models to power the Dr. Bombay assistant. No personally identifiable health records or account information are included in AI requests.</li>
          <li><strong>FDA Database:</strong> Barcode scans and drug name searches query the U.S. FDA's public OpenFDA database to retrieve medication details. Only the barcode number or drug name is sent — no personal information.</li>
          <li><strong>Push Notification Services:</strong> Device tokens are sent to Apple Push Notification service (APNs) and/or Firebase Cloud Messaging (FCM) to deliver notifications. These services do not have access to your health data.</li>
          <li><strong>Legal Requirements:</strong> When required by law, regulation, or legal process, or to protect safety.</li>
        </ul>

        <h2>5. Push Notifications</h2>
        <p>
          When you enable push notifications, Med Guard Rx uses Apple Push Notification service (APNs) and/or Firebase Cloud Messaging to deliver:
        </p>
        <ul>
          <li>Scheduled medication dose reminders (5–15 minutes before each dose).</li>
          <li>Overdue/missed dose alerts.</li>
          <li>Refill and low-supply warnings.</li>
          <li>Caregiver missed-dose notifications (only if you have enabled caregiver alerts).</li>
        </ul>
        <p>
          You can disable notifications at any time from the app's Notification Settings or from your device's system Settings. Disabling notifications will not affect your medication data.
        </p>

        <h2>6. Camera &amp; Barcode Scanning</h2>
        <p>
          Med Guard Rx requests camera access to:
        </p>
        <ul>
          <li>Scan prescription barcode labels to automatically identify medications via the FDA database.</li>
          <li>Identify pills using AI-powered image recognition.</li>
        </ul>
        <p>
          Camera images used for barcode scanning are processed in real-time and are <strong>not</strong> stored on our servers. Pill identification images may be sent to AI services for analysis and are not retained after processing. You can deny or revoke camera permission at any time from your device's system Settings.
        </p>

        <h2>8. Siri &amp; Voice Shortcuts</h2>
        <p>
          Med Guard Rx supports Siri Shortcuts for hands-free medication management. When you enable Siri integration:
        </p>
        <ul>
          <li>Voice processing is handled entirely by Apple's Siri framework on your device.</li>
          <li>We receive only the structured intent data (e.g., "log morning meds"), not raw audio.</li>
          <li>We do not record, store, or transmit your voice data.</li>
          <li>You can remove any Siri Shortcut at any time from the Shortcuts app or Siri Settings.</li>
        </ul>

        <h2>9. Your Rights</h2>
        <ul>
          <li><strong>Access &amp; Export:</strong> You can view all your data within the app at any time, including adherence history, HIPAA records, and access logs.</li>
          <li><strong>Deletion:</strong> You can permanently delete your account and all associated data (across 22+ data categories) from Profile → App Settings. Deletion is irreversible.</li>
          <li><strong>Revoke Permissions:</strong> You can disconnect Apple Health, disable push notifications, revoke camera access, remove Siri Shortcuts, or remove caregivers at any time.</li>
          <li><strong>Data Portability:</strong> Adherence reports can be generated as PDF documents from within the app.</li>
        </ul>

        <h2>10. Data Retention</h2>
        <p>
          We retain your data as long as your account is active. When you delete your account, all associated data — including medications, dose logs, health records, caregiver relationships, rewards, symptom logs, and push tokens — is permanently purged from our systems. No backup copies are retained.
        </p>

        <h2>11. Children's Privacy</h2>
        <p>
          Med Guard Rx is intended for users aged 13 and older. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided us with personal data, please contact us and we will promptly delete it.
        </p>

        <h2>12. International Data</h2>
        <p>
          Your data may be processed and stored in the United States or other countries where our service providers operate. By using the app, you consent to the transfer of your data to these locations, which may have different data protection laws than your country of residence.
        </p>

        <h2>13. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of significant changes through the app or via email. Continued use of the app after changes constitutes acceptance of the updated policy.
        </p>

        <h2>14. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy or wish to exercise your data rights, contact us at:<br />
          <strong>support@medguardrx.com</strong>
        </p>
      </main>
    </div>
  );
}