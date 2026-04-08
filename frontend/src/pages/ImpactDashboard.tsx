import { useEffect, useState } from 'react';
import './ImpactDashboard.css';

import { API_BASE_URL as API } from '../api/config';

interface Stats {
  totalDonations:   number;
  totalMonetary:    number;
  totalDonors:      number;
  activeSafehouses: number;
  totalResidents:   number;
  activeResidents:  number;
  totalAllocated:   number;
  byProgramArea:    { area: string; amount: number }[];
  byDonationType:   { type: string; count: number }[];
}


function fmt(n: number) {
  return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0 });
}

export default function ImpactDashboard() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/Impact/Stats`)
      .then(r => { if (!r.ok) throw new Error('Failed to load'); return r.json(); })
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const maxArea = stats ? Math.max(...stats.byProgramArea.map(a => a.amount), 1) : 1;

  return (
    <div className="impact-page">

      {/* ── HERO ── */}
      <div className="impact-hero">
        <h1>Our Impact</h1>
        <p>See how your generosity is transforming lives — every peso tracked, every child supported.</p>
      </div>

      {loading && <p className="impact-status">Loading…</p>}
      {error   && <p className="impact-status impact-error">Could not load impact data.</p>}

      {stats && (
        <>
          {/* ── STAT CARDS ── */}
          <div className="impact-cards">
            <div className="impact-card impact-card-orange">
              <div className="impact-card-icon">❤️</div>
              <div className="impact-card-value">{stats.totalResidents.toLocaleString()}</div>
              <div className="impact-card-label">Children Supported</div>
            </div>
            <div className="impact-card impact-card-dark">
              <div className="impact-card-icon">🏠</div>
              <div className="impact-card-value">{stats.activeSafehouses}</div>
              <div className="impact-card-label">Active Safehouses</div>
            </div>
            <div className="impact-card impact-card-warm">
              <div className="impact-card-icon">💰</div>
              <div className="impact-card-value">{fmt(stats.totalMonetary)}</div>
              <div className="impact-card-label">Total Donations Received</div>
            </div>
            <div className="impact-card impact-card-muted">
              <div className="impact-card-icon">🤝</div>
              <div className="impact-card-value">{stats.totalDonors.toLocaleString()}</div>
              <div className="impact-card-label">Generous Donors</div>
            </div>
          </div>

          {/* ── TWO-COLUMN SECTION ── */}
          <div className="impact-grid">

            {/* Allocation by Program Area */}
            <div className="impact-section">
              <h2>Resources by Program Area</h2>
              <p className="impact-section-sub">How allocated funds are distributed across programs</p>
              {stats.byProgramArea.length === 0
                ? <p className="impact-empty">No allocations recorded yet.</p>
                : stats.byProgramArea.map(a => (
                    <div key={a.area} className="impact-bar-row">
                      <div className="impact-bar-label">
                        <span>{a.area}</span>
                        <span>{fmt(a.amount)}</span>
                      </div>
                      <div className="impact-bar-track">
                        <div
                          className="impact-bar-fill"
                          style={{ width: `${(a.amount / maxArea) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
              }
            </div>

            {/* Donation type breakdown */}
            <div className="impact-section">
              <h2>Ways People Give</h2>
              <p className="impact-section-sub">Contributions by donation type</p>
              <div className="impact-donut-list">
                {stats.byDonationType.map(d => (
                  <div key={d.type} className="impact-type-row">
                    <span className="impact-type-dot" />
                    <span className="impact-type-name">{d.type}</span>
                    <span className="impact-type-count">{d.count} donation{d.count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>

              <div className="impact-divider" />

              <div className="impact-summary-row">
                <span>Total Allocated to Programs</span>
                <strong>{fmt(stats.totalAllocated)}</strong>
              </div>
              <div className="impact-summary-row">
                <span>Children Currently in Care</span>
                <strong>{stats.activeResidents}</strong>
              </div>
            </div>

          </div>

          {/* ── CTA ── */}
          <div className="impact-cta">
            <h2>Be Part of the Change</h2>
            <p>Every donation directly supports a child in need of safety, care, and a brighter future.</p>
            <a href="/donate" className="impact-cta-btn">Donate Now</a>
          </div>
        </>
      )}
    </div>
  );
}
