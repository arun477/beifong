import React from 'react';
import {
  Users,
  TrendingUp,
  Smile,
  Frown,
  AlertCircle,
  Minus,
  Filter,
  Calendar,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Activity,
  Clock,
  Hash,
  BarChart
} from 'lucide-react';


// Enhanced Users by Sentiment Card
const ImprovedUserSentimentCard = ({ userSentiment = [], loading = false }) => {
  // Helper functions remain the same as your original code
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

  // Action buttons for the card header
  const actionButtons = (
    <div className="flex items-center gap-2">
      <button className="p-1 rounded-md hover:bg-gray-700/50 transition-colors duration-200">
        <Filter size={14} className="text-gray-400" />
      </button>
      <button className="p-1 rounded-md hover:bg-gray-700/50 transition-colors duration-200">
        <Calendar size={14} className="text-gray-400" />
      </button>
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-850 to-gray-800 rounded-lg overflow-hidden shadow-xl border border-gray-700/50 transition-all duration-300 hover:shadow-2xl">
      <div className="relative px-3 py-2 bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur border-b border-gray-700/30">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-teal-600/5" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-md">
              <Users size={16} className="text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">Users by Sentiment</h3>
          </div>
          {actionButtons}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="relative flex flex-col items-center">
            <div className="animate-spin w-12 h-12 border-3 border-t-transparent rounded-full border-emerald-500 shadow-md"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="mt-4 text-emerald-400 text-sm animate-pulse">Loading user data...</p>
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-4 max-h-80 overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
          {userSentiment.map(user => {
            const dominantSentiment = getDominantSentiment(user);
            const styles = getSentimentStyle(dominantSentiment);
            
            return (
              <div
                key={user.user_handle}
                className={`group bg-gradient-to-br ${styles.bgGradient} rounded-lg p-4 border ${styles.border} transition-all duration-300 hover:shadow-lg relative overflow-hidden`}
              >
                {/* Sentiment wave background effect */}
                <div className="absolute -top-6 -left-6 -right-6 h-12 opacity-10 bg-gradient-to-r from-transparent via-white to-transparent skew-y-3 transform group-hover:animate-wave"></div>
                
                {/* User information */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center">
                    {/* User avatar placeholder - circle with first letter or custom profile pic */}
                    <div className="w-9 h-9 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700/50 mr-3">
                      <span className="text-sm font-semibold text-white">
                        {(user.user_display_name || user.user_handle || '@user')[1].toUpperCase()}
                      </span>
                    </div>
                    
                    <div>
                      <div className="flex items-center">
                        <span className="text-sm font-semibold text-white">
                          {user.user_display_name || user.user_handle?.replace('@', '')}
                        </span>
                        <div className={`ml-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full ${styles.iconBg} border ${styles.iconBorder}`}>
                          {getSentimentIcon(dominantSentiment)}
                          <span className={`text-xs capitalize ${styles.textColor}`}>{dominantSentiment}</span>
                        </div>
                      </div>
                      <div className="flex items-center mt-0.5">
                        <span className="text-xs text-gray-400">
                          {user.user_handle || '@unknown'}
                        </span>
                        <span className="text-xs text-gray-500 mx-1.5">•</span>
                        <span className="text-xs text-gray-400 bg-gray-800/70 px-1.5 py-0.5 rounded-full">
                          {user.total_posts} posts
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced sentiment visualization - with animated bars on hover */}
                <div className="space-y-2.5">
                  {/* Positive sentiment */}
                  <div className="flex items-center gap-3">
                    <div className="w-24 flex items-center">
                      <Smile size={14} className="text-emerald-400 mr-2" />
                      <span className="text-xs text-emerald-400 font-medium">Positive</span>
                    </div>
                    <div className="flex-grow h-6 bg-gray-800/70 rounded-md overflow-hidden relative">
                      <div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600/80 to-emerald-500/80 group-hover:from-emerald-600 group-hover:to-emerald-500 transition-all duration-500 rounded-md flex items-center pl-2"
                        style={{ width: `${Math.max(user.positive_percent, 2)}%` }}
                      >
                        <span className="text-xs text-white font-medium">{user.positive_percent.toFixed(1)}%</span>
                      </div>
                      {/* Animated pulse effect on hover */}
                      <div 
                        className="absolute inset-y-0 left-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-md animate-pulse-slow"
                        style={{ width: `${Math.max(user.positive_percent, 2)}%` }}
                      ></div>
                    </div>
                    <div className="w-10 text-right">
                      <span className="text-xs text-emerald-400 font-medium">{user.positive_count}</span>
                    </div>
                  </div>
                  
                  {/* Negative sentiment */}
                  <div className="flex items-center gap-3">
                    <div className="w-24 flex items-center">
                      <Frown size={14} className="text-red-400 mr-2" />
                      <span className="text-xs text-red-400 font-medium">Negative</span>
                    </div>
                    <div className="flex-grow h-6 bg-gray-800/70 rounded-md overflow-hidden relative">
                      <div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600/80 to-red-500/80 group-hover:from-red-600 group-hover:to-red-500 transition-all duration-500 rounded-md flex items-center pl-2"
                        style={{ width: `${Math.max(user.negative_percent, 2)}%` }}
                      >
                        <span className="text-xs text-white font-medium">{user.negative_percent.toFixed(1)}%</span>
                      </div>
                      <div 
                        className="absolute inset-y-0 left-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-md animate-pulse-slow"
                        style={{ width: `${Math.max(user.negative_percent, 2)}%` }}
                      ></div>
                    </div>
                    <div className="w-10 text-right">
                      <span className="text-xs text-red-400 font-medium">{user.negative_count}</span>
                    </div>
                  </div>
                  
                  {/* Critical sentiment */}
                  <div className="flex items-center gap-3">
                    <div className="w-24 flex items-center">
                      <AlertCircle size={14} className="text-orange-400 mr-2" />
                      <span className="text-xs text-orange-400 font-medium">Critical</span>
                    </div>
                    <div className="flex-grow h-6 bg-gray-800/70 rounded-md overflow-hidden relative">
                      <div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-600/80 to-orange-500/80 group-hover:from-orange-600 group-hover:to-orange-500 transition-all duration-500 rounded-md flex items-center pl-2"
                        style={{ width: `${Math.max(user.critical_percent, 2)}%` }}
                      >
                        <span className="text-xs text-white font-medium">{user.critical_percent.toFixed(1)}%</span>
                      </div>
                      <div 
                        className="absolute inset-y-0 left-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-md animate-pulse-slow"
                        style={{ width: `${Math.max(user.critical_percent, 2)}%` }}
                      ></div>
                    </div>
                    <div className="w-10 text-right">
                      <span className="text-xs text-orange-400 font-medium">{user.critical_count}</span>
                    </div>
                  </div>
                  
                  {/* Neutral sentiment */}
                  <div className="flex items-center gap-3">
                    <div className="w-24 flex items-center">
                      <Minus size={14} className="text-gray-400 mr-2" />
                      <span className="text-xs text-gray-400 font-medium">Neutral</span>
                    </div>
                    <div className="flex-grow h-6 bg-gray-800/70 rounded-md overflow-hidden relative">
                      <div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-gray-600/80 to-gray-500/80 group-hover:from-gray-600 group-hover:to-gray-500 transition-all duration-500 rounded-md flex items-center pl-2"
                        style={{ width: `${Math.max(user.neutral_percent, 2)}%` }}
                      >
                        <span className="text-xs text-white font-medium">{user.neutral_percent.toFixed(1)}%</span>
                      </div>
                      <div 
                        className="absolute inset-y-0 left-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-md animate-pulse-slow"
                        style={{ width: `${Math.max(user.neutral_percent, 2)}%` }}
                      ></div>
                    </div>
                    <div className="w-10 text-right">
                      <span className="text-xs text-gray-400 font-medium">{user.neutral_count}</span>
                    </div>
                  </div>
                </div>
                
                {/* Interactive footer - appears on hover */}
                <div className="mt-3 pt-2 border-t border-gray-700/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button className="w-full text-center text-xs text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1">
                    <span>View detailed analysis</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Enhanced Trending Topics Card
const ImprovedTrendingTopicsCard = ({ trendingTopics = [], loading = false }) => {
  // Color map for different sentiments
  const sentimentColorMap = {
    positive: '#10b981', // emerald-500
    negative: '#ef4444', // red-500
    critical: '#f97316', // orange-500
    neutral: '#6b7280', // gray-500
  };
  
  // Function to estimate momentum based on topic data
  const getMomentum = topic => {
    // Base this on positive_percent and total_count
    if (topic.positive_percent > 60 && topic.total_count > 3000) return 'rapidly rising';
    if (topic.positive_percent > 50 && topic.total_count > 2000) return 'rising';
    if (topic.negative_percent > 60 && topic.total_count > 3000) return 'trending negatively';
    if (topic.negative_percent > 50 && topic.total_count > 2000) return 'controversial';
    if (topic.critical_percent > 40) return 'critical discussion';
    return 'stable';
  };
  
  // Function to get momentum icon and style
  const getMomentumDetails = momentum => {
    switch (momentum) {
      case 'rapidly rising':
        return { 
          icon: <ArrowUp size={14} className="text-emerald-400" />,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30'
        };
      case 'rising':
        return { 
          icon: <ArrowUp size={14} className="text-emerald-300" />,
          color: 'text-emerald-300',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20'
        };
      case 'trending negatively':
        return { 
          icon: <ArrowDown size={14} className="text-red-400" />,
          color: 'text-red-400',
          bg: 'bg-red-500/10',
          border: 'border-red-500/30'
        };
      case 'controversial':
        return { 
          icon: <AlertCircle size={14} className="text-orange-400" />,
          color: 'text-orange-400',
          bg: 'bg-orange-500/10',
          border: 'border-orange-500/30'
        };
      case 'critical discussion':
        return { 
          icon: <BarChart size={14} className="text-orange-300" />,
          color: 'text-orange-300',
          bg: 'bg-orange-500/10',
          border: 'border-orange-500/20'
        };
      default:
        return { 
          icon: <Activity size={14} className="text-blue-400" />,
          color: 'text-blue-400',
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30'
        };
    }
  };
  
  // Determine the dominant sentiment for theming
  const getDominantSentiment = topic => {
    const values = [
      { type: 'positive', value: topic.positive_percent },
      { type: 'negative', value: topic.negative_percent },
      { type: 'critical', value: topic.critical_percent },
      { type: 'neutral', value: topic.neutral_percent }
    ];
    return values.reduce((max, obj) => (obj.value > max.value ? obj : max), values[0]).type;
  };
  
  // Action buttons for the card header
  const actionButtons = (
    <div className="flex items-center gap-2">
      <button className="p-1 rounded-md hover:bg-gray-700/50 transition-colors duration-200">
        <Filter size={14} className="text-gray-400" />
      </button>
      <button className="p-1 rounded-md hover:bg-gray-700/50 transition-colors duration-200">
        <Calendar size={14} className="text-gray-400" />
      </button>
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-850 to-gray-800 rounded-lg overflow-hidden shadow-xl border border-gray-700/50 transition-all duration-300 hover:shadow-2xl">
      <div className="relative px-3 py-2 bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur border-b border-gray-700/30">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-teal-600/5" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-md">
              <TrendingUp size={16} className="text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">Trending Topics</h3>
          </div>
          {actionButtons}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="relative flex flex-col items-center">
            <div className="animate-spin w-12 h-12 border-3 border-t-transparent rounded-full border-emerald-500 shadow-md"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="mt-4 text-emerald-400 text-sm animate-pulse">Loading trending topics...</p>
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-4 max-h-80 overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
          {trendingTopics.map((topic, index) => {
            const dominantSentiment = getDominantSentiment(topic);
            const momentum = getMomentum(topic);
            const momentumDetails = getMomentumDetails(momentum);
            
            return (
              <div
                key={index}
                className={`group rounded-lg overflow-hidden border border-gray-700/50 hover:border-${dominantSentiment === 'positive' ? 'emerald' : dominantSentiment === 'negative' ? 'red' : dominantSentiment === 'critical' ? 'orange' : 'gray'}-500/50 transition-all duration-300 bg-gradient-to-br from-gray-900/90 to-gray-800/90 hover:shadow-lg`}
              >
                {/* Header with topic name and count */}
                <div className={`px-4 py-3 border-b border-gray-700/30 flex justify-between items-center bg-gradient-to-r from-${dominantSentiment === 'positive' ? 'emerald' : dominantSentiment === 'negative' ? 'red' : dominantSentiment === 'critical' ? 'orange' : 'blue'}-900/10 to-transparent`}>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-800/80 border border-gray-700/50">
                      <Hash size={16} className={`text-${dominantSentiment === 'positive' ? 'emerald' : dominantSentiment === 'negative' ? 'red' : dominantSentiment === 'critical' ? 'orange' : 'blue'}-400`} />
                    </div>
                    <div>
                      <div className="flex items-center">
                        <span className="text-sm font-semibold text-white">#{topic.topic}</span>
                        <div className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${momentumDetails.bg} ${momentumDetails.border} ${momentumDetails.color} flex items-center gap-1`}>
                          {momentumDetails.icon}
                          <span>{momentum}</span>
                        </div>
                      </div>
                      <div className="flex items-center mt-0.5 gap-3">
                        <span className="text-xs text-gray-400 bg-gray-800/70 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <Activity size={10} className="text-gray-300" />
                          {topic.total_count.toLocaleString()} posts
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock size={10} className="text-gray-300" />
                          trending now
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Body with sentiment breakdown */}
                <div className="px-4 py-3">
                  {/* Sentiment distribution bar */}
                  <div className="h-5 flex w-full overflow-hidden rounded-md mb-2 border border-gray-700/30">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-600/90 to-emerald-500/90 group-hover:from-emerald-600 group-hover:to-emerald-500 transition-all duration-300 flex items-center justify-center" 
                      style={{ width: `${topic.positive_percent}%` }}
                    >
                      {topic.positive_percent >= 10 && (
                        <span className="text-xs font-medium text-white">{topic.positive_percent.toFixed(1)}%</span>
                      )}
                    </div>
                    <div 
                      className="h-full bg-gradient-to-r from-red-600/90 to-red-500/90 group-hover:from-red-600 group-hover:to-red-500 transition-all duration-300 flex items-center justify-center" 
                      style={{ width: `${topic.negative_percent}%` }}
                    >
                      {topic.negative_percent >= 10 && (
                        <span className="text-xs font-medium text-white">{topic.negative_percent.toFixed(1)}%</span>
                      )}
                    </div>
                    <div 
                      className="h-full bg-gradient-to-r from-orange-600/90 to-orange-500/90 group-hover:from-orange-600 group-hover:to-orange-500 transition-all duration-300 flex items-center justify-center" 
                      style={{ width: `${topic.critical_percent}%` }}
                    >
                      {topic.critical_percent >= 10 && (
                        <span className="text-xs font-medium text-white">{topic.critical_percent.toFixed(1)}%</span>
                      )}
                    </div>
                    <div 
                      className="h-full bg-gradient-to-r from-gray-600/90 to-gray-500/90 group-hover:from-gray-600 group-hover:to-gray-500 transition-all duration-300 flex items-center justify-center" 
                      style={{ width: `${topic.neutral_percent}%` }}
                    >
                      {topic.neutral_percent >= 10 && (
                        <span className="text-xs font-medium text-white">{topic.neutral_percent.toFixed(1)}%</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Detailed sentiment stats */}
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                      <Smile size={12} className="text-emerald-400" />
                      <span className="text-xs text-emerald-400">{topic.positive_count.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-red-500/10 rounded-md border border-red-500/20">
                      <Frown size={12} className="text-red-400" />
                      <span className="text-xs text-red-400">{topic.negative_count.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 rounded-md border border-orange-500/20">
                      <AlertCircle size={12} className="text-orange-400" />
                      <span className="text-xs text-orange-400">{topic.critical_count.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-gray-500/10 rounded-md border border-gray-500/20">
                      <Minus size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-400">{topic.neutral_count.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                {/* Interactive footer */}
                <div className="px-4 py-2 mt-1 border-t border-gray-700/30 bg-gray-800/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button className="w-full text-center text-xs text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1">
                    <span>View sentiment analysis</span>
                    <ChevronRight size={14} />
                  </button>
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