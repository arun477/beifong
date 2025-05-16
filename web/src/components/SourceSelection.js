import React, { useState, useEffect } from 'react';
import { Wrench } from 'lucide-react';
import LanguageSelector from './LanguageSelector';

const SourceIcon = ({ url }) => {
   const [iconUrl, setIconUrl] = useState(null);
   const [isIconReady, setIsIconReady] = useState(false);
   const defaultIconSvg = (
      <svg
         className="w-4 h-4 text-emerald-400 transition-transform duration-200 group-hover:scale-110"
         fill="none"
         viewBox="0 0 24 24"
         stroke="currentColor"
      >
         <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
         />
      </svg>
   );

   useEffect(() => {
      let isMounted = true;
      const preloadFavicon = () => {
         try {
            const domain = new URL(url).hostname;
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
            const img = new Image();
            img.src = faviconUrl;
            img.onload = () => {
               if (isMounted) {
                  setIconUrl(faviconUrl);
                  setIsIconReady(true);
               }
            };
            img.onerror = () => {
               if (isMounted) {
                  setIconUrl(null);
                  setIsIconReady(true);
               }
            };
         } catch (e) {
            if (isMounted) {
               setIconUrl(null);
               setIsIconReady(true);
            }
         }
      };

      preloadFavicon();
      return () => {
         isMounted = false;
      };
   }, [url]);
   
   if (!isIconReady || !iconUrl) {
      return defaultIconSvg;
   }
   
   return (
      <img
         src={iconUrl}
         alt="Source icon"
         className="w-4 h-4 object-contain transition-transform duration-200 group-hover:scale-110"
      />
   );
};

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
   const getToolIcon = () => {
      return(
         <Wrench className="w-3 h-3" />
      );
   };

   const formatDate = dateString => {
      if (!dateString) return null;

      try {
         const date = new Date(dateString);
         return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
         });
      } catch (error) {
         return null;
      }
   };

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
            <div className="flex-1">
               <div className="flex items-center justify-between">
                  <h3 className="font-medium text-white">Select Sources</h3>
                  <span className="text-sm text-emerald-400 bg-emerald-900/20 px-2 py-1 rounded">
                     {selectedIndices.length} of {sources.length} selected
                  </span>
               </div>
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
                  <div
                     className="mt-1 ml-6 text-xs text-gray-500 flex items-center gap-2"
                     style={{ position: 'relative' }}
                  >
                     <span>{source.source_name || source.source_id || 'Unknown Source'}</span>
                     {source.tool_used && (
                        <div className="relative group">
                           <span 
                              className="bg-white/10 backdrop-blur-sm hover:bg-white/20 px-1.5 py-1 rounded text-xs flex items-center transition-all duration-200 cursor-help"
                           >
                              {getToolIcon()}
                           </span>
                           <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 border border-gray-700 text-white text-xs rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
                              {source.tool_used}
                           </div>
                        </div>
                     )}
                     {source.url && (
                        <a
                           href={source.url}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="bg-white/10 backdrop-blur-sm hover:bg-white/20 px-1.5 py-1 rounded group flex items-center transition-all duration-200"
                           title={`Visit ${new URL(source.url).hostname}`}
                        >
                           <SourceIcon url={source.url} />
                        </a>
                     )}
                     {formatDate(source.published_date) && (
                        <span className="bg-white/10 backdrop-blur-sm px-1.5 py-1 rounded text-gray-400">
                           {formatDate(source.published_date)}
                        </span>
                     )}
                  </div>
                  <div className="mt-2 ml-6 text-xs text-gray-400 line-clamp-3">
                     {source.description || 'No description available'}
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