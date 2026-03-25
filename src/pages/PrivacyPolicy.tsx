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
          <li><strong>Account Information:</strong> Email address, name, and authentication credentials.</li>
          <li><strong>Health Data:</strong> Medications, dosage schedules, adherence history, symptom logs, allergies, medical conditions, and emergency contacts.</li>
          <li><strong>Device Information:</strong> Device type, operating system, and push notification tokens.</li>
          <li><strong>Apple Health Data:</strong> When authorized, we read health metrics (steps, heart rate) and write medication adherence data to Apple HealthKit.</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To provide medication tracking, reminders, and adherence monitoring.</li>
          <li>To power the Dr. Bombay AI assistant with context about your medications.</li>
          <li>To send dose reminders and missed-dose alerts to you and your designated caregivers.</li>
          <li>To generate adherence reports and health insights.</li>
          <li>To sync data with Apple Health when you grant permission.</li>
        </ul>

        <h2>3. Data Storage & Security</h2>
        <p>
          Your data is stored securely using industry-standard encryption. Health records are protected with HIPAA-grade security measures, including row-level security policies, PIN/biometric authentication, and immutable access audit logs.
        </p>

        <h2>4. Data Sharing</h2>
        <p>
          We do not sell your personal or health data. Data is shared only in the following circumstances:
        </p>
        <ul>
          <li><strong>Caregivers:</strong> Only when you explicitly invite a caregiver and grant them specific permissions.</li>
          <li><strong>AI Processing:</strong> Medication names and general queries are sent to AI services to power the Dr. Bombay assistant. No personally identifiable health records are shared.</li>
          <li><strong>Legal Requirements:</strong> When required by law or to protect safety.</li>
        </ul>

        <h2>5. Apple HealthKit</h2>
        <p>
          Med Guard Rx integrates with Apple HealthKit to read health metrics and write medication adherence data. HealthKit data is never used for advertising, shared with third parties, or stored outside your device and our secure backend. You can disconnect Apple Health at any time from App Settings.
        </p>

        <h2>6. Your Rights</h2>
        <ul>
          <li><strong>Access & Export:</strong> You can view all your data within the app at any time.</li>
          <li><strong>Deletion:</strong> You can delete your account and all associated data from the Profile tab.</li>
          <li><strong>Revoke Permissions:</strong> You can disconnect Apple Health, disable notifications, or remove caregivers at any time.</li>
        </ul>

        <h2>7. Data Retention</h2>
        <p>
          We retain your data as long as your account is active. When you delete your account, all associated data is permanently removed within 30 days.
        </p>

        <h2>8. Children's Privacy</h2>
        <p>
          Med Guard Rx is not intended for children under 13. We do not knowingly collect data from children under 13.
        </p>

        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of significant changes through the app or via email.
        </p>

        <h2>10. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, contact us at:<br />
          <strong>support@medguardrx.com</strong>
        </p>
      </main>
    </div>
  );
}
