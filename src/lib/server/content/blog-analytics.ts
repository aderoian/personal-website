import { createArticleAnalyticsStore } from './article-analytics';

export { normalizeUtmSource } from '$lib/schemas/blog-analytics';

const store = createArticleAnalyticsStore('blog-analytics.json');

export const loadBlogAnalytics = store.load;
export const getOverallAnalytics = store.getOverall;
export const getPostAnalytics = store.getPost;
export const recordBlogView = store.recordView;
