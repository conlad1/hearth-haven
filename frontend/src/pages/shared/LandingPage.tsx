import { useTheme } from "../../ThemeContext";
import { Link } from "react-router-dom";
import { Heart, Users, TrendingUp, Shield, Phone, Mail, ArrowRight } from "lucide-react";

function LandingPage() {
  const { theme } = useTheme();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-no-repeat opacity-[0.35]"
          style={{ backgroundImage: `url(${theme === 'dark' ? '/heart-dark.svg' : '/Logo.svg'})`, backgroundSize: '800px', backgroundPosition: 'center center' }}
        />
        <div className="relative mx-auto flex min-h-[720px] max-w-4xl flex-col items-center px-4 pt-10 text-center sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
            Restoring Hope
            <br />
            <span className="text-orange-500">Rebuilding Lives</span>
          </h1>
          <div className="mt-auto pt-8">
            <p className="mx-auto max-w-2xl text-lg text-gray-500 dark:text-gray-400">
              We provide safe refuge, comprehensive care, and pathways to recovery
              for individuals and families in need. Everyone deserves a second chance.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <Link to="/impact" className="btn-primary no-underline">See Our Impact</Link>
              <Link to="/contact" className="btn-secondary no-underline">
                Get Help Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { icon: Heart, title: "Safe Haven", desc: "Providing secure shelter and 24/7 care in comfortable, healing environments.", color: "bg-orange-50 dark:bg-orange-500/10 text-orange-500" },
              { icon: Users, title: "Holistic Care", desc: "Counseling, education support, health services, and life skills training.", color: "bg-blue-50 dark:bg-blue-500/10 text-blue-500" },
              { icon: TrendingUp, title: "Reintegration", desc: "Guided pathways to independent living, employment, and community connection.", color: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500" },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="card text-center">
                <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{title}</h3>
                <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stories */}
      <section className="py-14">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold">Stories of Hope</h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Real impact, real change. Read how your support transforms lives.</p>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="card border-l-4 border-l-orange-500 text-left">
              <p className="text-gray-600 dark:text-gray-400 italic leading-relaxed">
                "After six months in the program, I completed my education and
                learned computer skills. I now work at a local business and am
                saving for my future."
              </p>
              <h4 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">— Resident A.R., Age 19</h4>
              <span className="text-xs text-gray-400 dark:text-gray-500">Successfully reintegrated, December 2025</span>
            </div>

            <div className="card text-left">
              <p className="text-gray-600 dark:text-gray-400 italic leading-relaxed">
                "As a donor, I was skeptical without clear metrics. This
                dashboard showed exactly how funds were used and convinced me to
                increase my support."
              </p>
              <h4 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">— Rachel Kim, Donor</h4>
              <span className="text-xs text-gray-400 dark:text-gray-500">Major donor since 2024</span>
            </div>
          </div>
        </div>
      </section>

      {/* Help Section */}
      <section className="py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 shadow-md sm:p-12">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-500/10">
                <Shield className="h-7 w-7 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold">Need Help? You're Not Alone</h2>
              <p className="mt-2 text-gray-500 dark:text-gray-400">Confidential, safe, and judgment-free support available 24/7</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-6 text-center shadow-sm dark:border-orange-500/20 dark:from-orange-500/10 dark:to-gray-900">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/80 shadow-sm dark:bg-gray-900/80">
                  <Phone className="h-6 w-6 text-orange-500" />
                </div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">Emergency (General)</h3>
                <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">
                  USA: <a href="tel:911" className="font-medium text-orange-500 hover:text-orange-600">911</a>
                </p>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  Malaysia: <a href="tel:999" className="font-medium text-orange-500 hover:text-orange-600">999</a>
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-6 text-center shadow-sm dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/80 shadow-sm dark:bg-gray-900/80">
                  <Phone className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">Support (Sexual Assault / Abuse)</h3>
                <p className="mt-4 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  USA (RAINN National Sexual Assault Hotline):{' '}
                  <a href="tel:18006564673" className="font-medium text-orange-500 hover:text-orange-600">1-800-656-4673</a>
                </p>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  Malaysia (Talian Kasih): <a href="tel:15999" className="font-medium text-orange-500 hover:text-orange-600">15999</a>
                </p>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
              All communications are confidential and protected. Your safety is our priority.
            </p>
            <div className="mt-6 text-center">
            <Link to="/resources" className="btn-primary no-underline">
              View All Resources
            </Link>
</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="rounded-2xl border border-orange-200 dark:border-orange-500/20 bg-orange-50/50 dark:bg-orange-500/5 px-6 py-14 text-center shadow-sm">
            <Heart className="mx-auto mb-4 h-10 w-10 text-orange-500" />
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Join Us in <span className="text-orange-500">Making a Difference</span></h2>
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              Every contribution helps us provide safety, education, and hope to
              young survivors. Your support creates lasting change.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link to="/donate" className="btn-primary no-underline">
                Donate Now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/contact" className="btn-secondary no-underline">
                Become a Volunteer
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 shadow-md text-center sm:p-12">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-500/10">
              <Mail className="h-6 w-6 text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold">Get in Touch</h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Have questions or need support? We'd love to hear from you.</p>
            <Link to="/contact" className="btn-primary no-underline mt-6 inline-flex">
              Contact Us <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  
  );
}

export default LandingPage;
