import React, { useState, useEffect } from 'react';
import { Check, Loader2, FileText, Sparkles, Eye, X, Users, Calendar, Globe } from 'lucide-react';

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

const ScriptConfirmation = ({
   scriptText,
   onApprove,
   isProcessing,
   isModalOpen,
   onToggleModal,
   generated_script,
}) => {
   const [selectedSection, setSelectedSection] = useState(null);

   // Use structured script data if available, fallback to scriptText
   const scriptData = generated_script || { sections: [] };
   const hasStructuredScript = generated_script && generated_script.sections;

   // Speaker color mapping for consistent styling
   const speakerColors = {
      ALEX: 'from-emerald-500 to-teal-500',
      MORGAN: 'from-purple-500 to-pink-500',
      default: 'from-blue-500 to-indigo-500'
   };

   const getSpeakerColor = (speaker) => {
      return speakerColors[speaker] || speakerColors.default;
   };

   // Format script text for fallback display
   const formatScriptMarkdown = text =>
      text
         .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-6 mb-3 text-white">$1</h1>')
         .replace(
            /^## (.*$)/gm,
            '<h2 class="text-lg font-semibold mt-5 mb-2 text-gray-100">$1</h2>'
         )
         .replace(
            /^### (.*$)/gm,
            '<h3 class="text-base font-medium mt-4 mb-2 text-gray-200">$3</h3>'
         )
         .replace(/\[([^\]]+)\]:/g, '<strong class="text-emerald-400">$1:</strong>')
         .replace(/\n/g, '<br>');

   // Get preview of script (first few lines)
   const getScriptPreview = () => {
      if (hasStructuredScript && scriptData.sections.length > 0) {
         const firstSection = scriptData.sections[0];
         if (firstSection.dialog && firstSection.dialog.length > 0) {
            return firstSection.dialog.slice(0, 2).map((line, index) => (
               <div key={index} className="mb-2">
                  <span className={`inline-block px-3 py-1 text-xs font-medium bg-gradient-to-r ${getSpeakerColor(line.speaker)} text-white rounded-full mr-3 min-w-16 text-center`}>
                     {line.speaker}
                  </span>
                  <span className="text-gray-300">{line.text}</span>
               </div>
            ));
         }
      }
      // Fallback to markdown format
      return <div dangerouslySetInnerHTML={{ __html: formatScriptMarkdown(scriptText.split('\n').slice(0, 4).join('\n') + '...') }} />;
   };

   const formatSectionType = (type) => {
      return type.charAt(0).toUpperCase() + type.slice(1);
   };

   // Count total dialog lines
   const getTotalLines = () => {
      if (!hasStructuredScript) return null;
      return scriptData.sections.reduce((total, section) => total + (section.dialog ? section.dialog.length : 0), 0);
   };

   // Get unique speakers
   const getSpeakers = () => {
      if (!hasStructuredScript) return [];
      const speakers = new Set();
      scriptData.sections.forEach(section => {
         if (section.dialog) {
            section.dialog.forEach(line => speakers.add(line.speaker));
         }
      });
      return Array.from(speakers);
   };

   return (
      <>
         <div className="w-full max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-gray-900 via-gray-850 to-gray-800 rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50 transition-all duration-300 hover:shadow-3xl">
               {/* Enhanced Header */}
               <div className="relative px-6 py-4 bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur border-b border-gray-700/30">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-teal-600/5" />
                  <div className="relative flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-lg">
                           <FileText className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                           <h3 className="text-lg font-semibold text-white">
                              Podcast Script Preview
                           </h3>
                           <div className="flex items-center gap-4 mt-1">
                              {hasStructuredScript && scriptData.title && (
                                 <p className="text-sm text-gray-400">"{scriptData.title}"</p>
                              )}
                           </div>
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        {hasStructuredScript && (
                           <div className="flex items-center gap-3 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                 <Users className="w-3 h-3" />
                                 {getSpeakers().length}
                              </span>
                              <span className="flex items-center gap-1">
                                 <FileText className="w-3 h-3" />
                                 {getTotalLines()}
                              </span>
                           </div>
                        )}
                        <button
                           onClick={onToggleModal}
                           disabled={isProcessing}
                           className="group flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white text-xs font-medium rounded-lg transition-all duration-200 hover:scale-105 border border-gray-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                           <Eye className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                           View Full
                        </button>
                     </div>
                  </div>
               </div>

               {/* Script Preview */}
               <div className="px-6 py-6">
                  <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-xl p-6 border border-gray-600/30 backdrop-blur-sm">
                     {hasStructuredScript ? (
                        <div className="space-y-3">
                           {getScriptPreview()}
                           <div className="pt-3 border-t border-gray-600/30">
                              <div className="text-emerald-400 text-sm font-medium cursor-pointer hover:underline flex items-center gap-2" onClick={() => !isProcessing && onToggleModal()}>
                                 <Sparkles className="w-4 h-4" />
                                 Click to read the complete script with {scriptData.sections.length} sections...
                              </div>
                           </div>
                        </div>
                     ) : (
                        <div>
                           <div className="text-sm text-gray-300" dangerouslySetInnerHTML={{ __html: formatScriptMarkdown(scriptText.split('\n').slice(0, 4).join('\n') + '...') }} />
                           <div className="pt-3 border-t border-gray-600/30">
                              <div className="text-emerald-400 text-sm cursor-pointer hover:underline flex items-center gap-2" onClick={() => !isProcessing && onToggleModal()}>
                                 <Sparkles className="w-4 h-4" />
                                 Click to expand full script...
                              </div>
                           </div>
                        </div>
                     )}
                  </div>

                  {/* Script Sections Overview */}
                  {hasStructuredScript && scriptData.sections.length > 0 && (
                     <div className="mt-4">
                        <div className="flex flex-wrap gap-2">
                           {scriptData.sections.map((section, index) => (
                              <div
                                 key={index}
                                 className="px-3 py-1.5 bg-gray-700/50 text-gray-300 text-xs rounded-full border border-gray-600/30"
                              >
                                 {formatSectionType(section.type)}
                                 {section.title && ` - ${section.title.substring(0, 30)}...`}
                              </div>
                           ))}
                        </div>
                     </div>
                  )}
               </div>

               {/* Enhanced Actions Section */}
               <div className="px-6 py-4 bg-gradient-to-r from-gray-900/50 to-gray-800/50 backdrop-blur border-t border-gray-700/30">
                  <div className="flex justify-center">
                     <button
                        onClick={onApprove}
                        disabled={isProcessing}
                        className={`group flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/25 border border-emerald-500/30 ${
                           isProcessing ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                        aria-disabled={isProcessing}
                     >
                        {isProcessing ? (
                           <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Processing...</span>
                           </>
                        ) : (
                           <>
                              <Check className="w-5 h-5 group-hover:scale-110 transition-transform" />
                              <span>Approve Script</span>
                           </>
                        )}
                     </button>
                  </div>

                  {/* Additional info */}
                  <div className="mt-3 text-center">
                     <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                        <FileText className="w-4 h-4" />
                        {hasStructuredScript 
                           ? 'Review the complete script with speaker dialogs and sections'
                           : 'Review the complete script before approval'
                        }
                     </p>
                  </div>
               </div>
            </div>
         </div>

         {/* Enhanced Full Script Modal */}
         {isModalOpen && (
            <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700/50 max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl">
                  {/* Modal Header */}
                  <div className="px-6 py-4 border-b border-gray-700/30 flex items-center justify-between">
                     <div>
                        <h3 className="text-xl font-semibold text-white">Complete Podcast Script</h3>
                        {hasStructuredScript && scriptData.title && (
                           <p className="text-sm text-gray-400 mt-1">{scriptData.title}</p>
                        )}
                     </div>
                     <button
                        onClick={onToggleModal}
                        disabled={isProcessing}
                        className="p-2 text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        <X className="w-6 h-6" />
                     </button>
                  </div>

                  {/* Script Content */}
                  <div className="flex-1 overflow-hidden">
                     {hasStructuredScript ? (
                        <div className="flex h-full">
                           {/* Section Navigation */}
                           <div className="w-64 border-r border-gray-700/30 bg-gray-800/30 overflow-y-auto">
                              <div className="p-4">
                                 <h4 className="text-sm font-medium text-gray-300 mb-3">Sections</h4>
                                 <div className="space-y-2">
                                    {scriptData.sections.map((section, index) => (
                                       <button
                                          key={index}
                                          onClick={() => setSelectedSection(index)}
                                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                                             selectedSection === index
                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
                                          }`}
                                       >
                                          <div className="font-medium">{formatSectionType(section.type)}</div>
                                          {section.title && (
                                             <div className="text-xs text-gray-500 mt-0.5 truncate">
                                                {section.title}
                                             </div>
                                          )}
                                          {section.dialog && (
                                             <div className="text-xs text-gray-500 mt-0.5">
                                                {section.dialog.length} lines
                                             </div>
                                          )}
                                       </button>
                                    ))}
                                 </div>
                              </div>
                           </div>

                           {/* Script Content */}
                           <div className="flex-1 overflow-y-auto p-6">
                              {scriptData.sections.map((section, sectionIndex) => (
                                 <div key={sectionIndex} className={`mb-8 ${selectedSection !== null && selectedSection !== sectionIndex ? 'hidden' : ''}`}>
                                    <div className="mb-4">
                                       <h2 className="text-lg font-semibold text-white mb-1">
                                          {formatSectionType(section.type)}
                                          {section.title && ` - ${section.title}`}
                                       </h2>
                                       <div className="h-px bg-gradient-to-r from-emerald-500/50 to-transparent" />
                                    </div>
                                    {section.dialog ? (
                                       <div className="space-y-4">
                                          {section.dialog.map((line, lineIndex) => (
                                             <div key={lineIndex} className="flex gap-4 items-start">
                                                <div className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium bg-gradient-to-r ${getSpeakerColor(line.speaker)} text-white rounded-full min-w-18 text-center`}>
                                                   {line.speaker}
                                                </div>
                                                <div className="flex-1 text-gray-300 leading-relaxed pt-0.5">
                                                   {line.text}
                                                </div>
                                             </div>
                                          ))}
                                       </div>
                                    ) : (
                                       <div className="text-gray-400 italic">No dialog for this section</div>
                                    )}
                                 </div>
                              ))}

                              {/* Sources Section */}
                              {scriptData.sources && scriptData.sources.length > 0 && (
                                 <div className="mt-8 pt-6 border-t border-gray-700/30">
                                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                       <Globe className="w-5 h-5" />
                                       Sources
                                    </h3>
                                    <div className="space-y-3">
                                       {scriptData.sources.map((source, index) => (
                                          <a
                                             key={index}
                                             href={source}
                                             target="_blank"
                                             rel="noopener noreferrer"
                                             className="group flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700/30 hover:border-gray-600/50 hover:bg-gray-700/30 transition-all duration-200"
                                          >
                                             <div className="flex-shrink-0">
                                                <SourceIcon url={source} />
                                             </div>
                                             <div className="flex-1 min-w-0">
                                                <div className="text-emerald-400 group-hover:text-emerald-300 text-sm font-medium truncate">
                                                   {new URL(source).hostname}
                                                </div>
                                                <div className="text-gray-500 text-xs truncate mt-0.5">
                                                   {source}
                                                </div>
                                             </div>
                                          </a>
                                       ))}
                                    </div>
                                 </div>
                              )}
                           </div>
                        </div>
                     ) : (
                        <div className="p-6 overflow-y-auto h-full">
                           <div
                              className="prose prose-invert prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: formatScriptMarkdown(scriptText) }}
                           />
                        </div>
                     )}
                  </div>

                  {/* Modal Footer */}
                  <div className="px-6 py-4 border-t border-gray-700/30 flex justify-end">
                     <button
                        onClick={() => {
                           onToggleModal();
                           onApprove();
                        }}
                        disabled={isProcessing}
                        className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/25 border border-emerald-500/30 ${
                           isProcessing ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                     >
                        {isProcessing ? (
                           <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Processing...
                           </>
                        ) : (
                           <>
                              <Check className="w-5 h-5" />
                              Approve Script
                           </>
                        )}
                     </button>
                  </div>
               </div>
            </div>
         )}
      </>
   );
};

export default ScriptConfirmation;