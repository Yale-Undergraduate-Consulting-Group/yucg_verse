export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  file: File;
}

export interface TopWord {
  word: string;
  count: number;
  avg_hf_compound: number;
}

export interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
}

export interface AnalysisResult {
  filename: string;
  interviewee?: string;
  target_company?: string;
  sentence_count?: number;
  avg_compound?: number;
  sentiment?: string;
  target_sentence_count?: number;  // renamed from canva_sentence_count
  other_service_count?: number;
  sentiment_distribution?: SentimentDistribution;
  top_words?: TopWord[];
  error?: string;
}