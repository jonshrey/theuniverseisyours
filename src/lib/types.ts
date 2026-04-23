export interface SentimentResult {
  label: 'POSITIVE' | 'NEGATIVE';
  score: number;
}

export interface SentimentWorkerAPI {
  analyze(text: string): Promise<SentimentResult>;
}