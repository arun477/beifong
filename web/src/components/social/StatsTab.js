import React from 'react';

const StatsTab = ({ stats }) => {
   // Helper functions for charts (keeping original logic)
   const getMaxEngagement = () => {
      if (!stats || !stats.engagement || stats.engagement.length === 0) return 0;
      return Math.max(...stats.engagement.map(platform => platform.total_engagement || 0));
   };

   const getPlatformColorClass = platform => {
      switch (platform.toLowerCase()) {
         case 'facebook':
            return 'bg-blue-600';
         case 'x':
            return 'bg-blue-400';
         default:
            return 'bg-gray-500';
      }
   };

   const getMaxPostsByDate = () => {
      if (!stats || !stats.posts_by_date || stats.posts_by_date.length === 0) return 0;
      return Math.max(...stats.posts_by_date.map(entry => entry.post_count || 0));
   };

   const getTimeSeriesPath = platform => {
      if (!stats || !stats.posts_by_date || stats.posts_by_date.length === 0) return '';

      const filteredData = stats.posts_by_date.filter(entry => entry.platform === platform);
      if (filteredData.length === 0) return '';

      const maxCount = getMaxPostsByDate();
      const width = 100 / (filteredData.length - 1);
      const height = 90; // 90% of chart height, leaving space for labels

      // Sort by date
      filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Create SVG path
      let path = `M ${0} ${height - (height * filteredData[0].post_count) / maxCount}`;

      filteredData.forEach((entry, index) => {
         if (index === 0) return; // Skip first point as it's in the M command
         const x = width * index;
         const y = height - (height * entry.post_count) / maxCount;
         path += ` L ${x} ${y}`;
      });

      return path;
   };

   const getDataPointsForPlatform = platform => {
      if (!stats || !stats.posts_by_date || stats.posts_by_date.length === 0) return [];

      const filteredData = stats.posts_by_date.filter(entry => entry.platform === platform);
      if (filteredData.length === 0) return [];

      const maxCount = getMaxPostsByDate();
      const width = 100 / Math.max(filteredData.length - 1, 1);
      const height = 90; // 90% of chart height

      // Sort by date
      filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));

      return filteredData.map((entry, index) => ({
         x: width * index,
         y: height - (height * entry.post_count) / maxCount,
         count: entry.post_count,
         date: entry.date,
      }));
   };

   const getDateLabels = () => {
      if (!stats || !stats.posts_by_date || stats.posts_by_date.length === 0) return [];

      // Get unique dates
      const uniqueDates = [...new Set(stats.posts_by_date.map(entry => entry.date))];

      // Sort dates
      uniqueDates.sort((a, b) => new Date(a) - new Date(b));

      // For clarity, if we have many dates, only show some of them
      const maxLabels = 6;
      if (uniqueDates.length <= maxLabels) return uniqueDates;

      const step = Math.ceil(uniqueDates.length / maxLabels);
      return uniqueDates.filter((_, index) => index % step === 0);
   };

   // Loading state
   if (!stats) {
      return (
         <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
         </div>
      );
   }

   return (
      <div className="space-y-4">
         {/* Key Metrics - More compact row */}
         <div className="grid grid-cols-3 gap-3">
            {/* Total Posts */}
            <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700/50 shadow-md backdrop-blur-sm hover:border-emerald-500/30 transition-all duration-300">
               <div className="flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-emerald-900/40 flex items-center justify-center mr-3">
                     <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                     </svg>
                  </div>
                  <div>
                     <div className="text-xs text-gray-400">Total Posts</div>
                     <div className="text-xl font-bold text-white">{stats.total_posts}</div>
                  </div>
               </div>
            </div>

            {/* Unique Authors */}
            <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700/50 shadow-md backdrop-blur-sm hover:border-blue-500/30 transition-all duration-300">
               <div className="flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-blue-900/40 flex items-center justify-center mr-3">
                     <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                     </svg>
                  </div>
                  <div>
                     <div className="text-xs text-gray-400">Unique Authors</div>
                     <div className="text-xl font-bold text-white">{stats.unique_authors}</div>
                  </div>
               </div>
            </div>

            {/* Total Engagement */}
            <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700/50 shadow-md backdrop-blur-sm hover:border-purple-500/30 transition-all duration-300">
               <div className="flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-purple-900/40 flex items-center justify-center mr-3">
                     <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                     </svg>
                  </div>
                  <div>
                     <div className="text-xs text-gray-400">Total Engagement</div>
                     <div className="text-xl font-bold text-white">
                        {stats.engagement?.reduce(
                           (sum, platform) => sum + (platform.total_engagement || 0),
                           0
                        ) || 0}
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Main Content Area - 2 rows x 2 columns grid */}
         <div className="grid grid-cols-2 gap-4">
            {/* Platform Distribution - More compact */}
            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700/50 shadow-md backdrop-blur-sm">
               <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-1 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  Platform Distribution
               </h3>
               <div className="space-y-2">
                  <div className="flex items-center">
                     <div className="w-20 text-xs text-gray-400 font-medium">Facebook</div>
                     <div className="flex-1">
                        <div className="relative h-4 bg-gray-700/50 rounded overflow-hidden shadow-inner">
                           {stats.facebook_posts > 0 && (
                              <div
                                 className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-blue-500 rounded"
                                 style={{
                                    width: `${(stats.facebook_posts / stats.total_posts) * 100}%`,
                                 }}
                              >
                                 <div className="absolute inset-0 bg-blue-500 opacity-30 animate-pulse"></div>
                              </div>
                           )}
                        </div>
                     </div>
                     <div className="w-16 text-right text-xs text-white font-medium">
                        {stats.facebook_posts} ({((stats.facebook_posts / stats.total_posts) * 100).toFixed(1)}%)
                     </div>
                  </div>

                  <div className="flex items-center">
                     <div className="w-20 text-xs text-gray-400 font-medium">X (Twitter)</div>
                     <div className="flex-1">
                        <div className="relative h-4 bg-gray-700/50 rounded overflow-hidden shadow-inner">
                           {stats.x_posts > 0 && (
                              <div
                                 className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-blue-300 rounded"
                                 style={{
                                    width: `${(stats.x_posts / stats.total_posts) * 100}%`,
                                 }}
                              >
                                 <div className="absolute inset-0 bg-blue-400 opacity-30 animate-pulse"></div>
                              </div>
                           )}
                        </div>
                     </div>
                     <div className="w-16 text-right text-xs text-white font-medium">
                        {stats.x_posts} ({((stats.x_posts / stats.total_posts) * 100).toFixed(1)}%)
                     </div>
                  </div>
               </div>
            </div>

            {/* Top Authors - More compact */}
            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700/50 shadow-md backdrop-blur-sm">
               <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-1 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Top Authors
               </h3>
               <div className="space-y-2">
                  {stats.top_authors?.slice(0, 4).map((author, index) => (
                     <div key={index} className="flex justify-between items-center p-2 bg-gray-900/40 rounded border border-gray-700/30 hover:border-gray-600/50 transition-all">
                        <div className="flex items-center">
                           <div className="w-5 h-5 rounded bg-gray-800 flex items-center justify-center mr-2 text-gray-400 text-xs shadow-sm">
                              {index + 1}
                           </div>
                           <span className="text-gray-300 text-xs font-medium truncate max-w-[100px]">{author.author_name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                           <span className="bg-gray-800 text-white px-1.5 py-0.5 rounded">
                              {author.post_count}
                           </span>
                           <span className="bg-emerald-900/30 text-emerald-300 px-1.5 py-0.5 rounded">
                              {author.total_engagement || 0}
                           </span>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            {/* Engagement by Platform - More compact */}
            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700/50 shadow-md backdrop-blur-sm">
               <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-1 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Engagement by Platform
               </h3>
               <div className="h-52">
                  {stats.engagement && stats.engagement.length > 0 ? (
                     <div className="h-full flex flex-col">
                        <div className="flex-1">
                           <div className="relative h-full flex items-end">
                              {/* Y-Axis */}
                              <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col justify-between text-right pr-1">
                                 {[4, 3, 2, 1, 0].map((_, i) => (
                                    <span key={i} className="text-xs text-gray-500">
                                       {Math.round((getMaxEngagement() * (4 - i)) / 4)}
                                    </span>
                                 ))}
                              </div>

                              {/* Grid Lines */}
                              <div className="absolute left-10 right-0 top-0 bottom-0 flex flex-col justify-between">
                                 {[0, 1, 2, 3, 4].map((_, i) => (
                                    <div
                                       key={i}
                                       className="border-t border-gray-700/30 w-full h-0"
                                    ></div>
                                 ))}
                              </div>

                              {/* Bars */}
                              <div className="absolute left-10 right-0 bottom-0 flex items-end h-full pt-3 pb-5">
                                 {stats.engagement.map((platform, i) => {
                                    const maxEngagement = getMaxEngagement();
                                    const height =
                                       maxEngagement > 0
                                          ? `${(platform.total_engagement / maxEngagement) * 100}%`
                                          : '0%';

                                    return (
                                       <div
                                          key={i}
                                          className="flex-1 flex flex-col items-center justify-end h-full"
                                       >
                                          <div
                                             className={`w-10 ${getPlatformColorClass(
                                                platform.platform
                                             )} rounded-t relative group`}
                                             style={{ height }}
                                          >
                                             <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
                                             <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                                                {platform.platform}: {platform.total_engagement}
                                             </div>
                                          </div>
                                          <div className="mt-1 text-xs text-gray-400 uppercase font-medium">
                                             {platform.platform.substring(0, 1)}
                                          </div>
                                       </div>
                                    );
                                 })}
                              </div>
                           </div>
                        </div>

                        {/* Compact Legend */}
                        <div className="h-8 mt-3 flex items-center justify-center">
                           <div className="flex flex-wrap gap-2 justify-center">
                              <div className="flex items-center bg-gray-900/30 px-2 py-1 rounded text-xs">
                                 <div className="w-2 h-2 bg-blue-600 rounded mr-1"></div>
                                 <span className="text-gray-300">Likes</span>
                              </div>
                              <div className="flex items-center bg-gray-900/30 px-2 py-1 rounded text-xs">
                                 <div className="w-2 h-2 bg-green-600 rounded mr-1"></div>
                                 <span className="text-gray-300">Shares</span>
                              </div>
                              <div className="flex items-center bg-gray-900/30 px-2 py-1 rounded text-xs">
                                 <div className="w-2 h-2 bg-purple-600 rounded mr-1"></div>
                                 <span className="text-gray-300">Comments</span>
                              </div>
                           </div>
                        </div>
                     </div>
                  ) : (
                     <div className="h-full flex items-center justify-center">
                        <p className="text-gray-400 text-xs">No engagement data available</p>
                     </div>
                  )}
               </div>
            </div>

            {/* Posts Over Time - More compact */}
            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700/50 shadow-md backdrop-blur-sm">
               <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-1 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Posts Over Time
               </h3>
               <div className="h-52">
                  {stats.posts_by_date && stats.posts_by_date.length > 0 ? (
                     <div className="relative h-full">
                        {/* Y-Axis */}
                        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-right pr-1">
                           {[4, 3, 2, 1, 0].map((_, i) => (
                              <span key={i} className="text-xs text-gray-500">
                                 {Math.round((getMaxPostsByDate() * (4 - i)) / 4)}
                              </span>
                           ))}
                        </div>

                        {/* Time Series Chart */}
                        <div className="absolute left-8 right-0 top-0 bottom-0">
                           {/* Grid Lines */}
                           <div className="absolute inset-0 flex flex-col justify-between">
                              {[0, 1, 2, 3, 4].map((_, i) => (
                                 <div
                                    key={i}
                                    className="border-t border-gray-700/30 w-full h-0"
                                 ></div>
                              ))}
                           </div>

                           {/* Line Chart */}
                           <div className="absolute inset-0 flex items-end">
                              <svg className="w-full h-full" preserveAspectRatio="none">
                                 {/* Facebook Line */}
                                 <path
                                    d={getTimeSeriesPath('facebook')}
                                    fill="none"
                                    stroke="#3b82f6"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                 />

                                 {/* X Line */}
                                 <path
                                    d={getTimeSeriesPath('x')}
                                    fill="none"
                                    stroke="#38bdf8"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                 />

                                 {/* Data Points for Facebook */}
                                 {getDataPointsForPlatform('facebook').map((point, i) => (
                                    <circle
                                       key={`fb-${i}`}
                                       cx={point.x}
                                       cy={point.y}
                                       r="3"
                                       fill="#3b82f6"
                                       className="hover:r-4 transition-all duration-200"
                                    />
                                 ))}

                                 {/* Data Points for X */}
                                 {getDataPointsForPlatform('x').map((point, i) => (
                                    <circle
                                       key={`x-${i}`}
                                       cx={point.x}
                                       cy={point.y}
                                       r="3"
                                       fill="#38bdf8"
                                       className="hover:r-4 transition-all duration-200"
                                    />
                                 ))}
                              </svg>
                           </div>

                           {/* X-Axis - Dates */}
                           <div className="absolute left-0 right-0 bottom-0 h-6 flex justify-between">
                              {getDateLabels().map((date, i) => (
                                 <div
                                    key={i}
                                    className="text-xs text-gray-500 transform -rotate-45 origin-top-left text-xs"
                                 >
                                    {date}
                                 </div>
                              ))}
                           </div>
                        </div>

                        {/* Legend */}
                        <div className="absolute top-0 right-0 flex gap-2">
                           <div className="flex items-center bg-gray-900/30 px-2 py-0.5 rounded text-xs">
                              <div className="w-2 h-2 bg-blue-600 rounded-full mr-1"></div>
                              <span className="text-gray-300">FB</span>
                           </div>
                           <div className="flex items-center bg-gray-900/30 px-2 py-0.5 rounded text-xs">
                              <div className="w-2 h-2 bg-blue-400 rounded-full mr-1"></div>
                              <span className="text-gray-300">X</span>
                           </div>
                        </div>
                     </div>
                  ) : (
                     <div className="h-full flex items-center justify-center">
                        <p className="text-gray-400 text-xs">No time series data available</p>
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div>
   );
};

export default StatsTab;