export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  file: File;
}

export interface AnalysisResult {
  filename: string;
  page_count?: number;
  word_count?: number;
  char_count?: number;
  sentiment?: string;
  positive_word_count?: number;
  negative_word_count?: number;
  error?: string;
}
