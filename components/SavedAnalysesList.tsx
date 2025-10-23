
import React from 'react';
import type { SavedAnalysis } from '../types';

interface SavedAnalysesListProps {
  analyses: SavedAnalysis[];
  onLoad: (id: string) => void;
  onDelete: (id:string) => void;
}

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

export const SavedAnalysesList: React.FC<SavedAnalysesListProps> = ({ analyses, onLoad, onDelete }) => {
    return (
        <div className="mt-16">
            <h2 className="text-3xl font-bold text-cyan-700 mb-6 border-t border-slate-300 pt-8">Saved Analyses</h2>
            <div className="space-y-4">
                {analyses.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()).map(analysis => (
                    <div key={analysis.id} className="p-4 bg-white rounded-lg shadow-lg border border-slate-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex-grow min-w-0">
                            <p className="font-semibold text-slate-800 truncate" title={analysis.url}>{analysis.summary}</p>
                            <p className="text-sm text-slate-500 mt-1">Saved on {formatDate(analysis.savedAt)}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {analysis.tags.map(tag => (
                                    <span key={tag} className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-200 text-slate-600">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="flex-shrink-0 flex gap-2 w-full sm:w-auto">
                            <button onClick={() => onLoad(analysis.id)} className="w-1/2 sm:w-auto flex-grow px-3 py-1.5 text-sm font-semibold rounded-md text-slate-700 bg-slate-200 hover:bg-slate-300 transition-colors">
                                View
                            </button>
                            <button onClick={() => onDelete(analysis.id)} className="w-1/2 sm:w-auto flex-grow px-3 py-1.5 text-sm font-semibold rounded-md text-red-700 bg-red-100 hover:bg-red-200 transition-colors">
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
