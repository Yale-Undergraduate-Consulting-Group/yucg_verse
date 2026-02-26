export interface RedditPost {
  id: string;
  title: string;
  text: string;
  subreddit: string;
  score: number;
  num_comments: number;
  created_utc: string;
  permalink: string;
  title_sentiment: number;
  text_sentiment: number;
  combined_sentiment: number;
  sentiment_label: string;
}

export interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
}

export interface SentimentPercentages {
  positive: number;
  neutral: number;
  negative: number;
}

export interface RedditSummary {
  total_posts: number;
  avg_title_sentiment: number;
  avg_text_sentiment: number;
  avg_combined_sentiment: number;
  sentiment_distribution: SentimentDistribution;
  sentiment_percentages: SentimentPercentages;
}

export interface MonthlyTrend {
  year: number;
  month: number;
  avg_sentiment: number;
  post_count: number;
}

export interface Keyword {
  word: string;
  keyness: number;
  count: number;
}

export interface RedditAnalysisResult {
  success: boolean;
  subreddit: string;
  query: string;
  summary: RedditSummary;
  monthly_trend: MonthlyTrend[];
  top_keywords: Keyword[];
  posts: RedditPost[];
  csv_data: string;
  error?: string;
}
