import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Trash2,
  Pencil,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Brain,
  ClipboardList,
} from 'lucide-react';
import { API_BASE_URL as API } from '../../api/core/config';
import { apiFetch } from '../../api/core/http';
import {
  fetchSocialPostPrediction,
  SocialPostPrediction,
} from '../../api/socialsManager/MLSocialAPI';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

function generatePlatformPostId(): string {
  return `pp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function countHashtags(hashtags: string | null | undefined): number {
  if (!hashtags?.trim()) return 0;
  return hashtags.trim().split(/\s+/).filter((t) => t.startsWith('#') && t.length > 1).length;
}

function countMentions(caption: string | null | undefined): number {
  if (!caption) return 0;
  return (caption.match(/@\w+/g) ?? []).length;
}

interface SocialMediaPost {
  postId: number;
  platform: string;
  platformPostId: string;
  postUrl: string | null;
  createdAt: string;
  dayOfWeek: string;
  postHour: number;
  postType: string;
  mediaType: string;
  caption: string | null;
  hashtags: string | null;
  numHashtags: number;
  mentionsCount: number;
  hasCallToAction: boolean;
  callToActionType: string | null;
  contentTopic: string;
  sentimentTone: string;
  captionLength: number;
  featuresResidentStory: boolean;
  campaignName: string | null;
  isBoosted: boolean;
  boostBudgetPhp: number | null;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clickThroughs: number;
  videoViews: number | null;
  engagementRate: number;
  profileVisits: number;
  donationReferrals: number;
  estimatedDonationValuePhp: number;
  followerCountAtPost: number;
  watchTimeSeconds: number | null;
  avgViewDurationSeconds: number | null;
  subscriberCountAtPost: number | null;
  forwards: number | null;
}

interface FilterOptions {
  platforms: string[];
  postTypes: string[];
  mediaTypes: string[];
  contentTopics: string[];
  sentimentTones: string[];
  callToActionTypes: string[];
}

type PostForm = Omit<
  SocialMediaPost,
  'postId' | 'dayOfWeek' | 'postHour' | 'captionLength'
>;

const blankForm = (): PostForm => ({
  platform: '',
  platformPostId: '',
  postUrl: '',
  createdAt: new Date().toISOString().slice(0, 16),
  postType: '',
  mediaType: '',
  caption: '',
  hashtags: '',
  numHashtags: 0,
  mentionsCount: 0,
  hasCallToAction: false,
  callToActionType: '',
  contentTopic: '',
  sentimentTone: '',
  featuresResidentStory: false,
  campaignName: '',
  isBoosted: false,
  boostBudgetPhp: null,
  impressions: 0,
  reach: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  saves: 0,
  clickThroughs: 0,
  videoViews: null,
  engagementRate: 0,
  profileVisits: 0,
  donationReferrals: 0,
  estimatedDonationValuePhp: 0,
  followerCountAtPost: 0,
  watchTimeSeconds: null,
  avgViewDurationSeconds: null,
  subscriberCountAtPost: null,
  forwards: null,
});

export default function SocialMediaPage() {
  const [posts, setPosts] = useState<SocialMediaPost[]>([]);
  const [filterOpts, setFilterOpts] = useState<FilterOptions>({
    platforms: [],
    postTypes: [],
    mediaTypes: [],
    contentTopics: [],
    sentimentTones: [],
    callToActionTypes: [],
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [postTypeFilter, setPostTypeFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SocialMediaPost | null>(null);
  const [form, setForm] = useState<PostForm>(blankForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<
    'view' | 'edit' | 'create' | 'metrics'
  >('create');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [needsMetricsPosts, setNeedsMetricsPosts] = useState<SocialMediaPost[]>(
    []
  );
  const [needsMetricsOpen, setNeedsMetricsOpen] = useState(true);

  // ML scores for the currently-viewed post
  const [postPrediction, setPostPrediction] =
    useState<SocialPostPrediction | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  // Section collapse state
  const [sectionsOpen, setSectionsOpen] = useState({
    details: true,
    content: true,
    boost: true,
    engagement: true,
  });

  function toggleSection(key: keyof typeof sectionsOpen) {
    setSectionsOpen((s) => ({ ...s, [key]: !s[key] }));
  }

  async function loadPosts() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (platformFilter) params.set('platform', platformFilter);
      if (postTypeFilter) params.set('postType', postTypeFilter);

      const res = await apiFetch(`${API}/SocialMediaPost?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setPosts(json.data);
      setTotalCount(json.totalCount);
      setTotalPages(json.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load posts.');
    } finally {
      setLoading(false);
    }
  }

  async function loadNeedsMetrics() {
    try {
      const res = await apiFetch(
        `${API}/SocialMediaPost?page=1&pageSize=200`
      );
      if (!res.ok) return;
      const json = await res.json();
      setNeedsMetricsPosts(
        (json.data as SocialMediaPost[]).filter((p) => p.engagementRate === 0)
      );
    } catch {}
  }

  useEffect(() => {
    apiFetch(`${API}/SocialMediaPost/FilterOptions`)
      .then((r) =>
        r.ok ? r.json() : Promise.reject('Failed to load filter options')
      )
      .then(setFilterOpts)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, platformFilter, postTypeFilter]);
  useEffect(() => {
    loadPosts();
  }, [page, pageSize, debouncedSearch, platformFilter, postTypeFilter]);
  useEffect(() => {
    loadNeedsMetrics();
  }, []);

  // Auto-compute derived counts whenever the source fields change
  useEffect(() => {
    setField('numHashtags', countHashtags(form.hashtags));
  }, [form.hashtags]);
  useEffect(() => {
    setField('mentionsCount', countMentions(form.caption));
  }, [form.caption]);

  function clearFilters() {
    setSearchTerm('');
    setDebouncedSearch('');
    setPlatformFilter('');
    setPostTypeFilter('');
    setPage(1);
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...blankForm(), platformPostId: generatePlatformPostId() });
    setFormError(null);
    setSectionsOpen({
      details: true,
      content: true,
      boost: true,
      engagement: true,
    });
    setModalMode('create');
    setModalOpen(true);
  }

  function openView(p: SocialMediaPost) {
    setEditing(p);
    setPostPrediction(null);
    setPredictionLoading(true);
    fetchSocialPostPrediction(p.postId)
      .then(setPostPrediction)
      .catch(() => {})
      .finally(() => setPredictionLoading(false));
    setForm({
      platform: p.platform,
      platformPostId: p.platformPostId,
      postUrl: p.postUrl ?? '',
      createdAt: p.createdAt ? p.createdAt.slice(0, 16) : '',
      postType: p.postType,
      mediaType: p.mediaType,
      caption: p.caption ?? '',
      hashtags: p.hashtags ?? '',
      numHashtags: p.numHashtags,
      mentionsCount: p.mentionsCount,
      hasCallToAction: p.hasCallToAction,
      callToActionType: p.callToActionType ?? '',
      contentTopic: p.contentTopic,
      sentimentTone: p.sentimentTone,
      featuresResidentStory: p.featuresResidentStory,
      campaignName: p.campaignName ?? '',
      isBoosted: p.isBoosted,
      boostBudgetPhp: p.boostBudgetPhp,
      impressions: p.impressions,
      reach: p.reach,
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
      saves: p.saves,
      clickThroughs: p.clickThroughs,
      videoViews: p.videoViews,
      engagementRate: p.engagementRate,
      profileVisits: p.profileVisits,
      donationReferrals: p.donationReferrals,
      estimatedDonationValuePhp: p.estimatedDonationValuePhp,
      followerCountAtPost: p.followerCountAtPost,
      watchTimeSeconds: p.watchTimeSeconds,
      avgViewDurationSeconds: p.avgViewDurationSeconds,
      subscriberCountAtPost: p.subscriberCountAtPost,
      forwards: p.forwards,
    });
    setFormError(null);
    setSectionsOpen({
      details: true,
      content: true,
      boost: true,
      engagement: true,
    });
    setModalMode('view');
    setModalOpen(true);
  }

  function openMetrics(p: SocialMediaPost) {
    setEditing(p);
    setForm({
      platform: p.platform,
      platformPostId: p.platformPostId,
      postUrl: p.postUrl ?? '',
      createdAt: p.createdAt ? p.createdAt.slice(0, 16) : '',
      postType: p.postType,
      mediaType: p.mediaType,
      caption: p.caption ?? '',
      hashtags: p.hashtags ?? '',
      numHashtags: p.numHashtags,
      mentionsCount: p.mentionsCount,
      hasCallToAction: p.hasCallToAction,
      callToActionType: p.callToActionType ?? '',
      contentTopic: p.contentTopic,
      sentimentTone: p.sentimentTone,
      featuresResidentStory: p.featuresResidentStory,
      campaignName: p.campaignName ?? '',
      isBoosted: p.isBoosted,
      boostBudgetPhp: p.boostBudgetPhp,
      impressions: p.impressions,
      reach: p.reach,
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
      saves: p.saves,
      clickThroughs: p.clickThroughs,
      videoViews: p.videoViews,
      engagementRate: p.engagementRate,
      profileVisits: p.profileVisits,
      donationReferrals: p.donationReferrals,
      estimatedDonationValuePhp: p.estimatedDonationValuePhp,
      followerCountAtPost: p.followerCountAtPost,
      watchTimeSeconds: p.watchTimeSeconds,
      avgViewDurationSeconds: p.avgViewDurationSeconds,
      subscriberCountAtPost: p.subscriberCountAtPost,
      forwards: p.forwards,
    });
    setFormError(null);
    setModalMode('metrics');
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.platform) return setFormError('Platform is required.');
    if (!form.platformPostId.trim())
      return setFormError('Platform Post ID is required.');
    if (!form.postType.trim()) return setFormError('Post Type is required.');
    if (!form.mediaType.trim()) return setFormError('Media Type is required.');
    if (!form.contentTopic.trim())
      return setFormError('Content Topic is required.');
    if (!form.sentimentTone.trim())
      return setFormError('Sentiment Tone is required.');

    setSaving(true);
    setFormError(null);

    const body = {
      ...form,
      postUrl: form.postUrl || null,
      caption: form.caption || null,
      hashtags: form.hashtags || null,
      callToActionType: form.hasCallToAction
        ? form.callToActionType || null
        : null,
      campaignName: form.campaignName || null,
      boostBudgetPhp: form.isBoosted ? form.boostBudgetPhp : null,
      createdAt: new Date(form.createdAt).toISOString(),
    };

    try {
      const url = editing
        ? `${API}/SocialMediaPost/${editing.postId}`
        : `${API}/SocialMediaPost`;
      const method = editing ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return setFormError(await res.text());
      setModalOpen(false);
      loadPosts();
      loadNeedsMetrics();
      // Refresh filter options in case new values were added
      apiFetch(`${API}/SocialMediaPost/FilterOptions`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setFilterOpts(d))
        .catch(() => {});
    } catch {
      setFormError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await apiFetch(`${API}/SocialMediaPost/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        alert(await res.text());
        return;
      }
      setModalOpen(false);
      loadPosts();
    } catch {
      alert('Network error.');
    }
  }

  function setField<K extends keyof PostForm>(key: K, value: PostForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const numField = (
    key: keyof PostForm,
    label: string,
    opts?: { optional?: boolean }
  ) => (
    <div key={key}>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
        {opts?.optional ? '' : ' *'}
      </label>
      <input
        className="input-field"
        type="number"
        value={(form[key] as number | null) ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          setField(
            key,
            (opts?.optional && v === ''
              ? null
              : Number(v)) as PostForm[typeof key]
          );
        }}
      />
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Social Media Posts
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage social media post records and engagement metrics
          </p>
        </div>
        <button className="btn-primary w-full sm:w-auto" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New Post
        </button>
      </div>

      {loading && (
        <p className="py-10 text-center text-sm text-gray-500">Loading...</p>
      )}
      {error && (
        <p className="py-10 text-center text-sm text-red-500">Error: {error}</p>
      )}

      {!loading && !error && (
        <>
          {/* Needs Metrics Banner */}
          {needsMetricsPosts.length > 0 && (
            <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 shadow-md dark:border-orange-500/30 dark:bg-orange-500/5">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3"
                onClick={() => setNeedsMetricsOpen((o) => !o)}
              >
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                    Needs Metrics
                  </span>
                  <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">
                    {needsMetricsPosts.length}
                  </span>
                </div>
                <span className="text-xs text-orange-500">
                  {needsMetricsOpen ? '\u25B2' : '\u25BC'}
                </span>
              </button>
              {needsMetricsOpen && (
                <div className="border-t border-orange-200 dark:border-orange-500/20">
                  <ul className="divide-y divide-orange-100 dark:divide-orange-500/10">
                    {needsMetricsPosts.slice(0, 10).map((p) => (
                      <li
                        key={p.postId}
                        className="flex items-center justify-between gap-3 px-4 py-2.5"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                            {p.platform}
                          </span>
                          <span className="truncate text-sm text-gray-700 dark:text-gray-300">
                            {p.postType}
                            {p.contentTopic ? ` · ${p.contentTopic}` : ''}
                          </span>
                          <span className="hidden text-xs text-gray-400 sm:block">
                            {p.createdAt
                              ? new Date(p.createdAt).toLocaleDateString()
                              : ''}
                          </span>
                        </div>
                        <button
                          className="shrink-0 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-orange-600"
                          onClick={() => openMetrics(p)}
                        >
                          Enter Metrics
                        </button>
                      </li>
                    ))}
                    {needsMetricsPosts.length > 10 && (
                      <li className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                        +{needsMetricsPosts.length - 10} more — scroll the table
                        to find them
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative w-full sm:flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  className="input-field pl-9"
                  type="text"
                  placeholder="Search by platform, type, topic, caption, campaign..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search posts"
                />
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <select
                  className="select-field w-full sm:w-auto"
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  aria-label="Filter by platform"
                >
                  <option value="">All Platforms</option>
                  {filterOpts.platforms.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <select
                  className="select-field w-full sm:w-auto"
                  value={postTypeFilter}
                  onChange={(e) => setPostTypeFilter(e.target.value)}
                  aria-label="Filter by post type"
                >
                  <option value="">All Post Types</option>
                  {filterOpts.postTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <label className="flex w-full items-center gap-2 text-sm text-gray-600 sm:w-auto dark:text-gray-400">
                  Per page:
                  <select
                    className="select-field w-full sm:w-auto"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    aria-label="Posts per page"
                  >
                    {PAGE_SIZE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                {(searchTerm || platformFilter || postTypeFilter) && (
                  <button
                    className="btn-ghost w-full text-orange-600 sm:w-auto"
                    onClick={clearFilters}
                  >
                    <X className="h-4 w-4" /> Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          {posts.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">
              No posts found.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-900">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th>Post Type</th>
                    <th>Content Topic</th>
                    <th>Media Type</th>
                    <th>Caption</th>
                    <th>Impressions</th>
                    <th>Reach</th>
                    <th>Likes</th>
                    <th>Comments</th>
                    <th>Shares</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((p) => (
                    <tr
                      key={p.postId}
                      className="cursor-pointer"
                      onClick={() => openView(p)}
                    >
                      <td>
                        <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                          {p.platform}
                        </span>
                      </td>
                      <td>{p.postType}</td>
                      <td>{p.contentTopic}</td>
                      <td>{p.mediaType}</td>
                      <td className="max-w-[200px] truncate text-xs text-gray-500 dark:text-gray-400">
                        {p.caption || '\u2014'}
                      </td>
                      <td>{p.impressions.toLocaleString()}</td>
                      <td>{p.reach.toLocaleString()}</td>
                      <td>{p.likes.toLocaleString()}</td>
                      <td>{p.comments.toLocaleString()}</td>
                      <td>{p.shares.toLocaleString()}</td>
                      <td
                        onClick={(e) => e.stopPropagation()}
                        className="whitespace-nowrap"
                      >
                        {p.engagementRate === 0 && (
                          <button
                            className="rounded-md bg-orange-500 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-orange-600"
                            onClick={() => openMetrics(p)}
                          >
                            Enter Metrics
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {posts.length > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-md dark:border-gray-700 dark:bg-gray-900">
              <button
                className="btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {page} of {totalPages} ({totalCount} total)
              </span>
              <button
                className="btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Create / View / Edit Modal */}
      {modalOpen &&
        createPortal(
          <>
            <div
              className="modal-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="sm-dialog-title"
              onClick={() => setModalOpen(false)}
            >
              <div
                className="modal-body max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Top bar */}
                <div className="mb-6 flex items-start justify-between border-b border-gray-100 pb-5 dark:border-gray-700">
                  <div className="min-w-0 flex-1">
                    <h2
                      id="sm-dialog-title"
                      className="text-lg font-bold text-gray-900 dark:text-white"
                    >
                      {modalMode === 'create'
                        ? 'New Post'
                        : modalMode === 'metrics'
                          ? 'Enter Metrics'
                          : 'Post'}
                    </h2>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                      {modalMode === 'create'
                        ? 'Fill in the details below'
                        : modalMode === 'metrics'
                          ? 'Enter performance metrics for this post'
                          : modalMode === 'edit'
                            ? 'Editing record'
                            : 'Viewing record'}
                    </p>
                  </div>

                  <div className="ml-4 flex items-center gap-2">
                    {modalMode === 'view' && (
                      <>
                        <button
                          className="btn-icon"
                          onClick={() => setModalMode('edit')}
                          aria-label="Edit record"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="inline-flex items-center justify-center rounded-lg p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 disabled:opacity-50 cursor-pointer"
                          onClick={() => setShowDeleteConfirm(true)}
                          aria-label="Delete record"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    {modalMode === 'edit' && (
                      <>
                        <button
                          className="inline-flex items-center justify-center rounded-lg bg-orange-500 p-2 text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 cursor-pointer"
                          onClick={handleSave}
                          disabled={saving}
                          aria-label={saving ? 'Saving record' : 'Save record'}
                          title="Save"
                        >
                          {saving ? (
                            <span className="text-xs font-medium">
                              Saving...
                            </span>
                          ) : (
                            <Check size={16} />
                          )}
                        </button>
                        <button
                          className="inline-flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-2 text-gray-600 dark:text-gray-400 transition hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 cursor-pointer"
                          onClick={() => {
                            if (editing) {
                              setForm({
                                platform: editing.platform,
                                platformPostId: editing.platformPostId,
                                postUrl: editing.postUrl ?? '',
                                createdAt: editing.createdAt
                                  ? editing.createdAt.slice(0, 16)
                                  : '',
                                postType: editing.postType,
                                mediaType: editing.mediaType,
                                caption: editing.caption ?? '',
                                hashtags: editing.hashtags ?? '',
                                numHashtags: editing.numHashtags,
                                mentionsCount: editing.mentionsCount,
                                hasCallToAction: editing.hasCallToAction,
                                callToActionType:
                                  editing.callToActionType ?? '',
                                contentTopic: editing.contentTopic,
                                sentimentTone: editing.sentimentTone,
                                featuresResidentStory:
                                  editing.featuresResidentStory,
                                campaignName: editing.campaignName ?? '',
                                isBoosted: editing.isBoosted,
                                boostBudgetPhp: editing.boostBudgetPhp,
                                impressions: editing.impressions,
                                reach: editing.reach,
                                likes: editing.likes,
                                comments: editing.comments,
                                shares: editing.shares,
                                saves: editing.saves,
                                clickThroughs: editing.clickThroughs,
                                videoViews: editing.videoViews,
                                engagementRate: editing.engagementRate,
                                profileVisits: editing.profileVisits,
                                donationReferrals: editing.donationReferrals,
                                estimatedDonationValuePhp:
                                  editing.estimatedDonationValuePhp,
                                followerCountAtPost:
                                  editing.followerCountAtPost,
                                watchTimeSeconds: editing.watchTimeSeconds,
                                avgViewDurationSeconds:
                                  editing.avgViewDurationSeconds,
                                subscriberCountAtPost:
                                  editing.subscriberCountAtPost,
                                forwards: editing.forwards,
                              });
                            }
                            setFormError(null);
                            setModalMode('view');
                          }}
                          disabled={saving}
                          aria-label="Cancel editing"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                    {modalMode === 'create' && (
                      <>
                        <button
                          className="inline-flex items-center justify-center rounded-lg bg-orange-500 p-2 text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 cursor-pointer"
                          onClick={handleSave}
                          disabled={saving}
                          aria-label={
                            saving ? 'Creating record' : 'Create record'
                          }
                          title="Create"
                        >
                          {saving ? (
                            <span className="text-xs font-medium">
                              Creating...
                            </span>
                          ) : (
                            <Check size={16} />
                          )}
                        </button>
                        <button
                          className="inline-flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-2 text-gray-600 dark:text-gray-400 transition hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 cursor-pointer"
                          onClick={() => setModalOpen(false)}
                          disabled={saving}
                          aria-label="Cancel creating record"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                    {modalMode === 'metrics' && (
                      <>
                        <button
                          className="inline-flex items-center justify-center rounded-lg bg-orange-500 p-2 text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 cursor-pointer"
                          onClick={handleSave}
                          disabled={saving}
                          aria-label={saving ? 'Saving metrics' : 'Save metrics'}
                          title="Save Metrics"
                        >
                          {saving ? (
                            <span className="text-xs font-medium">
                              Saving...
                            </span>
                          ) : (
                            <Check size={16} />
                          )}
                        </button>
                        <button
                          className="inline-flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-2 text-gray-600 dark:text-gray-400 transition hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 cursor-pointer"
                          onClick={() => setModalOpen(false)}
                          disabled={saving}
                          aria-label="Cancel"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                  </div>

                  {modalMode === 'view' && (
                    <button
                      className="ml-2 inline-flex items-center justify-center rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                      onClick={() => setModalOpen(false)}
                      aria-label="Close dialog"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>

                {/* View mode */}
                {modalMode === 'view' && editing && (
                  <div className="space-y-4">
                    {/* ML Scores */}
                    {(predictionLoading || postPrediction) && (
                      <div className="rounded-xl border border-blue-100 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/5 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Brain className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                            ML Predictions
                          </span>
                          {predictionLoading && (
                            <span className="text-xs text-gray-400">
                              Loading...
                            </span>
                          )}
                        </div>
                        {postPrediction && (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {postPrediction.donationConversion && (
                              <div className="rounded-lg bg-white dark:bg-gray-900 p-3 border border-gray-100 dark:border-gray-700">
                                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                  Donation Conversion
                                </div>
                                <div
                                  className={`text-2xl font-bold mb-1 ${
                                    postPrediction.donationConversion
                                      .conversion_score >= 60
                                      ? 'text-green-600 dark:text-green-400'
                                      : postPrediction.donationConversion
                                            .conversion_score >= 35
                                        ? 'text-yellow-600 dark:text-yellow-400'
                                        : 'text-gray-500 dark:text-gray-400'
                                  }`}
                                >
                                  {
                                    postPrediction.donationConversion
                                      .conversion_score
                                  }
                                  <span className="ml-0.5 text-sm font-normal text-gray-400">
                                    /100
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {
                                    postPrediction.donationConversion
                                      .recommendation
                                  }
                                </div>
                              </div>
                            )}
                            {postPrediction.engagementRate && (
                              <div className="rounded-lg bg-white dark:bg-gray-900 p-3 border border-gray-100 dark:border-gray-700">
                                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                  Predicted Engagement
                                </div>
                                <div
                                  className={`text-2xl font-bold mb-1 ${
                                    postPrediction.engagementRate
                                      .engagement_rate_pct >= 15
                                      ? 'text-green-600 dark:text-green-400'
                                      : postPrediction.engagementRate
                                            .engagement_rate_pct >= 7
                                        ? 'text-yellow-600 dark:text-yellow-400'
                                        : 'text-gray-500 dark:text-gray-400'
                                  }`}
                                >
                                  {postPrediction.engagementRate.engagement_rate_pct.toFixed(
                                    1
                                  )}
                                  <span className="ml-0.5 text-sm font-normal text-gray-400">
                                    %
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {postPrediction.engagementRate.recommendation}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <h3 className="mt-4 mb-2 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Post Details
                    </h3>
                    <div className="grid grid-cols-1 gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-2 dark:bg-white/5">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Platform
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.platform || '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Platform Post ID
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.platformPostId || '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Post URL
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.postUrl ?? '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Created At
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.createdAt || '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Day of Week
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.dayOfWeek || '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Post Hour
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.postHour ?? '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Post Type
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.postType || '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Media Type
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.mediaType || '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Content Topic
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.contentTopic || '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Sentiment Tone
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.sentimentTone || '\u2014'}
                        </span>
                      </div>
                    </div>

                    <h3 className="mt-4 mb-2 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Content
                    </h3>
                    <div className="grid grid-cols-1 gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-2 dark:bg-white/5">
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Caption
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.caption ?? '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Hashtags
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.hashtags ?? '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Num Hashtags
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.numHashtags ?? '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Mentions Count
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.mentionsCount ?? '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Caption Length
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.captionLength ?? '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Has Call To Action
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.hasCallToAction ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Call To Action Type
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.callToActionType ?? '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Features Resident Story
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.featuresResidentStory ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Campaign Name
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.campaignName ?? '\u2014'}
                        </span>
                      </div>
                    </div>

                    <h3 className="mt-4 mb-2 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Boost
                    </h3>
                    <div className="grid grid-cols-1 gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-2 dark:bg-white/5">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Is Boosted
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.isBoosted ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Boost Budget (PHP)
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.boostBudgetPhp ?? '\u2014'}
                        </span>
                      </div>
                    </div>

                    <h3 className="mt-4 mb-2 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Engagement Metrics
                    </h3>
                    <div className="grid grid-cols-1 gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-2 dark:bg-white/5">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Impressions
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.impressions ?? '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Reach
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.reach ?? '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Likes
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.likes ?? '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Comments
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.comments ?? '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Shares
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.shares ?? '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Saves
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.saves ?? '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Click Throughs
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.clickThroughs ?? '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Video Views
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.videoViews ?? '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Engagement Rate (%)
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.engagementRate ?? '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Profile Visits
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.profileVisits ?? '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Donation Referrals
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.donationReferrals ?? '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Est. Donation Value (PHP)
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.estimatedDonationValuePhp ?? '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Follower Count At Post
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.followerCountAtPost ?? '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Watch Time (sec)
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.watchTimeSeconds ?? '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Avg View Duration (sec)
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.avgViewDurationSeconds ?? '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Subscriber Count
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.subscriberCountAtPost ?? '\u2014'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Forwards
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {editing.forwards ?? '\u2014'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit / Create mode */}
                {(modalMode === 'edit' || modalMode === 'create') && (
                  <>
                    {/* ── Post Details ── */}
                    <button
                      type="button"
                      className="mt-2 flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      onClick={() => toggleSection('details')}
                    >
                      Post Details
                      <span className="text-xs">
                        {sectionsOpen.details ? '\u25B2' : '\u25BC'}
                      </span>
                    </button>
                    {sectionsOpen.details && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 px-1 pt-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Platform *
                          </label>
                          <select
                            className="select-field"
                            value={form.platform}
                            onChange={(e) =>
                              setField('platform', e.target.value)
                            }
                          >
                            <option value="">-- Select platform --</option>
                            {filterOpts.platforms.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>
                        {modalMode !== 'create' && (
                        <div>
                          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Platform Post ID *
                          </label>
                          <input
                            className="input-field"
                            value={form.platformPostId}
                            onChange={(e) =>
                              setField('platformPostId', e.target.value)
                            }
                          />
                        </div>
                        )}
                        <div>
                          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Post URL
                          </label>
                          <input
                            className="input-field"
                            value={form.postUrl ?? ''}
                            onChange={(e) =>
                              setField('postUrl', e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Created At *
                          </label>
                          <input
                            className="input-field"
                            type="datetime-local"
                            value={form.createdAt}
                            onChange={(e) =>
                              setField('createdAt', e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Post Type *
                          </label>
                          <select
                            className="select-field"
                            value={form.postType}
                            onChange={(e) =>
                              setField('postType', e.target.value)
                            }
                          >
                            <option value="">-- Select post type --</option>
                            {filterOpts.postTypes.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Media Type *
                          </label>
                          <select
                            className="select-field"
                            value={form.mediaType}
                            onChange={(e) =>
                              setField('mediaType', e.target.value)
                            }
                          >
                            <option value="">-- Select media type --</option>
                            {filterOpts.mediaTypes.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Content Topic *
                          </label>
                          <select
                            className="select-field"
                            value={form.contentTopic}
                            onChange={(e) =>
                              setField('contentTopic', e.target.value)
                            }
                          >
                            <option value="">-- Select content topic --</option>
                            {filterOpts.contentTopics.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Sentiment Tone *
                          </label>
                          <select
                            className="select-field"
                            value={form.sentimentTone}
                            onChange={(e) =>
                              setField('sentimentTone', e.target.value)
                            }
                          >
                            <option value="">
                              -- Select sentiment tone --
                            </option>
                            {filterOpts.sentimentTones.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* ── Content ── */}
                    <button
                      type="button"
                      className="mt-2 flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      onClick={() => toggleSection('content')}
                    >
                      Content
                      <span className="text-xs">
                        {sectionsOpen.content ? '\u25B2' : '\u25BC'}
                      </span>
                    </button>
                    {sectionsOpen.content && (
                      <div className="space-y-3 px-1 pt-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Caption
                          </label>
                          <textarea
                            className="input-field resize-y"
                            rows={3}
                            value={form.caption ?? ''}
                            onChange={(e) =>
                              setField('caption', e.target.value)
                            }
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Hashtags
                            </label>
                            <input
                              className="input-field"
                              value={form.hashtags ?? ''}
                              onChange={(e) =>
                                setField('hashtags', e.target.value)
                              }
                              placeholder="#hearth #haven"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Campaign Name
                            </label>
                            <input
                              className="input-field"
                              value={form.campaignName ?? ''}
                              onChange={(e) =>
                                setField('campaignName', e.target.value)
                              }
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-6">
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                            <input
                              type="checkbox"
                              checked={form.hasCallToAction}
                              onChange={(e) =>
                                setField('hasCallToAction', e.target.checked)
                              }
                            />
                            Has Call To Action
                          </label>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                            <input
                              type="checkbox"
                              checked={form.featuresResidentStory}
                              onChange={(e) =>
                                setField(
                                  'featuresResidentStory',
                                  e.target.checked
                                )
                              }
                            />
                            Features Resident Story
                          </label>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                            <input
                              type="checkbox"
                              checked={form.isBoosted}
                              onChange={(e) =>
                                setField('isBoosted', e.target.checked)
                              }
                            />
                            Boosted Post
                          </label>
                        </div>
                        {form.hasCallToAction && (
                          <div>
                            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Call To Action Type
                            </label>
                            <select
                              className="select-field"
                              value={form.callToActionType ?? ''}
                              onChange={(e) =>
                                setField('callToActionType', e.target.value)
                              }
                            >
                              <option value="">-- Select CTA type --</option>
                              {filterOpts.callToActionTypes.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        {form.isBoosted && (
                          <div className="max-w-xs">
                            {numField('boostBudgetPhp', 'Boost Budget (PHP)', {
                              optional: true,
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Engagement Metrics (edit only — use Enter Metrics after posting) ── */}
                    {modalMode !== 'create' && (
                    <button
                      type="button"
                      className="mt-2 flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      onClick={() => toggleSection('engagement')}
                    >
                      Engagement Metrics
                      <span className="text-xs">
                        {sectionsOpen.engagement ? '\u25B2' : '\u25BC'}
                      </span>
                    </button>
                    )}
                    {modalMode !== 'create' && sectionsOpen.engagement && (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 px-1 pt-2">
                        {numField('impressions', 'Impressions')}
                        {numField('reach', 'Reach')}
                        {numField('likes', 'Likes')}
                        {numField('comments', 'Comments')}
                        {numField('shares', 'Shares')}
                        {numField('saves', 'Saves')}
                        {numField('clickThroughs', 'Click Throughs')}
                        {numField('videoViews', 'Video Views', {
                          optional: true,
                        })}
                        {numField('engagementRate', 'Engagement Rate (%)')}
                        {numField('profileVisits', 'Profile Visits')}
                        {numField('donationReferrals', 'Donation Referrals')}
                        {numField(
                          'estimatedDonationValuePhp',
                          'Est. Donation Value (PHP)'
                        )}
                        {numField(
                          'followerCountAtPost',
                          'Follower Count At Post'
                        )}
                        {numField('watchTimeSeconds', 'Watch Time (sec)', {
                          optional: true,
                        })}
                        {numField(
                          'avgViewDurationSeconds',
                          'Avg View Duration (sec)',
                          { optional: true }
                        )}
                        {numField('subscriberCountAtPost', 'Subscriber Count', {
                          optional: true,
                        })}
                        {numField('forwards', 'Forwards', { optional: true })}
                      </div>
                    )}

                    {/* Error */}
                    {formError && (
                      <p className="mb-2 text-xs text-red-600">{formError}</p>
                    )}

                    {/* Bottom action bar */}
                    <div className="mt-2 flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
                      <button
                        className="btn-secondary"
                        onClick={() => setModalOpen(false)}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn-primary"
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving
                          ? modalMode === 'create'
                            ? 'Creating...'
                            : 'Saving...'
                          : modalMode === 'create'
                            ? 'Create Post'
                            : 'Save Changes'}
                      </button>
                    </div>
                  </>
                )}

                {/* Metrics-only mode */}
                {modalMode === 'metrics' && editing && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-orange-100 bg-orange-50 p-3 dark:border-orange-500/20 dark:bg-orange-500/5">
                      <p className="text-xs text-orange-700 dark:text-orange-400">
                        Entering metrics for{' '}
                        <span className="font-semibold">{editing.platform}</span>{' '}
                        · {editing.postType}
                        {editing.contentTopic
                          ? ` · ${editing.contentTopic}`
                          : ''}
                        {editing.createdAt
                          ? ` · ${new Date(editing.createdAt).toLocaleDateString()}`
                          : ''}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {numField('impressions', 'Impressions')}
                      {numField('reach', 'Reach')}
                      {numField('likes', 'Likes')}
                      {numField('comments', 'Comments')}
                      {numField('shares', 'Shares')}
                      {numField('saves', 'Saves')}
                      {numField('clickThroughs', 'Click Throughs')}
                      {numField('videoViews', 'Video Views', { optional: true })}
                      {numField('engagementRate', 'Engagement Rate (%)')}
                      {numField('profileVisits', 'Profile Visits')}
                      {numField('donationReferrals', 'Donation Referrals')}
                      {numField(
                        'estimatedDonationValuePhp',
                        'Est. Donation Value (PHP)'
                      )}
                    </div>
                    {formError && (
                      <p className="mb-2 text-xs text-red-600">{formError}</p>
                    )}
                    <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
                      <button
                        className="btn-secondary"
                        onClick={() => setModalOpen(false)}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn-primary"
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save Metrics'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Delete confirmation nested modal */}
            {showDeleteConfirm && (
              <div
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="sm-delete-title"
                onClick={() => setShowDeleteConfirm(false)}
              >
                <div
                  className="relative mx-4 w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">
                    <Trash2 size={20} className="text-red-500" />
                  </div>
                  <h3
                    id="sm-delete-title"
                    className="text-lg font-bold text-gray-900 dark:text-white"
                  >
                    Delete Post
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Are you sure you want to delete this record? This action
                    cannot be undone.
                  </p>
                  <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                      className="btn-secondary"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        handleDelete(editing!.postId);
                      }}
                      disabled={saving}
                    >
                      {saving ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>,
          document.body
        )}
    </div>
  );
}
