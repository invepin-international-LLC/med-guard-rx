import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3 shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Terms of Service</h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 prose prose-sm dark:prose-invert">
        <p className="text-muted-foreground text-sm">Last updated: March 25, 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By downloading, installing, or using Med Guard Rx ("the App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to all of these Terms, do not download, install, or use the App. These Terms constitute a legally binding agreement between you and Invepin International Systems LLC ("we," "our," or "us").
        </p>

        <h2>2. Description of Service</h2>
        <p>
          Med Guard Rx is a medication management application available on Apple devices (iPhone and iPad). The App provides:
        </p>
        <ul>
          <li>Medication tracking with customizable dose schedules (morning, afternoon, evening, bedtime).</li>
          <li>Push notification reminders for upcoming, overdue, and missed doses.</li>
          <li>Prescription barcode scanning and AI-powered pill identification using the FDA database.</li>
          <li>An AI assistant ("Dr. Bombay") for general medication information.</li>
          <li>Adherence history, streak tracking, and PDF report generation.</li>
          <li>A gamification rewards system with coins, slot machine spins, badges, and weekly challenges.</li>
          <li>Caregiver invite and monitoring features.</li>
          
          <li>Siri Shortcuts for hands-free medication management.</li>
          <li>HIPAA health records vault with audit logging.</li>
          <li>Emergency contact management.</li>
          <li>Symptom and side-effect journaling.</li>
          <li>Drug interaction warnings.</li>
          <li>Fentanyl safety education resources.</li>
        </ul>

        <h2>3. Eligibility</h2>
        <p>
          You must be at least <strong>13 years of age</strong> to create an account and use the App. By using the App, you represent and warrant that you meet this age requirement. If you are under 18, you should review these Terms with a parent or guardian.
        </p>

        <h2>4. Medical Disclaimer</h2>
        <p>
          <strong>Med Guard Rx is not a medical device and is not a substitute for professional medical advice, diagnosis, or treatment.</strong>
        </p>
        <ul>
          <li>The AI assistant ("Dr. Bombay") provides <strong>general medication information only</strong> and does not provide medical diagnoses, treatment recommendations, or prescribing decisions.</li>
          <li>Drug interaction warnings are informational and may not cover all possible interactions. Always consult your pharmacist or prescribing physician.</li>
          <li>Pill identification results are AI-assisted estimates and must be verified by a licensed pharmacist before consuming any medication.</li>
          <li>Adherence tracking and reminders are personal management tools — they do not replace the judgment of a healthcare professional.</li>
          <li><strong>In case of a medical emergency, call 911 or your local emergency number immediately.</strong></li>
        </ul>

        <h2>5. Account Registration &amp; Security</h2>
        <ul>
          <li>You must provide accurate and complete information when creating an account.</li>
          <li>You are responsible for maintaining the confidentiality of your login credentials, PIN, and any biometric authentication settings (Face ID / Touch ID).</li>
          <li>You are responsible for all activity that occurs under your account.</li>
          <li>You must notify us immediately if you suspect unauthorized access to your account.</li>
          <li>We reserve the right to suspend or terminate accounts with inaccurate information or suspicious activity.</li>
        </ul>

        <h2>6. Device Permissions</h2>
        <p>
          Certain features of the App require access to device capabilities. You may grant or deny these permissions at any time through your device's system Settings:
        </p>
        <ul>
          <li><strong>Camera:</strong> Required for prescription barcode scanning and AI pill identification. Images are processed in real-time and are not permanently stored on our servers.</li>
          <li><strong>Notifications:</strong> Required for dose reminders, missed-dose alerts, refill warnings, and caregiver notifications.</li>
          <li><strong>Apple HealthKit:</strong> Optional integration to read health metrics (steps, heart rate) and write medication adherence data. HealthKit data is never used for advertising or sold to third parties.</li>
          <li><strong>Siri &amp; Shortcuts:</strong> Optional voice control for logging doses hands-free. Voice processing occurs on-device via Apple's Siri framework — we do not receive or store audio recordings.</li>
        </ul>

        <h2>7. Caregiver Features</h2>
        <p>
          Med Guard Rx allows you to invite caregivers to monitor your medication adherence:
        </p>
        <ul>
          <li>Caregiver invitations are sent via secure invite codes with email verification and a 7-day expiration.</li>
          <li>You control what information caregivers can access: medications, schedule, adherence history, and/or missed-dose alerts.</li>
          <li>You may revoke caregiver access at any time from your Profile settings.</li>
          <li>Caregivers must use the information responsibly and solely for health-related support purposes.</li>
          <li>Caregivers agree to these Terms by accepting an invitation.</li>
        </ul>

        <h2>8. Rewards &amp; Gamification</h2>
        <p>
          The App includes a gamification system designed to encourage medication adherence:
        </p>
        <ul>
          <li>Coins, spins, badges, and other virtual rewards have <strong>no monetary value</strong> and cannot be exchanged for real currency, goods, or services outside the App.</li>
          <li>Virtual items purchased in the in-app shop (avatars, themes, power-ups) are non-transferable and non-refundable.</li>
          <li>We reserve the right to modify the rewards system, item prices, or available items at any time.</li>
          <li>Rewards are earned through genuine medication adherence activities — any attempt to manipulate or exploit the system may result in account suspension.</li>
        </ul>

        <h2>9. AI-Powered Features</h2>
        <p>
          The App uses artificial intelligence for several features:
        </p>
        <ul>
          <li><strong>Dr. Bombay AI Assistant:</strong> Provides general medication information. Responses are generated by AI language models and may contain errors. Do not rely on AI responses for medical decisions.</li>
          <li><strong>Pill Identification:</strong> Uses AI image recognition to identify medications. Results are estimates only — always verify with a pharmacist.</li>
          <li><strong>Drug Interaction Checking:</strong> AI-assisted analysis of potential medication interactions. This does not replace professional pharmacist review.</li>
        </ul>
        <p>
          AI features send medication names and general queries to AI models for processing. No personally identifiable information or detailed health records are included in AI requests.
        </p>

        <h2>10. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the App for any unlawful or fraudulent purpose.</li>
          <li>Attempt to gain unauthorized access to other users' data or accounts.</li>
          <li>Interfere with, disrupt, or overload the App's infrastructure or services.</li>
          <li>Reverse engineer, decompile, disassemble, or attempt to derive the source code of the App.</li>
          <li>Use automated scripts, bots, or tools to interact with the App or manipulate the rewards system.</li>
          <li>Misrepresent your identity or provide false information.</li>
          <li>Use the App to store or transmit content that is illegal, harmful, or violates the rights of others.</li>
        </ul>

        <h2>11. Intellectual Property</h2>
        <p>
          All content, features, functionality, design, trademarks, and code of Med Guard Rx are owned by Invepin International Systems LLC and are protected by U.S. and international copyright, trademark, patent, and other intellectual property laws. You are granted a limited, non-exclusive, non-transferable license to use the App for personal, non-commercial purposes.
        </p>

        <h2>12. Privacy</h2>
        <p>
          Your use of the App is also governed by our <strong>Privacy Policy</strong>, which describes how we collect, use, store, and protect your information, including health data, HealthKit data, camera data, and push notification tokens. By using the App, you consent to the practices described in the Privacy Policy.
        </p>

        <h2>13. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by applicable law, Med Guard Rx and Invepin International Systems LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from or related to:
        </p>
        <ul>
          <li>Missed medication doses or inaccurate reminders.</li>
          <li>Incorrect or incomplete AI-generated information (Dr. Bombay, pill identification, drug interactions).</li>
          <li>Data loss, unauthorized access, or security breaches.</li>
          <li>Interruption or unavailability of push notifications or other services.</li>
          <li>Actions taken or not taken based on information provided by the App.</li>
          <li>Integration issues with Apple HealthKit, Siri, or other third-party services.</li>
        </ul>
        <p>
          <strong>The App is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, express or implied.</strong>
        </p>

        <h2>14. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless Invepin International Systems LLC, its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including reasonable attorneys' fees) arising from your use of the App, violation of these Terms, or infringement of any third-party rights.
        </p>

        <h2>15. Account Termination &amp; Data Deletion</h2>
        <ul>
          <li>You may delete your account at any time from Profile → App Settings.</li>
          <li>Upon deletion, all your data — including medications, dose logs, health records, rewards, caregiver relationships, symptom logs, emergency contacts, and push tokens — is permanently and irreversibly purged from our systems across 22+ data categories.</li>
          <li>We reserve the right to suspend or terminate accounts that violate these Terms, with or without prior notice.</li>
        </ul>

        <h2>16. Third-Party Services</h2>
        <p>
          The App integrates with third-party services including Apple HealthKit, Apple Siri, Apple Push Notification service (APNs), Firebase Cloud Messaging, and the U.S. FDA OpenFDA database. These services are governed by their own terms and privacy policies. We are not responsible for the availability, accuracy, or practices of third-party services.
        </p>

        <h2>17. Updates &amp; Modifications</h2>
        <p>
          We may update the App and these Terms from time to time. Material changes to these Terms will be communicated through the App or via email. Continued use of the App after changes constitutes acceptance of the updated Terms. We recommend reviewing these Terms periodically.
        </p>

        <h2>18. Governing Law &amp; Dispute Resolution</h2>
        <p>
          These Terms are governed by and construed in accordance with the laws of the State of Florida, United States, without regard to conflict of law principles. Any disputes arising from these Terms or your use of the App shall be resolved in the state or federal courts located in Florida.
        </p>

        <h2>19. Severability</h2>
        <p>
          If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.
        </p>

        <h2>20. Contact</h2>
        <p>
          For questions about these Terms of Service, contact us at:<br />
          <strong>support@medguardrx.com</strong>
        </p>
      </main>
    </div>
  );
}
