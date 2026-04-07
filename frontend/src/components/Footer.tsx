function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* TOP ROW */}
        <div className="footer-top">
          {/* Brand */}
          <div className="footer-brand">
            <div className="footer-logo">
              <img src="/Logo.svg" alt="Hearth Haven logo" />
              <span>Hearth Haven</span>
            </div>
            <p className="footer-tagline">
              Restoring hope and rebuilding lives through safe refuge,
              comprehensive care, and community support.
            </p>
            <p className="footer-crisis">
              24/7 Crisis Line: <a href="tel:1-800-467-3123">1-800-HOPE-123</a>
            </p>
          </div>

          {/* Quick Links */}
          <div className="footer-col">
            <h4>Quick Links</h4>
            <a href="/">Home</a>
            <a href="/outreach">Outreach</a>
            <a href="/cases">Case Management</a>
            <a href="/donors">Donors</a>
            <a href="/donate">Donate</a>
          </div>

          {/* Get Involved */}
          <div className="footer-col">
            <h4>Get Involved</h4>
            <a href="/donate">Donate</a>
            <a href="/register">Create an Account</a>
            <a href="/login">Sign In</a>
            <a href="/outreach">Outreach Insights</a>
          </div>

          {/* Support */}
          <div className="footer-col">
            <h4>Support</h4>
            <a href="/#contact">Contact Us</a>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/teapot">Teapot</a>
          </div>
        </div>

        {/* DIVIDER */}
        <div className="footer-divider" />

        {/* BOTTOM ROW */}
        <div className="footer-bottom">
          <p className="footer-copy">
            © {new Date().getFullYear()} Hearth Haven. All rights reserved.
            Soon to be a registered 501(c)(3) nonprofit organization.
          </p>
          <div className="footer-legal-links">
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/teapot">Teapot</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
