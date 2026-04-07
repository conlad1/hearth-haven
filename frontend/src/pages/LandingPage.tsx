import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

function LandingPage() {
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState("");

  useEffect(() => {
    if (!isSuccessModalOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSuccessModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isSuccessModalOpen]);

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    setIsSubmitting(true);
    setStatusMessage("Sending your message...");

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        setStatusMessage("");
        setSuccessModalMessage(result.message || "Message sent. We will get back to you soon.");
        setIsSuccessModalOpen(true);
        form.reset();
      } else {
        setStatusMessage(result.message || "Something went wrong. Please try again.");
      }
    } catch {
      setStatusMessage("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

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
            <Link className="btn-secondary" to="/#contact">Get Help Now</Link>
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

      {/* CONTACT */}
      <section className="contact-section" id="contact">
        <div className="contact-container">
          <div className="contact-header">
            <div className="contact-icon">✉️</div>
            <h2>Contact Us</h2>
            <p>
              Send us a message and our team will respond as soon as possible.
            </p>
          </div>

          <div className="contact-card">
            <form className="contact-form" onSubmit={handleContactSubmit}>
              <input
                type="hidden"
                name="access_key"
                value="83d97da9-fc41-414d-9528-45394bc1976a"
              />
              <input type="hidden" name="from_name" value="Hearth Haven" />
              <input
                type="hidden"
                name="subject"
                value="New contact form submission from Hearth Haven"
              />
              <input
                type="checkbox"
                name="botcheck"
                className="contact-botcheck"
                tabIndex={-1}
                aria-hidden="true"
              />

              <div className="contact-grid">
                <label className="contact-field">
                  <span>Name</span>
                  <input type="text" name="name" placeholder="Your name" required />
                </label>

                <label className="contact-field">
                  <span>Email</span>
                  <input type="email" name="email" placeholder="you@example.com" required />
                </label>
              </div>

              <label className="contact-field">
                <span>Subject</span>
                <input type="text" name="user_subject" placeholder="How can we help?" required />
              </label>

              <label className="contact-field">
                <span>Message</span>
                <textarea
                  name="message"
                  placeholder="Tell us what you need..."
                  rows={6}
                  required
                />
              </label>

              <p className="contact-status" aria-live="polite">
                {statusMessage}
              </p>

              <button className="contact-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {isSuccessModalOpen && (
        <div
          className="contact-success-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-success-title"
          onClick={() => setIsSuccessModalOpen(false)}
        >
          <div className="contact-success-modal" onClick={(event) => event.stopPropagation()}>
            <div className="contact-success-icon">✓</div>
            <h3 id="contact-success-title">Message Sent</h3>
            <p>{successModalMessage}</p>
            <button className="contact-success-close" onClick={() => setIsSuccessModalOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default LandingPage;
