export interface GBusiness {
  place_id: string;
  data_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number | null;
  review_count: number;
}

export interface GReview {
  author: string;
  rating: number;
  text: string;
  date: string;
  sentiment_label: string;
  sentiment_compound: number;
}

export interface GLocationResult extends GBusiness {
  total_reviews_analyzed: number;
  avg_sentiment: number;
  top_positive: GReview[];
  top_negative: GReview[];
  all_reviews: GReview[];
  error?: string;
}
