export interface PlaceResult {
  place_id: string;
  name: string;
  address: string;
  rating: number | null;
  user_ratings_total: number;
}

export interface Review {
  author: string;
  rating: number;
  text: string;
  time: string;
  profile_url: string;
  sentiment_label: string;
  sentiment_compound: number;
}

export interface PlaceAnalysisResult {
  place_id: string;
  place_name: string;
  address: string;
  rating: number | null;
  user_ratings_total: number;
  total_reviews_analyzed: number;
  avg_sentiment: number;
  top_positive: Review[];
  top_negative: Review[];
  all_reviews: Review[];
  error?: string;
}
