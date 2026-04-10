import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Home, BookOpen, Sparkles, ArrowLeft } from 'lucide-react';

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

export default function ThankYouPage() {
  const navigate = useNavigate();

  const impacts = [
    { icon: Home, text: 'Supports safe housing for children in need' },
    { icon: BookOpen, text: 'Provides education and wellbeing resources' },
    { icon: Sparkles, text: 'Helps transform and restore lives' },
  ];

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-24 px-6">
      <div className="w-full max-w-md text-center">
        <FadeIn>
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-500/10">
              <Heart className="h-7 w-7 text-orange-500" />
            </div>

            <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">
              Donation Complete
            </p>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white sm:text-4xl">Thank You!</h1>
            <p className="mx-auto mt-4 max-w-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Your generosity helps provide safety, care, and opportunity to those who need it most.
            </p>

            <FadeIn delay={150}>
              <div className="mt-8 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-5 py-5 text-left">
                <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">
                  Your Impact
                </p>
                <ul className="space-y-3">
                  {impacts.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-500/10">
                        <Icon className="h-4 w-4 text-orange-500" />
                      </div>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>

            <FadeIn delay={300}>
              <div className="mt-8 flex gap-3">
                <button
                  className="flex-1 rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600 transition-colors inline-flex items-center justify-center gap-2 no-underline"
                  onClick={() => navigate('/')}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </button>
                <button className="btn-secondary flex-1" onClick={() => navigate('/donate')}>
                  Donate Again
                </button>
              </div>

              <p className="mt-6 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                The Hearth Project is a registered nonprofit. Your contribution makes a difference.
              </p>
            </FadeIn>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
