import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchOutreachSummary, OutreachSummary } from '../api/OutreachAPI';
import { useAuthSession } from '../authSession';
import { BarChart3, Globe, MousePointerClick, TrendingUp } from 'lucide-react';

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export default function OutreachPage() {
  const navigate = useNavigate();
  const { isAuthenticated, sessionReady } = useAuthSession();
  const [data, setData] = useState<OutreachSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionReady) {
      return;
    }

    if (!isAuthenticated) {
      navigate('/login', { replace: true, state: { returnTo: '/outreach' } });
      return;
    }

    fetchOutreachSummary()
      .then(setData)
      .catch(() => setError('Unable to load outreach analytics right now.'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, navigate, sessionReady]);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-gray-500 dark:text-gray-400">Loading outreach insights...</div>;
  if (error || !data) return (
    <div className="p-4 text-center sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold">Outreach</h1>
      <p className="mt-2 text-gray-500 dark:text-gray-400">{error || 'No outreach data found.'}</p>
    </div>
  );

  const kpis = [
    { icon: BarChart3, label: 'Total Posts', value: String(data.kpis.totalPosts), color: 'bg-orange-50 dark:bg-orange-500/10 text-orange-500' },
    { icon: Globe, label: 'Total Reach', value: data.kpis.totalReach.toLocaleString(), color: 'bg-blue-50 dark:bg-blue-500/10 text-blue-500' },
    { icon: TrendingUp, label: 'Avg Engagement', value: formatPercent(data.kpis.avgEngagementRate), color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' },
    { icon: MousePointerClick, label: 'CTR', value: `${data.kpis.clickThroughRate.toFixed(2)}%`, color: 'bg-purple-50 dark:bg-purple-500/10 text-purple-500' },
  ];

  const maxReach = Math.max(...data.channelBreakdown.map(x => x.reach), 1);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold">Outreach Insights</h1>
      <p className="mt-1 text-gray-500 dark:text-gray-400">Built for social media managers to prioritize what drives engagement and referrals.</p>

      {/* KPIs */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
              <div className="text-xl font-bold">{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Channel + Top Content */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-bold">Channel Comparison</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Platform</th><th>Posts</th><th>Reach</th><th>CTR</th></tr></thead>
              <tbody>
                {data.channelBreakdown.map(ch => {
                  const ctr = ch.impressions === 0 ? 0 : (ch.clickThroughs / ch.impressions) * 100;
                  return (
                    <tr key={ch.platform}>
                      <td className="font-medium">{ch.platform}</td>
                      <td>{ch.postCount}</td>
                      <td>{ch.reach.toLocaleString()}</td>
                      <td>{ctr.toFixed(2)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold">Top Content</h2>
          <div className="mt-4 space-y-3">
            {data.topContent.map(post => (
              <div key={post.postId} className="rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3">
                <div className="text-sm">
                  <span className="font-semibold text-gray-900 dark:text-white">{post.platform}</span>
                  <span className="text-gray-400 dark:text-gray-500"> — </span>
                  <span className="text-gray-600 dark:text-gray-400">{post.postType} ({post.contentTopic})</span>
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Reach: {post.reach.toLocaleString()} | Engagement: {formatPercent(post.engagementRate)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations + Reach Chart */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-bold">Recommended Next Moves</h2>
          <ul className="mt-4 space-y-2">
            {data.recommendations.map(item => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold">Reach by Channel</h2>
          <div className="mt-4 space-y-3">
            {data.channelBreakdown.map(ch => (
              <div key={`${ch.platform}-bar`} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300">{ch.platform}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.max((ch.reach / maxReach) * 100, 4)}%` }} />
                </div>
                <span className="w-16 shrink-0 text-right text-sm text-gray-500 dark:text-gray-400">{ch.reach.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Snapshot + Guidance */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-bold">Latest Published Impact Snapshot</h2>
          {data.latestPublishedSnapshot ? (
            <div className="mt-3">
              <p className="font-semibold text-gray-900 dark:text-white">{data.latestPublishedSnapshot.headline}</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{data.latestPublishedSnapshot.summaryText || 'No summary text available yet.'}</p>
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">Published on {data.latestPublishedSnapshot.snapshotDate}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No published snapshot available yet.</p>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-bold">Refresh Guidance</h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            This dashboard combines live API metrics with lightweight visual placeholders. As your strategy matures,
            swap the placeholder bars with a chart library and track trends week-over-week.
          </p>
        </div>
      </div>
    </div>
  );
}
