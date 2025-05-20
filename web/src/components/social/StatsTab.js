import React from 'react';

// Mock data for the stats tab
const mockData = {
  total_posts: 345,
  platform_distribution: {
    facebook: 203,
    x: 142
  },
  sentiment_distribution: {
    overall: {
      positive: 165,
      negative: 92,
      neutral: 48,
      critical: 40
    },
    facebook: {
      positive: 110,
      negative: 48,
      neutral: 25,
      critical: 20
    },
    x: {
      positive: 55,
      negative: 44,
      neutral: 23,
      critical: 20
    }
  },
  trending_topics: [
    { topic: 'customer service', count: 46 },
    { topic: 'product quality', count: 39 },
    { topic: 'delivery time', count: 24 },
    { topic: 'pricing', count: 18 },
    { topic: 'new features', count: 15 }
  ]
};

const getPlatformIcon = platform => {
  switch (platform.toLowerCase()) {
    case 'facebook':
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case 'x':
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    default:
      return null;
  }
};

const getSentimentColor = sentiment => {
  switch (sentiment.toLowerCase()) {
    case 'positive':
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    case 'negative':
      return 'text-red-400 bg-red-500/10 border-red-500/30';
    case 'critical':
      return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    case 'neutral':
    default:
      return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
  }
};

const getSentimentGradient = sentiment => {
  switch (sentiment.toLowerCase()) {
    case 'positive':
      return 'from-emerald-600/30 to-emerald-500/30';
    case 'negative':
      return 'from-red-600/30 to-red-500/30';
    case 'critical':
      return 'from-orange-600/30 to-orange-500/30';
    case 'neutral':
    default:
      return 'from-gray-600/30 to-gray-500/30';
  }
};

const getPlatformColor = platform => {
  switch (platform.toLowerCase()) {
    case 'facebook':
      return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
    case 'x':
      return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
    default:
      return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
  }
};

