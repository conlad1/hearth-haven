import { Link } from "react-router-dom";

function LandingPage() {
  return (
    <div>
      {/* HERO */}
      <section className="hero-modern">
        <div className="hero-inner">
          <h1>
            Restoring Hope,
            <br />
            <span>Rebuilding Lives</span>
          </h1>

          <p>
            We provide safe refuge, comprehensive care, and pathways to recovery
            for individuals and families in need. Everyone deserves a second
            chance.
          </p>

          <div className="hero-buttons">
            <button className="btn-primary">See Our Impact</button>
            <button className="btn-secondary">Get Help Now</button>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features">
        <div className="features-row">
          <div className="feature-card">
            <div className="icon pink">❤️</div>
            <h3>Safe Haven</h3>
            <p>
              Providing secure shelter and 24/7 care in comfortable, healing
              environments.
            </p>
          </div>

          <div className="feature-card">
            <div className="icon yellow">👥</div>
            <h3>Holistic Care</h3>
            <p>
              Counseling, education support, health services, and life skills
              training.
            </p>
          </div>

          <div className="feature-card">
            <div className="icon purple">📈</div>
            <h3>Reintegration</h3>
            <p>
              Guided pathways to independent living, employment, and community
              connection.
            </p>
          </div>
        </div>
      </section>

      {/* STORIES */}
      <section className="stories">
        <div className="stories-container">
          <h2>Stories of Hope</h2>
          <p className="subtext">
            Real impact, real change. Read how your support transforms lives.
          </p>

          <div className="stories-row">
            <div className="story-card highlight">
              <p>
                "After six months in the program, I completed my education and
                learned computer skills. I now work at a local business and am
                saving for my future."
              </p>
              <h4>— Resident A.R., Age 19</h4>
              <span>Successfully reintegrated, December 2025</span>
            </div>

            <div className="story-card">
              <p>
                "As a donor, I was skeptical without clear metrics. This
                dashboard showed exactly how funds were used and convinced me to
                increase my support."
              </p>
              <h4>— Rachel Kim, Donor</h4>
              <span>Major donor since 2024</span>
            </div>
          </div>
        </div>
      </section>

      {/* HELP SECTION */}
      <section className="help-section">
        <div className="help-box">
          <div className="help-header">
            <div className="shield">🛡️</div>
            <h2>Need Help? You're Not Alone</h2>
            <p>Confidential, safe, and judgment-free support available 24/7</p>
          </div>

          <div className="help-row">
            <div className="help-card pink">
              <h3>24/7 Crisis Hotline</h3>
              {/* ✅ FIXED: was <h1> (giant). Now uses a styled div class */}
              <div className="help-contact-number">1-800-HOPE-123</div>
              <p>Free and confidential. Your call is private.</p>
            </div>

            <div className="help-card yellow">
              <h3>Secure Email</h3>
              {/* ✅ FIXED: was <h1> (giant). Now uses a styled div class */}
              <div className="help-contact-number">help@hearthhaven.org</div>
              <p>Encrypted communication. We respond within 24 hours.</p>
            </div>
          </div>

          <div className="help-footer">
            All communications are confidential and protected. Your safety is
            our priority.
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="cta-section">
        <div className="cta-container">
          <div className="cta-icon">❤️</div>

          <h2>Join Us in Making a Difference</h2>

          <p>
            Every contribution helps us provide safety, education, and hope to
            young survivors. Your support creates lasting change.
          </p>

          <div className="cta-buttons">
            <button className="cta-primary">
              <Link to="/donate" style={{ color: 'inherit', textDecoration: 'none' }}>
                Donate Now →
              </Link>
            </button>

            <button className="cta-secondary">Become a Volunteer</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
