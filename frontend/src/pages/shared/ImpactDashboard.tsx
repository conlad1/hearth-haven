import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Home,
  Banknote,
  ArrowRight,
  BookOpen,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';
import { API_BASE_URL as API } from '../../api/core/config';
import { apiFetch } from '../../api/core/http';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  totalMonetary: number;
  activeSafehouses: number;
  totalResidents: number;
  activeResidents: number;
  totalAllocated: number;
  completedReintegrations: number;
  totalCounselingSessions: number;
  yearsOfOperation: number;
  byProgramArea: { area: string; amount: number }[];
}

interface OutcomeStats {
  educationEngagementRate: number;
  healthImprovementRate: number;
  safetyRate: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0 });
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useOnScreen(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// Tracks how far the hero has scrolled out of view (0 = fully visible, 1 = fully gone)
function useHeroFade() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = heroRef.current;
      if (!el) return;
      const h = el.offsetHeight;
      const scrolled = window.scrollY;
      setProgress(Math.min(scrolled / (h * 0.6), 1));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return { heroRef, progress };
}

function AnimatedNumber({
  value,
  duration = 1800,
}: {
  value: number;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const started = useRef(false);
  const { ref, visible } = useOnScreen(0.2);

  useEffect(() => {
    if (!visible || started.current) return;
    started.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * value));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [visible, value, duration]);

  return <span ref={ref}>{display.toLocaleString()}</span>;
}