const StatsTab = () => {
  // Use mock data only
  const data = mockData;
  
  // Calculate percentages for platform distribution
  const totalPosts = data.total_posts;
  const facebookPosts = data.platform_distribution.facebook;
  const xPosts = data.platform_distribution.x;
  const facebookPercentage = (facebookPosts / totalPosts) * 100;
  const xPercentage = (xPosts / totalPosts) * 100;
  
  // Calculate percentages for sentiment distribution
  const overallSentiment = data.sentiment_distribution.overall;
  const positiveCount = overallSentiment.positive;
  const negativeCount = overallSentiment.negative;
  const neutralCount = overallSentiment.neutral;
  const criticalCount = overallSentiment.critical;
  
  const positivePercentage = (positiveCount / totalPosts) * 100;
  const negativePercentage = (negativeCount / totalPosts) * 100;
  const neutralPercentage = (neutralCount / totalPosts) * 100;
  const criticalPercentage = (criticalCount / totalPosts) * 100;
  
  // Calculate max count for trending topics
  const trendingTopics = data.trending_topics;
  const maxTopicCount = Math.max(...trendingTopics.map(topic => topic.count));

  return (
    <div className="space-y-3">
      {/* Top row - Total Posts and Platform Distribution */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Posts */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-sm p-3 border border-gray-700 shadow-md">
          <h3 className="text-xs font-semibold text-white mb-2 flex items-center">
            <svg className="w-3.5 h-3.5 mr-1 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Total Posts
          </h3>
          
          <div className="flex items-center">
            <div className="w-20 h-20 mr-4 rounded-sm bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border border-emerald-900/20 flex items-center justify-center">
              <span className="text-3xl font-bold text-white">{totalPosts}</span>
            </div>
            
            <div className="flex-1 space-y-2">
              {/* Facebook posts count */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-1 rounded-sm mr-1.5 bg-blue-500/10 border border-blue-500/30">
                    {getPlatformIcon('facebook')}
                  </div>
                  <span className="text-xs text-gray-300">Facebook</span>
                </div>
                <span className="text-white font-medium text-xs">{data.platform_distribution.facebook}</span>
              </div>
              
              {/* X posts count */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-1 rounded-sm mr-1.5 bg-blue-400/10 border border-blue-400/30">
                    {getPlatformIcon('x')}
                  </div>
                  <span className="text-xs text-gray-300">X (Twitter)</span>
                </div>
                <span className="text-white font-medium text-xs">{data.platform_distribution.x}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Platform Distribution */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-sm p-3 border border-gray-700 shadow-md">
          <h3 className="text-xs font-semibold text-white mb-2 flex items-center">
            <svg className="w-3.5 h-3.5 mr-1 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            Platform Distribution
          </h3>
          
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-32">
              {/* Donut chart */}
              <svg className="w-full h-full" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1f2937" strokeWidth="15" />
                
                {/* Facebook segment */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  fill="transparent" 
                  stroke="url(#facebook-gradient)" 
                  strokeWidth="15" 
                  strokeDasharray={`${facebookPercentage * 2.51} ${251 - facebookPercentage * 2.51}`} 
                  transform="rotate(-90 50 50)" 
                />
                
                {/* X segment */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  fill="transparent" 
                  stroke="url(#x-gradient)" 
                  strokeWidth="15" 
                  strokeDasharray={`${xPercentage * 2.51} ${251 - xPercentage * 2.51}`} 
                  transform={`rotate(${(facebookPercentage * 3.6) - 90} 50 50)`} 
                />
                
                {/* Gradients */}
                <defs>
                  <linearGradient id="facebook-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                  <linearGradient id="x-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#7dd3fc" />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-white">{totalPosts}</span>
                <span className="text-xs text-gray-400">Total</span>
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex gap-3 mt-2">
              <div className="flex items-center">
                <div className="w-2.5 h-2.5 rounded-sm bg-blue-500 mr-1"></div>
                <span className="text-xs text-gray-300">FB</span>
                <span className="text-xs font-medium text-white ml-1">
                  {facebookPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center">
                <div className="w-2.5 h-2.5 rounded-sm bg-blue-400 mr-1"></div>
                <span className="text-xs text-gray-300">X</span>
                <span className="text-xs font-medium text-white ml-1">
                  {xPercentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Second row - Sentiment Distribution */}
      <div className="grid grid-cols-1 gap-3">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-sm p-3 border border-gray-700 shadow-md">
          <h3 className="text-xs font-semibold text-white mb-2 flex items-center">
            <svg className="w-3.5 h-3.5 mr-1 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Sentiment Distribution
          </h3>
          
          <div className="space-y-4">
            {/* Overall sentiment */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-300">Overall Sentiment</span>
              </div>
              <div className="relative h-3 bg-gradient-to-r from-gray-700/30 to-gray-800/30 rounded-sm overflow-hidden shadow-inner border border-gray-700/30">
                {/* Positive segment */}
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-600/30 to-emerald-500/30 border-r border-gray-800/20"
                  style={{ width: `${positivePercentage}%` }}
                ></div>
                {/* Negative segment */}
                <div 
                  className="absolute top-0 h-full bg-gradient-to-r from-red-600/30 to-red-500/30 border-r border-gray-800/20"
                  style={{ left: `${positivePercentage}%`, width: `${negativePercentage}%` }}
                ></div>
                {/* Critical segment */}
                <div 
                  className="absolute top-0 h-full bg-gradient-to-r from-orange-600/30 to-orange-500/30 border-r border-gray-800/20"
                  style={{ left: `${positivePercentage + negativePercentage}%`, width: `${criticalPercentage}%` }}
                ></div>
                {/* Neutral segment */}
                <div 
                  className="absolute top-0 h-full bg-gradient-to-r from-gray-600/30 to-gray-500/30"
                  style={{ left: `${positivePercentage + negativePercentage + criticalPercentage}%`, width: `${neutralPercentage}%` }}
                ></div>
              </div>
              
              {/* Legend */}
              <div className="flex gap-3 mt-1.5 flex-wrap">
                <div className="flex items-center">
                  <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/60 mr-1"></div>
                  <span className="text-xs text-gray-300">Positive</span>
                  <span className="text-xs font-medium text-white ml-1">
                    {positiveCount}
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-2.5 h-2.5 rounded-sm bg-red-500/60 mr-1"></div>
                  <span className="text-xs text-gray-300">Negative</span>
                  <span className="text-xs font-medium text-white ml-1">
                    {negativeCount}
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-2.5 h-2.5 rounded-sm bg-orange-500/60 mr-1"></div>
                  <span className="text-xs text-gray-300">Critical</span>
                  <span className="text-xs font-medium text-white ml-1">
                    {criticalCount}
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-2.5 h-2.5 rounded-sm bg-gray-500/60 mr-1"></div>
                  <span className="text-xs text-gray-300">Neutral</span>
                  <span className="text-xs font-medium text-white ml-1">
                    {neutralCount}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Platform specific sentiment */}
            <div className="grid grid-cols-2 gap-3">
              {/* Facebook sentiment */}
              <div>
                <div className="flex items-center mb-1">
                  <div className="p-0.5 rounded-sm mr-1.5 bg-blue-500/10 border border-blue-500/30">
                    {getPlatformIcon('facebook')}
                  </div>
                  <span className="text-xs font-medium text-gray-300">Facebook</span>
                </div>
                <div className="relative h-3 bg-gradient-to-r from-gray-700/30 to-gray-800/30 rounded-sm overflow-hidden shadow-inner border border-gray-700/30">
                  {/* Calculate percentages for Facebook */}
                  {(() => {
                    const fbSentiment = data.sentiment_distribution.facebook;
                    const fbTotal = facebookPosts;
                    const fbPositive = fbSentiment.positive;
                    const fbNegative = fbSentiment.negative;
                    const fbCritical = fbSentiment.critical;
                    const fbNeutral = fbSentiment.neutral;
                    
                    const fbPositivePerc = (fbPositive / fbTotal) * 100;
                    const fbNegativePerc = (fbNegative / fbTotal) * 100;
                    const fbCriticalPerc = (fbCritical / fbTotal) * 100;
                    const fbNeutralPerc = (fbNeutral / fbTotal) * 100;
                    
                    return (
                      <>
                        <div 
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-600/30 to-emerald-500/30 border-r border-gray-800/20"
                          style={{ width: `${fbPositivePerc}%` }}
                        ></div>
                        <div 
                          className="absolute top-0 h-full bg-gradient-to-r from-red-600/30 to-red-500/30 border-r border-gray-800/20"
                          style={{ left: `${fbPositivePerc}%`, width: `${fbNegativePerc}%` }}
                        ></div>
                        <div 
                          className="absolute top-0 h-full bg-gradient-to-r from-orange-600/30 to-orange-500/30 border-r border-gray-800/20"
                          style={{ left: `${fbPositivePerc + fbNegativePerc}%`, width: `${fbCriticalPerc}%` }}
                        ></div>
                        <div 
                          className="absolute top-0 h-full bg-gradient-to-r from-gray-600/30 to-gray-500/30"
                          style={{ left: `${fbPositivePerc + fbNegativePerc + fbCriticalPerc}%`, width: `${fbNeutralPerc}%` }}
                        ></div>
                      </>
                    );
                  })()}
                </div>
                
                {/* Facebook sentiment stats */}
                <div className="flex gap-1.5 mt-1 text-xs">
                  <span className="text-emerald-400/80">{data.sentiment_distribution.facebook.positive}</span>
                  <span className="text-gray-500">|</span>
                  <span className="text-red-400/80">{data.sentiment_distribution.facebook.negative}</span>
                  <span className="text-gray-500">|</span>
                  <span className="text-orange-400/80">{data.sentiment_distribution.facebook.critical}</span>
                  <span className="text-gray-500">|</span>
                  <span className="text-gray-400/80">{data.sentiment_distribution.facebook.neutral}</span>
                </div>
              </div>
              
              {/* X sentiment */}
              <div>
                <div className="flex items-center mb-1">
                  <div className="p-0.5 rounded-sm mr-1.5 bg-blue-400/10 border border-blue-400/30">
                    {getPlatformIcon('x')}
                  </div>
                  <span className="text-xs font-medium text-gray-300">X (Twitter)</span>
                </div>
                <div className="relative h-3 bg-gradient-to-r from-gray-700/30 to-gray-800/30 rounded-sm overflow-hidden shadow-inner border border-gray-700/30">
                  {/* Calculate percentages for X */}
                  {(() => {
                    const xSentiment = data.sentiment_distribution.x;
                    const xTotal = xPosts;
                    const xPositive = xSentiment.positive;
                    const xNegative = xSentiment.negative;
                    const xCritical = xSentiment.critical;
                    const xNeutral = xSentiment.neutral;
                    
                    const xPositivePerc = (xPositive / xTotal) * 100;
                    const xNegativePerc = (xNegative / xTotal) * 100;
                    const xCriticalPerc = (xCritical / xTotal) * 100;
                    const xNeutralPerc = (xNeutral / xTotal) * 100;
                    
                    return (
                      <>
                        <div 
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-600/30 to-emerald-500/30 border-r border-gray-800/20"
                          style={{ width: `${xPositivePerc}%` }}
                        ></div>
                        <div 
                          className="absolute top-0 h-full bg-gradient-to-r from-red-600/30 to-red-500/30 border-r border-gray-800/20"
                          style={{ left: `${xPositivePerc}%`, width: `${xNegativePerc}%` }}
                        ></div>
                        <div 
                          className="absolute top-0 h-full bg-gradient-to-r from-orange-600/30 to-orange-500/30 border-r border-gray-800/20"
                          style={{ left: `${xPositivePerc + xNegativePerc}%`, width: `${xCriticalPerc}%` }}
                        ></div>
                        <div 
                          className="absolute top-0 h-full bg-gradient-to-r from-gray-600/30 to-gray-500/30"
                          style={{ left: `${xPositivePerc + xNegativePerc + xCriticalPerc}%`, width: `${xNeutralPerc}%` }}
                        ></div>
                      </>
                    );
                  })()}
                </div>
                
                {/* X sentiment stats */}
                <div className="flex gap-1.5 mt-1 text-xs">
                  <span className="text-emerald-400/80">{data.sentiment_distribution.x.positive}</span>
                  <span className="text-gray-500">|</span>
                  <span className="text-red-400/80">{data.sentiment_distribution.x.negative}</span>
                  <span className="text-gray-500">|</span>
                  <span className="text-orange-400/80">{data.sentiment_distribution.x.critical}</span>
                  <span className="text-gray-500">|</span>
                  <span className="text-gray-400/80">{data.sentiment_distribution.x.neutral}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Trending Topics */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-sm p-3 border border-gray-700 shadow-md">
        <h3 className="text-xs font-semibold text-white mb-2 flex items-center">
          <svg className="w-3.5 h-3.5 mr-1 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Trending Topics
        </h3>
        
        <div className="space-y-1.5">
          {data.trending_topics.map((topic, index) => (
            <div key={index} className="flex items-center">
              <div className="text-xs font-medium text-gray-400 w-24 truncate">{topic.topic}</div>
              <div className="flex-1 ml-2">
                <div className="relative h-2.5 bg-gradient-to-r from-gray-700/30 to-gray-800/30 rounded-sm overflow-hidden shadow-inner border border-gray-700/30">
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-600/30 to-purple-500/30"
                    style={{ width: `${(topic.count / maxTopicCount) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="ml-2 text-xs text-gray-300 w-6 text-right">{topic.count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsTab;