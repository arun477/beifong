import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import {
  Smile,
  Frown,
  AlertCircle,
  Minus,
  TrendingUp,
  Users,
  BarChart2,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react';
import api from '../../services/api';

const StatsTab = ({ platforms }) => {
  // State for analytics data
  const [loading, setLoading] = useState(true);
  const [sentimentData, setSentimentData] = useState([]);
  const [userSentiment, setUserSentiment] = useState([]);
  const [categorySentiment, setCategorySentiment] = useState([]);
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [sentimentOverTime, setSentimentOverTime] = useState([]);
  const [influentialPosts, setInfluentialPosts] = useState([]);
  const [engagementStats, setEngagementStats] = useState(null);
  
  // State for filters
  const [filters, setFilters] = useState({
    platform: '',
    timeRange: 30,
    sentiment: ''
  });
  
  // Colors for visualization
  const COLORS = {
    positive: '#10b981',
    negative: '#ef4444',
    critical: '#f97316',
    neutral: '#6b7280',
    background: '#1f2937',
    border: '#374151'
  };
  
  const SENTIMENT_COLORS = [
    COLORS.positive,
    COLORS.negative,
    COLORS.critical,
    COLORS.neutral
  ];
  
  // Load data
  useEffect(() => {
    if (platforms && platforms.length > 0) {
      fetchAllAnalyticsData();
    }
  }, [filters, platforms]);
  
  const fetchAllAnalyticsData = async () => {
    setLoading(true);
    try {
      console.log("Fetching analytics data...");
      
      // Fetch basic sentiment data first
      const sentimentsRes = await api.socialMedia.getSentiments();
      
      // Process sentiment distribution data
      const sentiments = sentimentsRes.data || [];
      const totalPosts = sentiments.reduce((sum, item) => sum + item.post_count, 0);
      const sentimentPieData = sentiments.map(item => ({
        name: item.sentiment,
        value: item.post_count,
        percentage: ((item.post_count / totalPosts) * 100).toFixed(1)
      }));
      
      setSentimentData(sentimentPieData);
      
      // Try to fetch each analytics endpoint separately to isolate errors
      try {
        const userSentimentRes = await api.socialMedia.getUserSentiment(10, filters.platform || undefined);
        setUserSentiment(userSentimentRes.data || []);
      } catch (err) {
        console.error("Error fetching user sentiment:", err);
      }
      
      try {
        const categorySentimentRes = await api.socialMedia.getCategorySentiment();
        setCategorySentiment(categorySentimentRes.data || []);
      } catch (err) {
        console.error("Error fetching category sentiment:", err);
      }
      
      try {
        const trendingTopicsRes = await api.socialMedia.getTrendingTopics(filters.timeRange, 10);
        console.log('trendingTopicsRes', trendingTopicsRes)
        setTrendingTopics(trendingTopicsRes.data || []);
      } catch (err) {
        console.error("Error fetching trending topics:", err);
      }
      
      try {
        const sentimentTimeRes = await api.socialMedia.getSentimentOverTime(filters.timeRange, filters.platform || undefined);
        
        // Format date for sentiment over time
        const timeData = sentimentTimeRes.data || [];
        const formattedTimeData = timeData.map(item => ({
          date: new Date(item.post_date).toLocaleDateString(),
          positive: item.positive_count,
          negative: item.negative_count,
          critical: item.critical_count,
          neutral: item.neutral_count,
          total: item.total_count
        }));
        
        setSentimentOverTime(formattedTimeData);
      } catch (err) {
        console.error("Error fetching sentiment over time:", err);
      }
      
      try {
        const influentialPostsRes = await api.socialMedia.getInfluentialPosts(filters.sentiment || undefined, 5);
        setInfluentialPosts(influentialPostsRes.data || []);
      } catch (err) {
        console.error("Error fetching influential posts:", err);
      }
      
      try {
        const engagementStatsRes = await api.socialMedia.getEngagementStats();
        setEngagementStats(engagementStatsRes.data || null);
      } catch (err) {
        console.error("Error fetching engagement stats:", err);
      }
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Common card component for analytics
  const AnalyticsCard = ({ title, icon, children, className = '' }) => (
    <div className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-sm p-3 border border-gray-700 shadow-md ${className}`}>
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
        {icon}
        <span className="ml-2">{title}</span>
      </h3>
      {children}
    </div>
  );
  
  // Helper to get sentiment icon
  const getSentimentIcon = (sentiment, size = 16) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return <Smile size={size} className="text-emerald-400" />;
      case 'negative':
        return <Frown size={size} className="text-red-400" />;
      case 'critical':
        return <AlertCircle size={size} className="text-orange-400" />;
      case 'neutral':
      default:
        return <Minus size={size} className="text-gray-400" />;
    }
  };
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 p-2 border border-gray-700 shadow-lg rounded-sm">
          <p className="text-white text-xs font-semibold">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  // Transform category data for visualization
  const categoryChartData = categorySentiment.slice(0, 6).map(cat => ({
    name: cat.category,
    positive: cat.positive_count,
    negative: cat.negative_count,
    critical: cat.critical_count,
    neutral: cat.neutral_count,
    total: cat.total_count
  }));
  
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full shadow-md"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-sm p-3 border border-gray-700 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white flex items-center">
            <Filter size={16} className="text-emerald-400 mr-2" />
            Analytics Filters
          </h3>
          <button 
            onClick={fetchAllAnalyticsData}
            className="flex items-center text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-sm transition-colors"
          >
            <RefreshCw size={12} className="mr-1" />
            Refresh
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Platform
            </label>
            <select
              value={filters.platform}
              onChange={e => handleFilterChange('platform', e.target.value)}
              className="w-full px-3 py-1.5 bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 rounded-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-400 text-xs text-gray-300 transition-all"
            >
              <option value="">All Platforms</option>
              {platforms.map(platform => (
                <option key={platform} value={platform}>
                  {platform.charAt(0).toUpperCase() + platform.slice(1).replace('.com', '')}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Time Range
            </label>
            <select
              value={filters.timeRange}
              onChange={e => handleFilterChange('timeRange', e.target.value)}
              className="w-full px-3 py-1.5 bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 rounded-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-400 text-xs text-gray-300 transition-all"
            >
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Sentiment
            </label>
            <select
              value={filters.sentiment}
              onChange={e => handleFilterChange('sentiment', e.target.value)}
              className="w-full px-3 py-1.5 bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 rounded-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-400 text-xs text-gray-300 transition-all"
            >
              <option value="">All Sentiments</option>
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
              <option value="critical">Critical</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Top row - Sentiment Overview and Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Sentiment Overview */}
        <AnalyticsCard 
          title="Sentiment Distribution" 
          icon={<BarChart2 size={16} className="text-emerald-400" />}
          className="md:col-span-1"
        >
          <div className="flex flex-col items-center">
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={SENTIMENT_COLORS[index % SENTIMENT_COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {sentimentData.map(item => (
                <div key={item.name} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-sm mr-1"
                    style={{ backgroundColor: COLORS[item.name] || COLORS.neutral }}
                  ></div>
                  <span className="text-xs text-gray-300 capitalize">
                    {item.name}
                  </span>
                  <span className="text-xs font-medium text-white ml-1">
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </AnalyticsCard>
        
        {/* Categories Sentiment */}
        <AnalyticsCard 
          title="Categories by Sentiment" 
          icon={<BarChart2 size={16} className="text-emerald-400" />}
          className="md:col-span-2"
        >
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryChartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis type="number" stroke="#9ca3af" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={10} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="positive" stackId="a" fill={COLORS.positive} name="Positive" />
                <Bar dataKey="negative" stackId="a" fill={COLORS.negative} name="Negative" />
                <Bar dataKey="critical" stackId="a" fill={COLORS.critical} name="Critical" />
                <Bar dataKey="neutral" stackId="a" fill={COLORS.neutral} name="Neutral" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsCard>
      </div>
      
      {/* Second row - Sentiment Over Time */}
      <AnalyticsCard 
        title="Sentiment Trends Over Time" 
        icon={<Calendar size={16} className="text-emerald-400" />}
      >
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={sentimentOverTime}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} />
              <YAxis stroke="#9ca3af" fontSize={10} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="positive" stackId="1" stroke={COLORS.positive} fill={`${COLORS.positive}50`} name="Positive" />
              <Area type="monotone" dataKey="negative" stackId="1" stroke={COLORS.negative} fill={`${COLORS.negative}50`} name="Negative" />
              <Area type="monotone" dataKey="critical" stackId="1" stroke={COLORS.critical} fill={`${COLORS.critical}50`} name="Critical" />
              <Area type="monotone" dataKey="neutral" stackId="1" stroke={COLORS.neutral} fill={`${COLORS.neutral}50`} name="Neutral" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </AnalyticsCard>
      
      {/* Third row - User Sentiment and Trending Topics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* User Sentiment */}
        <AnalyticsCard 
          title="Users by Sentiment" 
          icon={<Users size={16} className="text-emerald-400" />}
        >
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
            {userSentiment.map(user => (
              <div 
                key={user.user_handle} 
                className="bg-gradient-to-r from-gray-900/70 to-gray-800/70 rounded-sm p-2 border border-gray-700/70"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    <span className="text-xs font-medium text-white">
                      {user.user_display_name || `@${user.user_handle.replace('@', '')}`}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">
                      ({user.total_posts} posts)
                    </span>
                  </div>
                </div>
                
                <div className="relative h-2 bg-gradient-to-r from-gray-700/30 to-gray-800/30 rounded-sm overflow-hidden shadow-inner border border-gray-700/30">
                  {/* Sentiment bars */}
                  <div 
                    className="absolute top-0 left-0 h-full bg-emerald-500/70" 
                    style={{ width: `${user.positive_percent}%` }}
                    title={`Positive: ${user.positive_percent.toFixed(1)}%`}
                  ></div>
                  <div 
                    className="absolute top-0 h-full bg-red-500/70" 
                    style={{ 
                      left: `${user.positive_percent}%`, 
                      width: `${user.negative_percent}%` 
                    }}
                    title={`Negative: ${user.negative_percent.toFixed(1)}%`}
                  ></div>
                  <div 
                    className="absolute top-0 h-full bg-orange-500/70" 
                    style={{ 
                      left: `${user.positive_percent + user.negative_percent}%`, 
                      width: `${user.critical_percent}%` 
                    }}
                    title={`Critical: ${user.critical_percent.toFixed(1)}%`}
                  ></div>
                  <div 
                    className="absolute top-0 h-full bg-gray-500/70" 
                    style={{ 
                      left: `${user.positive_percent + user.negative_percent + user.critical_percent}%`, 
                      width: `${user.neutral_percent}%` 
                    }}
                    title={`Neutral: ${user.neutral_percent.toFixed(1)}%`}
                  ></div>
                </div>
                
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-emerald-400">+{user.positive_count}</span>
                  <span className="text-red-400">-{user.negative_count}</span>
                  <span className="text-orange-400">!{user.critical_count}</span>
                  <span className="text-gray-400">={user.neutral_count}</span>
                </div>
              </div>
            ))}
          </div>
        </AnalyticsCard>
        
        {/* Trending Topics */}
        <AnalyticsCard 
          title="Trending Topics" 
          icon={<TrendingUp size={16} className="text-emerald-400" />}
        >
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
            {trendingTopics.map((topic, index) => (
              <div 
                key={index} 
                className="bg-gradient-to-r from-gray-900/70 to-gray-800/70 rounded-sm p-2 border border-gray-700/70"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-white">#{topic.topic}</span>
                  <span className="text-xs text-gray-400">{topic.total_count} posts</span>
                </div>
                
                <div className="relative h-2 bg-gradient-to-r from-gray-700/30 to-gray-800/30 rounded-sm overflow-hidden shadow-inner border border-gray-700/30 mb-1">
                  {/* Sentiment distribution */}
                  <div className="absolute top-0 left-0 h-full bg-emerald-500/70" style={{ width: `${topic.positive_percent}%` }}></div>
                  <div className="absolute top-0 h-full bg-red-500/70" style={{ left: `${topic.positive_percent}%`, width: `${topic.negative_percent}%` }}></div>
                  <div className="absolute top-0 h-full bg-orange-500/70" style={{ left: `${topic.positive_percent + topic.negative_percent}%`, width: `${topic.critical_percent}%` }}></div>
                  <div className="absolute top-0 h-full bg-gray-500/70" style={{ left: `${topic.positive_percent + topic.negative_percent + topic.critical_percent}%`, width: `${topic.neutral_percent}%` }}></div>
                </div>
                
                {/* Sentiment breakdown */}
                <div className="flex space-x-2 text-xs">
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-sm bg-emerald-500/70 mr-1"></div>
                    <span className="text-gray-300">{topic.positive_percent.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-sm bg-red-500/70 mr-1"></div>
                    <span className="text-gray-300">{topic.negative_percent.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-sm bg-orange-500/70 mr-1"></div>
                    <span className="text-gray-300">{topic.critical_percent.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-sm bg-gray-500/70 mr-1"></div>
                    <span className="text-gray-300">{topic.neutral_percent.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AnalyticsCard>
      </div>
      
      {/* Fourth row - Most Influential Posts */}
      <AnalyticsCard 
        title="Most Influential Posts" 
        icon={<TrendingUp size={16} className="text-emerald-400" />}
      >
        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
          {influentialPosts.map(post => {
            // Calculate total engagement
            const engagement = post.engagement || {};
            const totalEngagement = 
              (engagement.replies || 0) + 
              (engagement.retweets || 0) + 
              (engagement.likes || 0) + 
              (engagement.bookmarks || 0);
            
            return (
              <div 
                key={post.post_id} 
                className={`bg-gradient-to-br from-gray-900/70 to-gray-800/70 rounded-sm p-3 border ${
                  post.sentiment === 'positive' ? 'border-emerald-500/30' : 
                  post.sentiment === 'negative' ? 'border-red-500/30' :
                  post.sentiment === 'critical' ? 'border-orange-500/30' :
                  'border-gray-700/70'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className="text-xs font-medium text-white">
                      {post.user_display_name || `@${post.user_handle?.replace('@', '')}`}
                    </span>
                    <span className="text-gray-500 mx-1 flex-shrink-0">·</span>
                    <span className="text-xs text-gray-400">
                      {new Date(post.post_timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div className={`flex items-center px-2 py-0.5 rounded-full ${
                    post.sentiment === 'positive' ? 'bg-emerald-500/20 text-emerald-400' : 
                    post.sentiment === 'negative' ? 'bg-red-500/20 text-red-400' :
                    post.sentiment === 'critical' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-gray-600/30 text-gray-300'
                  }`}>
                    {getSentimentIcon(post.sentiment, 12)}
                    <span className="text-xs ml-1 capitalize">{post.sentiment}</span>
                  </div>
                </div>
                
                <p className="text-gray-200 text-xs mb-2 line-clamp-2">
                  {post.post_text}
                </p>
                
                <div className="flex justify-between text-xs">
                  <div className="flex space-x-3">
                    {engagement.replies > 0 && (
                      <span className="text-gray-400">
                        {engagement.replies} replies
                      </span>
                    )}
                    {engagement.retweets > 0 && (
                      <span className="text-gray-400">
                        {engagement.retweets} retweets
                      </span>
                    )}
                    {engagement.likes > 0 && (
                      <span className="text-gray-400">
                        {engagement.likes} likes
                      </span>
                    )}
                  </div>
                  <span className="text-emerald-400 font-medium">
                    {totalEngagement} total engagement
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </AnalyticsCard>
    </div>
  );
};

export default StatsTab;