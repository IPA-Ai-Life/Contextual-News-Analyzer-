
import React from 'react';

export const Header: React.FC = () => (
  <header className="text-center">
    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-cyan-700">
      Contextual News Analyzer
    </h1>
    <p className="mt-3 text-lg text-slate-600 max-w-2xl mx-auto">
      Uncover the full story. Get an instant summary, in-depth analysis, critical questions, and opposing viewpoints for any news article, image, or video.
    </p>
  </header>
);