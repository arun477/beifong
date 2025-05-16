import React, { useState, useEffect } from 'react';
import { Settings, Check, Loader2, CheckSquare, Square, Calendar, ExternalLink, Sparkles, FileText } from 'lucide-react';
import LanguageSelector from './LanguageSelector';

const SourceIcon = ({ url }) => {
   const [iconUrl, setIconUrl] = useState(null);
   const [isIconReady, setIsIconReady] = useState(false);
   const defaultIconSvg = (
      <ExternalLink className="w-4 h-4 text-emerald-400 transition-transform duration-200 group-hover:scale-110" />
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
      <div className="w-full max-w-4xl mx-auto mt-6">
         <div className="bg-gradient-to-br from-gray-900 via-gray-850 to-gray-800 rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50 transition-all duration-300 hover:shadow-3xl">
            {/* Enhanced Header */}
            <div className="relative px-6 py-4 bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur border-b border-gray-700/30">
               <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-teal-600/5" />
               <div className="relative">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-lg">
                           <FileText className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                           <h3 className="text-lg font-semibold text-white">
                              Select Sources
                           </h3>
                           <p className="text-sm text-gray-400 mt-0.5">
                              Choose the sources you want to include in your podcast
                           </p>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="text-sm text-emerald-400 bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                           <span className="font-medium">{selectedIndices.length}</span>
                           <span className="text-gray-300 mx-1">of</span>
                           <span className="font-medium">{sources.length}</span>
                           <span className="text-gray-300 ml-1">selected</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Sources List */}
            <div className="p-6">
               <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {sources.map((source, index) => (
                     <div
                        key={index}
                        className={`group relative p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                           selectedIndices.includes(index)
                              ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/30 shadow-lg shadow-emerald-500/5'
                              : 'bg-gradient-to-r from-gray-800/50 to-gray-700/50 border-gray-700/30 hover:border-gray-600/50 hover:bg-gradient-to-r hover:from-gray-700/50 hover:to-gray-600/50'
                        }`}
                        onClick={() => !isProcessing && onToggleSelection(index)}
                     >
                        {/* Selection indicator */}
                        <div className="flex items-start gap-4">
                           <div className="flex-shrink-0 pt-0.5">
                              {selectedIndices.includes(index) ? (
                                 <CheckSquare className="w-5 h-5 text-emerald-400" />
                              ) : (
                                 <Square className="w-5 h-5 text-gray-500 group-hover:text-gray-400" />
                              )}
                           </div>

                           {/* Content */}
                           <div className="flex-1 min-w-0">
                              {/* Title and number */}
                              <div className="flex items-start justify-between gap-3">
                                 <h4 className={`text-sm font-medium leading-relaxed ${
                                    selectedIndices.includes(index) ? 'text-white' : 'text-gray-300 group-hover:text-white'
                                 } transition-colors duration-200`}>
                                    <span className="text-emerald-400 font-semibold">{index + 1}.</span> {source.title}
                                 </h4>
                              </div>

                              {/* Metadata row */}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                 {/* Source name with background */}
                                 <div className="bg-gray-800/50 border border-gray-700/50 px-2 py-1 rounded-md">
                                    <span className="text-xs text-gray-400 font-medium">
                                       {source.source_name || source.source_id || 'Unknown Source'}
                                    </span>
                                 </div>

                                 {/* Tool indicator with tooltip - same size as others */}
                                 {source.tool_used && (
                                    <div className="relative group/tool">
                                       <div className="bg-gradient-to-r from-blue-500/15 to-purple-500/15 border border-blue-500/25 px-2 py-1 rounded-md flex items-center gap-1">
                                          <Settings className="w-3 h-3 text-blue-400" />
                                          <span className="text-xs text-blue-300 font-medium">Tool</span>
                                       </div>
                                       <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 border border-gray-700 text-white text-xs rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover/tool:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
                                          <div className="font-medium">{source.tool_used}</div>
                                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                       </div>
                                    </div>
                                 )}

                                 {/* Published date */}
                                 {formatDate(source.published_date) && (
                                    <div className="bg-gray-800/50 border border-gray-700/50 px-2 py-1 rounded-md flex items-center gap-1">
                                       <Calendar className="w-3 h-3 text-gray-400" />
                                       <span className="text-xs text-gray-400">
                                          {formatDate(source.published_date)}
                                       </span>
                                    </div>
                                 )}

                                 {/* External link with favicon */}
                                 {source.url && (
                                    <a
                                       href={source.url}
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       onClick={(e) => e.stopPropagation()}
                                       className="group/link bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 hover:border-emerald-400/50 px-2 py-1 rounded-md flex items-center gap-1 transition-all duration-200 hover:scale-105"
                                       title={`Visit ${new URL(source.url).hostname}`}
                                    >
                                       <SourceIcon url={source.url} />
                                       <span className="text-xs text-emerald-300 font-medium">Visit</span>
                                    </a>
                                 )}
                              </div>

                              {/* Description - more compact */}
                              {source.description && (
                                 <p className="text-xs text-gray-500 mt-2 leading-snug line-clamp-2">
                                    {source.description}
                                 </p>
                              )}
                           </div>
                        </div>

                        {/* Subtle shine effect on hover */}
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                     </div>
                  ))}
               </div>

               {/* Language Selector */}
               <div className="mt-6">
                  <LanguageSelector
                     languages={languages}
                     selectedLanguage={selectedLanguage}
                     onSelectLanguage={onSelectLanguage}
                     isDisabled={isProcessing}
                  />
               </div>
            </div>

            {/* Enhanced Actions Section */}
            <div className="px-6 py-4 bg-gradient-to-r from-gray-900/50 to-gray-800/50 backdrop-blur border-t border-gray-700/30">
               <div className="flex items-center justify-between">
                  <button
                     type="button"
                     onClick={onToggleSelectAll}
                     disabled={isProcessing}
                     className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isProcessing
                           ? 'text-gray-500 cursor-not-allowed bg-gray-800/50'
                           : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-400/50'
                     }`}
                  >
                     {selectedIndices.length === sources.length ? (
                        <>
                           <Square className="w-4 h-4" />
                           Deselect All
                        </>
                     ) : (
                        <>
                           <CheckSquare className="w-4 h-4" />
                           Select All
                        </>
                     )}
                  </button>

                  <button
                     onClick={onConfirm}
                     disabled={isProcessing || selectedIndices.length === 0}
                     className={`group flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/25 border border-emerald-500/30 ${
                        isProcessing || selectedIndices.length === 0
                           ? 'opacity-70 cursor-not-allowed'
                           : ''
                     }`}
                  >
                     {isProcessing ? (
                        <>
                           <Loader2 className="w-5 h-5 animate-spin" />
                           <span>Processing...</span>
                        </>
                     ) : (
                        <>
                           <Check className="w-5 h-5 group-hover:scale-110 transition-transform" />
                           <span>Confirm Selection</span>
                        </>
                     )}
                  </button>
               </div>

               {/* Additional info */}
               <div className="mt-3 text-center">
                  <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                     <Sparkles className="w-4 h-4" />
                     {selectedIndices.length > 0 
                        ? `Ready to create podcast from ${selectedIndices.length} selected source${selectedIndices.length > 1 ? 's' : ''}`
                        : 'Select at least one source to continue'
                     }
                  </p>
               </div>
            </div>
         </div>
      </div>
   );
};

export default SourceSelection;