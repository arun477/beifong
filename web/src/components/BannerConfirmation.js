import React from 'react';

const BannerConfirmation = ({ bannerUrl, topic, onApprove, isProcessing }) => {
   return (
      <div className="fade-in mb-4">
         <div className="bg-gradient-to-br from-gray-800 to-gray-900 backdrop-blur-sm border border-gray-700 rounded-sm overflow-hidden shadow-lg">
            <div className="px-4 py-3 border-b border-gray-700">
               <div className="text-sm font-medium text-white">Podcast Banner</div>
            </div>
            <div className="p-4 flex items-center justify-center">
               <img
                  src={bannerUrl}
                  alt="Podcast Banner"
                  className="max-h-40 rounded-sm shadow-md"
               />
            </div>
            <div className="px-4 pb-4 text-center">
               <div className="text-xs text-gray-400">Banner for "{topic}" Podcast</div>
            </div>
            <div className="px-4 py-3 bg-gradient-to-r from-gray-800 to-gray-900 flex justify-end">
               <button
                  onClick={onApprove}
                  disabled={isProcessing}
                  className={`text-sm px-4 py-1.5 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium rounded-sm transition flex items-center ${
                     isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
               >
                  {isProcessing ? (
                     <>
                        <svg
                           className="animate-spin h-4 w-4 mr-1.5 text-white"
                           viewBox="0 0 24 24"
                           fill="none"
                        >
                           <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                           />
                           <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                           />
                        </svg>
                        Processing...
                     </>
                  ) : (
                     <>
                        <svg className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                           <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                           />
                        </svg>
                        Approve Banner
                     </>
                  )}
               </button>
            </div>
         </div>
      </div>
   );
};

export default BannerConfirmation;
