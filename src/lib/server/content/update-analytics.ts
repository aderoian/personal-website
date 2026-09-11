import { createArticleAnalyticsStore } from './article-analytics';

const store = createArticleAnalyticsStore('update-analytics.json');

export const loadUpdateAnalytics = store.load;
export const getOverallUpdateAnalytics = store.getOverall;
export const getUpdateAnalytics = store.getPost;
export const recordUpdateView = store.recordView;
