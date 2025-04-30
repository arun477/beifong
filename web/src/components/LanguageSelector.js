import React from 'react';

const LanguageSelector = ({ languages, selectedLanguage, onSelectLanguage, isDisabled }) => {
   const availableLanguages = languages || [{ code: 'en', name: 'English' }];
   return (
      <div className="mt-3 mb-4 border-t border-gray-700 pt-3">
         <div className="flex items-center mb-2">
            <div className="w-4 h-4 text-emerald-400 mr-1">
               <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
               >
                  <path
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802"
                  />
               </svg>
            </div>
            <span className="text-sm font-medium text-white">Podcast Language:</span>
         </div>
         <div className="flex flex-wrap gap-1">
            {availableLanguages.map(lang => (
               <button
                  key={lang.code}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                     selectedLanguage === lang.code
                        ? 'bg-emerald-800 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !isDisabled && onSelectLanguage(lang.code)}
                  disabled={isDisabled}
               >
                  {lang.name}
               </button>
            ))}
         </div>
      </div>
   );
};

export default LanguageSelector;
