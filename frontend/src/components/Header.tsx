import { useState } from 'react';
import { Link } from 'react-router-dom';

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          {/* LEFT — Logo */}
          <Link className="nav-logo" to="/">
            <img src="/Logo.svg" alt="Hearth Haven logo" />
            <span>Hearth Haven</span>
          </Link>

          {/* CENTER — Desktop links */}
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/analytics">Analytics</Link>
            <Link to="/cases">Case Management</Link>
            <Link to="/donors">Donors</Link>
            <Link to="/safehouses">Safehouses</Link>
            <Link to="/#contact">Contact</Link>
          </div>

          {/* RIGHT — Desktop action buttons */}
          <div className="nav-actions">
            <Link to="/donate">
              <button className="btn-donate">Donate</button>
            </Link>

            <Link to="/login">
              <button className="btn-light">Sign in</button>
            </Link>

            <Link to="/register">
              <button className="btn-dark">Register</button>
            </Link>
          </div>

          {/* HAMBURGER — mobile only */}
          <button
            className="hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      {/* MOBILE MENU */}
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
        <Link to="/analytics" onClick={() => setMenuOpen(false)}>Analytics</Link>
        <Link to="/cases" onClick={() => setMenuOpen(false)}>Case Management</Link>
        <Link to="/donors" onClick={() => setMenuOpen(false)}>Donors</Link>
        <Link to="/safehouses" onClick={() => setMenuOpen(false)}>Safehouses</Link>
        <Link to="/#contact" onClick={() => setMenuOpen(false)}>Contact</Link>

        <hr className="mobile-menu-divider" />

        <div className="mobile-menu-actions">
            <Link to="/donate" onClick={() => setMenuOpen(false)}>
              <button className="btn-donate">Donate</button>
            </Link>
          <button className="btn-donate">Donate</button>

          <Link to="/login" onClick={() => setMenuOpen(false)}>
            <button className="btn-light">Sign in</button>
          </Link>

          <Link to="/register" onClick={() => setMenuOpen(false)}>
            <button className="btn-dark">Register</button>
          </Link>
        </div>
      </div>
    </>
  );
}

export default Header;
