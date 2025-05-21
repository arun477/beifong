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
   Area,
} from 'recharts';
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
   ExternalLink,
   Sparkles,
} from 'lucide-react';
import {
   TrendingUp,
   Users,
   Calendar,
   Filter,
   RefreshCw,
   PieChart as PieChartIcon,
   Activity,
} from 'lucide-react';
import api from '../../services/api';
import ImprovedCards from './ImprovedCards';

const formatNumber = number => {
   if (!number || isNaN(number)) return '0';
   if (number >= 1000000) return (number / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
   if (number >= 10000) return Math.floor(number / 1000) + 'k';
   if (number >= 1000) return (number / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
   return number.toString();
};

const getPlatformIcon = platform => {
   switch (platform?.toLowerCase()) {
      case 'twitter':
      case 'x.com':
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
      default:
         return (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
               <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
         );
   }
};

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

const getPlatformColor = platform => {
   switch (platform?.toLowerCase()) {
      case 'x.com':
      case 'x':
      case 'twitter':
         return 'blue-400';
      case 'facebook':
         return 'blue-600';
      case 'instagram':
         return 'pink-500';
      default:
         return 'gray-400';
   }
};

const getSentimentCardStyle = sentiment => {
   switch (sentiment?.toLowerCase()) {
      case 'positive':
         return 'border-emerald-500/30 hover:border-emerald-500/50 bg-gradient-to-br from-emerald-900/10 to-teal-900/10';
      case 'negative':
         return 'border-red-500/30 hover:border-red-500/50 bg-gradient-to-br from-red-900/10 to-red-800/10';
      case 'critical':
         return 'border-orange-500/30 hover:border-orange-500/50 bg-gradient-to-br from-orange-900/10 to-orange-800/10';
      case 'neutral':
      default:
         return 'border-gray-700/50 hover:border-gray-600/50 bg-gradient-to-br from-gray-800/50 to-gray-700/50 hover:from-gray-700/60 hover:to-gray-600/60';
   }
};

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
      sentiment: '',
   });

   // Colors for visualization - consistent with design system
   const COLORS = {
      positive: '#10b981', // emerald-500
      negative: '#ef4444', // red-500
      critical: '#f97316', // orange-500
      neutral: '#6b7280', // gray-500
      background: {
         dark: '#111827', // gray-900
         medium: '#1f2937', // gray-800
         light: '#374151', // gray-700
      },
      border: {
         dark: '#1f2937', // gray-800
         medium: '#374151', // gray-700
         light: '#4b5563', // gray-600
      },
      emerald: {
         primary: '#10b981', // emerald-500
         light: 'rgba(16, 185, 129, 0.2)', // emerald-500/20
         border: 'rgba(16, 185, 129, 0.3)', // emerald-500/30
         gradient: 'from-emerald-600 to-teal-600', // Standard gradient
      },
      text: {
         primary: '#ffffff', // white
         secondary: '#9ca3af', // gray-400
         tertiary: '#6b7280', // gray-500
      },
   };

   // Ensure consistent color mapping for sentiment across all visualizations
   const sentimentColorMap = {
      positive: COLORS.positive,
      negative: COLORS.negative,
      critical: COLORS.critical,
      neutral: COLORS.neutral,
   };

   // Load data
   useEffect(() => {
      if (platforms && platforms.length > 0) {
         fetchAllAnalyticsData();
      }
   }, [filters, platforms]);

   const fetchAllAnalyticsData = async () => {
      setLoading(true);
      try {
         // Fetch basic sentiment data first
         const sentimentsRes = await api.socialMedia.getSentiments();

         // Process sentiment distribution data
         const sentiments = sentimentsRes.data || [];
         const totalPosts = sentiments.reduce((sum, item) => sum + item.post_count, 0);
         const sentimentPieData = sentiments.map(item => ({
            name: item.sentiment,
            value: item.post_count,
            percentage: ((item.post_count / totalPosts) * 100).toFixed(1),
         }));

         setSentimentData(sentimentPieData);

         // Try to fetch each analytics endpoint separately to isolate errors
         try {
            const userSentimentRes = await api.socialMedia.getUserSentiment(
               10,
               filters.platform || undefined
            );
            setUserSentiment(userSentimentRes.data || []);
         } catch (err) {
            console.error('Error fetching user sentiment:', err);
         }

         try {
            const categorySentimentRes = await api.socialMedia.getCategorySentiment();
            setCategorySentiment(categorySentimentRes.data || []);
         } catch (err) {
            console.error('Error fetching category sentiment:', err);
         }

         try {
            const trendingTopicsRes = await api.socialMedia.getTrendingTopics(
               filters.timeRange,
               10
            );
            setTrendingTopics(trendingTopicsRes.data || []);
         } catch (err) {
            console.error('Error fetching trending topics:', err);
         }

         try {
            const sentimentTimeRes = await api.socialMedia.getSentimentOverTime(
               filters.timeRange,
               filters.platform || undefined
            );

            // Format date for sentiment over time
            const timeData = sentimentTimeRes.data || [];
            const formattedTimeData = timeData.map(item => ({
               date: new Date(item.post_date).toLocaleDateString(),
               positive: item.positive_count,
               negative: item.negative_count,
               critical: item.critical_count,
               neutral: item.neutral_count,
               total: item.total_count,
            }));

            setSentimentOverTime(formattedTimeData);
         } catch (err) {
            console.error('Error fetching sentiment over time:', err);
         }

         try {
            const influentialPostsRes = await api.socialMedia.getInfluentialPosts(
               filters.sentiment || undefined,
               5
            );
            setInfluentialPosts(influentialPostsRes.data || []);
         } catch (err) {
            console.error('Error fetching influential posts:', err);
         }

         try {
            const engagementStatsRes = await api.socialMedia.getEngagementStats();
            setEngagementStats(engagementStatsRes.data || null);
         } catch (err) {
            console.error('Error fetching engagement stats:', err);
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
         [name]: value,
      }));
   };

   // Common card component for analytics with consistent design
   const AnalyticsCard = ({ title, icon, children, className = '' }) => (
      <div
         className={`bg-gradient-to-br from-gray-900 via-gray-850 to-gray-800 rounded-lg overflow-hidden shadow-xl border border-gray-700/50 transition-all duration-300 hover:shadow-2xl ${className}`}
      >
         <div className="relative px-3 py-2 bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur border-b border-gray-700/30">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-teal-600/5" />
            <div className="relative flex items-center gap-2">
               <div className="p-1 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-md">
                  {icon}
               </div>
               <h3 className="text-sm font-semibold text-white">{title}</h3>
            </div>
         </div>
         <div className="p-4">{children}</div>
      </div>
   );

   // Helper to get sentiment icon - consistent style
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

   // Enhanced custom tooltip for charts - consistent with design system
   const CustomTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
         return (
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-3 border border-gray-700/50 shadow-lg rounded-lg">
               <p className="text-white text-xs font-medium mb-1">{label}</p>
               {payload.map((entry, index) => (
                  <p
                     key={index}
                     className="text-xs flex items-center gap-1.5 my-0.5"
                     style={{ color: entry.color }}
                  >
                     <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: entry.color }}
                     ></span>
                     <span className="font-medium">{entry.name}:</span> {entry.value}
                  </p>
               ))}
            </div>
         );
      }
      return null;
   };

   // Custom label for the pie chart with smaller, better positioned text
   const renderCustomizedPieLabel = ({
      cx,
      cy,
      midAngle,
      innerRadius,
      outerRadius,
      percent,
      index,
      name,
   }) => {
      // Don't render labels inside the pie chart
      return null;
   };

   // Transform category data for visualization
   const categoryChartData = categorySentiment.slice(0, 7).map(cat => ({
      name: cat.category,
      positive: cat.positive_count,
      negative: cat.negative_count,
      critical: cat.critical_count,
      neutral: cat.neutral_count,
      total: cat.total_count,
   }));

   if (loading) {
      return (
         <div className="flex justify-center items-center py-16">
            <div className="relative flex flex-col items-center">
               <div className="animate-spin w-12 h-12 border-3 border-t-transparent rounded-full border-emerald-500 shadow-md"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-emerald-400" />
               </div>
               <p className="mt-4 text-emerald-400 text-sm animate-pulse">
                  Loading analytics data...
               </p>
            </div>
         </div>
      );
   }

   return (
      <div className="space-y-5">
         {/* Top row - Sentiment Overview and Key Metrics */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Sentiment Overview - IMPROVED */}
            <AnalyticsCard
               title="Sentiment Distribution"
               icon={<PieChartIcon size={16} className="text-emerald-400" />}
               className="md:col-span-1"
            >
               <div className="flex flex-col items-center">
                  <div className="h-56 w-full relative">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                           <Pie
                              data={sentimentData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={renderCustomizedPieLabel}
                              outerRadius={76}
                              innerRadius={35}
                              stroke="#2d3748"
                              strokeWidth={1}
                              dataKey="value"
                              animationDuration={1000}
                              animationBegin={200}
                              paddingAngle={2}
                           >
                              {sentimentData.map((entry, index) => (
                                 <Cell
                                    key={`cell-${index}`}
                                    fill={sentimentColorMap[entry.name.toLowerCase()]}
                                    className="hover:opacity-90 transition-opacity cursor-pointer"
                                    stroke="rgba(255,255,255,0.05)"
                                    strokeWidth={1}
                                 />
                              ))}
                           </Pie>
                           <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                        </PieChart>
                     </ResponsiveContainer>

                     {/* Overlaid sentiment percentages - positioned for better clarity */}
                     <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                        {sentimentData.map((item, index) => {
                           // Calculate position for each label
                           const angle = (index / sentimentData.length) * 2 * Math.PI;
                           const radius = 100; // Distance from center

                           // Calculate color from the sentiment type
                           const sentimentType = item.name.toLowerCase();

                           let offsetX = 0;
                           let offsetY = 0;
                           let textAnchor = 'middle';

                           // Position based on the sentiment (assuming 4 sentiments)
                           if (sentimentType === 'positive') {
                              offsetX = -70;
                              offsetY = 65;
                           } else if (sentimentType === 'negative') {
                              offsetX = 65;
                              offsetY = 65;
                           } else if (sentimentType === 'critical') {
                              offsetX = 75;
                              offsetY = -50;
                           } else if (sentimentType === 'neutral') {
                              offsetX = -75;
                              offsetY = -50;
                           }

                           return (
                              <div
                                 key={item.name}
                                 className="absolute flex flex-col items-center text-center"
                                 style={{
                                    transform: `translate(${offsetX}px, ${offsetY}px)`,
                                    color: sentimentColorMap[sentimentType],
                                 }}
                              >
                                 <span className="text-xs capitalize">{item.name}</span>
                                 <span className="text-sm font-bold tracking-tight">
                                    {item.percentage}%
                                 </span>
                              </div>
                           );
                        })}
                     </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2 mt-3 bg-gray-800/50 p-2 rounded-md border border-gray-700/30 w-full">
                     {sentimentData.map(item => {
                        const sentimentType = item.name.toLowerCase();
                        return (
                           <div
                              key={item.name}
                              className="flex items-center bg-gray-900/70 px-2 py-1 rounded-md"
                           >
                              <div
                                 className="w-2 h-2 rounded-sm mr-1.5"
                                 style={{ backgroundColor: sentimentColorMap[sentimentType] }}
                              ></div>
                              <span className="text-xs text-gray-300 capitalize">{item.name}</span>
                              <span className="text-xs font-medium text-white ml-1.5 px-1 py-0.5 bg-gray-800 rounded-md">
                                 {item.percentage}%
                              </span>
                           </div>
                        );
                     })}
                  </div>
               </div>
            </AnalyticsCard>

            {/* Categories Sentiment - IMPROVED */}
            <AnalyticsCard
               title="Categories by Sentiment"
               icon={<BarChart2 size={16} className="text-emerald-400" />}
               className="md:col-span-2"
            >
               <div className="flex flex-col h-64">
                  <div className="flex-grow">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                           data={categoryChartData}
                           layout="vertical"
                           margin={{ top: 10, right: 30, left: 30, bottom: 15 }}
                           barSize={16}
                           barGap={3}
                           maxBarSize={16}
                        >
                           <CartesianGrid
                              strokeDasharray="3 3"
                              stroke={COLORS.border.medium}
                              horizontal={true}
                              vertical={false}
                           />
                           <XAxis
                              type="number"
                              stroke={COLORS.text.secondary}
                              fontSize={12}
                              tickFormatter={value => value.toLocaleString()}
                              axisLine={false}
                              tickLine={false}
                              domain={[0, 'dataMax']}
                              allowDecimals={false}
                              tickCount={6}
                           />
                           <YAxis
                              dataKey="name"
                              type="category"
                              stroke={COLORS.text.secondary}
                              fontSize={14}
                              width={75}
                              tick={{ fill: COLORS.text.primary }}
                              axisLine={false}
                              tickLine={false}
                              tickMargin={5}
                           />
                           <Tooltip
                              content={<CustomTooltip />}
                              cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                           />
                           <Bar
                              dataKey="positive"
                              stackId="a"
                              fill={sentimentColorMap.positive}
                              name="Positive"
                              animationDuration={1500}
                              animationBegin={300}
                              radius={[0, 3, 3, 0]}
                           />
                           <Bar
                              dataKey="negative"
                              stackId="a"
                              fill={sentimentColorMap.negative}
                              name="Negative"
                              animationDuration={1500}
                              animationBegin={600}
                           />
                           <Bar
                              dataKey="critical"
                              stackId="a"
                              fill={sentimentColorMap.critical}
                              name="Critical"
                              animationDuration={1500}
                              animationBegin={900}
                           />
                           <Bar
                              dataKey="neutral"
                              stackId="a"
                              fill={sentimentColorMap.neutral}
                              name="Neutral"
                              animationDuration={1500}
                              animationBegin={1200}
                           />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>

                  <div className="flex items-center justify-center mt-4 mb-1 gap-6">
                     <div className="flex items-center">
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 mr-2"></div>
                        <span className="text-sm font-medium text-gray-200">Positive</span>
                     </div>
                     <div className="flex items-center">
                        <div className="w-3.5 h-3.5 rounded-full bg-red-500 mr-2"></div>
                        <span className="text-sm font-medium text-gray-200">Negative</span>
                     </div>
                     <div className="flex items-center">
                        <div className="w-3.5 h-3.5 rounded-full bg-orange-500 mr-2"></div>
                        <span className="text-sm font-medium text-gray-200">Critical</span>
                     </div>
                     <div className="flex items-center">
                        <div className="w-3.5 h-3.5 rounded-full bg-gray-500 mr-2"></div>
                        <span className="text-sm font-medium text-gray-200">Neutral</span>
                     </div>
                  </div>
               </div>
            </AnalyticsCard>
         </div>
         {/* Second row - Sentiment Over Time */}
         <AnalyticsCard
            title="Sentiment Trends Over Time"
            icon={<Calendar size={16} className="text-emerald-400" />}
         >
            <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                     data={sentimentOverTime}
                     margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                     <defs>
                        <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                           <stop
                              offset="5%"
                              stopColor={sentimentColorMap.positive}
                              stopOpacity={0.5}
                           />
                           <stop
                              offset="95%"
                              stopColor={sentimentColorMap.positive}
                              stopOpacity={0}
                           />
                        </linearGradient>
                        <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                           <stop
                              offset="5%"
                              stopColor={sentimentColorMap.negative}
                              stopOpacity={0.5}
                           />
                           <stop
                              offset="95%"
                              stopColor={sentimentColorMap.negative}
                              stopOpacity={0}
                           />
                        </linearGradient>
                        <linearGradient id="criticalGradient" x1="0" y1="0" x2="0" y2="1">
                           <stop
                              offset="5%"
                              stopColor={sentimentColorMap.critical}
                              stopOpacity={0.5}
                           />
                           <stop
                              offset="95%"
                              stopColor={sentimentColorMap.critical}
                              stopOpacity={0}
                           />
                        </linearGradient>
                        <linearGradient id="neutralGradient" x1="0" y1="0" x2="0" y2="1">
                           <stop
                              offset="5%"
                              stopColor={sentimentColorMap.neutral}
                              stopOpacity={0.5}
                           />
                           <stop
                              offset="95%"
                              stopColor={sentimentColorMap.neutral}
                              stopOpacity={0}
                           />
                        </linearGradient>
                     </defs>
                     <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={COLORS.border.medium}
                        vertical={false}
                     />
                     <XAxis
                        dataKey="date"
                        stroke={COLORS.text.secondary}
                        fontSize={9}
                        tick={{ fill: COLORS.text.secondary }}
                        axisLine={false}
                        tickLine={false}
                     />
                     <YAxis
                        stroke={COLORS.text.secondary}
                        fontSize={9}
                        tick={{ fill: COLORS.text.secondary }}
                        tickFormatter={value => value.toLocaleString()}
                        axisLine={false}
                        tickLine={false}
                     />
                     <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1 }}
                     />
                     <Legend
                        iconType="circle"
                        iconSize={6}
                        wrapperStyle={{ fontSize: '9px', color: COLORS.text.secondary }}
                     />
                     <Area
                        type="monotone"
                        dataKey="positive"
                        stackId="1"
                        stroke={sentimentColorMap.positive}
                        strokeWidth={2}
                        fill="url(#positiveGradient)"
                        name="Positive"
                        animationDuration={1500}
                        animationBegin={300}
                     />
                     <Area
                        type="monotone"
                        dataKey="negative"
                        stackId="1"
                        stroke={sentimentColorMap.negative}
                        strokeWidth={2}
                        fill="url(#negativeGradient)"
                        name="Negative"
                        animationDuration={1500}
                        animationBegin={600}
                     />
                     <Area
                        type="monotone"
                        dataKey="critical"
                        stackId="1"
                        stroke={sentimentColorMap.critical}
                        strokeWidth={2}
                        fill="url(#criticalGradient)"
                        name="Critical"
                        animationDuration={1500}
                        animationBegin={900}
                     />
                     <Area
                        type="monotone"
                        dataKey="neutral"
                        stackId="1"
                        stroke={sentimentColorMap.neutral}
                        strokeWidth={2}
                        fill="url(#neutralGradient)"
                        name="Neutral"
                        animationDuration={1500}
                        animationBegin={1200}
                     />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </AnalyticsCard>
         {/* Third row - User Sentiment and Trending Topics */}
         <ImprovedCards 
            userSentiment={userSentiment}
            trendingTopics={trendingTopics}
            loading={loading}
         />
         {/* Fourth row - Most Influential Posts */}
         <AnalyticsCard
            title="Most Influential Posts"
            icon={<TrendingUp size={16} className="text-emerald-400" />}
         >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[32rem] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
               {influentialPosts.map(post => {
                  const sentiment = post.sentiment || 'neutral';
                  const platform = post.platform || 'web';
                  const engagement = post.engagement || {};
                  const replyCount = engagement.replies || 0;
                  const retweetCount = engagement.retweets || 0;
                  const likeCount = engagement.likes || 0;
                  const viewCount = engagement.views || 0;
                  const platformColorClass = getPlatformColor(platform);

                  return (
                     <div
                        key={post.post_id}
                        className={`relative h-full flex flex-col overflow-hidden group backdrop-blur-sm rounded-lg transition-colors duration-300 shadow-md hover:shadow-md ${getSentimentCardStyle(
                           sentiment
                        )}`}
                     >
                        {/* Sentiment indicator strip at the top */}
                        <div
                           className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                              sentiment === 'positive'
                                 ? 'from-emerald-500 to-teal-500'
                                 : sentiment === 'negative'
                                 ? 'from-red-500 to-red-600'
                                 : sentiment === 'critical'
                                 ? 'from-orange-500 to-orange-600'
                                 : 'from-gray-600 to-gray-700'
                           }`}
                        ></div>

                        {/* Header */}
                        <div
                           className={`flex flex-col px-3.5 py-2.5 border-b ${
                              sentiment === 'positive'
                                 ? 'border-emerald-500/30 bg-gradient-to-r from-gray-800/80 to-emerald-900/40'
                                 : sentiment === 'negative'
                                 ? 'border-red-500/30 bg-gradient-to-r from-gray-800/80 to-red-900/40'
                                 : sentiment === 'critical'
                                 ? 'border-orange-500/30 bg-gradient-to-r from-gray-800/80 to-orange-900/40'
                                 : 'border-gray-700/30 bg-gradient-to-r from-gray-800/80 to-gray-900/80'
                           } backdrop-blur`}
                        >
                           {/* Row 1: Author info and platform icon */}
                           <div className="flex items-center gap-2.5 justify-between">
                              <div className="flex items-center gap-2.5">
                                 {/* Platform Icon */}
                                 <div className="min-w-8 w-8 h-8 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center border border-gray-700/50 shadow-inner overflow-hidden transition-all duration-300 group-hover:border-gray-600">
                                    <div className="flex items-center justify-center w-full h-full">
                                       <div
                                          className={`text-${platformColorClass} group-hover:text-opacity-90 transition-colors duration-300`}
                                       >
                                          {getPlatformIcon(platform)}
                                       </div>
                                    </div>
                                 </div>

                                 {/* Author info */}
                                 <div className="min-w-0">
                                    <div className="flex items-center gap-1">
                                       <span className="text-white font-medium text-sm truncate max-w-[700%] group-hover:text-emerald-50 transition-colors duration-300">
                                          {post.user_display_name ||
                                             `@${post.user_handle?.replace('@', '')}`}
                                       </span>
                                    </div>
                                 </div>
                              </div>
                           </div>

                           {/* Row 2: Author details */}
                           <div className="flex items-center flex-wrap text-gray-400 text-xs mt-1">
                              <span className="truncate max-w-[100px] inline-block">
                                 @{post.user_handle ? post.user_handle.replace('@', '') : 'unknown'}
                              </span>
                              <span className="text-gray-500 mx-1 flex-shrink-0">·</span>
                              <span
                                 className={`text-xs text-${platformColorClass} flex-shrink-0 font-medium mr-0.5 group-hover:font-semibold transition-all duration-300`}
                              >
                                 {platform.replace('.com', '')}
                              </span>
                              <span className="text-gray-500 mx-1 flex-shrink-0">·</span>
                              <span className="text-gray-500 flex-shrink-0">
                                 {new Date(post.post_timestamp).toLocaleDateString()}
                              </span>
                           </div>

                           {/* Row 3: Sentiment Indicator */}
                           <div className="flex items-center mt-2">
                              <div
                                 className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${
                                    sentiment === 'positive'
                                       ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/50 text-emerald-400'
                                       : sentiment === 'negative'
                                       ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/50 text-red-400'
                                       : sentiment === 'critical'
                                       ? 'bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-500/50 text-orange-400'
                                       : 'bg-gradient-to-r from-gray-600/30 to-gray-700/30 border border-gray-600/40 text-gray-300'
                                 } group-hover:shadow-sm transition-all duration-300`}
                                 title={`${
                                    sentiment.charAt(0).toUpperCase() + sentiment.slice(1)
                                 } sentiment`}
                              >
                                 {getSentimentIcon(sentiment)}
                                 <span className="text-xs font-medium capitalize">{sentiment}</span>
                              </div>
                           </div>
                        </div>

                        {/* Content */}
                        <div className="px-4 py-3.5 flex-grow min-h-[80px] bg-gradient-to-br from-transparent to-gray-800/10">
                           <p className="text-gray-200 text-sm leading-relaxed line-clamp-3 group-hover:text-white transition-colors duration-300">
                              {post.post_text || 'No content available'}
                           </p>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-700/30 bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm">
                           <div className="py-2 px-3.5 flex items-center justify-between">
                              {/* Engagement metrics */}
                              <div className="flex items-center gap-3">
                                 {replyCount > 0 && (
                                    <div className="flex items-center transition-colors duration-300">
                                       <MessageCircle className="w-3.5 h-3.5 text-gray-400 mr-1.5 group-hover:text-emerald-400 transition-colors duration-300" />
                                       <span className="text-xs text-gray-400 group-hover:text-white transition-colors duration-300">
                                          {formatNumber(replyCount)}
                                       </span>
                                    </div>
                                 )}

                                 {retweetCount > 0 && (
                                    <div className="flex items-center transition-colors duration-300">
                                       <Share2 className="w-3.5 h-3.5 text-gray-400 mr-1.5 group-hover:text-emerald-400 transition-colors duration-300" />
                                       <span className="text-xs text-gray-400 group-hover:text-white transition-colors duration-300">
                                          {formatNumber(retweetCount)}
                                       </span>
                                    </div>
                                 )}

                                 {likeCount > 0 && (
                                    <div className="flex items-center transition-colors duration-300">
                                       <Heart className="w-3.5 h-3.5 text-gray-400 mr-1.5 group-hover:text-emerald-400 transition-colors duration-300" />
                                       <span className="text-xs text-gray-400 group-hover:text-white transition-colors duration-300">
                                          {formatNumber(likeCount)}
                                       </span>
                                    </div>
                                 )}
                              </div>

                              {/* Total engagement counter with trending icon */}
                              <div className="flex items-center px-2 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                                 <TrendingUp size={12} className="text-emerald-400 mr-1.5" />
                                 <span className="text-emerald-400 font-medium text-xs">
                                    {formatNumber(
                                       replyCount +
                                          retweetCount +
                                          likeCount +
                                          (engagement.bookmarks || 0)
                                    )}{' '}
                                    engagement
                                 </span>
                              </div>
                           </div>

                           {/* View indicator strip at bottom */}
                           <div
                              className={`border-t py-1.5 px-3.5 ${
                                 sentiment === 'positive'
                                    ? 'border-emerald-500/30 bg-gradient-to-r from-gray-800/50 to-emerald-900/30'
                                    : sentiment === 'negative'
                                    ? 'border-red-500/30 bg-gradient-to-r from-gray-800/50 to-red-900/30'
                                    : sentiment === 'critical'
                                    ? 'border-orange-500/30 bg-gradient-to-r from-gray-800/50 to-orange-900/30'
                                    : 'border-gray-700/20 bg-gradient-to-r from-gray-800/50 to-gray-900/50'
                              }`}
                           >
                              <div
                                 className={`flex items-center justify-center gap-1.5 ${
                                    sentiment === 'positive'
                                       ? 'text-emerald-400'
                                       : sentiment === 'negative'
                                       ? 'text-red-400'
                                       : sentiment === 'critical'
                                       ? 'text-orange-400'
                                       : 'text-gray-400 group-hover:text-emerald-400'
                                 } transition-colors duration-300 text-xs`}
                              >
                                 <ExternalLink className="w-3 h-3" />
                                 <span>View details</span>
                              </div>
                           </div>
                        </div>
                     </div>
                  );
               })}
            </div>
         </AnalyticsCard>
         <div
            className="h-0.5 w-full bg-gradient-to-r from-emerald-600/0 via-emerald-500/30 to-emerald-600/0 rounded-full animate-pulse"
            style={{ animationDuration: '3s' }}
         ></div>
      </div>
   );
};

export default StatsTab;
