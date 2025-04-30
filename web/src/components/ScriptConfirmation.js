import React from 'react';

const ScriptConfirmation = ({
   scriptText,
   onApprove,
   isProcessing,
   isModalOpen,
   onToggleModal,
}) => {
   const formatScriptMarkdown = text =>
      text
         .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-6 mb-3 text-white">$1</h1>')
         .replace(
            /^## (.*$)/gm,
            '<h2 class="text-lg font-semibold mt-5 mb-2 text-gray-100">$1</h2>'
         )
         .replace(
            /^### (.*$)/gm,
            '<h3 class="text-base font-medium mt-4 mb-2 text-gray-200">$1</h3>'
         )
         .replace(/\[([^\]]+)\]:/g, '<strong class="text-emerald-400">$1:</strong>')
         .replace(/\n/g, '<br>');

   const getScriptPreview = () =>
      formatScriptMarkdown(scriptText.split('\n').slice(0, 4).join('\n') + '...');

   return (
      <>
         <div className="fade-in mb-4">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 backdrop-blur-sm border border-gray-700 rounded-sm overflow-hidden shadow-lg">
               <div className="px-4 py-3 border-b border-gray-700 flex items-center">
                  <div className="text-sm font-medium text-white">Podcast Script</div>
                  <button
                     onClick={onToggleModal}
                     disabled={isProcessing}
                     className={`ml-auto text-xs px-2 py-1 bg-gray-900/70 text-gray-300 hover:text-white rounded-sm transition ${
                        isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                     }`}
                  >
                     View Full Script
                  </button>
               </div>
               <div className="p-4">
                  <div
                     className="text-sm text-gray-300 line-clamp-3"
                     dangerouslySetInnerHTML={{ __html: getScriptPreview() }}
                  />
                  <div
                     className="text-xs text-emerald-400 mt-2 cursor-pointer hover:underline"
                     onClick={() => !isProcessing && onToggleModal()}
                  >
                     Click to expand...
                  </div>
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
                           Approve Script
                        </>
                     )}
                  </button>
               </div>
            </div>
         </div>
         {isModalOpen && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
               <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-sm border border-gray-700 max-w-2xl w-full max-h-[90vh] flex flex-col">
                  <div className="p-4 border-b border-gray-700 flex items-center">
                     <h3 className="font-medium text-white">Complete Podcast Script</h3>
                     <button
                        onClick={onToggleModal}
                        disabled={isProcessing}
                        className={`ml-auto text-gray-400 hover:text-white ${
                           isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                     >
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                           />
                        </svg>
                     </button>
                  </div>
                  <div className="p-6 overflow-y-auto custom-scrollbar flex-grow">
                     <div
                        className="prose prose-invert prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: formatScriptMarkdown(scriptText) }}
                     />
                  </div>
                  <div className="p-4 border-t border-gray-700 flex justify-end">
                     <button
                        onClick={() => {
                           onToggleModal();
                           onApprove();
                        }}
                        disabled={isProcessing}
                        className={`px-4 py-2 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition ${
                           isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                     >
                        {isProcessing ? 'Processing...' : 'Approve Script'}
                     </button>
                  </div>
               </div>
            </div>
         )}
      </>
   );
};

export default ScriptConfirmation;
