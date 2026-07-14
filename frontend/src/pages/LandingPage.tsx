import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const CATEGORIES = [
  "💪 Heavy Lifting", "📚 Tutoring", "🧹 Cleaning", "🚗 Need a Ride", "💻 Computer Help",
  "📦 Delivery", "🐾 Pet Care", "🎨 Painting", "🌿 Gardening", "🛠️ Repairs",
];

const STEPS = [
  { n: "01", t: "Post what you need", d: "Describe the task, set a budget, drop a pin on the map. Takes two minutes." },
  { n: "02", t: "Pick the best bid", d: "Helpers nearby send offers. Compare ratings and prices, then choose." },
  { n: "03", t: "Pay only when it's done", d: "Money sits safely in escrow and releases to your helper once you confirm." },
];

const FEATURES = [
  { t: "Escrow-backed payments", d: "Funds are held securely and only released when the job is confirmed done.", span: "sm:col-span-2" },
  { t: "Live task map", d: "See work happening around you, sorted by distance.", span: "" },
  { t: "Two-way ratings", d: "Reputation you can trust — posters and helpers both get rated.", span: "" },
  { t: "Dispute resolution", d: "Something off? Open a dispute and our team steps in.", span: "sm:col-span-2" },
];

const FAQS = [
  { q: "How much does it cost to join?", a: "Nothing. Creating an account is free for both task posters and helpers — you only move money when you hire or get hired." },
  { q: "How do payments stay safe?", a: "When you accept a bid, the amount is held in escrow. It's only released to the helper once you confirm the work is done — or automatically after a few days if you go quiet." },
  { q: "What if something goes wrong?", a: "Either side can open a dispute, which freezes the task. Our team reviews it and decides whether to release the payment or refund it." },
  { q: "Who can be a helper?", a: "Anyone. Sign up as a helper, browse open tasks near you, place a bid, and get paid straight to your in-app wallet." },
];

