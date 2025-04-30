import React from 'react';
import LanguageSelector from './LanguageSelector';

const SourceSelection = ({
   sources,
   selectedIndices,
   onToggleSelection,
   onToggleSelectAll,
   onConfirm,
   isProcessing,
   languages,
   selectedLanguage,
   onSelectLanguage,
}) => {
   return (
      <div className="my-4 space-y-4 bg-[#121824] border border-gray-700 rounded-md p-4 shadow-lg animate-slideUp">
         <div className="flex items-start mb-2">
            <div className="w-5 h-5 text-emerald-400 mr-2 mt-0.5 flex-shrink-0">
               <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  stroke="currentColor"
               >
                  <path
                     d="M7 9l3 3 3-3M5 5h10a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
                     strokeWidth="1.5"
                     strokeLinecap="round"
                     strokeLinejoin="round"
                  />
               </svg>
            </div>
            <div>
               <h3 className="font-medium text-white">Select Sources</h3>
               <p className="text-sm text-gray-400 mt-1">
                  Choose the sources you want to include in your podcast.
               </p>
            </div>
         </div>
         <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {sources.map((source, index) => (
               <div
                  key={index}
                  className={`p-3 rounded-md border transition-colors ${
                     selectedIndices.includes(index)
                        ? 'bg-emerald-900/20 border-emerald-600/40'
                        : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                  }`}
               >
                  <div className="flex items-center">
                     <input
                        type="checkbox"
                        id={`source-${index}`}
                        checked={selectedIndices.includes(index)}
                        onChange={() => onToggleSelection(index)}
                        disabled={isProcessing}
                        className="form-checkbox h-4 w-4 text-emerald-500 rounded border-gray-700 bg-gray-900 focus:ring-0 focus:ring-offset-0"
                     />
                     <label
                        htmlFor={`source-${index}`}
                        className={`ml-2 text-sm font-medium ${
                           selectedIndices.includes(index) ? 'text-white' : 'text-gray-300'
                        } cursor-pointer flex-1`}
                     >
                        {index + 1}. {source.title}
                     </label>
                  </div>
                  <div className="mt-1 ml-6 text-xs text-gray-500">
                     {source.source_name || source.source_id || 'Unknown Source'}
                     {source.url && (
                        <a
                           href={source.url}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="ml-2 text-emerald-500 hover:text-emerald-400"
                        >
                           View Source
                        </a>
                     )}
                  </div>
                  <div className="mt-2 ml-6 text-xs text-gray-400 line-clamp-3">
                     {source.summary || source.content || 'No content available'}
                  </div>
               </div>
            ))}
         </div>
         <LanguageSelector
            languages={languages}
            selectedLanguage={selectedLanguage}
            onSelectLanguage={onSelectLanguage}
            isDisabled={isProcessing}
         />
         <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700">
            <button
               type="button"
               onClick={onToggleSelectAll}
               disabled={isProcessing}
               className={`text-xs ${
                  isProcessing
                     ? 'text-gray-500 cursor-not-allowed'
                     : 'text-emerald-400 hover:text-emerald-300'
               } transition-colors`}
            >
               {selectedIndices.length === sources.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
               onClick={onConfirm}
               disabled={isProcessing || selectedIndices.length === 0}
               className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isProcessing || selectedIndices.length === 0
                     ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                     : 'bg-emerald-600 hover:bg-emerald-700 text-white'
               }`}
            >
               {isProcessing ? (
                  <div className="flex items-center">
                     <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                     >
                        <circle
                           className="opacity-25"
                           cx="12"
                           cy="12"
                           r="10"
                           stroke="currentColor"
                           strokeWidth="4"
                        ></circle>
                        <path
                           className="opacity-75"
                           fill="currentColor"
                           d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                     </svg>
                     Processing...
                  </div>
               ) : (
                  'Confirm Selection'
               )}
            </button>
         </div>
      </div>
   );
};

export default SourceSelection;
