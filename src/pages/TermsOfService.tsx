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
          By downloading, installing, or using Med Guard Rx ("the App"), you agree to be bound by these Terms of Service. If you do not agree, do not use the App.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          Med Guard Rx is a medication management application available exclusively on Apple devices (iPhone and iPad). The App helps users track medications, receive dose reminders, monitor adherence, and access AI-powered medication information. The App is designed as a personal health management tool.
        </p>

        <h2>3. Medical Disclaimer</h2>
        <p>
          <strong>Med Guard Rx is not a substitute for professional medical advice, diagnosis, or treatment.</strong> The AI assistant (Dr. Bombay) provides general medication information only. Always consult your doctor or pharmacist before making changes to your medication regimen. In case of emergency, call 911 or your local emergency number.
        </p>

        <h2>4. Account Responsibilities</h2>
        <ul>
          <li>You must provide accurate information when creating an account.</li>
          <li>You are responsible for maintaining the security of your account credentials and PIN.</li>
          <li>You must be at least 13 years old to use the App.</li>
          <li>You are responsible for all activity that occurs under your account.</li>
        </ul>

        <h2>5. Caregiver Features</h2>
        <p>
          When you invite a caregiver, you grant them permission to view specific information about your medication schedule and adherence as configured. You can revoke caregiver access at any time. Caregivers must use the information responsibly and in accordance with these Terms.
        </p>

        <h2>6. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the App for any unlawful purpose.</li>
          <li>Attempt to gain unauthorized access to other users' data.</li>
          <li>Interfere with or disrupt the App's functionality.</li>
          <li>Reverse engineer or decompile any part of the App.</li>
        </ul>

        <h2>7. Intellectual Property</h2>
        <p>
          All content, features, and functionality of Med Guard Rx are owned by Invepin International Systems LLC and are protected by copyright, trademark, and other intellectual property laws.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Med Guard Rx and its developers shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the App, including but not limited to missed medication doses, incorrect AI-generated information, or data loss.
        </p>

        <h2>9. Account Termination</h2>
        <p>
          You may delete your account at any time from the Profile tab. We reserve the right to suspend or terminate accounts that violate these Terms. Upon deletion, all your data will be permanently removed.
        </p>

        <h2>10. Changes to Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of the App after changes constitutes acceptance of the new Terms.
        </p>

        <h2>11. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the State of Florida, United States, without regard to conflict of law principles.
        </p>

        <h2>12. Contact</h2>
        <p>
          For questions about these Terms, contact us at:<br />
          <strong>support@medguardrx.com</strong>
        </p>
      </main>
    </div>
  );
}
