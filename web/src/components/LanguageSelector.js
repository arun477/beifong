import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, Globe2, X } from 'lucide-react';

const LanguageSelector = ({ languages, selectedLanguage, onSelectLanguage, isDisabled }) => {
   // Use provided languages or default to English
   const availableLanguages = languages || [{ code: 'en', name: 'English' }];
   
   const [isOpen, setIsOpen] = useState(false);
   const [searchQuery, setSearchQuery] = useState('');
   const [filteredLanguages, setFilteredLanguages] = useState(availableLanguages);
   const searchInputRef = useRef(null);

   // Filter languages based on search query
   useEffect(() => {
      if (!searchQuery) {
         setFilteredLanguages(availableLanguages);
      } else {
         const filtered = availableLanguages.filter(lang =>
            lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lang.code.toLowerCase().includes(searchQuery.toLowerCase())
         );
         setFilteredLanguages(filtered);
      }
   }, [searchQuery, availableLanguages]);

   // Focus search input when modal opens
   useEffect(() => {
      if (isOpen && searchInputRef.current) {
         setTimeout(() => searchInputRef.current.focus(), 100);
      }
   }, [isOpen]);

   // Handle language selection - call with just the code like the old component
   const handleLanguageSelect = (language) => {
      onSelectLanguage(language.code);
      setIsOpen(false);
      setSearchQuery('');
   };

   const handleClose = () => {
      setIsOpen(false);
      setSearchQuery('');
   };

   const selectedLang = availableLanguages.find(lang => lang.code === selectedLanguage);

   // Get flag emoji from language code - only for clear, unambiguous mappings
   const getFlagEmoji = (code) => {
      // Only include languages that are clearly associated with a single country
      // Avoid sub-languages, regional variants, or languages spoken across multiple countries
      const clearCountryMap = {
         'en': 'US', // English - using US as most common
         'zh': 'CN', // Chinese - simplified Chinese
         'es': 'ES', // Spanish - using Spain
         'fr': 'FR', // French - using France
         'de': 'DE', // German
         'ja': 'JP', // Japanese
         'ko': 'KR', // Korean
         'ru': 'RU', // Russian
         'it': 'IT', // Italian
         'pt': 'PT', // Portuguese - using Portugal
         'nl': 'NL', // Dutch
         'sv': 'SE', // Swedish
         'no': 'NO', // Norwegian
         'da': 'DK', // Danish
         'fi': 'FI', // Finnish
         'pl': 'PL', // Polish
         'tr': 'TR', // Turkish
         'he': 'IL', // Hebrew
         'cs': 'CZ', // Czech
         'hu': 'HU', // Hungarian
         'th': 'TH', // Thai
         'vi': 'VN', // Vietnamese
         'uk': 'UA', // Ukrainian
         'is': 'IS', // Icelandic
      };

      // For languages with clear country associations, show flag
      if (clearCountryMap[code.toLowerCase()]) {
         const countryCode = clearCountryMap[code.toLowerCase()];
         try {
            return String.fromCodePoint(...countryCode.split('').map(char => 
               127397 + char.charCodeAt(0)
            ));
         } catch {
            return '🌐';
         }
      }
      
      // For all other languages (sub-languages, regional variants, etc.), use globe
      return '🌐';
   };

   return (
      <>
         <div className="mt-2 pt-2 border-t border-gray-700/30">
            <div className="mb-2">
               <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                  <Globe2 className="w-3 h-3" />
                  Podcast Language
               </label>
            </div>

            {/* Selected language display button */}
            <button
               onClick={() => !isDisabled && setIsOpen(true)}
               disabled={isDisabled}
               className={`w-full flex items-center justify-between px-2 py-1.5 bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-gray-700/50 rounded-lg transition-all duration-200 ${
                  isDisabled
                     ? 'opacity-50 cursor-not-allowed'
                     : 'hover:border-gray-600/50 hover:bg-gradient-to-r hover:from-gray-700/50 hover:to-gray-600/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50'
               }`}
            >
               <div className="flex items-center gap-2">
                  {selectedLang ? (
                     <>
                        <span className="text-sm" role="img" aria-label="flag">
                           {getFlagEmoji(selectedLang.code)}
                        </span>
                        <span className="text-xs font-medium text-white">
                           {selectedLang.name}
                        </span>
                        <span className="text-[10px] text-gray-400 uppercase bg-gray-700/50 px-1 py-0.5 rounded-sm">
                           {selectedLang.code}
                        </span>
                     </>
                  ) : (
                     <span className="text-xs text-gray-400">Select language...</span>
                  )}
               </div>
               <ChevronDown className="w-3 h-3 text-gray-400 transition-transform duration-200" />
            </button>
         </div>

         {/* Language Selection Modal */}
         {isOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border border-gray-700/50 w-full max-w-sm max-h-[60vh] flex flex-col shadow-xl">
                  {/* Modal Header */}
                  <div className="px-3 py-2 border-b border-gray-700/30 flex items-center justify-between">
                     <div>
                        <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                           <Globe2 className="w-3 h-3 text-emerald-400" />
                           Select Language
                        </h3>
                        <p className="text-xs text-gray-400">
                           Choose podcast language
                        </p>
                     </div>
                     <button
                        onClick={handleClose}
                        className="p-1 text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 rounded-md transition-all duration-200"
                     >
                        <X className="w-3 h-3" />
                     </button>
                  </div>

                  {/* Search input - only show if more than 5 languages */}
                  {availableLanguages.length > 5 && (
                     <div className="p-2 border-b border-gray-700/30">
                        <div className="relative">
                           <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                           <input
                              ref={searchInputRef}
                              type="text"
                              placeholder="Search languages..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-7 pr-2 py-1.5 bg-gray-800/50 border border-gray-700/50 rounded-md text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent"
                           />
                        </div>
                     </div>
                  )}

                  {/* Languages list */}
                  <div className="flex-1 overflow-y-auto p-2">
                     {filteredLanguages.length > 0 ? (
                        <div className="space-y-1">
                           {filteredLanguages.map((language) => (
                              <button
                                 key={language.code}
                                 onClick={() => handleLanguageSelect(language)}
                                 className={`w-full flex items-center gap-2 px-2 py-1.5 text-left transition-all duration-200 rounded-md ${
                                    selectedLanguage === language.code
                                       ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-white'
                                       : 'hover:bg-gray-700/30 text-gray-300 hover:text-white border border-transparent hover:border-gray-600/50'
                                 }`}
                              >
                                 <span className="text-sm" role="img" aria-label="flag">
                                    {getFlagEmoji(language.code)}
                                 </span>
                                 <div className="flex-1">
                                    <div className="text-xs font-medium">{language.name}</div>
                                    <div className="text-[10px] text-gray-400 uppercase">
                                       {language.code}
                                    </div>
                                 </div>
                                 {selectedLanguage === language.code && (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                 )}
                              </button>
                           ))}
                        </div>
                     ) : (
                        <div className="text-center text-gray-400 py-4">
                           <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                           <p className="text-xs font-medium">No languages found</p>
                           <p className="text-[10px] mt-1">Try a different search term</p>
                        </div>
                     )}
                  </div>

                  {/* Footer with language count */}
                  {availableLanguages.length > 5 && (
                     <div className="px-3 py-2 bg-gray-800/30 border-t border-gray-700/30 rounded-b-lg">
                        <p className="text-[10px] text-gray-500 text-center">
                           {filteredLanguages.length} language{filteredLanguages.length !== 1 ? 's' : ''} available
                           {searchQuery && ` (filtered from ${availableLanguages.length})`}
                        </p>
                     </div>
                  )}
               </div>
            </div>
         )}
      </>
   );
};

export default LanguageSelector;