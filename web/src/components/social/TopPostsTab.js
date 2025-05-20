import React from 'react';
import { Link } from 'react-router-dom';

const formatDate = dateStr => {
   if (!dateStr) return 'N/A';
   try {
      const date = new Date(dateStr);
      return (
         date.toLocaleDateString() +
         ' ' +
         date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
   } catch (e) {
      return 'Invalid Date';
   }
};

const getPlatformIcon = platform => {
   if (platform === 'x') {
      return (
         <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
         </svg>
      );
   } else if (platform === 'facebook') {
      return (
         <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
         </svg>
      );
   } else {
      return (
         <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
         </svg>
      );
   }
};

const TopPostsTab = ({ topPosts }) => {
   return (
      <div className="space-y-4">
         {topPosts.length === 0 ? (
            <div className="flex justify-center py-16">
               <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full shadow-lg"></div>
            </div>
         ) : (
            <>
               <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/60 rounded-xl p-5 shadow-lg">
                  <h3 className="text-lg font-semibold text-white mb-5 flex items-center">
                     <svg
                        className="w-5 h-5 mr-2 text-emerald-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                     >
                        <path
                           strokeLinecap="round"
                           strokeLinejoin="round"
                           strokeWidth="2"
                           d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                     </svg>
                     Most Engaging Content
                  </h3>
                  <div className="space-y-4">
                     {topPosts.map(post => (
                        <Link
                           key={post.id}
                           to={`/social-media/${post.id}`}
                           className="block bg-gray-800/20 hover:bg-gray-800/40 backdrop-blur-sm border border-gray-700/60 hover:border-gray-600 rounded-xl p-4 transition-all duration-300 shadow-md hover:shadow-lg"
                        >
                           <div className="flex items-start gap-4">
                              <div className="flex-shrink-0">
                                 {post.has_image && post.image_url ? (
                                    <div className="w-16 h-16 bg-gray-700 rounded-xl overflow-hidden shadow-lg">
                                       <img
                                          src={post.image_url}
                                          alt="Post image"
                                          className="w-full h-full object-cover"
                                          onError={e => {
                                             e.target.onerror = null;
                                             e.target.src = 'https://via.placeholder.com/100';
                                          }}
                                       />
                                    </div>
                                 ) : (
                                    <div className="w-16 h-16 bg-gray-700/50 rounded-xl flex items-center justify-center text-gray-500 shadow-lg">
                                       {getPlatformIcon(post.platform)}
                                    </div>
                                 )}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className="text-gray-300 font-medium">
                                       {post.author_name}
                                    </span>
                                    <span className="text-gray-500 text-sm">·</span>
                                    <span className="text-gray-500 text-sm">
                                       {formatDate(post.post_datetime)}
                                    </span>
                                    <div
                                       className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${
                                          post.platform === 'facebook'
                                             ? 'bg-blue-900/40 text-blue-300'
                                             : 'bg-blue-500/30 text-blue-400'
                                       } shadow-sm`}
                                    >
                                       {post.platform}
                                    </div>
                                 </div>
                                 <p className="text-gray-200 leading-relaxed mb-3 line-clamp-2">
                                    {post.message}
                                 </p>
                                 <div className="flex flex-wrap items-center gap-3 text-sm">
                                    <div className="px-3 py-1.5 bg-emerald-900/30 text-emerald-300 rounded-lg flex items-center shadow-md">
                                       <svg
                                          className="w-4 h-4 mr-1.5"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                       >
                                          <path
                                             strokeLinecap="round"
                                             strokeLinejoin="round"
                                             strokeWidth="2"
                                             d="M13 10V3L4 14h7v7l9-11h-7z"
                                          />
                                       </svg>
                                       {post.total_engagement ||
                                          post.comments_count +
                                             post.reactions_count +
                                             post.shares_count +
                                             post.reposts_count +
                                             post.likes_count +
                                             post.bookmarks_count}{' '}
                                       total eng.
                                    </div>
                                    {post.comments_count > 0 && (
                                       <div className="px-3 py-1.5 bg-gray-900/60 text-gray-300 rounded-lg flex items-center shadow-md">
                                          <svg
                                             className="w-4 h-4 mr-1.5"
                                             fill="none"
                                             viewBox="0 0 24 24"
                                             stroke="currentColor"
                                          >
                                             <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                             />
                                          </svg>
                                          {post.comments_count} comments
                                       </div>
                                    )}
                                    {post.likes_count > 0 && (
                                       <div className="px-3 py-1.5 bg-gray-900/60 text-gray-300 rounded-lg flex items-center shadow-md">
                                          <svg
                                             className="w-4 h-4 mr-1.5"
                                             fill="none"
                                             viewBox="0 0 24 24"
                                             stroke="currentColor"
                                          >
                                             <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                             />
                                          </svg>
                                          {post.likes_count} likes
                                       </div>
                                    )}
                                 </div>
                              </div>
                           </div>
                        </Link>
                     ))}
                  </div>
               </div>
            </>
         )}
      </div>
   );
};

export default TopPostsTab;