export function LandingPage() {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-paper text-ink dark:bg-[#0B0B0B] dark:text-[#EDEBE4] overflow-x-hidden">
      <Nav />
      <Hero />
      <Marquee />
      <HowItWorks />
      <Features />
      <Stats />
      <Faq />
      <Contact />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 grid grid-cols-2 sm:grid-cols-3 items-center px-5 sm:px-8 py-4 backdrop-blur bg-paper/70 dark:bg-[#0B0B0B]/70 border-b border-ink/10 dark:border-white/10">
      <div className="hidden sm:block eyebrow">Community task marketplace</div>
      <Link to="/" className="justify-self-start sm:justify-self-center flex items-center gap-2 font-display font-bold text-lg">
        <span className="text-2xl">🤝</span> LendAHand
      </Link>
      <div className="justify-self-end flex items-center gap-2 sm:gap-3">
        <Link to="/login" className="text-sm font-semibold hover:underline underline-offset-4">Log in</Link>
        <Link to="/register" className="btn-primary !px-4 !py-2 text-sm">Get Started</Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative px-5 sm:px-8 pt-16 sm:pt-24 pb-16 max-w-6xl mx-auto">
      <p className="eyebrow animate-fade-up">★ Trusted by neighbours across Pakistan</p>
      <h1 className="mt-5 font-display font-bold leading-[0.92] tracking-tightest text-[clamp(2.75rem,11vw,8.5rem)] animate-fade-up">
        Get help.
        <br />
        <span className="inline-flex items-center gap-3 sm:gap-6">
          Give
          <span className="inline-block bg-ink text-paper dark:bg-white dark:text-ink px-3 sm:px-6 rotate-[-2deg]">help</span>.
        </span>
      </h1>
      <div className="mt-8 flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-10 animate-fade-up">
        <p className="max-w-md text-lg text-muted">
          Post a task, get bids from helpers nearby, and pay securely through escrow. From heavy lifting to
          tutoring — the whole neighbourhood, one tap away.
        </p>
        <div className="flex gap-3 shrink-0">
          <Link to="/register" className="btn-primary">Post a Task →</Link>
          <Link to="/register" className="btn-secondary">Earn as a Helper</Link>
        </div>
      </div>
    </section>
  );
}

function Marquee() {
  const row = [...CATEGORIES, ...CATEGORIES];
  return (
    <div className="border-y border-ink/12 dark:border-white/12 py-4 marquee-mask">
      <div className="flex w-max gap-4 animate-marquee">
        {row.map((c, i) => (
          <span key={i} className="text-sm font-mono uppercase tracking-wide px-4 py-1.5 rounded-full border border-ink/20 dark:border-white/20 whitespace-nowrap">
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <section className="bg-ink text-paper dark:bg-white dark:text-ink px-5 sm:px-8 py-20 sm:py-28">
      <div className="max-w-6xl mx-auto">
        <p className="eyebrow !text-paper/60 dark:!text-ink/50">How it works</p>
        <h2 className="mt-4 font-display font-bold text-[clamp(2rem,6vw,4rem)] leading-tight max-w-2xl">
          Three steps from “I need help” to “done”.
        </h2>
        <div className="mt-14 grid md:grid-cols-3 gap-10 md:gap-6">
          {STEPS.map((s) => (
            <div key={s.n} className="border-t border-paper/25 dark:border-ink/20 pt-5">
              <div className="font-mono text-sm opacity-60">{s.n}</div>
              <h3 className="mt-3 font-display text-2xl font-semibold">{s.t}</h3>
              <p className="mt-2 text-paper/70 dark:text-ink/70 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="px-5 sm:px-8 py-20 sm:py-28 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-display font-bold text-[clamp(2rem,6vw,4rem)] leading-tight max-w-xl">
          Built on trust, by design.
        </h2>
        <p className="text-muted max-w-sm">Everything you need to hire — or get hired — without the awkward “will I actually get paid?” part.</p>
      </div>
      <div className="mt-12 grid sm:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
          <div
            key={f.t}
            className={`${f.span} group rounded-card border border-ink dark:border-white p-6 transition-all duration-200 hover:shadow-hard dark:hover:shadow-none hover:-translate-x-0.5 hover:-translate-y-0.5`}
          >
            <div className="h-8 w-8 rounded-full bg-ink dark:bg-white group-hover:scale-110 transition-transform" />
            <h3 className="mt-5 font-display text-xl font-semibold">{f.t}</h3>
            <p className="mt-2 text-muted leading-relaxed">{f.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { k: "0%", v: "to sign up" },
    { k: "Escrow", v: "on every job" },
    { k: "2-way", v: "ratings" },
    { k: "24/7", v: "task map" },
  ];
  return (
    <section className="border-y border-ink/12 dark:border-white/12">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-ink/12 dark:divide-white/12">
        {stats.map((s) => (
          <div key={s.v} className="p-8 sm:p-10">
            <div className="font-display text-4xl sm:text-5xl font-bold tracking-tightest">{s.k}</div>
            <div className="mt-1 text-sm uppercase tracking-wide text-muted">{s.v}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section className="px-5 sm:px-8 py-20 sm:py-28 max-w-3xl mx-auto">
      <p className="eyebrow">FAQ</p>
      <h2 className="mt-4 font-display font-bold text-[clamp(2rem,6vw,3.5rem)] leading-tight">Good questions.</h2>
      <div className="mt-10 divide-y divide-ink/12 dark:divide-white/12 border-y border-ink/12 dark:border-white/12">
        {FAQS.map((f) => (
          <details key={f.q} className="group py-5">
            <summary className="flex items-center justify-between cursor-pointer list-none font-display text-lg font-semibold">
              {f.q}
              <span className="ml-4 shrink-0 text-2xl leading-none transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-muted leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Contact() {
  const [sent, setSent] = useState(false);
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const subject = encodeURIComponent(`LendAHand — message from ${data.get("name")}`);
    const body = encodeURIComponent(`${data.get("message")}\n\nFrom: ${data.get("name")} (${data.get("email")})`);
    window.location.href = `mailto:s.nadishah@gmail.com?subject=${subject}&body=${body}`;
    setSent(true);
  }
  return (
    <section className="bg-ink text-paper dark:bg-white dark:text-ink px-5 sm:px-8 py-20 sm:py-28">
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12">
        <div>
          <p className="eyebrow !text-paper/60 dark:!text-ink/50">Contact us</p>
          <h2 className="mt-4 font-display font-bold text-[clamp(2rem,6vw,3.5rem)] leading-tight">
            Questions? Say hello.
          </h2>
          <p className="mt-4 text-paper/70 dark:text-ink/70 max-w-sm">
            Whether you're stuck, curious, or want to partner with us — drop a line and we'll get back to you.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input name="name" required placeholder="Your name" className="landing-input" />
          <input name="email" type="email" required placeholder="Your email" className="landing-input" />
          <textarea name="message" required rows={4} placeholder="Your message" className="landing-input resize-none" />
          <button type="submit" className="w-full rounded-full py-3 font-semibold bg-paper text-ink dark:bg-ink dark:text-paper hover:opacity-90 transition-opacity">
            {sent ? "Opening your email…" : "Send message"}
          </button>
        </form>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="px-5 sm:px-8 py-12 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="font-display font-bold text-2xl flex items-center gap-2">
          <span className="text-2xl">🤝</span> LendAHand
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
          <FooterLink href="#top">Home</FooterLink>
          <Link to="/login" className="hover:underline underline-offset-4">Log in</Link>
          <Link to="/register" className="hover:underline underline-offset-4">Sign up</Link>
        </div>
      </div>
      <div className="mt-8 pt-6 border-t border-ink/12 dark:border-white/12 text-sm text-muted">
        © {new Date().getFullYear()} LendAHand. Get help. Give help.
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="hover:underline underline-offset-4">
      {children}
    </a>
  );
}
