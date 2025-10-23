
import React, { useState } from 'react';

interface UrlInputFormProps {
  url: string;
  setUrl: (url: string) => void;
  pastedText: string;
  setPastedText: (text: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  onReset: () => void;
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
}

type UrlType = 'article' | 'text' | 'image' | 'video';

const VALIDATION_REGEX = {
  article: /^(https?:\/\/)?((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(#[-a-z\d_]*)?$/i,
  image: /^(https?:\/\/).*\.(jpg|jpeg|png|webp|avif|gif|svg)(\?.*)?$/i,
  video: /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[\w-]{11}(\?.*)?$/i,
  text: /.*/, // No validation needed for pasted text
};

const PLACEHOLDERS = {
  article: 'Enter an article URL',
  image: 'Enter a direct image URL (.jpg, .png, etc.)',
  video: 'Enter a YouTube video URL',
  text: 'Paste the full text of an article here...'
};

const ERROR_MESSAGES = {
  article: 'Please enter a valid URL format.',
  image: 'Please enter a valid image URL ending in .jpg, .png, etc.',
  video: 'Please enter a valid YouTube video URL.',
  text: '',
};

const MAX_CHARS = 90000;

const UrlTypeSelector: React.FC<{ selectedType: UrlType; onChange: (type: UrlType) => void; }> = ({ selectedType, onChange }) => {
    const types: UrlType[] = ['article', 'text', 'image', 'video'];
    const typeLabels: Record<UrlType, string> = { article: 'Article URL', text: 'Full Article', image: 'Image', video: 'YouTube Video' };

    return (
        <div className="flex justify-center mb-4 rounded-lg bg-slate-200 p-1" role="radiogroup">
            {types.map(type => (
                <label key={type} className="relative w-full text-center cursor-pointer">
                    <input
                        type="radio"
                        name="urlType"
                        value={type}
                        checked={selectedType === type}
                        onChange={() => onChange(type)}
                        className="sr-only peer"
                    />
                    <span className="block w-full px-4 py-2 rounded-md text-sm font-semibold text-slate-600 transition-colors peer-checked:bg-white peer-checked:text-cyan-700 peer-checked:shadow-sm">
                        {typeLabels[type]}
                    </span>
                </label>
            ))}
        </div>
    );
};

export const UrlInputForm: React.FC<UrlInputFormProps> = ({ url, setUrl, pastedText, setPastedText, onSubmit, isLoading, onReset, selectedFile, onFileChange }) => {
  const [urlType, setUrlType] = useState<UrlType>('article');
  
  const isUrlConsideredValid = url.trim() === '' || VALIDATION_REGEX[urlType].test(url);
  const isInvalidAndNotEmpty = !isUrlConsideredValid && url.trim() !== '';

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    if (newUrl.trim() !== '') {
      onFileChange(null);
      setPastedText('');
    }
  };

  const handlePastedTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    if (newText.length <= MAX_CHARS) {
        setPastedText(newText);
        if (newText.trim() !== '') {
            setUrl('');
            onFileChange(null);
        }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onFileChange(file);
    if (file) {
      setUrl('');
      setPastedText('');
    }
  };
  
  const handleTypeChange = (newType: UrlType) => {
    setUrlType(newType);
    if (newType !== 'image') {
        onFileChange(null);
    }
    if (newType !== 'text') {
        setPastedText('');
    }
    if (newType === 'text' || newType === 'image') {
        setUrl('');
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitDisabled) return;
    onSubmit(e);
  };
  
  const handleReset = () => {
      onReset();
      setUrlType('article');
  };

  const isSubmitDisabled = isLoading || !((isUrlConsideredValid && url.trim() !== '') || (selectedFile && urlType === 'image') || (pastedText.trim() !== '' && urlType === 'text'));

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col items-start gap-3">
       <div className="w-full">
         <UrlTypeSelector selectedType={urlType} onChange={handleTypeChange} />
          {urlType === 'text' ? (
            <div className="w-full">
              <textarea
                value={pastedText}
                onChange={handlePastedTextChange}
                placeholder={PLACEHOLDERS[urlType]}
                required
                className="w-full px-4 py-3 rounded-lg border bg-white outline-none transition duration-200 text-slate-900 placeholder:text-slate-400 border-slate-300 focus:ring-2 focus:ring-cyan-600 focus:border-cyan-600 min-h-[150px] resize-y"
                aria-label="Article text input"
              />
              <p className="text-right text-sm text-slate-500 mt-1 pr-1">
                {MAX_CHARS - pastedText.length} characters remaining
              </p>
            </div>
          ) : (
             <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                    </svg>
                </div>
                <input
                    type="url"
                    value={url}
                    onChange={handleUrlChange}
                    placeholder={PLACEHOLDERS[urlType]}
                    required={!selectedFile}
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border bg-white outline-none transition duration-200 text-slate-900 placeholder:text-slate-400
                      ${isInvalidAndNotEmpty 
                        ? 'border-red-400 focus:ring-2 focus:ring-red-500 focus:border-red-500' 
                        : 'border-slate-300 focus:ring-2 focus:ring-cyan-600 focus:border-cyan-600'
                      }`}
                    aria-invalid={isInvalidAndNotEmpty}
                    aria-describedby="url-error"
                    disabled={!!selectedFile}
                />
             </div>
          )}

          {isInvalidAndNotEmpty && (
            <p id="url-error" className="text-red-600 text-sm mt-1">
                {ERROR_MESSAGES[urlType]}
            </p>
          )}

          {urlType === 'image' && (
            <>
                <div className="relative flex items-center justify-center w-full">
                    <div className="flex-grow border-t border-slate-300"></div>
                    <span className="flex-shrink mx-4 text-slate-500 text-sm">or</span>
                    <div className="flex-grow border-t border-slate-300"></div>
                </div>
                <div className="w-full">
                    <label htmlFor="image-upload" className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 focus:ring-offset-slate-100 transition-colors duration-200 cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>{selectedFile ? 'Change image' : 'Upload an image'}</span>
                    </label>
                    <input id="image-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                    {selectedFile && (
                        <div className="mt-2 flex items-center justify-between text-sm text-slate-700 bg-slate-100 p-2 rounded-md border border-slate-200">
                            <span className="truncate pr-2">{selectedFile.name}</span>
                            <button type="button" onClick={() => onFileChange(null)} className="flex-shrink-0 p-1 rounded-full hover:bg-slate-200" aria-label="Remove selected file">
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </>
          )}
      </div>
      <div className="w-full sm:w-auto flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="w-full sm:w-auto px-6 py-3 rounded-lg font-semibold text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-100 transition-colors duration-200 flex items-center justify-center"
          >
            {isLoading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                </>
            ) : (
              'Analyze'
            )}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-3 rounded-lg font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 focus:ring-offset-slate-100 transition-colors duration-200"
          >
            Reset
          </button>
      </div>
    </form>
  );
};
