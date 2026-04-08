import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthService } from '../api/AuthService';

type HeaderProps = {
  isAuthenticated: boolean;
};

function Header({ isAuthenticated }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await AuthService.logout();
    setMenuOpen(false);
    navigate('/');
  };

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
            <Link to="/impact">Impact</Link>
            <Link to="/cases">Case Management</Link>
            <Link to="/donors">Donors</Link>
            <Link to="/outreach">Outreach</Link>
          </div>

          {/* RIGHT — Desktop action buttons */}
          <div className="nav-actions">
            <Link to="/donate">
              <button className="btn-donate">Donate</button>
            </Link>

            {!isAuthenticated && (
              <>
                <Link to="/login">
                  <button className="btn-light">Sign in</button>
                </Link>

                <Link to="/register">
                  <button className="btn-dark">Register</button>
                </Link>
              </>
            )}

            {isAuthenticated && (
              <button className="btn-light" onClick={handleLogout}>
                Logout
              </button>
            )}
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
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <Link to="/" onClick={() => setMenuOpen(false)}>
          Home
        </Link>
        <Link to="/impact" onClick={() => setMenuOpen(false)}>
          Impact
        </Link>
        <Link to="/cases" onClick={() => setMenuOpen(false)}>
          Case Management
        </Link>
        <Link to="/donors" onClick={() => setMenuOpen(false)}>
          Donors
        </Link>
        <Link to="/outreach" onClick={() => setMenuOpen(false)}>
          Outreach
        </Link>

        <hr className="mobile-menu-divider" />

        <div className="mobile-menu-actions">
          <Link to="/donate" onClick={() => setMenuOpen(false)}>
            <button className="btn-donate">Donate</button>
          </Link>

          {!isAuthenticated && (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)}>
                <button className="btn-light">Sign in</button>
              </Link>

              <Link to="/register" onClick={() => setMenuOpen(false)}>
                <button className="btn-dark">Register</button>
              </Link>
            </>
          )}

          {isAuthenticated && (
            <button className="btn-light" onClick={handleLogout}>
              Logout
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export default Header;