function FadeIn({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useOnScreen(0.08);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// Slides in from left or right, one-shot on first intersection
function SlideIn({
  children,
  className = '',
  direction = 'left',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  direction?: 'left' | 'right';
  delay?: number;
}) {
  const { ref, visible } = useOnScreen(0.12);
  const offset = direction === 'left' ? '-60px' : '60px';
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : `translateX(${offset})`,
        transition: `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Program area meta ────────────────────────────────────────────────────────

const programMeta: Record<
  string,
  { icon: React.ElementType; description: string }
> = {
  Education: {
    icon: BookOpen,
    description:
      'School enrollment, tutoring, and vocational training that open doors to independence.',
  },
  Wellbeing: {
    icon: Heart,
    description:
      'Counseling, trauma therapy, and mental health support for healing and resilience.',
  },
  Operations: {
    icon: Home,
    description:
      'Safe housing, meals, and daily care that give every girl a stable place to recover.',
  },
  Transport: {
    icon: ArrowRight,
    description: 'Safe transit to schools, clinics, and court appearances.',
  },
  Outreach: {
    icon: Users,
    description: 'Community engagement and family reunification programs.',
  },
  Maintenance: {
    icon: Shield,
    description:
      'Keeping safehouses secure, clean, and dignified for every resident.',
  },
};

// ─── Stat row — alternates big number left/right ──────────────────────────────

function StatRow({
  value,
  color,
  label,
  description,
  flip = false,
  extra,
}: {
  value: number;
  color: string;
  label: React.ReactNode;
  description: string;
  flip?: boolean;
  extra?: React.ReactNode;
}) {
  const numberSide = (
    <SlideIn direction={flip ? 'right' : 'left'} className="flex items-end gap-4 justify-center sm:justify-start">
      <span className={`text-[clamp(5rem,12vw,8rem)] font-black leading-none ${color}`}>
        <AnimatedNumber value={value} />
      </span>
      <span className="mb-2 text-2xl font-bold text-gray-700 dark:text-gray-300 leading-tight">
        {label}
      </span>
    </SlideIn>
  );

  const textSide = (
    <SlideIn direction={flip ? 'left' : 'right'} delay={80} className="flex flex-col gap-4">
      <p className="text-gray-500 dark:text-gray-400 text-base leading-relaxed">
        {description}
      </p>
      {extra}
    </SlideIn>
  );

  return (
    <section className="bg-white dark:bg-gray-900 py-24 px-6">
      <div className="mx-auto max-w-5xl grid grid-cols-1 gap-10 sm:grid-cols-2 items-center">
        {flip ? (
          <>
            {textSide}
            {numberSide}
          </>
        ) : (
          <>
            {numberSide}
            {textSide}
          </>
        )}
      </div>
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ImpactDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [outcomeStats, setOutcomeStats] = useState<OutcomeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { heroRef, progress } = useHeroFade();

  useEffect(() => {
    Promise.all([
      apiFetch(`${API}/Impact/Stats`).then((r) => {
        if (!r.ok) throw new Error('Failed to load stats');
        return r.json() as Promise<Stats>;
      }),
      apiFetch(`${API}/Impact/OutcomeStats`).then((r) => {
        if (!r.ok) throw new Error('Failed to load outcome stats');
        return r.json() as Promise<OutcomeStats>;
      }),
    ])
      .then(([s, o]) => {
        setStats(s);
        setOutcomeStats(o);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  if (error)
    return (
      <p className="py-24 text-center text-red-500">
        Could not load impact data.
      </p>
    );
  if (!stats || !outcomeStats) return null;

  const totalArea = stats.byProgramArea.reduce((s, a) => s + a.amount, 0) || 1;

  return (
    <div className="overflow-x-hidden">
      {/* ── STICKY HERO — fades out as you scroll ── */}
      <div className="sticky top-0 z-0" ref={heroRef}>
        <section className="relative flex h-screen flex-col items-center justify-center overflow-hidden bg-gray-950 px-6 text-center">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 70% 50% at 50% 60%, rgba(249,115,22,0.18) 0%, transparent 70%)',
            }}
          />
          {/* Hero text fades + lifts as scroll progresses */}
          <div
            className="relative z-10 max-w-2xl"
            style={{
              opacity: 1 - progress,
              transform: `translateY(${-progress * 40}px)`,
              transition: 'none',
            }}
          >
            <p className="mb-4 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-orange-400">
              <img src="/hearth-dark.png" alt="" className="h-7 w-auto" />
              The Hearth Project · Impact Report
            </p>
            <h1 className="text-5xl font-black leading-tight text-white sm:text-6xl lg:text-7xl">
              Where Does Your
              <br />
              <span className="text-orange-500">Money Go?</span>
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-lg text-gray-400">
              Every dollar donated to The Hearth Project is tracked, allocated, and
              working — here's the full story of what your generosity makes
              possible.
            </p>
          </div>
          {/* Scroll nudge */}
          <div
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
            style={{ opacity: (1 - progress) * 0.4 }}
          >
            <div className="h-8 w-px bg-gray-500" />
            <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" />
          </div>
        </section>
      </div>

      {/* ── SCROLLABLE CONTENT — z-10 slides over hero ── */}
      <div className="relative z-10">

        {/* ── SECTION HEADER ── */}
        <section className="bg-white dark:bg-gray-900 pt-24 pb-0 px-6">
          <FadeIn className="text-center max-w-5xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">
              The Scale of Our Work
            </p>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white sm:text-4xl">
              Real numbers. Real lives.
            </h2>
          </FadeIn>
        </section>

        {/* ── STAT ROWS — alternating sides ── */}
        <StatRow
          value={stats.totalResidents}
          color="text-orange-500"
          label={<>girls<br />supported</>}
          description="We provide a safe reprieve to children who are victims of sexual abuse, trafficking, and neglect — giving them access to proper care, counseling, education, and the resources they need to heal and rebuild their lives."
          flip={false}
        />

        <StatRow
          value={stats.activeSafehouses}
          color="text-blue-500"
          label={<>active<br />safehouses</>}
          description="The Hearth Project operates secure, dignified residential facilities across Malaysia where girls can escape dangerous situations and begin their journey toward stability and independence."
          flip={true}
        />

        <StatRow
          value={stats.yearsOfOperation}
          color="text-emerald-500"
          label={<>years<br />of service</>}
          description="Over a decade of uninterrupted care — building trust with communities, partners, and the girls we serve."
          flip={false}
        />

        <StatRow
          value={stats.completedReintegrations}
          color="text-purple-500"
          label={<>girls found<br />a new home</>}
          description="Successfully reintegrated into loving families, foster care, or independent living — the ultimate measure of our mission."
          flip={true}
        />

        <StatRow
          value={stats.totalCounselingSessions}
          color="text-orange-500"
          label={<>counseling<br />sessions</>}
          description="Every session is a step toward healing. Our social workers are with each girl through every stage of recovery — and none of it is possible without donor support."
          flip={false}
          extra={
            <Link
              to="/donate"
              className="self-start inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors no-underline"
            >
              Support the mission <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />

        {/* ── SECTION 2: WHERE DONATIONS GO ── */}
        <section className="bg-gray-50 dark:bg-gray-950 py-24 px-6">
          <div className="mx-auto max-w-5xl">
            <FadeIn className="mb-16 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">
                Allocation Breakdown
              </p>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white sm:text-4xl">
                Every donation has a purpose.
              </h2>
              <p className="mt-4 text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Funds are allocated across six program areas — each one
                essential to a girl's journey from crisis to recovery.
              </p>
            </FadeIn>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {stats.byProgramArea.map((area, i) => {
                const meta = programMeta[area.area] ?? {
                  icon: Shield,
                  description: 'Supporting every aspect of resident care.',
                };
                const Icon = meta.icon;
                const pct = Math.round((area.amount / totalArea) * 100);
                return (
                  <FadeIn
                    key={area.area}
                    delay={i * 70}
                    className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-500/10">
                        <Icon className="h-5 w-5 text-orange-500" />
                      </div>
                      <span className="text-2xl font-black text-orange-500">
                        {pct}%
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      {area.area}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {meta.description}
                    </p>
                    <div className="mt-4">
                      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-orange-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-right">
                        {fmt(area.amount)} allocated
                      </p>
                    </div>
                  </FadeIn>
                );
              })}
            </div>

            <FadeIn delay={200} className="mt-12 text-center">
              <Link
                to="/donate"
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600 transition-colors no-underline"
              >
                Make a donation <ArrowRight className="h-4 w-4" />
              </Link>
            </FadeIn>
          </div>
        </section>

        {/* ── SECTION 3: PARTNERS / ORGS ── */}
        <section className="bg-white dark:bg-gray-900 py-24 px-6">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <FadeIn>
                <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">
                  Organizations &amp; Partners
                </p>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white sm:text-4xl">
                  Support comes in many forms.
                </h2>
                <p className="mt-4 text-gray-500 dark:text-gray-400 leading-relaxed">
                  The Hearth Project is powered by more than monetary donations.
                  Companies, NGOs, and community organizations can partner with
                  us through volunteer time, in-kind resources, professional
                  skills, or logistical support.
                </p>
                <p className="mt-3 text-gray-500 dark:text-gray-400 leading-relaxed">
                  If your organization wants to make a difference, we'd love to
                  connect and find the best way to work together.
                </p>
                <Link
                  to="/contact"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gray-900 dark:bg-white px-6 py-3 font-semibold text-white dark:text-gray-900 hover:opacity-90 transition-opacity no-underline"
                >
                  Get in touch <ArrowRight className="h-4 w-4" />
                </Link>
              </FadeIn>

              <FadeIn delay={150} className="grid grid-cols-2 gap-4">
                {[
                  {
                    icon: Users,
                    label: 'Volunteer Time',
                    desc: 'Bring your team for hands-on support at our safehouses.',
                  },
                  {
                    icon: BookOpen,
                    label: 'Skills & Expertise',
                    desc: 'Legal, medical, educational, or technical professionals.',
                  },
                  {
                    icon: Banknote,
                    label: 'In-Kind Resources',
                    desc: 'Supplies, equipment, food, or materials for residents.',
                  },
                  {
                    icon: Heart,
                    label: 'Awareness Campaigns',
                    desc: 'Use your platform to amplify our mission and reach.',
                  },
                ].map(({ icon: Icon, label, desc }, i) => (
                  <FadeIn
                    key={label}
                    delay={i * 60}
                    className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-5"
                  >
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-500/10">
                      <Icon className="h-4 w-4 text-orange-500" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      {label}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {desc}
                    </p>
                  </FadeIn>
                ))}
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ── SECTION 4: OUTCOMES ── */}
        <section className="bg-gray-950 py-24 px-6">
          <div className="mx-auto max-w-5xl">
            <FadeIn className="mb-16 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-400 mb-3">
                Why It Works
              </p>
              <h2 className="text-3xl font-black text-white sm:text-4xl">
                The results speak for themselves.
              </h2>
              <p className="mt-4 text-gray-400 max-w-md mx-auto">
                Girls in The Hearth Project's care show measurable improvements across
                every dimension of wellbeing.
              </p>
            </FadeIn>

            <div className="grid gap-6 sm:grid-cols-3">
              {[
                {
                  icon: BookOpen,
                  stat: `${outcomeStats.educationEngagementRate}%`,
                  label: 'Education Engagement',
                  desc: 'of residents maintain active school enrollment or vocational training.',
                },
                {
                  icon: TrendingUp,
                  stat: `${outcomeStats.healthImprovementRate}%`,
                  label: 'Health Improvement',
                  desc: 'of residents show improved physical health scores within 3 months of admission.',
                },
                {
                  icon: Shield,
                  stat: `${outcomeStats.safetyRate}%`,
                  label: 'Safety Record',
                  desc: 'of residents complete their stay without a serious safety incident.',
                },
              ].map(({ icon: Icon, stat, label, desc }, i) => (
                <FadeIn
                  key={label}
                  delay={i * 120}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm text-center hover:bg-white/10 transition-colors"
                >
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/20">
                    <Icon className="h-6 w-6 text-orange-400" />
                  </div>
                  <div className="text-4xl font-black text-orange-400 mb-2">
                    {stat}
                  </div>
                  <h3 className="font-bold text-white mb-2">{label}</h3>
                  <p className="text-sm text-gray-400">{desc}</p>
                </FadeIn>
              ))}
            </div>

            <FadeIn
              delay={300}
              className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
                <p className="text-gray-400 text-sm text-center sm:text-left">
                  Outcome data drawn from monthly health, education, and case
                  records across all active safehouses.
                </p>
                <Link
                  to="/donate"
                  className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors no-underline"
                >
                  Donate now <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── SECTION 5: FINAL CTA ── */}
        <section className="bg-white dark:bg-gray-900 py-24 px-6">
          <div className="mx-auto max-w-2xl text-center">
            <FadeIn>
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-500/10">
                <Heart className="h-8 w-8 text-orange-500" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white sm:text-4xl">
                Be Part of the <span className="text-orange-500">Change</span>
              </h2>
              <p className="mx-auto mt-4 max-w-md text-gray-500 dark:text-gray-400">
                Any amount makes a difference. Your donation goes directly
                toward housing, counseling, and education for girls who need it
                most.
              </p>
              <Link to="/donate" className="btn-primary mt-8 no-underline">
                Donate Now <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                {stats.completedReintegrations} girls have already found a new
                home thanks to donors like you.
              </p>
            </FadeIn>
          </div>
        </section>
      </div>
    </div>
  );
}
