
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { UrlInputForm } from './components/UrlInputForm';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { ErrorAlert } from './components/ErrorAlert';
import { SavedAnalysesList } from './components/SavedAnalysesList';
import { analyzeContent, getFollowUpAnswer, generateTags, getOpposingViewpoint } from './services/geminiService';
import type { AnalysisResult, SavedAnalysis, ChatMessage } from './types';

const App: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [pastedText, setPastedText] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAnswering, setIsAnswering] = useState<boolean>(false);
  const [isFetchingOpposing, setIsFetchingOpposing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [showDonationOptions, setShowDonationOptions] = useState<boolean>(false);


  useEffect(() => {
    try {
      const saved = localStorage.getItem('newsAnalyzerAnalyses');
      if (saved) {
        setSavedAnalyses(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load saved analyses:", e);
      setError("Could not load saved analyses from local storage.");
    }

    const loadFromHash = () => {
        try {
            if (window.location.hash.startsWith('#analysis=')) {
                const encodedData = window.location.hash.substring('#analysis='.length);
                const decodedJson = decodeURIComponent(atob(encodedData));
                const loadedAnalysis: AnalysisResult = JSON.parse(decodedJson);

                if (loadedAnalysis && (loadedAnalysis.url || loadedAnalysis.summary) && loadedAnalysis.summary) {
                    setAnalysisResult(loadedAnalysis);
                    setUrl(loadedAnalysis.url.startsWith('Uploaded:') || loadedAnalysis.url === 'Pasted Text' ? '' : loadedAnalysis.url);
                    if (loadedAnalysis.url === 'Pasted Text') {
                        // Can't restore pasted text, but can show analysis
                    } else if (loadedAnalysis.url.startsWith('Uploaded:')) {
                        // Can't restore file, but can show the analysis
                    } else {
                        setUrl(loadedAnalysis.url);
                    }
                    window.history.replaceState(null, '', window.location.pathname + window.location.search);
                }
            }
        } catch (e) {
            console.error("Failed to load analysis from URL hash", e);
            setError("The shared analysis link is invalid or corrupted.");
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
    };
    loadFromHash();
  }, []);

  const handleReset = useCallback(() => {
    setUrl('');
    setUploadedFile(null);
    setPastedText('');
    setAnalysisResult(null);
    setIsLoading(false);
    setIsAnswering(false);
    setIsFetchingOpposing(false);
    setError(null);
  }, []);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading || (!url.trim() && !uploadedFile && !pastedText.trim())) return;

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result = await analyzeContent(url, uploadedFile, pastedText);
      setAnalysisResult({ ...result, conversation: [] });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred. Please try again.';
      setError(`Failed to analyze content. ${errorMessage}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [url, uploadedFile, pastedText, isLoading]);

  const handleAskFollowUp = useCallback(async (question: string) => {
    if (!analysisResult || isAnswering) return;

    setIsAnswering(true);
    setError(null);
    
    try {
      const { answer, sources } = await getFollowUpAnswer(analysisResult.url, question);
      const newChatMessage: ChatMessage = { question, answer, sources };
      setAnalysisResult(prev => prev ? { ...prev, conversation: [...prev.conversation, newChatMessage] } : null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to get an answer. ${errorMessage}`);
      console.error(err);
    } finally {
      setIsAnswering(false);
    }
  }, [analysisResult, isAnswering]);

  const handleFetchOpposingViewpoint = useCallback(async () => {
    if (!analysisResult || isFetchingOpposing) return;

    setIsFetchingOpposing(true);
    setError(null);
    try {
        const opposingView = await getOpposingViewpoint(analysisResult.url, analysisResult.summary);
        setAnalysisResult(prev => prev ? { ...prev, opposingViewpoint: opposingView } : null);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to fetch opposing viewpoints. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsFetchingOpposing(false);
    }
  }, [analysisResult, isFetchingOpposing]);

  const handleSaveAnalysis = useCallback(async () => {
    if (!analysisResult) return;

    if (savedAnalyses.some(saved => saved.url === analysisResult.url && saved.summary === analysisResult.summary)) {
        alert("This analysis appears to be already saved.");
        return;
    }

    const tags = await generateTags(analysisResult.summary, analysisResult.detailedAnalysis, analysisResult.conversation);
    const newSavedAnalysis: SavedAnalysis = {
        ...analysisResult,
        id: crypto.randomUUID(),
        savedAt: new Date().toISOString(),
        tags,
    };
    
    const updatedSavedAnalyses = [...savedAnalyses, newSavedAnalysis];
    setSavedAnalyses(updatedSavedAnalyses);
    localStorage.setItem('newsAnalyzerAnalyses', JSON.stringify(updatedSavedAnalyses));
    alert("Analysis saved!");
  }, [analysisResult, savedAnalyses]);
  
  const handleLoadAnalysis = useCallback((id: string) => {
    const analysisToLoad = savedAnalyses.find(a => a.id === id);
    if (analysisToLoad) {
        setAnalysisResult(analysisToLoad);
        setUrl(analysisToLoad.url.startsWith('Uploaded:') || analysisToLoad.url === 'Pasted Text' ? '' : analysisToLoad.url);
        setUploadedFile(null);
        setPastedText('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [savedAnalyses]);

  const handleDeleteAnalysis = useCallback((id: string) => {
    if (!window.confirm("Are you sure you want to delete this saved analysis?")) return;
    const updatedSaved = savedAnalyses.filter(a => a.id !== id);
    setSavedAnalyses(updatedSaved);
    localStorage.setItem('newsAnalyzerAnalyses', JSON.stringify(updatedSaved));
  }, [savedAnalyses]);


  return (
    <div className="min-h-screen text-slate-800 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Header />
        <main className="mt-8">
          <UrlInputForm
            url={url}
            setUrl={setUrl}
            pastedText={pastedText}
            setPastedText={setPastedText}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            onReset={handleReset}
            selectedFile={uploadedFile}
            onFileChange={setUploadedFile}
          />
          {error && <ErrorAlert message={error} />}
          <AnalysisDisplay
             result={analysisResult} 
             isLoading={isLoading}
             isAnswering={isAnswering}
             isFetchingOpposing={isFetchingOpposing}
             onAskFollowUp={handleAskFollowUp}
             onSave={handleSaveAnalysis}
             onFetchOpposingViewpoint={handleFetchOpposingViewpoint}
          />
          {savedAnalyses.length > 0 && (
            <SavedAnalysesList
                analyses={savedAnalyses}
                onLoad={handleLoadAnalysis}
                onDelete={handleDeleteAnalysis}
            />
          )}
        </main>
         <footer className="text-center mt-12 text-xs text-slate-500">
            <p>Powered by Google Gemini. Analysis may not be perfect. Always cross-reference multiple sources.</p>
            <p className="mt-1">Developed by Illuminated Pathways Agency</p>
            <div className="mt-8 border-t border-slate-200 pt-6">
                <button
                    onClick={() => setShowDonationOptions(!showDonationOptions)}
                    className="px-4 py-2 text-sm font-semibold rounded-md text-slate-700 bg-slate-200 hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 focus:ring-offset-slate-100 transition-all duration-200"
                    aria-expanded={showDonationOptions}
                >
                    Help Support This App and others dedicated to finding the truth.
                </button>
                {showDonationOptions && (
                    <div className="mt-4 animate-fade-in">
                        <p className="text-sm text-slate-600 mb-2">Select an amount to contribute via CashApp:</p>
                        <div className="flex justify-center items-center gap-2 sm:gap-4">
                            {[2, 5, 10, 20].map(amount => (
                                <a 
                                    key={amount}
                                    href={`https://cash.app/$amGuss70/${amount}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-6 py-2 text-base font-bold rounded-lg text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-slate-100 transition-colors"
                                >
                                    ${amount}
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
