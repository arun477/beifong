import React from 'react';
import {
   Users,
   TrendingUp,
   Smile,
   Frown,
   AlertCircle,
   Minus,
   Hash,
   Activity,
} from 'lucide-react';

// Compact Users by Sentiment Card
const CompactUserSentimentCard = ({ userSentiment = [], loading = false }) => {
   const getSentimentIcon = sentiment => {
      switch (sentiment?.toLowerCase()) {
         case 'positive': return <Smile className="w-3 h-3" />;
         case 'negative': return <Frown className="w-3 h-3" />;
         case 'critical': return <AlertCircle className="w-3 h-3" />;
         case 'neutral':
         default: return <Minus className="w-3 h-3" />;
      }
   };

   const getDominantSentiment = user => {
      const values = [
         { type: 'positive', value: user.positive_percent },
         { type: 'negative', value: user.negative_percent },
         { type: 'critical', value: user.critical_percent },
         { type: 'neutral', value: user.neutral_percent },
      ];
      return values.reduce((max, obj) => (obj.value > max.value ? obj : max), values[0]).type;
   };

   const getSentimentColor = sentiment => {
      switch (sentiment) {
         case 'positive': return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', bar: 'from-emerald-500 to-emerald-400' };
         case 'negative': return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', bar: 'from-red-500 to-red-400' };
         case 'critical': return { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', bar: 'from-orange-500 to-orange-400' };
         case 'neutral':
         default: return { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400', bar: 'from-gray-500 to-gray-400' };
      }
   };

   return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl border border-gray-700/40 overflow-hidden">
         {/* Compact Header */}
         <div className="px-4 py-2.5 bg-gradient-to-r from-gray-800/90 to-gray-900/90 border-b border-gray-700/30">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gray-700/50 rounded-lg">
                     <Users size={14} className="text-gray-300" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Top Users Sentiment</h3>
               </div>
               <span className="text-xs text-gray-400 bg-gray-800/60 px-2 py-1 rounded-full">
                  {userSentiment.length}
               </span>
            </div>
         </div>

         {loading ? (
            <div className="flex justify-center items-center py-8">
               <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full border-gray-500"></div>
                  <span className="text-xs text-gray-400">Loading...</span>
               </div>
            </div>
         ) : (
            <div className="p-3 max-h-72 overflow-y-auto space-y-2">
               {userSentiment.map((user, index) => {
                  const dominantSentiment = getDominantSentiment(user);
                  const colors = getSentimentColor(dominantSentiment);

                  return (
                     <div key={user.user_handle || index} className="group relative bg-gray-800/30 hover:bg-gray-800/50 rounded-lg p-2.5 border border-gray-700/40 hover:border-gray-600/60 transition-all duration-200">
                        
                        {/* User Info Row */}
                        <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center border border-gray-600/50 flex-shrink-0">
                                 <span className="text-xs font-medium text-white">
                                    {(user.user_display_name?.[0] || user.user_handle?.[1] || 'U').toUpperCase()}
                                 </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                 <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-medium text-white truncate max-w-24">
                                       {user.user_display_name || user.user_handle?.replace('@', '') || 'Unknown'}
                                    </span>
                                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.border} border`}>
                                       {getSentimentIcon(dominantSentiment)}
                                       <span className={`text-xs ${colors.text}`}>
                                          {dominantSentiment}
                                       </span>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                    <span className="truncate max-w-20">{user.user_handle || '@unknown'}</span>
                                    <span>•</span>
                                    <span>{user.total_posts} posts</span>
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* Compact Sentiment Grid */}
                        <div className="grid grid-cols-4 gap-1.5">
                           {[
                              { key: 'positive', icon: Smile, value: user.positive_percent, color: 'emerald' },
                              { key: 'negative', icon: Frown, value: user.negative_percent, color: 'red' },
                              { key: 'critical', icon: AlertCircle, value: user.critical_percent, color: 'orange' },
                              { key: 'neutral', icon: Minus, value: user.neutral_percent, color: 'gray' }
                           ].map(({ key, icon: Icon, value, color }) => (
                              <div key={key} className="flex flex-col items-center">
                                 <div className="flex items-center gap-1 mb-1">
                                    <Icon size={8} className={`text-${color}-400`} />
                                    <span className={`text-xs text-${color}-400 font-medium`}>
                                       {value.toFixed(0)}%
                                    </span>
                                 </div>
                                 <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                                    <div 
                                       className={`h-full bg-gradient-to-r from-${color}-500 to-${color}-400 rounded-full transition-all duration-300`}
                                       style={{ width: `${Math.max(value, 3)}%` }}
                                    />
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  );
               })}
            </div>
         )}
      </div>
   );
};

// Compact Trending Topics Card
const CompactTrendingTopicsCard = ({ trendingTopics = [], loading = false }) => {
   const getDominantSentiment = topic => {
      const values = [
         { type: 'positive', value: topic.positive_percent },
         { type: 'negative', value: topic.negative_percent },
         { type: 'critical', value: topic.critical_percent },
         { type: 'neutral', value: topic.neutral_percent },
      ];
      return values.reduce((max, obj) => (obj.value > max.value ? obj : max), values[0]).type;
   };

   const getSentimentIcon = sentiment => {
      switch (sentiment?.toLowerCase()) {
         case 'positive': return <Smile className="w-3 h-3" />;
         case 'negative': return <Frown className="w-3 h-3" />;
         case 'critical': return <AlertCircle className="w-3 h-3" />;
         case 'neutral':
         default: return <Minus className="w-3 h-3" />;
      }
   };

   const getSentimentColor = sentiment => {
      switch (sentiment) {
         case 'positive': return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' };
         case 'negative': return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' };
         case 'critical': return { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400' };
         case 'neutral':
         default: return { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400' };
      }
   };

   return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl border border-gray-700/40 overflow-hidden">
         {/* Compact Header */}
         <div className="px-4 py-2.5 bg-gradient-to-r from-gray-800/90 to-gray-900/90 border-b border-gray-700/30">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-700/50 rounded-lg">
                     <TrendingUp size={14} className="text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Trending Topics Sentiment</h3>
               </div>
               <span className="text-xs text-gray-400 bg-gray-800/60 px-2 py-1 rounded-full">
                  {trendingTopics.length}
               </span>
            </div>
         </div>

         {loading ? (
            <div className="flex justify-center items-center py-8">
               <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full border-emerald-500"></div>
                  <span className="text-xs text-emerald-400">Loading...</span>
               </div>
            </div>
         ) : (
            <div className="p-3 max-h-72 overflow-y-auto space-y-2">
               {trendingTopics.map((topic, index) => {
                  const dominantSentiment = getDominantSentiment(topic);
                  const colors = getSentimentColor(dominantSentiment);

                  return (
                     <div key={topic.topic || index} className="group relative bg-gray-800/30 hover:bg-gray-800/50 rounded-lg p-2.5 border border-gray-700/40 hover:border-gray-600/60 transition-all duration-200">
                        
                        {/* Topic Info Row */}
                        <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="w-7 h-7 bg-emerald-700/20 rounded-full flex items-center justify-center border border-emerald-500/30 flex-shrink-0">
                                 <Hash size={12} className="text-emerald-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                 <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-medium text-white truncate max-w-24">
                                       #{topic.topic}
                                    </span>
                                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.border} border`}>
                                       {getSentimentIcon(dominantSentiment)}
                                       <span className={`text-xs ${colors.text}`}>
                                          {dominantSentiment}
                                       </span>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                    <span>Trending</span>
                                    <span>•</span>
                                    <span>{topic.total_count.toLocaleString()} posts</span>
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* Compact Sentiment Grid */}
                        <div className="grid grid-cols-4 gap-1.5">
                           {[
                              { key: 'positive', icon: Smile, value: topic.positive_percent, count: topic.positive_count, color: 'emerald' },
                              { key: 'negative', icon: Frown, value: topic.negative_percent, count: topic.negative_count, color: 'red' },
                              { key: 'critical', icon: AlertCircle, value: topic.critical_percent, count: topic.critical_count, color: 'orange' },
                              { key: 'neutral', icon: Minus, value: topic.neutral_percent, count: topic.neutral_count, color: 'gray' }
                           ].map(({ key, icon: Icon, value, count, color }) => (
                              <div key={key} className="flex flex-col items-center">
                                 <div className="flex items-center gap-1 mb-1">
                                    <Icon size={8} className={`text-${color}-400`} />
                                    <span className={`text-xs text-${color}-400 font-medium`}>
                                       {value.toFixed(0)}%
                                    </span>
                                 </div>
                                 <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                                    <div 
                                       className={`h-full bg-gradient-to-r from-${color}-500 to-${color}-400 rounded-full transition-all duration-300`}
                                       style={{ width: `${Math.max(value, 3)}%` }}
                                    />
                                 </div>
                                 <span className={`text-xs text-${color}-400/70 mt-0.5`}>
                                    {count > 999 ? `${(count/1000).toFixed(1)}k` : count}
                                 </span>
                              </div>
                           ))}
                        </div>
                     </div>
                  );
               })}
            </div>
         )}
      </div>
   );
};

// Main component with improved layout
const CompactImprovedCards = ({ userSentiment, trendingTopics, loading }) => {
   return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full max-w-7xl mx-auto">
         <CompactUserSentimentCard userSentiment={userSentiment} loading={loading} />
         <CompactTrendingTopicsCard trendingTopics={trendingTopics} loading={loading} />
      </div>
   );
};

export default CompactImprovedCards;