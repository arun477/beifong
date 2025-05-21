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
   Smile,
   Frown,
   AlertCircle,
   Minus,
   TrendingUp,
   Users,
   BarChart2,
   Calendar,
   Filter,
   RefreshCw,
   PieChart as PieChartIcon,
   Activity,
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
   const categoryChartData = categorySentiment.slice(0, 6).map(cat => ({
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
               <div className="flex flex-col h-56">
                  <div className="flex-grow">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                           data={categoryChartData}
                           layout="vertical"
                           margin={{ top: 5, right: 20, left: 25, bottom: 5 }}
                           barSize={10}
                           barGap={1}
                           maxBarSize={10}
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
                              fontSize={9}
                              tickFormatter={value => value.toLocaleString()}
                              axisLine={false}
                              tickLine={false}
                              domain={[0, 'dataMax']}
                              allowDecimals={false}
                           />
                           <YAxis
                              dataKey="name"
                              type="category"
                              stroke={COLORS.text.secondary}
                              fontSize={10}
                              width={60}
                              tick={{ fill: COLORS.text.secondary }}
                              axisLine={false}
                              tickLine={false}
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

                  {/* Manual Legend - better positioned and styled */}
                  <div className="flex items-center justify-center mt-2 gap-4">
                     <div className="flex items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5"></div>
                        <span className="text-xs text-gray-300">Positive</span>
                     </div>
                     <div className="flex items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 mr-1.5"></div>
                        <span className="text-xs text-gray-300">Negative</span>
                     </div>
                     <div className="flex items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500 mr-1.5"></div>
                        <span className="text-xs text-gray-300">Critical</span>
                     </div>
                     <div className="flex items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-500 mr-1.5"></div>
                        <span className="text-xs text-gray-300">Neutral</span>
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
         <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* User Sentiment - IMPROVED */}
            <AnalyticsCard
               title="Users by Sentiment"
               icon={<Users size={16} className="text-emerald-400" />}
            >
               <div className="space-y-3 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
                  {userSentiment.map(user => (
                     <div
                        key={user.user_handle}
                        className="group bg-gradient-to-r from-gray-900 to-gray-800/90 rounded-md p-3 border border-gray-700/50 transition-all duration-300 hover:border-emerald-600/30 hover:shadow-md"
                     >
                        <div className="flex items-center justify-between mb-1.5">
                           <div className="flex items-center">
                              <span className="text-xs font-medium text-white">
                                 {user.user_display_name || `@${user.user_handle.replace('@', '')}`}
                              </span>
                              <span className="text-xs text-gray-400 ml-1.5 bg-gray-800/70 px-1.5 py-0.5 rounded-full">
                                 {user.total_posts} posts
                              </span>
                           </div>
                        </div>

                        {/* Enhanced sentiment visualization */}
                        <div className="flex items-center space-x-1 mb-2">
                           {/* Sentiment gauges with improved design */}
                           <div
                              className="h-8 relative flex-grow bg-gray-800/50 rounded-md overflow-hidden border border-gray-700/30"
                              style={{ width: `${Math.max(user.positive_percent, 5)}%` }}
                           >
                              <div className="absolute inset-0 bg-emerald-500/20"></div>
                              <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                                 <Smile size={12} className="text-emerald-400 mr-1" />
                                 <span className="text-xs text-emerald-300 font-medium">
                                    {user.positive_percent}%
                                 </span>
                              </div>
                           </div>

                           <div
                              className="h-8 relative flex-grow bg-gray-800/50 rounded-md overflow-hidden border border-gray-700/30"
                              style={{ width: `${Math.max(user.negative_percent, 5)}%` }}
                           >
                              <div className="absolute inset-0 bg-red-500/20"></div>
                              <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                                 <Frown size={12} className="text-red-400 mr-1" />
                                 <span className="text-xs text-red-300 font-medium">
                                    {user.negative_percent}%
                                 </span>
                              </div>
                           </div>

                           <div
                              className="h-8 relative flex-grow bg-gray-800/50 rounded-md overflow-hidden border border-gray-700/30"
                              style={{ width: `${Math.max(user.critical_percent, 5)}%` }}
                           >
                              <div className="absolute inset-0 bg-orange-500/20"></div>
                              <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                                 <AlertCircle size={12} className="text-orange-400 mr-1" />
                                 <span className="text-xs text-orange-300 font-medium">
                                    {user.critical_percent}%
                                 </span>
                              </div>
                           </div>

                           <div
                              className="h-8 relative flex-grow bg-gray-800/50 rounded-md overflow-hidden border border-gray-700/30"
                              style={{ width: `${Math.max(user.neutral_percent, 5)}%` }}
                           >
                              <div className="absolute inset-0 bg-gray-500/20"></div>
                              <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                                 <Minus size={12} className="text-gray-400 mr-1" />
                                 <span className="text-xs text-gray-300 font-medium">
                                    {user.neutral_percent}%
                                 </span>
                              </div>
                           </div>
                        </div>

                        {/* Post count badges */}
                        <div className="flex flex-wrap gap-2 text-xs">
                           <div className="flex items-center bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                              <Smile size={10} className="text-emerald-400 mr-1" />
                              <span className="text-emerald-400">{user.positive_count}</span>
                           </div>
                           <div className="flex items-center bg-red-500/10 px-1.5 py-0.5 rounded-md border border-red-500/20">
                              <Frown size={10} className="text-red-400 mr-1" />
                              <span className="text-red-400">{user.negative_count}</span>
                           </div>
                           <div className="flex items-center bg-orange-500/10 px-1.5 py-0.5 rounded-md border border-orange-500/20">
                              <AlertCircle size={10} className="text-orange-400 mr-1" />
                              <span className="text-orange-400">{user.critical_count}</span>
                           </div>
                           <div className="flex items-center bg-gray-500/10 px-1.5 py-0.5 rounded-md border border-gray-500/20">
                              <Minus size={10} className="text-gray-400 mr-1" />
                              <span className="text-gray-400">{user.neutral_count}</span>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </AnalyticsCard>

            {/* Trending Topics with enhanced UI */}
            <AnalyticsCard
               title="Trending Topics"
               icon={<TrendingUp size={16} className="text-emerald-400" />}
            >
               <div className="space-y-3 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
                  {trendingTopics.map((topic, index) => (
                     <div
                        key={index}
                        className="group bg-gradient-to-r from-gray-900/70 to-gray-800/70 rounded-md p-3 border border-gray-700/50 transition-all duration-300 hover:border-emerald-600/30 hover:shadow-md"
                     >
                        <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-1.5">
                              <div className="p-1 bg-emerald-500/10 rounded-full">
                                 <TrendingUp size={12} className="text-emerald-400" />
                              </div>
                              <span className="text-xs font-medium text-white">#{topic.topic}</span>
                           </div>
                           <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-800/70 rounded-full">
                              {topic.total_count} posts
                           </span>
                        </div>

                        <div className="flex mb-2 h-2.5 rounded-full overflow-hidden border border-gray-700/30">
                           {/* Sentiment distribution - horizontal bars */}
                           <div
                              className="h-full bg-emerald-500 group-hover:bg-emerald-400 transition-colors duration-300"
                              style={{ width: `${topic.positive_percent}%` }}
                           ></div>
                           <div
                              className="h-full bg-red-500 group-hover:bg-red-400 transition-colors duration-300"
                              style={{ width: `${topic.negative_percent}%` }}
                           ></div>
                           <div
                              className="h-full bg-orange-500 group-hover:bg-orange-400 transition-colors duration-300"
                              style={{ width: `${topic.critical_percent}%` }}
                           ></div>
                           <div
                              className="h-full bg-gray-500 group-hover:bg-gray-400 transition-colors duration-300"
                              style={{ width: `${topic.neutral_percent}%` }}
                           ></div>
                        </div>

                        {/* Sentiment breakdown */}
                        <div className="flex flex-wrap gap-2 text-xs">
                           <div className="flex items-center bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></div>
                              <span className="text-gray-300">
                                 {topic.positive_percent.toFixed(1)}%
                              </span>
                           </div>
                           <div className="flex items-center bg-red-500/10 px-2 py-1 rounded-md border border-red-500/20">
                              <div className="w-2 h-2 rounded-full bg-red-500 mr-1.5"></div>
                              <span className="text-gray-300">
                                 {topic.negative_percent.toFixed(1)}%
                              </span>
                           </div>
                           <div className="flex items-center bg-orange-500/10 px-2 py-1 rounded-md border border-orange-500/20">
                              <div className="w-2 h-2 rounded-full bg-orange-500 mr-1.5"></div>
                              <span className="text-gray-300">
                                 {topic.critical_percent.toFixed(1)}%
                              </span>
                           </div>
                           <div className="flex items-center bg-gray-500/10 px-2 py-1 rounded-md border border-gray-500/20">
                              <div className="w-2 h-2 rounded-full bg-gray-500 mr-1.5"></div>
                              <span className="text-gray-300">
                                 {topic.neutral_percent.toFixed(1)}%
                              </span>
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
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
               {influentialPosts.map(post => {
                  // Calculate total engagement
                  const engagement = post.engagement || {};
                  const totalEngagement =
                     (engagement.replies || 0) +
                     (engagement.retweets || 0) +
                     (engagement.likes || 0) +
                     (engagement.bookmarks || 0);

                  const sentimentColor =
                     post.sentiment === 'positive'
                        ? 'emerald'
                        : post.sentiment === 'negative'
                        ? 'red'
                        : post.sentiment === 'critical'
                        ? 'orange'
                        : 'gray';

                  return (
                     <div
                        key={post.post_id}
                        className="group bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-md p-3 border border-gray-700/50 transition-all duration-300 hover:shadow-md hover:border-gray-600/70"
                     >
                        <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center">
                              <span className="text-xs font-medium text-white">
                                 {post.user_display_name ||
                                    `@${post.user_handle?.replace('@', '')}`}
                              </span>
                              <span className="text-gray-500 mx-1.5 flex-shrink-0">·</span>
                              <span className="text-xs text-gray-400">
                                 {new Date(post.post_timestamp).toLocaleDateString()}
                              </span>
                           </div>
                           <div
                              className={`flex items-center px-2 py-1 rounded-full bg-${sentimentColor}-500/20 text-${sentimentColor}-400 border border-${sentimentColor}-500/30`}
                           >
                              {getSentimentIcon(post.sentiment, 12)}
                              <span className="text-xs ml-1 capitalize">{post.sentiment}</span>
                           </div>
                        </div>

                        <p className="text-gray-200 text-xs mb-3 line-clamp-2 bg-gray-800/30 p-2 rounded-md border border-gray-700/30">
                           {post.post_text}
                        </p>

                        <div className="flex justify-between items-center">
                           <div className="flex flex-wrap gap-2 text-xs">
                              {engagement.replies > 0 && (
                                 <div className="flex items-center px-1.5 py-0.5 bg-gray-800/50 rounded-md border border-gray-700/30">
                                    <span className="text-gray-400">
                                       {engagement.replies} replies
                                    </span>
                                 </div>
                              )}
                              {engagement.retweets > 0 && (
                                 <div className="flex items-center px-1.5 py-0.5 bg-gray-800/50 rounded-md border border-gray-700/30">
                                    <span className="text-gray-400">
                                       {engagement.retweets} retweets
                                    </span>
                                 </div>
                              )}
                              {engagement.likes > 0 && (
                                 <div className="flex items-center px-1.5 py-0.5 bg-gray-800/50 rounded-md border border-gray-700/30">
                                    <span className="text-gray-400">{engagement.likes} likes</span>
                                 </div>
                              )}
                           </div>
                           <div className="flex items-center px-2 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                              <TrendingUp size={12} className="text-emerald-400 mr-1.5" />
                              <span className="text-emerald-400 font-medium text-xs">
                                 {totalEngagement} engagement
                              </span>
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
