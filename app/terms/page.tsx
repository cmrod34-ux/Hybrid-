import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use — Hybrid",
  description: "The rules for using Hybrid's website, app, and coaching services.",
};

const UPDATED = "August 6, 2026";
const CONTACT = "cmrod34@gmail.com";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">{title}</h2>
      <div className="space-y-3 text-white/55 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#080a0f] px-6 py-20">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link href="/" className="text-[#00e5ff] text-sm font-medium hover:text-white transition-colors">
          ← Back to Hybrid
        </Link>

        {/* Header */}
        <h1 className="text-4xl sm:text-5xl font-black text-white mt-8 mb-3">Terms of Use</h1>
        <p className="text-white/35 text-sm mb-4">Last updated: {UPDATED}</p>
        <p className="text-white/35 text-sm mb-12">
          These terms have not yet been reviewed by an attorney. Professional legal review is a pending
          launch task, and this document may change materially before or shortly after public release.
        </p>

        <Section title="Agreement to these terms">
          <p>
            These Terms of Use (&ldquo;Terms&rdquo;) govern your use of the Hybrid website (hybridfit.org),
            the Hybrid mobile app, and any coaching or custom-plan services we offer
            (together, the &ldquo;Service&rdquo;). Hybrid is referred to below as
            &ldquo;Hybrid,&rdquo; &ldquo;we,&rdquo; or &ldquo;us.&rdquo;
          </p>
          <p>
            By creating an account or using the Service, you agree to these Terms. If you do not agree,
            do not use the Service. Your privacy is covered separately by our{" "}
            <Link href="/privacy" className="text-[#00e5ff] hover:text-white transition-colors">Privacy Policy</Link>.
          </p>
        </Section>

        <Section title="Not medical advice">
          <p>
            Hybrid provides general fitness and nutrition <strong className="text-white/80">information
            and education only</strong>. It is <strong className="text-white/80">not medical advice</strong>,
            not a diagnosis, not treatment, and not a substitute for care from a qualified professional.
            We are not a healthcare provider, and using the Service does not create a doctor&ndash;patient,
            dietitian&ndash;client, or therapist&ndash;client relationship.
          </p>
          <p>
            Training plans, session prescriptions, calorie and macro estimates, fueling suggestions, and
            AI Coach responses are informational. Consult a qualified physician or registered dietitian
            before starting or changing any training or nutrition program &mdash; especially if you are
            pregnant, are managing an injury or medical condition, take medication, have a food allergy,
            or have a history of disordered eating.
          </p>
        </Section>

        <Section title="You are responsible for your own training decisions">
          <p>
            Exercise carries inherent risk, including injury and, in rare cases, death. You are solely
            responsible for deciding whether any workout, load, distance, intensity, or meal suggestion
            is appropriate for you on a given day, and for performing it safely and with correct technique.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Warm up, scale, substitute, or skip anything that does not feel right.</li>
            <li>Stop immediately if you feel pain, dizziness, chest discomfort, or shortness of breath.</li>
            <li>Train within your ability and your equipment&rsquo;s limits, and use a spotter when appropriate.</li>
            <li>Do not rely on the Service to detect an injury, an illness, or overtraining.</li>
          </ul>
          <p>
            To the fullest extent permitted by law, you assume the risks of training and agree that Hybrid
            is not liable for injury, illness, or loss arising from your use of the Service.
          </p>
        </Section>

        <Section title="Emergencies and medical limitations">
          <p>
            <strong className="text-white/80">The Service is not for emergencies.</strong> It does not
            monitor you, does not detect medical events, and no one is watching your account in real time.
            Messages you send in the app &mdash; including AI Coach messages and messages to a human coach
            &mdash; are not monitored for urgent or crisis content and may not be read for some time.
          </p>
          <p>
            If you are experiencing a medical emergency, injury, or mental-health crisis, stop using the
            Service and call your local emergency number or contact a licensed professional immediately.
          </p>
        </Section>

        <Section title="Eligibility and minimum age">
          <p>
            You must be at least <strong className="text-white/80">13 years old</strong> to use the Service.
            If you are under the age of majority where you live, you may use the Service only with the
            involvement and consent of a parent or legal guardian, who agrees to be bound by these Terms.
          </p>
          <p>
            Sign-up currently collects an email address and password only, so we do not verify age
            technically &mdash; this is a policy requirement you agree to when you create an account. If we
            learn that an account belongs to someone under 13, we may terminate it and delete the
            associated data.
          </p>
        </Section>

        <Section title="Your account">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-white/80">Accurate information:</strong> the plans, calorie targets, and coaching feedback you receive are only as good as what you enter. Provide accurate details about your goals, training history, body metrics, injuries, and dietary needs, and keep them current.</li>
            <li><strong className="text-white/80">Credentials:</strong> keep your password confidential. You are responsible for everything that happens under your account. Tell us promptly at{" "}
              <a href={`mailto:${CONTACT}`} className="text-[#00e5ff] hover:text-white transition-colors">{CONTACT}</a>{" "}
              if you suspect unauthorized access.</li>
            <li><strong className="text-white/80">One person per account:</strong> accounts are personal and individual. Do not share, sell, or transfer your account, and do not use one account to generate plans or coaching for multiple people.</li>
            <li><strong className="text-white/80">Connected services:</strong> if you connect Strava, you are responsible for that connection and may disconnect it at any time in Hybrid and revoke Hybrid&rsquo;s access in your Strava account settings.</li>
          </ul>
        </Section>

        <Section title="Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Use the Service for anything unlawful, or to harass, threaten, defame, or abuse anyone &mdash; including coaches and support staff.</li>
            <li>Submit content you do not have the right to share, or impersonate another person.</li>
            <li>Attempt to access accounts, data, or areas of the Service that are not yours, or interfere with our security controls or rate limits.</li>
            <li>Scrape, crawl, reverse engineer, decompile, or attempt to derive our source code, prompts, or models, except where that restriction is prohibited by law.</li>
            <li>Resell, sublicense, or commercially redistribute plans, coaching output, or other material from the Service.</li>
            <li>Use the Service to build a competing product, or to train a machine-learning model.</li>
            <li>Overload, disrupt, or automate access to the Service in a way that degrades it for others.</li>
          </ul>
          <p>We may suspend or remove access for conduct that violates these rules.</p>
        </Section>

        <Section title="AI-generated content and its limits">
          <p>
            The AI Coach and parts of the planning experience are powered by a large language model
            provided by Anthropic. AI output is generated automatically and{" "}
            <strong className="text-white/80">can be wrong, incomplete, outdated, or inappropriate for
            your situation</strong>. It may misread your context, miss a detail you entered, or state
            something confidently that is inaccurate.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Treat AI responses as a starting point, not an instruction. Verify anything that affects your health, safety, or a load you intend to lift.</li>
            <li>The AI Coach sees only a limited slice of your data &mdash; recent sessions, your current plan context, and the limitations you typed in. It does not know your full medical history.</li>
            <li>Do not use the AI Coach to diagnose a symptom, evaluate an injury, or decide whether to seek care.</li>
            <li>Similar prompts can produce different answers, and we do not guarantee that AI output is accurate, consistent, or unique to you.</li>
          </ul>
          <p>
            AI Coach usage may be rate-limited or capped per day, and those limits can change.
          </p>
        </Section>

        <Section title="Coaching and custom-plan services">
          <p>
            Where offered, coaching and custom-plan services are delivered by a human coach who reviews the
            intake information you submit and returns a plan, a written summary, and in-app messages.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-white/80">Training guidance only.</strong> Coaching is athletic training and general nutrition guidance. It is <strong className="text-white/80">not</strong> medical care, physical therapy, diagnosis, treatment, rehabilitation, or medical nutrition therapy.</li>
            <li><strong className="text-white/80">Your coach is not your doctor.</strong> Unless expressly stated otherwise, a Hybrid coach is not a physician, registered dietitian, physical therapist, or licensed clinician, and cannot advise on medical conditions, medications, supplements as treatment, or injury rehabilitation.</li>
            <li><strong className="text-white/80">Not continuous supervision.</strong> Coaching is asynchronous. Your coach is not observing your sessions and will not respond immediately.</li>
            <li><strong className="text-white/80">Scope and revisions.</strong> Each service has a defined deliverable and a limited number of revisions. Requests outside that scope may require a new purchase.</li>
            <li><strong className="text-white/80">What you share.</strong> Coaching intake and messages are stored on our servers so your coach can read and respond to them. See the{" "}
              <Link href="/privacy" className="text-[#00e5ff] hover:text-white transition-colors">Privacy Policy</Link>{" "}
              for details. Do not send information you are not comfortable sharing with a coach.</li>
          </ul>
        </Section>

        <Section title="Purchases and subscriptions">
          <p>
            <strong className="text-white/80">Purchases are not enabled yet.</strong> No paid plan,
            subscription, or coaching service is currently available for sale in the app, and no billing
            is taking place. Every account resolves to the free tier. The terms below describe how billing
            will work once in-app purchases are turned on, and they take effect only at that point.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-white/80">Billed through Apple.</strong> Paid subscriptions and one-time services will be sold as Apple In-App Purchases and charged to your Apple Account. Apple, not Hybrid, processes the payment; we never receive your card details.</li>
            <li><strong className="text-white/80">Auto-renewal.</strong> Subscriptions will renew automatically at the then-current price for the same period unless auto-renew is turned off. Your Apple Account will be charged for renewal within 24 hours before the end of the current period.</li>
            <li><strong className="text-white/80">Cancellation.</strong> You can manage or cancel a subscription any time in your Apple Account&rsquo;s Subscriptions settings on your device. To avoid being charged, cancel at least <strong className="text-white/80">24 hours before</strong> the current period ends. Deleting the app does not cancel a subscription.</li>
            <li><strong className="text-white/80">Access after cancellation.</strong> If you cancel, paid access continues through the end of the period you already paid for; no partial-period refunds are given for the unused remainder.</li>
            <li><strong className="text-white/80">Refunds.</strong> Purchases made through Apple are subject to Apple&rsquo;s refund policy and are requested from Apple, not from us. Where a coaching service has already been delivered, we may decline to provide additional work after a refund.</li>
            <li><strong className="text-white/80">Price and packaging changes.</strong> We may change prices, tiers, or what is included in a tier going forward. Where required, price increases affecting an active subscription will be handled through Apple&rsquo;s notice and consent process.</li>
            <li><strong className="text-white/80">Free offers.</strong> Introductory or free-plan offers are limited, subject to eligibility rules, and may be withdrawn or changed at any time.</li>
          </ul>
        </Section>

        <Section title="Availability and changes to the Service">
          <p>
            Hybrid is under active development. Features may be added, changed, limited, or removed, and
            the Service may be unavailable for maintenance, provider outages, or reasons outside our
            control. We do not guarantee uninterrupted or error-free operation.
          </p>
          <p>
            Your training plans, workout logs, nutrition preferences, and fueling profile are stored on
            your device rather than on our servers. That means they are not automatically backed up by us
            and can be lost if you delete the app, lose the device, or reset it. You are responsible for
            keeping your own copy &mdash; the app includes an export option.
          </p>
        </Section>

        <Section title="Intellectual property">
          <p>
            The Service &mdash; including the Hybrid name and logo, the website and app, the planning and
            fueling logic, prompts, text, design, and code &mdash; is owned by Hybrid and protected by
            intellectual property laws. Subject to these Terms, we grant you a personal, limited,
            non-exclusive, non-transferable, revocable license to use the Service and to use the plans and
            coaching output you receive for your own training. All other rights are reserved.
          </p>
          <p>
            <strong className="text-white/80">Your content.</strong> You keep ownership of the information
            you submit &mdash; your inputs, logs, notes, messages, and feedback. You grant us a
            non-exclusive, worldwide, royalty-free license to host, store, process, and transmit that
            content as needed to operate the Service and provide it back to you, including sending the
            limited context described in our Privacy Policy to the providers that power the Service. If you
            send us feedback or suggestions, we may use them without obligation to you.
          </p>
          <p>
            <strong className="text-white/80">Third-party marks.</strong> Apple, Strava, and other names
            referenced in the Service belong to their respective owners and are used for identification
            only. Their services are governed by their own terms.
          </p>
        </Section>

        <Section title="Termination">
          <p>
            You may stop using the Service at any time. You can delete your account from within the app,
            which removes your account and the local data stored under it on that device. Deletion is
            permanent and cannot be undone.
          </p>
          <p>
            Some records are kept after deletion where we have a legitimate reason to keep them &mdash;
            including billing and payment-event records, which are retained with your account identifier
            removed. Account deletion also does not remove Hybrid&rsquo;s authorization inside Strava;
            revoke that in your Strava account settings. See the{" "}
            <Link href="/privacy" className="text-[#00e5ff] hover:text-white transition-colors">Privacy Policy</Link>{" "}
            for what deletion does and does not cover.
          </p>
          <p>
            We may suspend or terminate your access, with or without notice, if you breach these Terms,
            if we suspect fraud or abuse, or if we discontinue the Service. Sections that by their nature
            should survive &mdash; including disclaimers, intellectual property, and limitation of liability
            &mdash; survive termination.
          </p>
        </Section>

        <Section title="Disclaimers and limitation of liability">
          <p>
            To the fullest extent permitted by law, the Service is provided
            &ldquo;<strong className="text-white/80">as is</strong>&rdquo; and
            &ldquo;<strong className="text-white/80">as available</strong>,&rdquo; without warranties of
            any kind, express or implied, including merchantability, fitness for a particular purpose, and
            non-infringement. We do not warrant that the Service will meet your goals, improve your
            performance, be accurate, or be uninterrupted.
          </p>
          <p>
            To the fullest extent permitted by law, Hybrid will not be liable for indirect, incidental,
            special, consequential, or punitive damages, or for lost profits, lost data, or personal
            injury arising from your use of the Service. Where liability cannot be excluded, our total
            liability is limited to the greater of the amount you paid us in the twelve months before the
            claim, or fifty US dollars. Some jurisdictions do not allow certain exclusions, so parts of
            this section may not apply to you.
          </p>
          <p>
            You agree to indemnify and hold Hybrid harmless from claims arising out of your misuse of the
            Service or your violation of these Terms or of applicable law.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            We may update these Terms from time to time. When we do, we will revise the &ldquo;Last
            updated&rdquo; date above, and material changes will be communicated through the app or
            website. Continuing to use the Service after an update means you accept the revised Terms.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            Questions about these Terms, an account, or a coaching service? Email{" "}
            <a href={`mailto:${CONTACT}`} className="text-[#00e5ff] hover:text-white transition-colors">{CONTACT}</a>.
          </p>
        </Section>

        <div className="border-t border-white/10 pt-8 mt-12">
          <Link href="/" className="text-[#00e5ff] text-sm font-medium hover:text-white transition-colors">
            ← Back to Hybrid
          </Link>
        </div>
      </div>
    </main>
  );
}
