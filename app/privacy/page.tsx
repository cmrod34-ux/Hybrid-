import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Hybrid",
  description: "How Hybrid collects, uses, and protects your data.",
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

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#080a0f] px-6 py-20">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link href="/" className="text-[#00e5ff] text-sm font-medium hover:text-white transition-colors">
          ← Back to Hybrid
        </Link>

        {/* Header */}
        <h1 className="text-4xl sm:text-5xl font-black text-white mt-8 mb-3">Privacy Policy</h1>
        <p className="text-white/35 text-sm mb-12">Last updated: {UPDATED}</p>

        <Section title="Who we are">
          <p>
            Hybrid (&ldquo;Hybrid,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) provides AI-assisted training
            and nutrition guidance for hybrid athletes through our website (hybridfit.org) and our iOS app.
            This policy explains, in plain language, exactly what we collect, where it lives, who else sees
            it, and how to get rid of it.
          </p>
          <p>
            We do <strong className="text-white/80">not</strong> sell your personal information, and we do
            not use it for advertising. There is no analytics SDK, no crash-reporting SDK, and no ad SDK in
            the app. The app does not ask for camera, microphone, location, contacts, or Apple Health access,
            and it does not read Apple Health data.
          </p>
        </Section>

        <Section title="The short version">
          <ul className="list-disc pl-5 space-y-2">
            <li>Your training plan, workout logs, nutrition preferences, and fueling profile are stored <strong className="text-white/80">on your phone</strong>, not on our servers.</li>
            <li>Your <strong className="text-white/80">email and password</strong> live in our authentication provider (Supabase) so you can sign in.</li>
            <li>If you message the <strong className="text-white/80">AI Coach</strong>, your messages and a short summary of your current training context are sent to Anthropic to generate the reply.</li>
            <li>If you buy <strong className="text-white/80">coaching or a custom plan</strong>, the intake form you fill out, the plan your coach writes, and your messages with them are stored on our server so your coach can read them.</li>
            <li>If you connect <strong className="text-white/80">Strava</strong>, we store its access tokens on your device and pull a reduced list of your recent activities.</li>
            <li>You can <strong className="text-white/80">delete your account from inside the app</strong> — Profile → Delete Account. It is not email-only.</li>
          </ul>
        </Section>

        <Section title="What is stored on your device">
          <p>
            Most of what Hybrid knows about you never leaves your phone. The following are written to your
            device&rsquo;s local app storage, keyed to your account, and are <strong className="text-white/80">not synced to our servers</strong>:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-white/80">Your training plan and the inputs behind it</strong> — goal, experience level, race name and date, target time, weekly mileage, squat/deadlift/bench numbers, available equipment, injuries you type in, joint concerns, movements you want to avoid, and your height, weight, age, and sex.</li>
            <li><strong className="text-white/80">Workout logs</strong> — date, session type, miles, notes, RPE, difficulty, how it felt, average heart rate, top weight, a pain flag, completion percentage, and (if connected) the Strava activity ID it came from.</li>
            <li><strong className="text-white/80">Nutrition preferences</strong> — goal, calorie override, weight, height, age, sex, activity level, meals per day, dietary restrictions including any free-text notes you write (allergies, religious requirements, and so on), disliked and liked foods, budget, favorite and never-again meals.</li>
            <li><strong className="text-white/80">Fueling profile</strong> — carb products, pre-run foods you tolerate or avoid, caffeine use, dairy-free flag, sweat level, and a rolling record of your last 30 GI feedback entries.</li>
            <li><strong className="text-white/80">Your first name</strong>, pending plan adjustments, your first-free-plan record, and a per-day count of AI Coach messages.</li>
          </ul>
          <p>
            Separately, your <strong className="text-white/80">Supabase session tokens</strong> and, if you
            connect Strava, your <strong className="text-white/80">Strava access and refresh tokens plus your
            Strava athlete ID and name</strong>, are stored in the iOS Keychain via Expo SecureStore rather
            than in ordinary app storage.
          </p>
          <p>
            Because this data is local, it is only as protected as your phone is, and it is not recoverable
            by us if you lose the device. It also means data can exist on more than one device: signing out
            does not erase what is already stored locally on that phone.
          </p>
        </Section>

        <Section title="What is stored on our servers">
          <p>We use Supabase for authentication and for the small amount of data we do keep server-side.</p>
          <p>
            <strong className="text-white/80">Your account:</strong> your email address and a password
            managed by Supabase&rsquo;s authentication service. Sign-up asks for an email and a password, and asks you
            to confirm that you are at least 13 years old. We record that you confirmed it; we do not ask for or
            store your date of birth. We also store a role flag for coach/admin accounts and a record of whether you have
            used your first free plan.
          </p>
          <p>
            <strong className="text-white/80">Coaching requests</strong> (created only if you purchase
            coaching or a custom plan): your athlete name, the service purchased, its status, and the
            <strong className="text-white/80"> full intake form</strong> — which includes your age, sex,
            height, weight, injuries, joint concerns, lifting numbers, and your free-text answers about what
            hasn&rsquo;t worked, what concerns you, what you enjoy, what you struggle with, and what to
            include or avoid. It also holds the plan your coach writes for you, their summary, your note back
            to them, and how many revisions you have used.
          </p>
          <p>
            <strong className="text-white/80">Coaching messages:</strong> the message bodies you and your
            coach exchange.
          </p>
          <p>
            <strong className="text-white/80">A coach edit trail:</strong> a record of which fields your
            coach changed and when, used for accountability. It is not visible to athletes.
          </p>
          <p>
            <strong className="text-white/80">Billing events:</strong> if and when purchases are turned on,
            we record the event ID and type, an account identifier, the transaction and product IDs, a
            cancellation reason if there is one, status, and processing timestamps. We do not store receipts,
            payment tokens, card numbers, or any other payment details.
          </p>
          <p>
            Access is restricted at the database level: you can only read and write your own rows, coaches
            need an explicitly granted role to see an athlete&rsquo;s request, and the status changes you can
            make yourself are limited to a fixed set.
          </p>
          <p>
            Our website and API are run on third-party cloud hosting. Like most hosting platforms, it keeps
            its own request logs; we do not control what those contain or how long they are kept. In our own
            code, the AI Coach endpoint logs the user ID only for internal developer/admin accounts and logs
            error messages when something fails — it does not log the contents of your conversations.
          </p>
        </Section>

        <Section title="The AI Coach and Anthropic">
          <p>
            When you message the in-app AI Coach, your request goes to our API, which verifies you are signed
            in and then calls Anthropic&rsquo;s Claude API to generate the reply. Anthropic receives:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>The <strong className="text-white/80">last 10 turns</strong> of the conversation, as plain text, each turn truncated to 4,000 characters.</li>
            <li>A short <strong className="text-white/80">athlete context</strong> string, truncated to 2,000 characters, containing: your goal, which week and phase of the plan you are in, your race name and weeks remaining, today&rsquo;s session, up to three upcoming sessions, up to three recent logged sessions (with difficulty, RPE and how they felt), up to two unplanned activities from the last three days, today&rsquo;s calorie and protein estimate, any pending plan adjustments, and <strong className="text-white/80">the injuries or limitations text you typed in, verbatim</strong>.</li>
          </ul>
          <p>
            Anthropic does <strong className="text-white/80">not</strong> receive your email, your name, your
            account ID, your height, weight, age or sex, your dietary restrictions or food dislikes, your GI
            and fueling feedback, or your full workout history.
          </p>
          <p>
            The landing-page demo chat on our website is a separate, unauthenticated feature. It sends only
            what you type in that box — no athlete context — and is rate-limited by IP address.
          </p>
          <p>
            Anthropic processes this data under its own terms and privacy policy. We cannot make promises on
            their behalf about how long they retain it or what they do with it — please read their policies
            directly.
          </p>
        </Section>

        <Section title="Strava">
          <p>
            Connecting Strava is optional. If you connect it, you authorize Hybrid through Strava&rsquo;s own
            login screen, and we request the <strong className="text-white/80">activity:read_all</strong>{" "}
            scope, which covers your activities including those marked private.
          </p>
          <p>
            The resulting access token, refresh token, expiry, and your Strava athlete ID and name are stored
            in your device&rsquo;s Keychain. The token exchange and activity requests are proxied through our
            backend (so that our Strava client secret stays server-side), and the activity data we take is
            reduced to activity ID, name, type, distance, start date, and moving time before it reaches the app.
          </p>
          <p>
            <strong className="text-white/80">Disconnecting or deleting your account removes the tokens from
            your device but does not revoke Hybrid&rsquo;s access at Strava.</strong> To fully revoke it, go
            to your Strava settings and remove Hybrid from your connected apps.
          </p>
        </Section>

        <Section title="Purchases and subscriptions">
          <p>
            <strong className="text-white/80">In-app purchases are not enabled yet.</strong> The purchase
            library is present in the app, but it is not configured with a store key, so no purchase,
            subscription, or entitlement request is made and every account resolves to the free tier.
          </p>
          <p>
            When purchases are turned on, they will run through Apple&rsquo;s App Store and RevenueCat.
            RevenueCat will receive your Hybrid account ID as its user identifier and will handle
            subscription and entitlement status. Apple handles the payment itself; we never see your card or
            payment details. Purchase and cancellation events sent to us will be recorded as the billing
            events described above. We will update this policy when that happens.
          </p>
        </Section>

        <Section title="Website forms">
          <p>
            These are website-only and separate from the app. If you join the waitlist, submit feedback, or
            use the &ldquo;get a plan&rdquo; form, the email address and answers you provide are recorded to a
            Google Sheet and emailed to us via Gmail. Only submit what you are comfortable sending by email.
          </p>
        </Section>

        <Section title="Health &amp; wellness disclaimer">
          <p>
            Hybrid provides general fitness and nutrition information, much of it generated by AI. It is{" "}
            <strong className="text-white/80">not medical advice</strong>, and we are not a healthcare
            provider. Plans, macro estimates, and coach replies are for informational purposes only. Always
            consult a qualified physician or registered dietitian before starting any new training or
            nutrition program, particularly if you have an injury, medical condition, allergy, or eating
            disorder.
          </p>
        </Section>

        <Section title="Deleting your account">
          <p>
            You can delete your account yourself from inside the app:{" "}
            <strong className="text-white/80">Profile → Delete Account</strong>. You do not have to email us.
          </p>
          <p>When you do, all of the following happen:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Your authentication record is deleted — email, password, and account metadata.</li>
            <li>Your coaching requests, intake, coach-written plans, coach messages, and the coach edit trail are deleted along with it.</li>
            <li>The app removes <strong className="text-white/80">that account&rsquo;s</strong> locally stored plan, workout logs, clean days, nutrition preferences, fueling profile, first name, adjustments, counters and first-plan notice from that device, and clears that account&rsquo;s Strava tokens from the device Keychain. If someone else has used the app on the same device, their cached data is deliberately left alone — deleting your account does not wipe theirs.</li>
          </ul>
          <p>
            <strong className="text-white/80">What deletion does not do, honestly stated:</strong>
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-white/80">Billing event records are kept.</strong> We detach your account identifier from them — it is set to null so the rows are no longer linked to you — but the event ID and type, transaction and product IDs, cancellation reason, timestamps, and any error text remain, so that we retain a payment and refund history. This is deliberate.</li>
            <li>It does not revoke Hybrid at Strava. Do that in your Strava settings.</li>
            <li>It only clears the device you ran it on. If you were signed in on another phone, that phone&rsquo;s local data stays until you delete the app there.</li>
            <li>Two small local values are not covered by the per-account cleanup and may remain on the device: a developer preview-tier setting and a &ldquo;notice dismissed&rdquo; flag. Neither contains personal information.</li>
            <li>It does not retroactively delete anything already sent to Anthropic, Strava, Apple, or RevenueCat. We do not call a deletion API on those services; you would need to use their own controls.</li>
          </ul>
        </Section>

        <Section title="Exporting your data">
          <p>
            Profile → Export Device Data produces a JSON file and hands it to the iOS share sheet. Be aware of its
            limits: <strong className="text-white/80">it exports the data stored on that device only</strong>{" "}
            — your plan, workouts, nutrition, fueling, profile, and adjustments — plus your account email and
            the export timestamp. It does <strong className="text-white/80">not</strong> include your Supabase
            or Strava tokens, and it does not include server-side coaching data (requests, intake, coach plans,
            or messages). For a copy of your coaching data, email us at{" "}
            <a href={`mailto:${CONTACT}`} className="text-[#00e5ff] hover:text-white transition-colors">{CONTACT}</a>.
          </p>
        </Section>

        <Section title="Retention">
          <p>
            Device data stays on your phone until you delete it in the app, delete your account, or delete the
            app. We do not have a copy of it.
          </p>
          <p>
            Server data — your account, and any coaching requests, intake, plans, and messages — is kept while
            your account exists and is deleted when you delete your account. Billing event records are kept
            after deletion, with your identifier detached, as described above.
          </p>
          <p>
            Waitlist, feedback, and plan-request submissions from the website are kept in our Google Sheet and
            email inbox until we remove them; email us if you want yours deleted.
          </p>
        </Section>

        <Section title="Security">
          <p>
            Traffic between the app and our API uses HTTPS. Your session tokens and Strava tokens are stored
            in the iOS Keychain. Server-side coaching data is protected by row-level security rules that
            restrict each athlete to their own records and require an explicitly granted coach role for coach
            access.
          </p>
          <p>
            To be straight with you about what we cannot claim: the plan, workout, nutrition, and fueling data
            on your device is written as ordinary app storage and is not separately encrypted by us beyond the
            protection iOS provides. Encryption at rest, password hashing, backups, and log retention at
            Supabase, Anthropic, Strava, Apple, RevenueCat, Google, and our host are managed by those
            providers under their own terms, and we describe them only as they describe themselves. No method
            of transmission or storage is completely secure.
          </p>
        </Section>

        <Section title="Age requirement">
          <p>
            Hybrid is for people <strong className="text-white/80">13 and older</strong>. We do not knowingly
            collect personal information from anyone under 13.
          </p>
          <p>
            Two controls back this up. Creating an account requires you to tick a confirmation that you are at
            least 13 — it is off by default and sign-up will not proceed without it. Separately, when you set up
            training or nutrition guidance the app may ask for your age, because calorie and training
            calculations depend on it; if an age under 13 is entered, the app refuses to generate that guidance
            and explains why, and points you to account deletion.
          </p>
          <p>
            To be transparent about the limits: these are self-declared. We do not ask for a date of birth and
            we do not verify age against any document. If you believe someone under 13 has created an account,
            contact us and we will delete it.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            We may update this policy from time to time — in particular when in-app purchases are enabled, or
            if we begin syncing training data to our servers. When we do, we&rsquo;ll revise the &ldquo;Last
            updated&rdquo; date above, and material changes will be communicated through the app or website.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            Questions about this policy, or requests about your data? Email{" "}
            <a href={`mailto:${CONTACT}`} className="text-[#00e5ff] hover:text-white transition-colors">{CONTACT}</a>.
          </p>
          <p className="text-white/35 text-[13px]">
            Note: this policy was written from a direct review of Hybrid&rsquo;s source code. Review by a
            qualified privacy attorney is a pending pre-launch task and has not yet taken place.
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
