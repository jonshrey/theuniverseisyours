// src/ai/worker/sentiment.worker.ts
import { pipeline, env} from '@xenova/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

// Define the expected output structure for sentiment analysis
interface SentimentResult {
  label: string;
  score: number;
}

// Type alias for the specific pipeline function
type SentimentPipeline = (text: string) => Promise<SentimentResult[]>;

type WorkerMessage =
  | { type: 'LOAD_MODEL' }
  | { type: 'ANALYZE'; payload: { text: string } };

type WorkerResponse =
  | { type: 'MODEL_LOADED' }
  | { type: 'LOADING_PROGRESS'; payload: { progress: number } }
  | { type: 'ANALYSIS_RESULT'; payload: { score: number } }
  | { type: 'ERROR'; payload: { message: string } };

let sentimentPipeline: SentimentPipeline | null = null;
let isLoading = false;

async function loadModel(): Promise<void> {
  if (sentimentPipeline) return;
  if (isLoading) return;

  isLoading = true;

  try {
    // pipeline returns a Pipeline type; we assert it as our specific function type
    const basePipeline = await pipeline(
      'sentiment-analysis',
      'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      {
        progress_callback: (progress: { progress: number }) => {
          const response: WorkerResponse = {
            type: 'LOADING_PROGRESS',
            payload: { progress: progress.progress },
          };
          self.postMessage(response);
        },
      }
    );

    // Cast to the callable function type
    sentimentPipeline = basePipeline as unknown as SentimentPipeline;

    isLoading = false;
    const response: WorkerResponse = { type: 'MODEL_LOADED' };
    self.postMessage(response);
  } catch (error) {
    isLoading = false;
    const response: WorkerResponse = {
      type: 'ERROR',
      payload: { message: error instanceof Error ? error.message : 'Unknown error' },
    };
    self.postMessage(response);
  }
}

async function analyzeText(text: string): Promise<number> {
  if (!sentimentPipeline) {
    throw new Error('Model not loaded');
  }

  const result = await sentimentPipeline(text);
  const top = result[0];
  const label = top.label;
  const confidence = top.score;

  return label === 'POSITIVE' ? confidence : -confidence;
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type } = event.data;

  try {
    if (type === 'LOAD_MODEL') {
      await loadModel();
    } else if (type === 'ANALYZE') {
      const { text } = event.data.payload;

      if (!sentimentPipeline) {
        await loadModel();
      }

      const score = await analyzeText(text);
      const response: WorkerResponse = {
        type: 'ANALYSIS_RESULT',
        payload: { score },
      };
      self.postMessage(response);
    }
  } catch (error) {
    const response: WorkerResponse = {
      type: 'ERROR',
      payload: { message: error instanceof Error ? error.message : 'Unknown error' },
    };
    self.postMessage(response);
  }
};