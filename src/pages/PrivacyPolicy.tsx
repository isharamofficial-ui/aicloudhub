import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background">
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/login"><Button variant="ghost" size="icon" className="rounded-xl"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <h1 className="text-xl font-heading font-bold text-foreground">Privacy Policy</h1>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-foreground/90">
        <p className="text-muted-foreground text-xs">Last updated: February 17, 2026</p>

        <section>
          <h2 className="text-lg font-heading font-bold">1. Information We Collect</h2>
          <p>When you register and use AICloudHub, we collect:</p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li><strong>Account Information:</strong> Name, email address, phone number, and password.</li>
            <li><strong>Financial Information:</strong> Bank account details, deposit/withdrawal history, and wallet balances.</li>
            <li><strong>Device Information:</strong> IP address, browser fingerprint, user agent, device type, and timezone for security monitoring.</li>
            <li><strong>Activity Data:</strong> Login times, daily sign-ins, package purchases, referral activity, and transaction history.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-heading font-bold">2. Device Tracking & Security</h2>
          <p className="text-sm">We use device fingerprinting and IP address logging to:</p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Detect and prevent unauthorized access to your account.</li>
            <li>Identify suspicious multi-account activity from the same device or IP.</li>
            <li>Protect the platform against fraud, abuse, and policy violations.</li>
            <li>Administrators may use this data to freeze or ban accounts engaged in suspicious activity.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-heading font-bold">3. Account Freezing & Banning</h2>
          <p className="text-sm">We reserve the right to freeze or permanently ban accounts that:</p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Engage in fraudulent deposits or withdrawals.</li>
            <li>Use multiple accounts from the same device or IP to exploit referral or commission systems.</li>
            <li>Violate platform terms of service.</li>
            <li>Show suspicious transaction patterns flagged by our integrity monitoring system.</li>
          </ul>
          <p className="text-sm">Banned users will be notified and may have their remaining balance reviewed before any action.</p>
        </section>

        <section>
          <h2 className="text-lg font-heading font-bold">4. Financial Data & Commissions</h2>
          <p className="text-sm">Your deposit, withdrawal, and commission data is stored securely. We use automated integrity checks to ensure balance accuracy. Any discrepancies are flagged to administrators for investigation.</p>
        </section>

        <section>
          <h2 className="text-lg font-heading font-bold">5. Data Sharing</h2>
          <p className="text-sm">We do not sell your personal data. We may share data with:</p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Platform administrators for account management and security.</li>
            <li>Law enforcement if required by applicable law.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-heading font-bold">6. Data Retention</h2>
          <p className="text-sm">Your data is retained as long as your account is active. If your account is deleted by an administrator, all associated data (transactions, commissions, device logs, etc.) will be permanently removed.</p>
        </section>

        <section>
          <h2 className="text-lg font-heading font-bold">7. Your Rights</h2>
          <p className="text-sm">You may request to view or export your data by contacting support. Account deletion requests must go through the platform administrator.</p>
        </section>

        <section>
          <h2 className="text-lg font-heading font-bold">8. Consent</h2>
          <p className="text-sm">By creating an account, you acknowledge that you have read and agree to this Privacy Policy, including our device tracking and account management practices.</p>
        </section>
      </div>
    </div>
  </div>
);

export default PrivacyPolicy;
