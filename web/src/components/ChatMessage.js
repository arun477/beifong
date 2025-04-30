import React from 'react';

const ChatMessage = ({ message, role }) => {
   const formatMarkdown = content => {
      try {
         return content
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>')
            .replace(
               /!\[(.*?)\]\((.*?)\)/g,
               '<img src="$2" alt="$1" class="max-w-full rounded-sm my-2 border border-gray-700">'
            )
            .replace(
               /• (.*?)(?:<br>|$)/g,
               '<div class="flex mt-1"><span class="mr-2 text-emerald-400">•</span><span>$1</span></div>'
            );
      } catch (error) {
         console.error('Error formatting message:', error);
         return content;
      }
   };

   return role === 'user' ? (
      <div className="mb-4 flex justify-end fade-in">
         <div className="max-w-[80%] bg-gradient-to-r from-emerald-700 to-emerald-800 text-white px-4 py-3 rounded-md rounded-tr-none text-sm shadow-md">
            {message}
         </div>
      </div>
   ) : (
      <div className="mb-4 flex fade-in">
         <div className="w-10 h-10 rounded-full relative flex-shrink-0 mr-3 mt-1">
            <div className="absolute inset-0 flex items-center justify-center">
               <span
                  className="text-2xl filter"
                  style={{
                     textShadow: '0 0 10px rgba(16, 185, 129, 0.5)',
                     fontSize: '1.3rem',
                     zIndex: 3,
                  }}
               >
                  🦉
               </span>
            </div>
            <div className="absolute inset-0 bg-emerald-500 opacity-10 rounded-full blur-md"></div>
            <div className="absolute inset-0 rounded-full border border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900"></div>
         </div>
         <div
            className="max-w-[80%] bg-gradient-to-r from-gray-800 to-gray-900 text-gray-200 px-4 py-3 rounded-md rounded-tl-none text-sm shadow-md"
            dangerouslySetInnerHTML={{ __html: formatMarkdown(message) }}
         />
      </div>
   );
};

export const LoadingIndicator = () => {
   const message = 'The agent is working. Please wait this may take a while...';
   return (
      <div className="mb-6 flex items-center p-4 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl fade-in">
         <div className="w-12 h-12 relative flex-shrink-0 mr-4">
            <div className="absolute inset-0 bg-emerald-500 opacity-20 rounded-full blur-lg animate-pulse"></div>
            <div
               className="absolute inset-0 rounded-full border-2 border-emerald-300 border-dashed animate-spin"
               style={{ animationDuration: '2s' }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-center z-10">
               <span
                  className="text-3xl"
                  style={{ textShadow: '0 0 10px rgba(16, 185, 129, 0.5)' }}
               >
                  🦉
               </span>
            </div>
         </div>
         <div className="flex items-center">
            <span className="text-gray-100 font-semibold tracking-wide mr-2">{message}</span>
            {[0, 1, 2].map(i => (
               <span
                  key={i}
                  className="w-2 h-2 bg-emerald-400 rounded-full mx-0.5 animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }}
               />
            ))}
         </div>
      </div>
   );
};

export default ChatMessage;
