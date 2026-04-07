import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchOutreachSummary, OutreachSummary } from '../api/OutreachAPI';
import { AuthService } from '../api/AuthService';

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function OutreachPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<OutreachSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!AuthService.isAuthenticated()) {
      navigate('/login', { replace: true, state: { returnTo: '/outreach' } });
      return;
    }

    const loadData = async () => {
      try {
        const summary = await fetchOutreachSummary();
        setData(summary);
      } catch {
        setError('Unable to load outreach analytics right now.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  if (loading) {
    return <section className="simple-page"><h1>Loading outreach insights...</h1></section>;
  }

  if (error || !data) {
    return <section className="simple-page"><h1>Outreach</h1><p>{error || 'No outreach data found.'}</p></section>;
  }

  return (
    <section className="simple-page outreach-page">
      <h1>Outreach Insights</h1>
      <p className="page-subtitle">Built for social media managers to prioritize what drives engagement and referrals.</p>

      <div className="outreach-kpis">
        <div className="outreach-card"><h3>Total Posts</h3><p>{data.kpis.totalPosts}</p></div>
        <div className="outreach-card"><h3>Total Reach</h3><p>{data.kpis.totalReach.toLocaleString()}</p></div>
        <div className="outreach-card"><h3>Avg Engagement</h3><p>{formatPercent(data.kpis.avgEngagementRate)}</p></div>
        <div className="outreach-card"><h3>CTR</h3><p>{data.kpis.clickThroughRate.toFixed(2)}%</p></div>
      </div>

      <div className="outreach-grid">
        <div className="outreach-panel">
          <h2>Channel Comparison</h2>
          <table className="outreach-table">
            <thead>
              <tr>
                <th>Platform</th>
                <th>Posts</th>
                <th>Reach</th>
                <th>CTR</th>
              </tr>
            </thead>
            <tbody>
              {data.channelBreakdown.map((channel) => {
                const ctr = channel.impressions === 0 ? 0 : (channel.clickThroughs / channel.impressions) * 100;
                return (
                  <tr key={channel.platform}>
                    <td>{channel.platform}</td>
                    <td>{channel.postCount}</td>
                    <td>{channel.reach.toLocaleString()}</td>
                    <td>{ctr.toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="outreach-panel">
          <h2>Top Content</h2>
          <ul className="outreach-list">
            {data.topContent.map((post) => (
              <li key={post.postId}>
                <strong>{post.platform}</strong> - {post.postType} ({post.contentTopic})
                <span>Reach: {post.reach.toLocaleString()} | Engagement: {formatPercent(post.engagementRate)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="outreach-grid">
        <div className="outreach-panel">
          <h2>Recommended Next Moves</h2>
          <ul className="outreach-list">
            {data.recommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="outreach-panel">
          <h2>Reach by Channel</h2>
          <div className="outreach-chart">
            {data.channelBreakdown.map((channel) => {
              const maxReach = Math.max(...data.channelBreakdown.map((x) => x.reach), 1);
              const width = Math.max((channel.reach / maxReach) * 100, 6);
              return (
                <div className="outreach-chart-row" key={`${channel.platform}-reach`}>
                  <span>{channel.platform}</span>
                  <div className="outreach-chart-track">
                    <div className="outreach-chart-bar" style={{ width: `${width}%` }}></div>
                  </div>
                  <strong>{channel.reach.toLocaleString()}</strong>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="outreach-grid">
        <div className="outreach-panel">
          <h2>Latest Published Impact Snapshot</h2>
          {data.latestPublishedSnapshot ? (
            <div>
              <p><strong>{data.latestPublishedSnapshot.headline}</strong></p>
              <p>{data.latestPublishedSnapshot.summaryText || 'No summary text available yet.'}</p>
              <p className="muted-small">Published on {data.latestPublishedSnapshot.snapshotDate}</p>
            </div>
          ) : (
            <p>No published snapshot available yet.</p>
          )}
        </div>

        <div className="outreach-panel">
          <h2>Refresh Guidance</h2>
          <p>
            This dashboard combines live API metrics with lightweight visual placeholders. As your strategy matures,
            swap the placeholder bars with a chart library and track trends week-over-week.
          </p>
        </div>
      </div>
    </section>
  );
}

export default OutreachPage;
