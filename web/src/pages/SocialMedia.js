import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

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

const SocialMedia = () => {
   const [posts, setPosts] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const [stats, setStats] = useState(null);
   const [topPosts, setTopPosts] = useState([]);
   const [platforms, setPlatforms] = useState([]);
   const [authors, setAuthors] = useState([]);
   const [activeTab, setActiveTab] = useState('feed');
   const [filters, setFilters] = useState({
      platform: '',
      author: '',
      dateFrom: '',
      dateTo: '',
      search: '',
   });
   const [pagination, setPagination] = useState({
      page: 1,
      perPage: 10,
      totalPages: 1,
      total: 0,
   });

   // Load initial data
   useEffect(() => {
      fetchPosts();
      fetchStats();
      fetchTopPosts();
      fetchPlatforms();
      fetchAuthors();
   }, []);

   // Refetch posts when filters or pagination changes
   useEffect(() => {
      fetchPosts();
   }, [pagination.page, filters]);

   // Add isFilterOpen state
   const [isFilterOpen, setIsFilterOpen] = useState(false);

   const fetchPosts = async () => {
      try {
         setLoading(true);
         const response = await api.socialMedia.getAll({
            page: pagination.page,
            per_page: pagination.perPage,
            platform: filters.platform || undefined,
            author: filters.author || undefined,
            date_from: filters.dateFrom || undefined,
            date_to: filters.dateTo || undefined,
            search: filters.search || undefined,
         });

         setPosts(response.data.items || []);
         setPagination({
            page: response.data.page || 1,
            perPage: response.data.per_page || 10,
            totalPages: response.data.total_pages || 1,
            total: response.data.total || 0,
         });
      } catch (error) {
         console.error('Error fetching social media posts:', error);
         setError('Failed to load social media posts');
      } finally {
         setLoading(false);
      }
   };

   const fetchStats = async () => {
      try {
         const response = await api.socialMedia.getStats();
         setStats(response.data);
      } catch (error) {
         console.error('Error fetching social media stats:', error);
      }
   };

   const fetchTopPosts = async () => {
      try {
         const response = await api.socialMedia.getTopPosts(5);
         setTopPosts(response.data || []);
      } catch (error) {
         console.error('Error fetching top posts:', error);
      }
   };

   const fetchPlatforms = async () => {
      try {
         const response = await api.socialMedia.getPlatforms();
         setPlatforms(response.data || []);
      } catch (error) {
         console.error('Error fetching platforms:', error);
      }
   };

   const fetchAuthors = async () => {
      try {
         const response = await api.socialMedia.getAuthors(20);
         setAuthors(response.data || []);
      } catch (error) {
         console.error('Error fetching authors:', error);
      }
   };

   const resetFilters = () => {
      setFilters({
         platform: '',
         author: '',
         dateFrom: '',
         dateTo: '',
         search: '',
      });
      setPagination(prev => ({ ...prev, page: 1 }));
   };

   const handleFilterChange = (name, value) => {
      setFilters(prev => ({
         ...prev,
         [name]: value,
      }));
      setPagination(prev => ({ ...prev, page: 1 }));
   };

   const handlePrevPage = () => {
      if (pagination.page > 1) {
         setPagination(prev => ({ ...prev, page: prev.page - 1 }));
      }
   };

   const handleNextPage = () => {
      if (pagination.page < pagination.totalPages) {
         setPagination(prev => ({ ...prev, page: prev.page + 1 }));
      }
   };

   const handleTabChange = tab => {
      setActiveTab(tab);
   };

   // Helper functions for charts
   const getMaxEngagement = () => {
      if (!stats || !stats.engagement || stats.engagement.length === 0) return 0;
      return Math.max(...stats.engagement.map(platform => platform.total_engagement || 0));
   };

   const getPlatformColorClass = platform => {
      switch (platform.toLowerCase()) {
         case 'facebook':
            return 'bg-gradient-to-b from-blue-600 to-blue-700';
         case 'x':
            return 'bg-gradient-to-b from-blue-400 to-blue-500';
         default:
            return 'bg-gradient-to-b from-gray-500 to-gray-600';
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

   // Tab content components
   const FeedTab = () => (
      <div className="space-y-6">
         {isFilterOpen && (
            <div className="bg-gray-800/80 backdrop-blur-sm shadow-xl rounded-xl p-5 mb-6 border border-gray-700/80">
               <form
                  onSubmit={e => {
                     e.preventDefault();
                     setIsFilterOpen(false);
                  }}
                  className="space-y-4 md:space-y-0 md:grid md:grid-cols-3 md:gap-4"
               >
                  <div>
                     <label
                        htmlFor="platform"
                        className="block text-sm font-medium text-gray-300 mb-1"
                     >
                        Platform
                     </label>
                     <select
                        id="platform"
                        className="w-full px-3 py-2.5 bg-gray-900/90 border border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-400 sm:text-sm text-gray-300 transition-all"
                        value={filters.platform}
                        onChange={e => handleFilterChange('platform', e.target.value)}
                     >
                        <option value="">All Platforms</option>
                        {platforms.map(platform => (
                           <option key={platform} value={platform}>
                              {platform.charAt(0).toUpperCase() + platform.slice(1)}
                           </option>
                        ))}
                     </select>
                  </div>
                  <div>
                     <label
                        htmlFor="author"
                        className="block text-sm font-medium text-gray-300 mb-1"
                     >
                        Author
                     </label>
                     <select
                        id="author"
                        className="w-full px-3 py-2.5 bg-gray-900/90 border border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-400 sm:text-sm text-gray-300 transition-all"
                        value={filters.author}
                        onChange={e => handleFilterChange('author', e.target.value)}
                     >
                        <option value="">All Authors</option>
                        {authors.map(author => (
                           <option key={author.author_name} value={author.author_name}>
                              {author.author_name}
                           </option>
                        ))}
                     </select>
                  </div>
                  <div className="flex space-x-2">
                     <div className="w-1/2">
                        <label
                           htmlFor="dateFrom"
                           className="block text-sm font-medium text-gray-300 mb-1"
                        >
                           From Date
                        </label>
                        <input
                           type="date"
                           id="dateFrom"
                           value={filters.dateFrom}
                           onChange={e => handleFilterChange('dateFrom', e.target.value)}
                           className="w-full px-3 py-2.5 bg-gray-900/90 border border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-400 sm:text-sm text-gray-300 transition-all"
                        />
                     </div>
                     <div className="w-1/2">
                        <label
                           htmlFor="dateTo"
                           className="block text-sm font-medium text-gray-300 mb-1"
                        >
                           To Date
                        </label>
                        <input
                           type="date"
                           id="dateTo"
                           value={filters.dateTo}
                           onChange={e => handleFilterChange('dateTo', e.target.value)}
                           className="w-full px-3 py-2.5 bg-gray-900/90 border border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-400 sm:text-sm text-gray-300 transition-all"
                        />
                     </div>
                  </div>
                  <div className="md:col-span-3 flex items-end space-x-3">
                     <button
                        type="submit"
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-lg hover:shadow-lg hover:shadow-emerald-900/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 text-sm font-medium transition-all duration-200"
                     >
                        Apply Filters
                     </button>
                     <button
                        type="button"
                        onClick={resetFilters}
                        className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900 text-sm font-medium transition-all duration-200 border border-gray-700"
                     >
                        Reset
                     </button>
                  </div>
               </form>
            </div>
         )}

         {(filters.platform || filters.author || filters.dateFrom || filters.dateTo) && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
               <span className="text-sm text-gray-400 font-medium">Active filters:</span>
               {filters.platform && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-800/90 text-gray-300 border border-gray-700 shadow-sm">
                     Platform: {filters.platform}
                     <button
                        onClick={() => handleFilterChange('platform', '')}
                        className="ml-1.5 text-gray-500 hover:text-emerald-300 transition-colors duration-200"
                        aria-label={`Remove ${filters.platform} filter`}
                     >
                        <svg
                           xmlns="http://www.w3.org/2000/svg"
                           className="h-3 w-3"
                           viewBox="0 0 20 20"
                           fill="currentColor"
                        >
                           <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                           />
                        </svg>
                     </button>
                  </span>
               )}
               {filters.author && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-800/90 text-gray-300 border border-gray-700 shadow-sm">
                     Author: {filters.author}
                     <button
                        onClick={() => handleFilterChange('author', '')}
                        className="ml-1.5 text-gray-500 hover:text-emerald-300 transition-colors duration-200"
                        aria-label={`Remove ${filters.author} filter`}
                     >
                        <svg
                           xmlns="http://www.w3.org/2000/svg"
                           className="h-3 w-3"
                           viewBox="0 0 20 20"
                           fill="currentColor"
                        >
                           <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                           />
                        </svg>
                     </button>
                  </span>
               )}
               {filters.dateFrom && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-900/40 text-emerald-300 border border-emerald-700/70 shadow-sm relative group">
                     From: {filters.dateFrom}
                     <button
                        onClick={() => handleFilterChange('dateFrom', '')}
                        className="ml-1.5 text-emerald-500 hover:text-emerald-200 transition-colors duration-200"
                        aria-label="Remove date from filter"
                     >
                        <svg
                           xmlns="http://www.w3.org/2000/svg"
                           className="h-3 w-3"
                           viewBox="0 0 20 20"
                           fill="currentColor"
                        >
                           <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                           />
                        </svg>
                     </button>
                  </span>
               )}
               {filters.dateTo && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-900/40 text-emerald-300 border border-emerald-700/70 shadow-sm relative group">
                     To: {filters.dateTo}
                     <button
                        onClick={() => handleFilterChange('dateTo', '')}
                        className="ml-1.5 text-emerald-500 hover:text-emerald-200 transition-colors duration-200"
                        aria-label="Remove date to filter"
                     >
                        <svg
                           xmlns="http://www.w3.org/2000/svg"
                           className="h-3 w-3"
                           viewBox="0 0 20 20"
                           fill="currentColor"
                        >
                           <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                           />
                        </svg>
                     </button>
                  </span>
               )}
            </div>
         )}

         {loading ? (
            <div className="flex justify-center py-16">
               <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full shadow-md"></div>
            </div>
         ) : error ? (
            <div className="bg-red-900/40 backdrop-blur-sm border border-red-700 text-red-200 px-5 py-4 rounded-xl shadow-lg">
               <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
               </div>
            </div>
         ) : posts.length === 0 ? (
            <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700 rounded-xl p-10 text-center shadow-lg">
               <div className="w-20 h-20 mx-auto mb-5 bg-gray-700/50 rounded-full flex items-center justify-center">
                  <svg
                     className="w-10 h-10 text-gray-400"
                     fill="none"
                     viewBox="0 0 24 24"
                     stroke="currentColor"
                  >
                     <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M6 18L18 6M6 6l12 12"
                     />
                  </svg>
               </div>
               <h3 className="text-xl font-semibold text-gray-300 mb-2">No posts found</h3>
               <p className="text-gray-400">Try adjusting your filters or search terms</p>
            </div>
         ) : (
            <>
               <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/70 rounded-xl p-4 mb-6 shadow-lg">
                  <div className="flex items-center justify-between">
                     <span className="text-sm text-gray-300">
                        Showing <span className="text-white font-semibold">{posts.length}</span> of{' '}
                        <span className="text-white font-semibold">{pagination.total}</span> posts
                     </span>
                  </div>
               </div>

               <div className="space-y-3">
                  {posts.map(post => (
                     <Link
                        key={post.id}
                        to={`/social-media/${post.id}`}
                        className="block bg-gray-800/20 hover:bg-gray-800/40 backdrop-blur-sm border border-gray-700/60 hover:border-gray-600 rounded-xl p-4 transition-all duration-300 shadow-md hover:shadow-lg"
                     >
                        <div className="flex gap-4">
                           <div className="flex-shrink-0 mt-0.5">
                              {post.has_image && post.image_url ? (
                                 <div className="w-12 h-12 bg-gray-700 rounded-xl overflow-hidden border border-gray-700 shadow-md">
                                    <img
                                       src={post.image_url}
                                       alt="Profile"
                                       className="w-full h-full object-cover"
                                       onError={e => {
                                          e.target.onerror = null;
                                          e.target.src = 'https://via.placeholder.com/40';
                                       }}
                                    />
                                 </div>
                              ) : (
                                 <div className="w-12 h-12 bg-gray-800/80 rounded-xl flex items-center justify-center border border-gray-700/80 shadow-md">
                                    {getPlatformIcon(post.platform)}
                                 </div>
                              )}
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-1">
                                 <span className="text-white font-medium text-sm">
                                    {post.author_name}
                                 </span>
                                 {post.author_is_verified && (
                                    <span className="text-blue-400">
                                       <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="h-4 w-4"
                                          viewBox="0 0 24 24"
                                          fill="currentColor"
                                       >
                                          <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"></path>
                                       </svg>
                                    </span>
                                 )}
                                 <span className="text-gray-500 text-xs">
                                    @
                                    {post.author_handle ||
                                       post.author_name.toLowerCase().replace(/\s/g, '')}
                                 </span>
                                 <span className="text-gray-500 text-xs mx-1">·</span>
                                 <span className="text-gray-500 text-xs">
                                    {formatDate(post.post_datetime).split(' ')[0]}
                                 </span>
                              </div>
                              <p className="text-gray-200 text-sm mb-3 leading-relaxed">{post.message}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-400">
                                 {post.comments_count > 0 && (
                                    <div className="flex items-center gap-1 hover:text-blue-400 transition-colors">
                                       <svg
                                          className="w-3.5 h-3.5"
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
                                       {post.comments_count}
                                    </div>
                                 )}

                                 {(post.reposts_count > 0 || post.shares_count > 0) && (
                                    <div className="flex items-center gap-1 hover:text-green-400 transition-colors">
                                       <svg
                                          className="w-3.5 h-3.5"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                       >
                                          <path
                                             strokeLinecap="round"
                                             strokeLinejoin="round"
                                             strokeWidth="2"
                                             d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                          />
                                       </svg>
                                       {post.reposts_count || post.shares_count}
                                    </div>
                                 )}

                                 {post.likes_count > 0 && (
                                    <div className="flex items-center gap-1 hover:text-rose-400 transition-colors">
                                       <svg
                                          className="w-3.5 h-3.5"
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
                                       {post.likes_count}
                                    </div>
                                 )}

                                 {post.views_count > 0 && (
                                    <div className="flex items-center gap-1">
                                       <svg
                                          className="w-3.5 h-3.5"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                       >
                                          <path
                                             strokeLinecap="round"
                                             strokeLinejoin="round"
                                             strokeWidth="2"
                                             d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                          />
                                          <path
                                             strokeLinecap="round"
                                             strokeLinejoin="round"
                                             strokeWidth="2"
                                             d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                          />
                                       </svg>
                                       {post.views_count}
                                    </div>
                                 )}

                                 <div className="ml-auto text-xs flex items-center">
                                    <div
                                       className={`h-2 w-2 rounded-full mr-1 ${
                                          post.platform === 'x'
                                             ? 'bg-blue-400'
                                             : post.platform === 'facebook'
                                             ? 'bg-blue-600'
                                             : 'bg-gray-400'
                                       }`}
                                    ></div>
                                    <span className="capitalize">{post.platform}</span>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </Link>
                  ))}
               </div>

               {!loading && !error && posts.length > 0 && (
                  <div className="mt-8 flex items-center justify-between bg-gray-800/40 backdrop-blur-sm p-4 rounded-xl border border-gray-700/70 shadow-lg">
                     <div className="flex items-center text-xs text-gray-400">
                        Showing{' '}
                        <span className="font-medium text-gray-300 px-1">{posts.length}</span> of{' '}
                        <span className="font-medium text-gray-300 px-1">{pagination.total}</span>{' '}
                        results
                     </div>
                     <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-end">
                        <nav
                           className="inline-flex shadow-lg rounded-lg overflow-hidden"
                           aria-label="Pagination"
                        >
                           <button
                              onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
                              disabled={pagination.page === 1}
                              className={`relative inline-flex items-center px-3 py-2 ${
                                 pagination.page > 1
                                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border-r border-gray-700'
                                    : 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-70'
                              } transition-colors duration-200`}
                           >
                              <span className="sr-only">First</span>
                              <svg
                                 xmlns="http://www.w3.org/2000/svg"
                                 className="h-5 w-5"
                                 viewBox="0 0 20 20"
                                 fill="currentColor"
                              >
                                 <path
                                    fillRule="evenodd"
                                    d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z"
                                    clipRule="evenodd"
                                 />
                              </svg>
                           </button>
                           <button
                              onClick={handlePrevPage}
                              disabled={pagination.page === 1}
                              className={`relative inline-flex items-center px-3 py-2 ${
                                 pagination.page > 1
                                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border-r border-gray-700'
                                    : 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-70'
                              } transition-colors duration-200`}
                           >
                              <span className="sr-only">Previous</span>
                              <svg
                                 className="h-5 w-5"
                                 xmlns="http://www.w3.org/2000/svg"
                                 viewBox="0 0 20 20"
                                 fill="currentColor"
                                 aria-hidden="true"
                              >
                                 <path
                                    fillRule="evenodd"
                                    d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                                    clipRule="evenodd"
                                 />
                              </svg>
                           </button>
                           <span className="relative inline-flex items-center px-4 py-2 text-sm font-medium bg-emerald-900/50 text-emerald-300 border-r border-emerald-800/70">
                              Page {pagination.page} of {pagination.totalPages}
                              {/* Active page indicator with subtle glow */}
                              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 opacity-70"></span>
                           </span>
                           <button
                              onClick={handleNextPage}
                              disabled={pagination.page === pagination.totalPages}
                              className={`relative inline-flex items-center px-3 py-2 ${
                                 pagination.page < pagination.totalPages
                                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border-r border-gray-700'
                                    : 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-70'
                              } transition-colors duration-200`}
                           >
                              <span className="sr-only">Next</span>
                              <svg
                                 className="h-5 w-5"
                                 xmlns="http://www.w3.org/2000/svg"
                                 viewBox="0 0 20 20"
                                 fill="currentColor"
                                 aria-hidden="true"
                              >
                                 <path
                                    fillRule="evenodd"
                                    d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                                    clipRule="evenodd"
                                 />
                              </svg>
                           </button>
                           <button
                              onClick={() =>
                                 setPagination(prev => ({ ...prev, page: pagination.totalPages }))
                              }
                              disabled={pagination.page === pagination.totalPages}
                              className={`relative inline-flex items-center px-3 py-2 ${
                                 pagination.page < pagination.totalPages
                                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    : 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-70'
                              } transition-colors duration-200`}
                           >
                              <span className="sr-only">Last</span>
                              <svg
                                 xmlns="http://www.w3.org/2000/svg"
                                 className="h-5 w-5"
                                 viewBox="0 0 20 20"
                                 fill="currentColor"
                              >
                                 <path
                                    fillRule="evenodd"
                                    d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z"
                                    clipRule="evenodd"
                                 />
                                 <path
                                    fillRule="evenodd"
                                    d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z"
                                    clipRule="evenodd"
                                 />
                              </svg>
                           </button>
                        </nav>
                     </div>
                     <div className="flex flex-1 justify-between sm:hidden">
                        <button
                           onClick={handlePrevPage}
                           disabled={pagination.page === 1}
                           className={`relative inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium ${
                              pagination.page > 1
                                 ? 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 shadow-lg'
                                 : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                           } transition-colors duration-200`}
                        >
                           Previous
                        </button>
                        <button
                           onClick={handleNextPage}
                           disabled={pagination.page === pagination.totalPages}
                           className={`relative ml-3 inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium ${
                              pagination.page < pagination.totalPages
                                 ? 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 shadow-lg'
                                 : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                           } transition-colors duration-200`}
                        >
                           Next
                        </button>
                     </div>
                  </div>
               )}
            </>
         )}
      </div>
   );

   const StatsTab = () => (
      <div className="space-y-6">
         {!stats ? (
            <div className="flex items-center justify-center h-64">
               <div className="w-14 h-14 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin shadow-xl"></div>
            </div>
         ) : (
            <>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/60 rounded-xl p-5 shadow-lg hover:shadow-emerald-900/5 transition-all duration-300 hover:border-gray-600">
                     <div className="flex items-center">
                        <div className="w-14 h-14 bg-emerald-900/30 backdrop-blur-sm rounded-xl flex items-center justify-center mr-4 shadow-lg">
                           <svg
                              className="w-7 h-7 text-emerald-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                           >
                              <path
                                 strokeLinecap="round"
                                 strokeLinejoin="round"
                                 strokeWidth="2"
                                 d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                              />
                           </svg>
                        </div>
                        <div>
                           <div className="text-gray-400 text-sm">Total Posts</div>
                           <div className="text-3xl font-bold text-white mt-1">{stats.total_posts}</div>
                        </div>
                     </div>
                  </div>

                  <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/60 rounded-xl p-5 shadow-lg hover:shadow-blue-900/5 transition-all duration-300 hover:border-gray-600">
                     <div className="flex items-center">
                        <div className="w-14 h-14 bg-blue-900/30 backdrop-blur-sm rounded-xl flex items-center justify-center mr-4 shadow-lg">
                           <svg
                              className="w-7 h-7 text-blue-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                           >
                              <path
                                 strokeLinecap="round"
                                 strokeLinejoin="round"
                                 strokeWidth="2"
                                 d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                              />
                           </svg>
                        </div>
                        <div>
                           <div className="text-gray-400 text-sm">Unique Authors</div>
                           <div className="text-3xl font-bold text-white mt-1">
                              {stats.unique_authors}
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/60 rounded-xl p-5 shadow-lg hover:shadow-purple-900/5 transition-all duration-300 hover:border-gray-600">
                     <div className="flex items-center">
                        <div className="w-14 h-14 bg-purple-900/30 backdrop-blur-sm rounded-xl flex items-center justify-center mr-4 shadow-lg">
                           <svg
                              className="w-7 h-7 text-purple-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                           >
                              <path
                                 strokeLinecap="round"
                                 strokeLinejoin="round"
                                 strokeWidth="2"
                                 d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                              />
                           </svg>
                        </div>
                        <div>
                           <div className="text-gray-400 text-sm">Total Engagement</div>
                           <div className="text-3xl font-bold text-white mt-1">
                              {stats.engagement?.reduce(
                                 (sum, platform) => sum + (platform.total_engagement || 0),
                                 0
                              ) || 0}
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/60 rounded-xl p-5 shadow-lg">
                     <h3 className="text-lg font-semibold text-white mb-5 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                        </svg>
                        Platform Distribution
                     </h3>
                     <div className="flex flex-col space-y-5">
                        <div className="flex items-center mb-1">
                           <div className="w-28 text-xs text-gray-400 font-medium">Facebook</div>
                           <div className="flex-1">
                              <div className="relative h-5 bg-gray-700/50 rounded-lg overflow-hidden shadow-inner">
                                 {stats.facebook_posts > 0 && (
                                    <div
                                       className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-700 to-blue-500 rounded-lg"
                                       style={{
                                          width: `${
                                             (stats.facebook_posts / stats.total_posts) * 100
                                          }%`,
                                       }}
                                    >
                                       <div className="absolute inset-0 bg-blue-500 opacity-30 animate-pulse"></div>
                                    </div>
                                 )}
                                 {stats.facebook_posts > 0 && (
                                    <div className="absolute right-2 top-0 bottom-0 flex items-center">
                                       <span className="text-xs font-medium text-white">
                                          {(
                                             (stats.facebook_posts / stats.total_posts) *
                                             100
                                          ).toFixed(1)}
                                          %
                                       </span>
                                    </div>
                                 )}
                              </div>
                           </div>
                           <div className="w-16 text-right text-sm text-white font-medium">
                              {stats.facebook_posts}
                           </div>
                        </div>

                        <div className="flex items-center mb-1">
                           <div className="w-28 text-xs text-gray-400 font-medium">X (Twitter)</div>
                           <div className="flex-1">
                              <div className="relative h-5 bg-gray-700/50 rounded-lg overflow-hidden shadow-inner">
                                 {stats.x_posts > 0 && (
                                    <div
                                       className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-blue-300 rounded-lg"
                                       style={{
                                          width: `${(stats.x_posts / stats.total_posts) * 100}%`,
                                       }}
                                    >
                                       <div className="absolute inset-0 bg-blue-400 opacity-30 animate-pulse"></div>
                                    </div>
                                 )}
                                 {stats.x_posts > 0 && (
                                    <div className="absolute right-2 top-0 bottom-0 flex items-center">
                                       <span className="text-xs font-medium text-white">
                                          {((stats.x_posts / stats.total_posts) * 100).toFixed(1)}%
                                       </span>
                                    </div>
                                 )}
                              </div>
                           </div>
                           <div className="w-16 text-right text-sm text-white font-medium">
                              {stats.x_posts}
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/60 rounded-xl p-5 shadow-lg">
                     <h3 className="text-lg font-semibold text-white mb-5 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Top Authors
                     </h3>
                     <div className="space-y-4">
                        {stats.top_authors?.slice(0, 5).map((author, index) => (
                           <div key={index} className="flex justify-between items-center p-3 bg-gray-900/40 backdrop-blur-sm rounded-lg border border-gray-700/40 hover:border-gray-600 transition-all shadow-md">
                              <div className="flex items-center">
                                 <div className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center mr-3 text-gray-400 text-xs font-medium shadow-md">
                                    {index + 1}
                                 </div>
                                 <span className="text-gray-300 font-medium">{author.author_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                 <span className="bg-gray-800 text-white text-xs px-2.5 py-1 rounded-lg shadow-sm">
                                    {author.post_count} posts
                                 </span>
                                 <span className="bg-emerald-900/30 text-emerald-300 text-xs px-2.5 py-1 rounded-lg shadow-sm">
                                    {author.total_engagement || 0} eng.
                                 </span>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/60 rounded-xl p-5 shadow-lg">
                  <h3 className="text-lg font-semibold text-white mb-5 flex items-center">
                     <svg className="w-5 h-5 mr-2 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                     </svg>
                     Engagement by Platform
                  </h3>
                  <div className="h-80">
                     <div className="h-full">
                        {/* Engagement chart */}
                        {stats.engagement && stats.engagement.length > 0 ? (
                           <div className="h-full flex flex-col">
                              <div className="flex-1">
                                 <div className="relative h-full flex items-end">
                                    {/* Y-Axis */}
                                    <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-right pr-2">
                                       <span className="text-xs text-gray-500">Engagement</span>
                                       {[4, 3, 2, 1, 0].map((_, i) => (
                                          <span key={i} className="text-xs text-gray-500">
                                             {Math.round((getMaxEngagement() * (4 - i)) / 4)}
                                          </span>
                                       ))}
                                    </div>

                                    {/* Grid Lines */}
                                    <div className="absolute left-16 right-0 top-0 bottom-0 flex flex-col justify-between">
                                       {[0, 1, 2, 3, 4].map((_, i) => (
                                          <div
                                             key={i}
                                             className="border-t border-gray-700/50 w-full h-0"
                                          ></div>
                                       ))}
                                    </div>

                                    {/* Bars */}
                                    <div className="absolute left-16 right-0 bottom-0 flex items-end h-full pt-4 pb-6">
                                       {stats.engagement.map((platform, i) => {
                                          const maxEngagement = getMaxEngagement();
                                          const height =
                                             maxEngagement > 0
                                                ? `${
                                                     (platform.total_engagement / maxEngagement) *
                                                     100
                                                  }%`
                                                : '0%';

                                          return (
                                             <div
                                                key={i}
                                                className="flex-1 flex flex-col items-center justify-end h-full"
                                             >
                                                <div
                                                   className={`w-16 ${getPlatformColorClass(
                                                      platform.platform
                                                   )} rounded-t-lg relative group shadow-lg`}
                                                   style={{ height }}
                                                >
                                                   <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>

                                                   {/* Tooltip */}
                                                   <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-nowrap bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg border border-gray-700">
                                                      <div className="font-medium">{platform.platform}: {platform.total_engagement}</div>
                                                   </div>
                                                </div>
                                                <div className="mt-2 text-xs text-gray-400 uppercase font-medium">
                                                   {platform.platform}
                                                </div>
                                             </div>
                                          );
                                       })}
                                    </div>
                                 </div>
                              </div>

                              {/* Legend */}
                              <div className="h-16 mt-6 flex items-center justify-center">
                                 <div className="flex flex-wrap gap-4 justify-center">
                                    <div className="flex items-center bg-gray-900/40 px-3 py-1.5 rounded-lg">
                                       <div className="w-3 h-3 bg-blue-600 rounded-lg mr-1.5"></div>
                                       <span className="text-xs text-gray-300">Likes</span>
                                    </div>
                                    <div className="flex items-center bg-gray-900/40 px-3 py-1.5 rounded-lg">
                                       <div className="w-3 h-3 bg-green-600 rounded-lg mr-1.5"></div>
                                       <span className="text-xs text-gray-300">Shares</span>
                                    </div>
                                    <div className="flex items-center bg-gray-900/40 px-3 py-1.5 rounded-lg">
                                       <div className="w-3 h-3 bg-purple-600 rounded-lg mr-1.5"></div>
                                       <span className="text-xs text-gray-300">Comments</span>
                                    </div>
                                    <div className="flex items-center bg-gray-900/40 px-3 py-1.5 rounded-lg">
                                       <div className="w-3 h-3 bg-yellow-600 rounded-lg mr-1.5"></div>
                                       <span className="text-xs text-gray-300">Views</span>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        ) : (
                           <div className="h-full flex items-center justify-center">
                              <p className="text-gray-400 text-sm">No engagement data available</p>
                           </div>
                        )}
                     </div>
                  </div>
               </div>

               <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/60 rounded-xl p-5 shadow-lg">
                  <h3 className="text-lg font-semibold text-white mb-5 flex items-center">
                     <svg className="w-5 h-5 mr-2 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>
                     Posts Over Time
                  </h3>
                  <div className="h-72">
                     {stats.posts_by_date && stats.posts_by_date.length > 0 ? (
                        <div className="relative h-full">
                           {/* Y-Axis */}
                           <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col justify-between text-right pr-2">
                              <span className="text-xs text-gray-500">Posts</span>
                              {[4, 3, 2, 1, 0].map((_, i) => (
                                 <span key={i} className="text-xs text-gray-500">
                                    {Math.round((getMaxPostsByDate() * (4 - i)) / 4)}
                                 </span>
                              ))}
                           </div>

                           {/* Time Series Chart */}
                           <div className="absolute left-10 right-0 top-0 bottom-0">
                              {/* Grid Lines */}
                              <div className="absolute inset-0 flex flex-col justify-between">
                                 {[0, 1, 2, 3, 4].map((_, i) => (
                                    <div
                                       key={i}
                                       className="border-t border-gray-700/50 w-full h-0"
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
                                       strokeWidth="2.5"
                                       strokeLinecap="round"
                                       strokeLinejoin="round"
                                    />

                                    {/* X Line */}
                                    <path
                                       d={getTimeSeriesPath('x')}
                                       fill="none"
                                       stroke="#38bdf8"
                                       strokeWidth="2.5"
                                       strokeLinecap="round"
                                       strokeLinejoin="round"
                                    />

                                    {/* Data Points for Facebook */}
                                    {getDataPointsForPlatform('facebook').map((point, i) => (
                                       <circle
                                          key={`fb-${i}`}
                                          cx={point.x}
                                          cy={point.y}
                                          r="4"
                                          fill="#3b82f6"
                                          className="hover:r-6 transition-all duration-200"
                                          filter="url(#glow)"
                                       />
                                    ))}

                                    {/* Data Points for X */}
                                    {getDataPointsForPlatform('x').map((point, i) => (
                                       <circle
                                          key={`x-${i}`}
                                          cx={point.x}
                                          cy={point.y}
                                          r="4"
                                          fill="#38bdf8"
                                          className="hover:r-6 transition-all duration-200"
                                          filter="url(#glow)"
                                       />
                                    ))}

                                    {/* Glow filter */}
                                    <defs>
                                       <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                          <feGaussianBlur stdDeviation="2" result="blur" />
                                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                       </filter>
                                    </defs>
                                 </svg>
                              </div>

                              {/* X-Axis - Dates */}
                              <div className="absolute left-0 right-0 bottom-0 h-6 flex justify-between">
                                 {getDateLabels().map((date, i) => (
                                    <div
                                       key={i}
                                       className="text-xs text-gray-500 transform -rotate-45 origin-top-left"
                                    >
                                       {date}
                                    </div>
                                 ))}
                              </div>
                           </div>

                           {/* Legend */}
                           <div className="absolute top-0 right-0 flex gap-4">
                              <div className="flex items-center bg-gray-900/40 px-3 py-1.5 rounded-lg shadow-md">
                                 <div className="w-3 h-3 bg-blue-600 rounded-full mr-1.5"></div>
                                 <span className="text-xs text-gray-300">Facebook</span>
                              </div>
                              <div className="flex items-center bg-gray-900/40 px-3 py-1.5 rounded-lg shadow-md">
                                 <div className="w-3 h-3 bg-blue-400 rounded-full mr-1.5"></div>
                                 <span className="text-xs text-gray-300">X</span>
                              </div>
                           </div>
                        </div>
                     ) : (
                        <div className="h-full flex items-center justify-center">
                           <p className="text-gray-400 text-sm">No time series data available</p>
                        </div>
                     )}
                  </div>
               </div>
            </>
         )}
      </div>
   );

   const TopPostsTab = () => (
      <div className="space-y-4">
         {topPosts.length === 0 ? (
            <div className="flex justify-center py-16">
               <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full shadow-lg"></div>
            </div>
         ) : (
            <>
               <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/60 rounded-xl p-5 shadow-lg">
                  <h3 className="text-lg font-semibold text-white mb-5 flex items-center">
                     <svg className="w-5 h-5 mr-2 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
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

   return (
      <div className="max-w-7xl mx-auto">
         <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 relative">
            <div className="relative mb-4 md:mb-0">
               <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-10 h-10">
                  <div className="relative w-10 h-10">
                     <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="text-emerald-500 w-10 h-10 relative z-10"
                     >
                        <path
                           d="M2 9.5V4C2 2.89543 2.89543 2 4 2H20C21.1046 2 22 2.89543 22 4V9.5"
                           stroke="currentColor"
                           strokeWidth="1.5"
                        />
                        <path
                           d="M2 14.5V20C2 21.1046 2.89543 22 4 22H20C21.1046 22 22 21.1046 22 20V14.5"
                           stroke="currentColor"
                           strokeWidth="1.5"
                        />
                        <path d="M2 12H22" stroke="currentColor" strokeWidth="1.5" />
                        <path
                           d="M10 6H17"
                           stroke="currentColor"
                           strokeWidth="1.5"
                           strokeLinecap="round"
                        />
                        <path
                           d="M7 6H8"
                           stroke="currentColor"
                           strokeWidth="1.5"
                           strokeLinecap="round"
                        />
                        <path
                           d="M7 18H17"
                           stroke="currentColor"
                           strokeWidth="1.5"
                           strokeLinecap="round"
                        />
                     </svg>
                     <div className="absolute inset-0 bg-emerald-500 opacity-30 blur-md rounded-full"></div>
                  </div>
               </div>
               <h1 className="text-2xl font-medium text-gray-100 ml-14">Social Media Dashboard</h1>
            </div>
            <div className="flex items-center space-x-3">
               <div className="relative flex-grow">
                  <input
                     type="text"
                     value={filters.search}
                     onChange={e => handleFilterChange('search', e.target.value)}
                     placeholder="Search posts..."
                     className="w-full pl-10 pr-4 py-2.5 bg-gray-900/80 border border-gray-700 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 text-gray-300 transition-all"
                  />
                  <div className="absolute left-3 top-2.5 text-gray-500">
                     <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                     >
                        <path
                           strokeLinecap="round"
                           strokeLinejoin="round"
                           strokeWidth={2}
                           d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                     </svg>
                  </div>
               </div>
               <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="flex items-center justify-center p-2.5 bg-gray-800 border border-gray-700 rounded-lg shadow-lg hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200"
                  aria-expanded={isFilterOpen}
                  aria-label="Toggle filters"
               >
                  <svg
                     xmlns="http://www.w3.org/2000/svg"
                     className="h-5 w-5 text-gray-400"
                     fill="none"
                     viewBox="0 0 24 24"
                     stroke="currentColor"
                  >
                     <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                     />
                  </svg>
               </button>
            </div>
         </div>

         <div className="mb-8">
            <div className="border-b border-gray-700">
               <nav className="flex -mb-px space-x-8">
                  <button
                     onClick={() => handleTabChange('feed')}
                     className={`py-3 px-1 inline-flex items-center whitespace-nowrap font-medium text-sm border-b-2 ${
                        activeTab === 'feed'
                           ? 'border-emerald-500 text-emerald-400'
                           : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
                     } transition-colors duration-200`}
                  >
                     <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                     >
                        <path
                           strokeLinecap="round"
                           strokeLinejoin="round"
                           strokeWidth="1.5"
                           d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                        />
                     </svg>
                     Post Feed
                  </button>
                  <button
                     onClick={() => handleTabChange('stats')}
                     className={`py-3 px-1 inline-flex items-center whitespace-nowrap font-medium text-sm border-b-2 ${
                        activeTab === 'stats'
                           ? 'border-emerald-500 text-emerald-400'
                           : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
                     } transition-colors duration-200`}
                  >
                     <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                     >
                        <path
                           strokeLinecap="round"
                           strokeLinejoin="round"
                           strokeWidth="1.5"
                           d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                     </svg>
                     Analytics
                  </button>
                  <button
                     onClick={() => handleTabChange('top')}
                     className={`py-3 px-1 inline-flex items-center whitespace-nowrap font-medium text-sm border-b-2 ${
                        activeTab === 'top'
                           ? 'border-emerald-500 text-emerald-400'
                           : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
                     } transition-colors duration-200`}
                  >
                     <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                     >
                        <path
                           strokeLinecap="round"
                           strokeLinejoin="round"
                           strokeWidth="1.5"
                           d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                     </svg>
                     Top Content
                  </button>
               </nav>
            </div>
         </div>

         {activeTab === 'feed' && <FeedTab />}
         {activeTab === 'stats' && <StatsTab />}
         {activeTab === 'top' && <TopPostsTab />}
      </div>
   );
};

export default SocialMedia;