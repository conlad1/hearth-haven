import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../ThemeContext";
import { Link } from "react-router-dom";
import { Heart, Users, TrendingUp, Shield, Phone, Mail, ArrowRight } from "lucide-react";

// ─── Hooks / Animation helpers ───────────────────────────────────────────────

function useOnScreen(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function FadeIn({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useOnScreen(0.08);
  return (
    <div ref={ref} className={className}
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms` }}>
      {children}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

function LandingPage() {
  const { theme } = useTheme();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Soft radial orange glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 45% at 50% 40%, rgba(249,115,22,0.12) 0%, transparent 70%)' }}
        />
        <div className="relative mx-auto flex min-h-[680px] max-w-5xl flex-col items-center justify-center px-6 py-24 text-center">
          <FadeIn delay={0}>
            <img
              src={theme === 'dark' ? '/hearth-dark.png' : '/Logo.png'}
              alt="The Hearth Project"
              className="mx-auto mb-8 h-auto w-40 drop-shadow-lg sm:w-48"
            />
          </FadeIn>
          <FadeIn delay={150}>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white sm:text-4xl lg:text-5xl">
              Restoring Hope
              <br />
              <span className="text-orange-500">Rebuilding Lives</span>
            </h1>
          </FadeIn>
          <FadeIn delay={300}>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-500 dark:text-gray-400">
              We provide safe refuge, comprehensive care, and pathways to recovery
              for individuals and families in need. Everyone deserves a second chance.
            </p>
          </FadeIn>
          <FadeIn delay={450}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/impact"
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white no-underline transition-colors hover:bg-orange-600"
              >
                See Our Impact <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 font-semibold text-gray-900 no-underline transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
              >
                Get Help Now
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <FadeIn className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">What We Do</p>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white sm:text-4xl">Comprehensive Support</h2>
          </FadeIn>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { icon: Heart, title: "Safe Haven", desc: "Providing secure shelter and 24/7 care in comfortable, healing environments." },
              { icon: Users, title: "Holistic Care", desc: "Counseling, education support, health services, and life skills training." },
              { icon: TrendingUp, title: "Reintegration", desc: "Guided pathways to independent living, employment, and community connection." },
            ].map(({ icon: Icon, title, desc }, i) => (
              <FadeIn key={title} delay={i * 120}>
                <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center hover:shadow-lg transition-shadow">
                  <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-500/10">
                    <Icon className="h-5 w-5 text-orange-500" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
                  <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">{desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Stories */}
      <section className="bg-gray-950 py-24 px-6">
        <div className="mx-auto max-w-5xl text-center">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">Testimonials</p>
            <h2 className="text-3xl font-black text-white sm:text-4xl">Stories of Hope</h2>
            <p className="mt-3 text-gray-400">Real impact, real change. Read how your support transforms lives.</p>
          </FadeIn>

          <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-2">
            <FadeIn delay={100}>
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-left hover:shadow-lg transition-shadow">
                <p className="text-gray-400 italic leading-relaxed">
                  "After six months in the program, I completed my education and
                  learned computer skills. I now work at a local business and am
                  saving for my future."
                </p>
                <h4 className="mt-5 text-sm font-semibold text-white">— Resident A.R., Age 19</h4>
                <span className="text-xs text-gray-500">Successfully reintegrated, December 2025</span>
              </div>
            </FadeIn>

            <FadeIn delay={220}>
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-left hover:shadow-lg transition-shadow">
                <p className="text-gray-400 italic leading-relaxed">
                  "As a donor, I was skeptical without clear metrics. This
                  dashboard showed exactly how funds were used and convinced me to
                  increase my support."
                </p>
                <h4 className="mt-5 text-sm font-semibold text-white">— Rachel Kim, Donor</h4>
                <span className="text-xs text-gray-500">Major donor since 2024</span>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Help Section */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <FadeIn>
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 sm:p-12">
              <div className="mb-10 text-center">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-500/10">
                  <Shield className="h-5 w-5 text-orange-500" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">Resources</p>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white sm:text-4xl">Need Help? You're Not Alone</h2>
                <p className="mt-3 text-gray-500 dark:text-gray-400">Confidential, safe, and judgment-free support available 24/7</p>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-6 text-center">
                  <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-500/10">
                    <Phone className="h-5 w-5 text-orange-500" />
                  </div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-orange-500">Emergency (General)</h3>
                  <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                    USA: <a href="tel:911" className="font-medium text-orange-500 hover:text-orange-600">911</a>
                  </p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    Malaysia: <a href="tel:999" className="font-medium text-orange-500 hover:text-orange-600">999</a>
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-6 text-center">
                  <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-500/10">
                    <Phone className="h-5 w-5 text-orange-500" />
                  </div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-orange-500">Support (Sexual Assault / Abuse)</h3>
                  <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    USA (RAINN):{' '}
                    <a href="tel:18006564673" className="font-medium text-orange-500 hover:text-orange-600">1-800-656-4673</a>
                  </p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    Malaysia (Talian Kasih): <a href="tel:15999" className="font-medium text-orange-500 hover:text-orange-600">15999</a>
                  </p>
                </div>
              </div>

              <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
                All communications are confidential and protected. Your safety is our priority.
              </p>
              <div className="mt-6 text-center">
                <Link
                  to="/resources"
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white no-underline transition-colors hover:bg-orange-600"
                >
                  View All Resources <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <FadeIn>
            <div className="rounded-2xl border border-orange-200 dark:border-orange-500/20 bg-orange-50/50 dark:bg-orange-500/5 px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-500/20">
                <Heart className="h-5 w-5 text-orange-500" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white sm:text-4xl">
                Join Us in <span className="text-orange-500">Making a Difference</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-gray-500 dark:text-gray-400">
                Every contribution helps us provide safety, education, and hope to
                young survivors. Your support creates lasting change.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  to="/donate"
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white no-underline transition-colors hover:bg-orange-600"
                >
                  Donate Now <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 font-semibold text-gray-900 no-underline transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
                >
                  Become a Volunteer
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <FadeIn>
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center sm:p-12 hover:shadow-lg transition-shadow">
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-500/10">
                <Mail className="h-5 w-5 text-orange-500" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">Contact</p>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white sm:text-4xl">Get in Touch</h2>
              <p className="mx-auto mt-3 max-w-md text-gray-500 dark:text-gray-400">Have questions or need support? We'd love to hear from you.</p>
              <div className="mt-8">
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white no-underline transition-colors hover:bg-orange-600"
                >
                  Contact Us <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  
  );
}

export default LandingPage;
