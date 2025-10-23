
import React, { useState, useEffect } from 'react';
import type { AnalysisResult, Source } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

interface AnalysisDisplayProps {
  result: AnalysisResult | null;
  isLoading: boolean;
  isAnswering: boolean;
  isFetchingOpposing: boolean;
  onAskFollowUp: (question: string) => void;
  onSave: () => void;
  onFetchOpposingViewpoint: () => void;
}

// Helper to extract YouTube video ID from various URL formats
const getYoutubeVideoId = (url: string): string | null => {
    try {
        const urlObj = new URL(url);
        let videoId = urlObj.searchParams.get('v');
        if (videoId) return videoId;
        if (urlObj.hostname === 'youtu.be') return urlObj.pathname.slice(1);
    } catch (e) {
        // Fallback for malformed URLs
    }
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

const formatDisplayDate = (dateString: string): string => {
    try {
        const parts = dateString.split('-');
        if (parts.length === 3) {
            const date = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'UTC',
            });
        }
        return dateString;
    } catch (e) {
        console.error("Failed to parse date string:", dateString, e);
        return dateString;
    }
};


export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ result, isLoading, isAnswering, isFetchingOpposing, onAskFollowUp, onSave, onFetchOpposingViewpoint }) => {
  const [customQuestion, setCustomQuestion] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const conversationEndRef = React.useRef<HTMLDivElement>(null);

  const handleCustomQuestionSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (customQuestion.trim() && !isAnswering) {
          onAskFollowUp(customQuestion);
          setCustomQuestion('');
      }
  };
  
  const handleCopyLink = async () => {
    if (!result) return;
    try {
        const jsonString = JSON.stringify(result);
        // Using encodeURIComponent to handle special characters before base64 encoding
        const encodedData = btoa(encodeURIComponent(jsonString));
        const shareUrl = `${window.location.origin}${window.location.pathname}#analysis=${encodedData}`;

        await navigator.clipboard.writeText(shareUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
        console.error('Failed to create or copy share link: ', err);
        alert('Failed to copy share link to clipboard.');
    }
  };

  useEffect(() => {
    // When a new result is loaded, clear the custom question input and reset state
    if (result) {
      setCustomQuestion('');
      setIsCopied(false);

      if (result.url.startsWith("Uploaded: ") && !previewImageUrl) {
          // This path is tricky because we don't have the File object anymore.
          // For now, we can't show a preview for uploaded images from a shared link or saved item.
          setPreviewImageUrl(null);
      } else if (result.type === 'image') {
          setPreviewImageUrl(result.url);
      } else {
          setPreviewImageUrl(null);
      }
    }
  }, [result]);

  useEffect(() => {
    if (isAnswering) {
      conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isAnswering, result?.conversation.length]);


  if (isLoading) {
    return (
      <div className="mt-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="mt-8 text-center p-10 bg-white rounded-lg shadow-lg border border-slate-200">
        <h2 className="text-xl font-medium text-slate-700">Ready for Analysis</h2>
        <p className="text-slate-500 mt-2">Enter a URL or upload an image to begin.</p>
      </div>
    );
  }
  
  const videoId = result.type === 'video' ? getYoutubeVideoId(result.url) : null;

  const getTitle = () => {
    if (result.url === 'Pasted Text') {
      return 'Pasted Text Analysis';
    }
    switch(result.type) {
        case 'image': return 'Image Description & Analysis';
        case 'video': return 'Video Summary & Analysis';
        default: return 'Summary';
    }
  };

  const sourcesForSummary = result.sources || [];
  const sourcesForDeeperDive = result.conversation
    .flatMap(chat => chat.sources || [])
    .filter((source, index, self) => index === self.findIndex(s => s.uri === source.uri)); // Deduplicate

  const sourcesForOpposing = result.opposingViewpoint?.sources || [];

  return (
    <div className="mt-8 space-y-8 animate-fade-in">
      {result.type === 'image' && previewImageUrl && (
        <div className="p-2 bg-white rounded-lg shadow-lg border border-slate-300">
            <img 
                src={previewImageUrl} 
                alt="Analyzed content" 
                className="rounded-md max-w-full h-auto mx-auto max-h-96 object-contain" 
            />
        </div>
      )}
      
      {result.type === 'video' && videoId && (
         <div className="bg-black rounded-lg shadow-lg border border-slate-300 overflow-hidden">
            <div className="aspect-video w-full">
                <iframe 
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title="YouTube video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowFullScreen>
                </iframe>
            </div>
        </div>
      )}

      <div className="relative p-6 bg-white rounded-lg shadow-lg border border-slate-300">
        <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 text-sm font-semibold rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-white transition-all duration-200 flex items-center disabled:opacity-75"
                aria-label="Copy link to this analysis"
                disabled={isCopied}
            >
                {isCopied ? (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                    </>
                ) : (
                    <>
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Copy Link
                    </>
                )}
            </button>
            <button 
                onClick={onSave}
                className="px-3 py-1.5 text-sm font-semibold rounded-md text-slate-700 bg-slate-200 hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 focus:ring-offset-white transition-colors"
                aria-label="Save this analysis"
            >
                Save
            </button>
        </div>
        <h2 className="text-2xl font-bold text-cyan-700 mb-2">
            {getTitle()}
        </h2>
        {result.publicationDate && (
          <div className="flex items-center text-sm text-slate-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Published: {formatDisplayDate(result.publicationDate)}</span>
          </div>
        )}
        <p className="text-slate-700 leading-relaxed">{result.summary}</p>
      </div>

      <div className="p-6 bg-white rounded-lg shadow-lg border border-slate-300">
        <h2 className="text-2xl font-bold text-cyan-700 mb-2">Detailed Analysis</h2>
        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{result.detailedAnalysis}</p>
      </div>

      {result.conversation.map((chat, index) => (
        <div key={index} className="p-6 bg-white rounded-lg shadow-lg border border-slate-300 animate-fade-in">
            <div className="flex items-start">
                 <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-slate-200 text-cyan-700 font-bold text-lg mr-4">
                    ?
                </div>
                <p className="font-semibold text-slate-800 pt-1">{chat.question}</p>
            </div>
            <div className="mt-4 pl-12 text-slate-700 leading-relaxed whitespace-pre-wrap">
                {chat.answer}
            </div>
        </div>
      ))}

      <div className="p-6 bg-white rounded-lg shadow-lg border border-slate-300">
        <h2 className="text-2xl font-bold text-cyan-700 mb-4">Deeper Dive</h2>
        <p className="text-slate-500 mb-4">Select a suggested question or ask your own.</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {result.contextualQuestions.map((question, index) => (
            <button key={index} onClick={() => onAskFollowUp(question)} disabled={isAnswering} className="px-3 py-1.5 text-sm text-left font-medium rounded-md text-cyan-800 bg-cyan-100 hover:bg-cyan-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {question}
            </button>
          ))}
        </div>
        
        <form onSubmit={handleCustomQuestionSubmit} className="flex flex-col sm:flex-row items-center gap-3">
            <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Ask your own follow-up question..."
                disabled={isAnswering}
                className="w-full pl-4 pr-4 py-3 rounded-lg border bg-slate-100 border-slate-300 focus:ring-2 focus:ring-cyan-600 focus:border-cyan-600 outline-none transition duration-200 text-slate-900 placeholder:text-slate-400"
            />
            <button type="submit" disabled={isAnswering || !customQuestion.trim()} className="w-full sm:w-auto px-6 py-3 rounded-lg font-semibold text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-white transition-colors duration-200">
                Ask
            </button>
        </form>

        {isAnswering && (
          <div className="mt-4 flex items-center justify-center text-slate-500" ref={conversationEndRef}>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Getting an answer...</span>
          </div>
        )}
      </div>

      {(result.type === 'text' || result.type === 'video') && (
        <div className="p-6 bg-white rounded-lg shadow-lg border border-amber-400">
            <div className="flex items-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <h2 className="text-2xl font-bold text-cyan-700">The Other Side</h2>
            </div>
            
            {result.opposingViewpoint && (
                <div className="animate-fade-in">
                    <blockquote className="border-l-4 border-slate-300 pl-4 py-2 my-4">
                        <p className="text-slate-700 leading-relaxed">{result.opposingViewpoint.summary}</p>
                    </blockquote>
                </div>
            )}
            
            {result.opposingViewpoint === undefined && !isFetchingOpposing && (
                <div>
                     <p className="text-slate-500 mb-4">Explore alternative or opposing viewpoints on this topic to get a more complete picture.</p>
                     <button onClick={onFetchOpposingViewpoint} disabled={isFetchingOpposing} className="w-full sm:w-auto px-6 py-3 rounded-lg font-semibold text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-white transition-colors duration-200 flex items-center justify-center">
                        Explore Opposing Viewpoints
                     </button>
                </div>
            )}

            {result.opposingViewpoint === null && !isFetchingOpposing && (
                 <p className="text-slate-500 italic">No clear opposing viewpoint could be identified for this content, or the topic may be non-partisan.</p>
            )}

            {isFetchingOpposing && (
                <div className="mt-4 flex items-center justify-center text-slate-500">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Finding other perspectives...</span>
                </div>
            )}
        </div>
      )}

      {(sourcesForSummary.length > 0 || sourcesForDeeperDive.length > 0 || sourcesForOpposing.length > 0) && (
        <div className="p-6 bg-white rounded-lg shadow-lg border border-slate-300">
            <h2 className="text-2xl font-bold text-cyan-700 mb-4">References</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {sourcesForSummary.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-3">From Summary & Analysis</h3>
                        <ul className="space-y-2">
                            {sourcesForSummary.map((source, i) => (
                                <li key={`summary-${i}`} className="flex items-start">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-cyan-600 hover:underline transition-colors" title={source.uri}>
                                        {source.title || source.uri}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {sourcesForDeeperDive.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-3">From Deeper Dive</h3>
                        <ul className="space-y-2">
                            {sourcesForDeeperDive.map((source, i) => (
                                <li key={`orig-${i}`} className="flex items-start">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-cyan-600 hover:underline transition-colors" title={source.uri}>
                                        {source.title || source.uri}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                 {sourcesForOpposing.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-3">From The Other Side</h3>
                        <ul className="space-y-2">
                            {sourcesForOpposing.map((source, i) => (
                                <li key={`oppo-${i}`} className="flex items-start">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-cyan-600 hover:underline transition-colors" title={source.uri}>
                                        {source.title || source.uri}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
      )}

    </div>
  );
};
