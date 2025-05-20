import React from 'react';
import PostItem from './PostItem';
import Filters from './Filters';
import Pagination from './Pagination';

// Function to enhance existing data with sentiment and impact score if not present
const enhancePostData = (posts) => {
  const sentiments = ['positive', 'negative', 'neutral', 'critical'];
  const impactScores = [2.5, 3.1, 3.5, 3.7, 4.2, 4.6, 4.8, 4.9];
  
  return posts.map(post => {
    // Create a new object to avoid mutating the original
    const enhancedPost = { ...post };
    
    // Only add sentiment and impact_score if they don't exist
    if (!enhancedPost.sentiment) {
      enhancedPost.sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    }
    
    if (!enhancedPost.impact_score) {
      enhancedPost.impact_score = impactScores[Math.floor(Math.random() * impactScores.length)];
    }
    
    return enhancedPost;
  });
};

const FeedTab = ({
   posts,
   loading,
   error,
   filters,
   pagination,
   isFilterOpen,
   platforms,
   authors,
   handleFilterChange,
   resetFilters,
   handlePrevPage,
   handleNextPage,
   setIsFilterOpen,
   setPagination,
}) => {
   // Enhance posts with sentiment and impact score if needed
   const enhancedPosts = enhancePostData(posts);
   
   return (
      <div className="space-y-6">
         <Filters
            isOpen={isFilterOpen}
            filters={filters}
            platforms={platforms}
            authors={authors}
            handleFilterChange={handleFilterChange}
            resetFilters={resetFilters}
            setIsFilterOpen={setIsFilterOpen}
         />

         {loading ? (
            <div className="flex justify-center py-16">
               <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full shadow-md"></div>
            </div>
         ) : error ? (
            <div className="bg-red-900/40 backdrop-blur-sm border border-red-700 text-red-200 px-5 py-4 rounded-xl shadow-lg">
               <div className="flex items-center">
                  <svg
                     className="w-5 h-5 text-red-400 mr-2"
                     fill="currentColor"
                     viewBox="0 0 20 20"
                  >
                     <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                     />
                  </svg>
                  {error}
               </div>
            </div>
         ) : enhancedPosts.length === 0 ? (
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
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {enhancedPosts.map(post => (
                     <PostItem key={post.id || post._id} post={post} />
                  ))}
               </div>

               {posts.length > 0 && (
                  <Pagination
                     pagination={pagination}
                     handlePrevPage={handlePrevPage}
                     handleNextPage={handleNextPage}
                     setPagination={setPagination}
                  />
               )}
            </>
         )}
      </div>
   );
};

export default FeedTab;

