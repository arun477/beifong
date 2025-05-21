import React from 'react';
import {
  Users,
  TrendingUp,
  Smile,
  Frown,
  AlertCircle,
  Minus,
  Clock,
  Hash,
  BarChart,
  Activity
} from 'lucide-react';

// Enhanced Users by Sentiment Card - Cleaner and more compact
const ImprovedUserSentimentCard = ({ userSentiment = [], loading = false }) => {
  // Helper functions
  const getSentimentIcon = sentiment => {
    switch (sentiment?.toLowerCase()) {
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

  // Determine the dominant sentiment for each user (for highlighting)
  const getDominantSentiment = user => {
    const values = [
      { type: 'positive', value: user.positive_percent },
      { type: 'negative', value: user.negative_percent },
      { type: 'critical', value: user.critical_percent },
      { type: 'neutral', value: user.neutral_percent }
    ];
    return values.reduce((max, obj) => (obj.value > max.value ? obj : max), values[0]).type;
  };

  // Get appropriate styling based on sentiment
  const getSentimentStyle = sentiment => {
    switch (sentiment) {
      case 'positive':
        return {
          bgGradient: 'from-emerald-900/10 to-emerald-800/10',
          border: 'border-emerald-500/30 hover:border-emerald-400/50',
          textColor: 'text-emerald-400',
          iconBg: 'bg-emerald-500/10',
          iconBorder: 'border-emerald-500/30'
        };
      case 'negative':
        return {
          bgGradient: 'from-red-900/10 to-red-800/10',
          border: 'border-red-500/30 hover:border-red-400/50',
          textColor: 'text-red-400',
          iconBg: 'bg-red-500/10',
          iconBorder: 'border-red-500/30'
        };
      case 'critical':
        return {
          bgGradient: 'from-orange-900/10 to-orange-800/10',
          border: 'border-orange-500/30 hover:border-orange-400/50',
          textColor: 'text-orange-400',
          iconBg: 'bg-orange-500/10',
          iconBorder: 'border-orange-500/30'
        };
      case 'neutral':
      default:
        return {
          bgGradient: 'from-gray-800/10 to-gray-700/10',
          border: 'border-gray-600/30 hover:border-gray-500/50',
          textColor: 'text-gray-400',
          iconBg: 'bg-gray-500/10',
          iconBorder: 'border-gray-500/30'
        };
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-850 to-gray-800 rounded-lg overflow-hidden shadow-xl border border-gray-700/50 transition-all duration-300 hover:shadow-2xl">
      <div className="relative px-3 py-2 bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur border-b border-gray-700/30">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-600/5 to-gray-700/5" />
        <div className="relative flex items-center">
          <div className="p-1 bg-gradient-to-br from-gray-500/20 to-gray-600/20 rounded-md mr-2">
            <Users size={16} className="text-gray-300" />
          </div>
          <h3 className="text-sm font-semibold text-white">Top Users by Sentiment</h3>
          <div className="ml-auto">
            <span className="text-xs text-gray-400 bg-gray-800/80 py-0.5 px-2 rounded-full">
              {userSentiment.length} users
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="relative flex flex-col items-center">
            <div className="animate-spin w-10 h-10 border-3 border-t-transparent rounded-full border-gray-500 shadow-md"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="h-4 w-4 text-gray-300" />
            </div>
            <p className="mt-3 text-gray-300 text-xs animate-pulse">Loading user data...</p>
          </div>
        </div>
      ) : (
        <div className="p-3 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {userSentiment.map((user, index) => {
            const dominantSentiment = getDominantSentiment(user);
            const styles = getSentimentStyle(dominantSentiment);
            
            return (
              <div
                key={user.user_handle || index}
                className={`group rounded-lg p-3 border border-gray-700/50 hover:border-gray-600/60 transition-all duration-300 hover:shadow-lg relative overflow-hidden mb-3 last:mb-0 bg-gradient-to-br from-gray-800/50 to-gray-900/50`}
              >
                {/* Sentiment wave background effect */}
                <div className="absolute -top-6 -left-6 -right-6 h-12 opacity-10 bg-gradient-to-r from-transparent via-white to-transparent skew-y-3 transform group-hover:animate-wave"></div>
                
                {/* User information */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center">
                    {/* User avatar placeholder */}
                    <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700/50 mr-2">
                      <span className="text-xs font-semibold text-white">
                        {((user.user_display_name || user.user_handle || '@user')?.[0] || 'U').toUpperCase()}
                      </span>
                    </div>
                    
                    <div>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-white truncate max-w-[140px]">
                          {user.user_display_name || user.user_handle?.replace('@', '') || 'Unknown User'}
                        </span>
                        <div className={`ml-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full ${styles.iconBg} border ${styles.iconBorder}`}>
                          {getSentimentIcon(dominantSentiment)}
                          <span className={`text-xs capitalize ${styles.textColor}`}>{dominantSentiment}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        <span className="inline-block max-w-[120px] truncate">{user.user_handle || '@unknown'}</span>
                        <span className="text-xs bg-gray-800/70 px-1.5 py-0.5 rounded-full ml-1">
                          {user.total_posts} posts
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Sentiment visualization - Compact bars */}
                <div className="space-y-1.5">
                  {/* Sentiment bars in a 2x2 grid */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Positive sentiment */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <Smile size={10} className="text-emerald-400 mr-1" />
                          <span className="text-xs text-emerald-400">Positive</span>
                        </div>
                        <span className="text-xs text-emerald-400">{user.positive_percent.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-800/70 rounded-sm overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-600/80 to-emerald-500/80 rounded-sm"
                          style={{ width: `${Math.max(user.positive_percent, 2)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Negative sentiment */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <Frown size={10} className="text-red-400 mr-1" />
                          <span className="text-xs text-red-400">Negative</span>
                        </div>
                        <span className="text-xs text-red-400">{user.negative_percent.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-800/70 rounded-sm overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-red-600/80 to-red-500/80 rounded-sm"
                          style={{ width: `${Math.max(user.negative_percent, 2)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Critical sentiment */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <AlertCircle size={10} className="text-orange-400 mr-1" />
                          <span className="text-xs text-orange-400">Critical</span>
                        </div>
                        <span className="text-xs text-orange-400">{user.critical_percent.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-800/70 rounded-sm overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-600/80 to-orange-500/80 rounded-sm"
                          style={{ width: `${Math.max(user.critical_percent, 2)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Neutral sentiment */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <Minus size={10} className="text-gray-400 mr-1" />
                          <span className="text-xs text-gray-400">Neutral</span>
                        </div>
                        <span className="text-xs text-gray-400">{user.neutral_percent.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-800/70 rounded-sm overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-gray-600/80 to-gray-500/80 rounded-sm"
                          style={{ width: `${Math.max(user.neutral_percent, 2)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Enhanced Trending Topics Card - Cleaner and more compact
const ImprovedTrendingTopicsCard = ({ trendingTopics = [], loading = false }) => {
  // Color map for different sentiments
  const sentimentColorMap = {
    positive: '#10b981', // emerald-500
    negative: '#ef4444', // red-500
    critical: '#f97316', // orange-500
    neutral: '#6b7280', // gray-500
  };
  
  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-850 to-gray-800 rounded-lg overflow-hidden shadow-xl border border-gray-700/50 transition-all duration-300 hover:shadow-2xl">
      <div className="relative px-3 py-2 bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur border-b border-gray-700/30">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-teal-600/5" />
        <div className="relative flex items-center">
          <div className="p-1 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-md mr-2">
            <TrendingUp size={16} className="text-emerald-400" />
          </div>
          <h3 className="text-sm font-semibold text-white">Trending Topics</h3>
          <div className="ml-auto">
            <span className="text-xs text-gray-400 bg-gray-800/80 py-0.5 px-2 rounded-full">
              {trendingTopics.length} topics
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="relative flex flex-col items-center">
            <div className="animate-spin w-10 h-10 border-3 border-t-transparent rounded-full border-emerald-500 shadow-md"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-3 text-emerald-400 text-xs animate-pulse">Loading trending topics...</p>
          </div>
        </div>
      ) : (
        <div className="p-3 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent space-y-3">
          {trendingTopics.map((topic, index) => {
            return (
              <div
                key={topic.topic || index}
                className="rounded-lg overflow-hidden border border-gray-700/50 hover:border-emerald-500/30 transition-all duration-300 bg-gradient-to-br from-gray-900/90 to-gray-800/90 hover:shadow-lg"
              >
                {/* Header with topic name and count */}
                <div className="px-3 py-2 border-b border-gray-700/30 flex justify-between items-center bg-gradient-to-r from-emerald-900/10 to-transparent">
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gray-800/80 border border-gray-700/50">
                      <Hash size={12} className="text-emerald-400" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-white">#{topic.topic}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="text-xs text-gray-400 bg-gray-800/70 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <Activity size={10} className="text-gray-300" />
                      {topic.total_count.toLocaleString()} posts
                    </span>
                  </div>
                </div>
                
                {/* Body with sentiment breakdown */}
                <div className="px-3 py-2">
                  {/* Sentiment distribution bar */}
                  <div className="h-4 flex w-full overflow-hidden rounded-sm mb-2 border border-gray-700/30">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-600/90 to-emerald-500/90 flex items-center justify-center text-xs" 
                      style={{ width: `${topic.positive_percent}%` }}
                    >
                      {topic.positive_percent >= 15 && (
                        <span className="px-1 font-medium text-white text-[10px]">{topic.positive_percent.toFixed(0)}%</span>
                      )}
                    </div>
                    <div 
                      className="h-full bg-gradient-to-r from-red-600/90 to-red-500/90 flex items-center justify-center text-xs" 
                      style={{ width: `${topic.negative_percent}%` }}
                    >
                      {topic.negative_percent >= 15 && (
                        <span className="px-1 font-medium text-white text-[10px]">{topic.negative_percent.toFixed(0)}%</span>
                      )}
                    </div>
                    <div 
                      className="h-full bg-gradient-to-r from-orange-600/90 to-orange-500/90 flex items-center justify-center text-xs" 
                      style={{ width: `${topic.critical_percent}%` }}
                    >
                      {topic.critical_percent >= 15 && (
                        <span className="px-1 font-medium text-white text-[10px]">{topic.critical_percent.toFixed(0)}%</span>
                      )}
                    </div>
                    <div 
                      className="h-full bg-gradient-to-r from-gray-600/90 to-gray-500/90 flex items-center justify-center text-xs" 
                      style={{ width: `${topic.neutral_percent}%` }}
                    >
                      {topic.neutral_percent >= 15 && (
                        <span className="px-1 font-medium text-white text-[10px]">{topic.neutral_percent.toFixed(0)}%</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Sentiment counts */}
                  <div className="flex flex-wrap gap-1.5">
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 rounded-sm border border-emerald-500/20">
                      <Smile size={10} className="text-emerald-400" />
                      <span className="text-[10px] text-emerald-400">{topic.positive_count.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 rounded-sm border border-red-500/20">
                      <Frown size={10} className="text-red-400" />
                      <span className="text-[10px] text-red-400">{topic.negative_count.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/10 rounded-sm border border-orange-500/20">
                      <AlertCircle size={10} className="text-orange-400" />
                      <span className="text-[10px] text-orange-400">{topic.critical_count.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-500/10 rounded-sm border border-gray-500/20">
                      <Minus size={10} className="text-gray-400" />
                      <span className="text-[10px] text-gray-400">{topic.neutral_count.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Export the improved cards
const ImprovedCards = ({ userSentiment, trendingTopics, loading }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <ImprovedUserSentimentCard userSentiment={userSentiment} loading={loading} />
      <ImprovedTrendingTopicsCard trendingTopics={trendingTopics} loading={loading} />
    </div>
  );
};

export default ImprovedCards;