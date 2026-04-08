import { API_BASE_URL as OUTREACH_API_BASE_URL } from './config';

export type OutreachSummary = {
  generatedAt: string;
  kpis: {
    totalPosts: number;
    totalReach: number;
    totalImpressions: number;
    totalClicks: number;
    avgEngagementRate: number;
    clickThroughRate: number;
  };
  channelBreakdown: Array<{
    platform: string;
    postCount: number;
    reach: number;
    impressions: number;
    clickThroughs: number;
    avgEngagementRate: number;
    donationReferrals: number;
  }>;
  topContent: Array<{
    postId: number;
    platform: string;
    postType: string;
    contentTopic: string;
    createdAt: string;
    reach: number;
    engagementRate: number;
    clickThroughs: number;
    donationReferrals: number;
    campaignName: string | null;
  }>;
  recommendations: string[];
  latestPublishedSnapshot: {
    snapshotId: number;
    snapshotDate: string;
    headline: string;
    summaryText: string | null;
    metricPayloadJson: string | null;
  } | null;
};

export async function fetchOutreachSummary(): Promise<OutreachSummary> {
  const response = await fetch(`${OUTREACH_API_BASE_URL}/outreach/summary`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Unable to load outreach summary data.');
  }

  return response.json();
}
