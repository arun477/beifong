import React from 'react';
import { Link } from 'react-router-dom';
import {
   MessageCircle,
   Heart,
   Share2,
   CheckCircle,
   BarChart2,
   Smile,
   Frown,
   AlertCircle,
   Minus,
} from 'lucide-react';

// Helper functions
const formatDate = dateStr => {
   if (!dateStr) return 'N/A';
   try {
      const date = new Date(dateStr);
      return date.toLocaleDateString().split('/')[0];
   } catch (e) {
      return 'Invalid Date';
   }
};

// Format numbers to K notation with more aggressive formatting for very large numbers
const formatNumber = number => {
   if (!number || isNaN(number)) return '0';

   // More aggressive formatting for very large numbers (millions)
   if (number >= 1000000) {
      return (number / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
   }

   // Aggressive formatting for large numbers (thousands)
   if (number >= 10000) {
      return Math.floor(number / 1000) + 'k';
   }

   // Standard formatting for moderate numbers (thousands with decimal)
   if (number >= 1000) {
      return (number / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
   }

   return number.toString();
};

const getPlatformIcon = platform => {
   switch (platform) {
      case 'x':
         return (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
               <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
         );
      case 'facebook':
         return (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
               <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
         );
      case 'instagram':
         return (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
               <path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153.509.5.902 1.105 1.153 1.772.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 01-1.153 1.772c-.5.508-1.105.902-1.772 1.153-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 01-1.772-1.153 4.904 4.904 0 01-1.153-1.772c-.247-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 011.153-1.772A4.897 4.897 0 015.45 2.525c.638-.247 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 5a5 5 0 100 10 5 5 0 000-10zm6.5-.25a1.25 1.25 0 10-2.5 0 1.25 1.25 0 002.5 0zM12 9a3 3 0 110 6 3 3 0 010-6z" />
            </svg>
         );
      case 'linkedin':
         return (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
               <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
         );
      default:
         return (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
               <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
         );
   }
};

// Sentiment related helpers
const getSentimentIcon = sentiment => {
   switch (sentiment) {
      case 'positive':
         return <Smile className="w-3.5 h-3.5" />;
      case 'negative':
         return <Frown className="w-3.5 h-3.5" />;
      case 'critical':
         return <AlertCircle className="w-3.5 h-3.5" />;
      case 'neutral':
      default:
         return <Minus className="w-3.5 h-3.5" />;
   }
};

const getSentimentColor = sentiment => {
   switch (sentiment) {
      case 'positive':
         return 'bg-emerald-400/10 text-emerald-400';
      case 'negative':
         return 'bg-red-400/10 text-red-400';
      case 'critical':
         return 'bg-orange-400/10 text-orange-400';
      case 'neutral':
      default:
         return 'bg-gray-600/50 text-gray-300';
   }
};

const getPlatformColor = platform => {
   switch (platform) {
      case 'x':
         return 'text-blue-400';
      case 'facebook':
         return 'text-blue-600';
      case 'instagram':
         return 'text-pink-500';
      case 'linkedin':
         return 'text-blue-700';
      default:
         return 'text-gray-400';
   }
};

const PostItem = ({ post }) => {
   if (!post) return null;

   // Get sentiment and impact score with fallbacks
   const sentiment = post.sentiment || 'neutral';
   const impactScore = post.impact_score || 0;

   // Handle missing values
   const commentsCount = post.comments_count || 0;
   const likesCount = post.likes_count || 0;
   const repostsCount = post.reposts_count || 0;
   const sharesCount = post.shares_count || 0;

   // Use shares count if reposts are not available and vice versa
   const shareOrRepostCount = repostsCount || sharesCount || 0;

   // Check for large numbers to adapt layout
   const hasLargeNumbers = commentsCount >= 100 || likesCount >= 100 || shareOrRepostCount >= 100;

   // Check for very high engagement (requiring special treatment)
   const hasVeryHighEngagement =
      commentsCount > 200 || shareOrRepostCount > 200 || likesCount > 1000;

   return (
      <Link
         to={`/social-media/${post.id}`}
         className="block bg-gray-800/30 hover:bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 hover:border-gray-600/70 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg overflow-hidden relative group h-full flex flex-col"
      >
         {/* Thin sentiment indicator strip at the top */}
         <div
            className={`absolute top-0 left-0 right-0 h-0.5 ${
               getSentimentColor(sentiment).split(' ')[0]
            }`}
         ></div>

         {/* Header */}
         <div className="flex flex-col px-3.5 py-2.5 border-b border-gray-700/30">
            {/* Row 1: Author info and platform icon with sentiment icon on right */}
            <div className="flex items-center gap-2.5 justify-between">
               <div className="flex items-center gap-2.5">
                  {/* Platform Icon */}
                  <div className="min-w-8 w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700 shadow-inner overflow-hidden">
                     <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-gray-800 to-gray-900">
                        {getPlatformIcon(post.platform)}
                     </div>
                  </div>

                  {/* Author info */}
                  <div className="min-w-0">
                     <div className="flex items-center gap-1">
                        <span className="text-white font-medium text-sm truncate max-w-[700%]">
                           {post.author_name || 'Unknown Author'}
                        </span>
                        {post.author_is_verified && (
                           <CheckCircle className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                        )}
                     </div>
                  </div>
               </div>
            </div>

            {/* Row 2: Author details */}
            <div className="flex items-center flex-wrap text-gray-400 text-xs mt-1">
               <span className="truncate max-w-[100px] inline-block">
                  @
                  {post.author_handle ||
                     post.author_name?.toLowerCase().replace(/\s/g, '') ||
                     'unknown'}
               </span>
               <span className="text-gray-500 mx-1 flex-shrink-0">·</span>
               <span
                  className={`text-xs ${getPlatformColor(
                     post.platform
                  )} flex-shrink-0 font-medium mr-0.5`}
               >
                  {post.platform || 'web'}
               </span>
               <span className="text-gray-500 mx-1 flex-shrink-0">·</span>
               <span className="text-gray-500 flex-shrink-0">{formatDate(post.post_datetime)}</span>
            </div>

            {/* Row 3: Sentiment Indicator Only */}
            <div className="flex items-center mt-2">
               {/* Sentiment indicator */}
               <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full ${getSentimentColor(
                     sentiment
                  )}`}
                  title={`${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)} sentiment`}
               >
                  {getSentimentIcon(sentiment)}
                  <span className="sr-only">{sentiment}</span>
               </div>
            </div>
         </div>

         {/* Content */}
         <div className="px-4 py-3.5 flex-grow min-h-[80px]">
            <p className="text-gray-200 text-sm leading-relaxed line-clamp-3 group-hover:text-white transition-colors duration-200">
               {post.message || 'No content available'}
            </p>
         </div>

         {/* Footer - Only engagement metrics now */}
         <div className="border-t border-gray-700/30 bg-gray-800/40 backdrop-blur-sm">
            {/* For very high engagement numbers, use a stacked 2-row layout */}
            {hasVeryHighEngagement ? (
               <div className="py-2 px-3.5">
                  {/* Engagement metrics */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                     <div className="flex items-center gap-2">
                        {commentsCount > 0 && (
                           <div className="flex items-center min-w-[60px]">
                              <MessageCircle className="w-3 h-3 text-gray-400 mr-1" />
                              <span className="text-xs text-gray-400">
                                 {formatNumber(commentsCount)}
                              </span>
                           </div>
                        )}

                        {shareOrRepostCount > 0 && (
                           <div className="flex items-center min-w-[60px]">
                              <Share2 className="w-3 h-3 text-gray-400 mr-1" />
                              <span className="text-xs text-gray-400">
                                 {formatNumber(shareOrRepostCount)}
                              </span>
                           </div>
                        )}

                        {likesCount > 0 && (
                           <div className="flex items-center min-w-[60px]">
                              <Heart className="w-3 h-3 text-gray-400 mr-1" />
                              <span className="text-xs text-gray-400">
                                 {formatNumber(likesCount)}
                              </span>
                           </div>
                        )}
                     </div>

                     {/* Impact score */}
                     {impactScore > 0 && (
                        <div
                           className="flex items-center justify-center gap-1 py-1 px-2 rounded-full bg-gray-700/50 text-gray-200"
                           title={`Impact score: ${impactScore.toFixed(1)}`}
                        >
                           <BarChart2 className="w-3.5 h-3.5" />
                           <span className="text-xs font-medium">{impactScore.toFixed(1)}</span>
                        </div>
                     )}
                  </div>
               </div>
            ) : (
               /* Standard layout for normal numbers */
               <div className="py-2 px-3.5 flex items-center justify-between">
                  {/* Left side - engagement metrics */}
                  <div className="flex items-center gap-4">
                     {commentsCount > 0 && (
                        <div className="flex items-center">
                           <MessageCircle className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                           <span className="text-xs text-gray-400">
                              {formatNumber(commentsCount)}
                           </span>
                        </div>
                     )}

                     {shareOrRepostCount > 0 && (
                        <div className="flex items-center">
                           <Share2 className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                           <span className="text-xs text-gray-400">
                              {formatNumber(shareOrRepostCount)}
                           </span>
                        </div>
                     )}

                     {likesCount > 0 && (
                        <div className="flex items-center">
                           <Heart className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                           <span className="text-xs text-gray-400">{formatNumber(likesCount)}</span>
                        </div>
                     )}
                  </div>

                  {/* Right side - impact score */}
                  {impactScore > 0 && (
                     <div
                        className="flex items-center justify-center gap-1 py-1 px-2 rounded-full bg-gray-700/50 text-gray-200"
                        title={`Impact score: ${impactScore.toFixed(1)}`}
                     >
                        <BarChart2 className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">{impactScore.toFixed(1)}</span>
                     </div>
                  )}
               </div>
            )}
         </div>
      </Link>
   );
};

export default PostItem;
