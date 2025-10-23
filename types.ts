
export interface Source {
  uri: string;
  title: string;
}

export interface ChatMessage {
  question: string;
  answer: string;
  sources?: Source[];
}

export interface OpposingViewpoint {
    summary: string;
    sources: Source[];
}

export interface AnalysisResult {
  url: string;
  type: 'image' | 'text' | 'video';
  summary: string;
  detailedAnalysis: string;
  contextualQuestions: string[];
  conversation: ChatMessage[];
  publicationDate?: string;
  opposingViewpoint?: OpposingViewpoint | null;
  sources?: Source[];
}

export interface SavedAnalysis extends AnalysisResult {
    id: string;
    savedAt: string;
    tags: string[];
}