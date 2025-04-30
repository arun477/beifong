import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../services/api';

const Sidebar = ({ onNewSession, onSessionSelect }) => {
   const [sessions, setSessions] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const [isCreating, setIsCreating] = useState(false);
   const [navExpanded, setNavExpanded] = useState(false);
   const [pagination, setPagination] = useState({
      page: 1,
      perPage: 5,
      totalPages: 1,
      total: 0,
   });
   const [showDeleteModal, setShowDeleteModal] = useState(false);
   const [sessionToDelete, setSessionToDelete] = useState(null);
   const [isDeleting, setIsDeleting] = useState(false);
   const navigate = useNavigate();
   const { sessionId } = useParams();

   useEffect(() => {
      loadSessions();
   }, [pagination.page]);

   const loadSessions = async (resetToFirstPage = false) => {
      try {
         setLoading(true);
         if (resetToFirstPage) {
            setPagination(prev => ({ ...prev, page: 1 }));
         }
         const currentPage = resetToFirstPage ? 1 : pagination.page;
         const response = await api.podcastAgent.listSessions(currentPage, pagination.perPage);
         if (response?.data?.sessions) {
            setSessions(response.data.sessions);
            if (response.data.pagination) {
               setPagination(prev => ({
                  ...prev,
                  total: response.data.pagination.total,
                  totalPages: response.data.pagination.total_pages,
                  page: resetToFirstPage ? 1 : prev.page,
               }));
            }
         } else {
            setError('Invalid sessions data format');
         }
      } catch (error) {
         setError(error.message || 'Failed to load sessions');
      } finally {
         setLoading(false);
      }
   };

   const handleNextPage = () => {
      if (pagination.page < pagination.totalPages) {
         setPagination(prev => ({ ...prev, page: prev.page + 1 }));
      }
   };

   const handlePrevPage = () => {
      if (pagination.page > 1) {
         setPagination(prev => ({ ...prev, page: prev.page - 1 }));
      }
   };

   const formatSessionDate = timestamp => {
      try {
         if (!timestamp) {
            return 'Recent';
         }
         const date = new Date(isNaN(timestamp) ? parseInt(timestamp) : timestamp * 1000);
         if (isNaN(date.getTime()) || date.getFullYear() < 2000) {
            return 'Recent';
         }
         return (
            date.toLocaleDateString() +
            ' ' +
            date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
         );
      } catch (e) {
         console.error('Error formatting date:', e);
         return 'Recent';
      }
   };

   const handleSessionSelect = id => {
      navigate(`/studio/chat/${id}`);
      if (onSessionSelect) {
         onSessionSelect();
      }
   };

   const handleNewSession = async () => {
      if (isCreating) return;
      setIsCreating(true);
      try {
         await onNewSession();
      } catch (error) {
         console.error('Error in sidebar new session:', error);
      } finally {
         setIsCreating(false);
      }
   };

   const openDeleteModal = (e, session) => {
      e.stopPropagation();
      setSessionToDelete(session);
      setShowDeleteModal(true);
   };

   const cancelDelete = () => {
      setShowDeleteModal(false);
      setSessionToDelete(null);
   };

   const confirmDelete = async () => {
      if (!sessionToDelete || isDeleting) return;
      setIsDeleting(true);
      try {
         await api.podcastAgent.deleteSession(sessionToDelete.session_id);
         if (sessionToDelete.session_id === sessionId) {
            navigate('/studio');
         }
         await loadSessions(true);
      } catch (error) {
         setError(`Failed to delete session: ${error.message}`);
      } finally {
         setIsDeleting(false);
         setShowDeleteModal(false);
         setSessionToDelete(null);
      }
   };

   const getStatusBadge = stage => {
      const statusConfig = {
         welcome: {
            class: 'bg-blue-900 text-blue-300 border-blue-700',
            label: 'start',
         },
         searching: {
            class: 'bg-indigo-900 text-indigo-300 border-indigo-700',
            label: 'searching',
         },
         source_selection: {
            class: 'bg-indigo-900 text-indigo-300 border-indigo-700',
            label: 'source',
         },
         script: {
            class: 'bg-indigo-900 text-indigo-300 border-indigo-700',
            label: 'script',
         },
         banner: {
            class: 'bg-indigo-900 text-indigo-300 border-indigo-700',
            label: 'banner',
         },
         audio: {
            class: 'bg-indigo-900 text-indigo-300 border-indigo-700',
            label: 'audio',
         },
         web_search: {
            class: 'bg-indigo-900 text-indigo-300 border-indigo-700',
            label: 'search',
         },
         complete: {
            class: 'bg-emerald-900 text-emerald-300 border-emerald-700',
            label: 'complete',
         },
      };
      const config = statusConfig[stage] || {
         class: 'bg-gray-800 text-gray-300 border-gray-700',
         label: stage ? stage.charAt(0).toUpperCase() + stage.slice(1) : 'Unknown',
      };
      return config;
   };

   const renderPagination = () => {
      if (sessions.length === 0 || pagination.totalPages <= 1) return null;
      return (
         <div className="flex items-center justify-between mt-4 mb-2 px-1">
            <button
               onClick={handlePrevPage}
               disabled={pagination.page === 1}
               className={`p-1 rounded text-xs ${
                  pagination.page === 1
                     ? 'text-gray-600 cursor-not-allowed'
                     : 'text-gray-400 hover:text-emerald-400 hover:bg-gray-800'
               }`}
            >
               <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     strokeWidth={2}
                     d="M15 19l-7-7 7-7"
                  />
               </svg>
            </button>
            <span className="text-xs text-gray-500">
               {pagination.page} / {pagination.totalPages}
            </span>
            <button
               onClick={handleNextPage}
               disabled={pagination.page === pagination.totalPages}
               className={`p-1 rounded text-xs ${
                  pagination.page === pagination.totalPages
                     ? 'text-gray-600 cursor-not-allowed'
                     : 'text-gray-400 hover:text-emerald-400 hover:bg-gray-800'
               }`}
            >
               <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     strokeWidth={2}
                     d="M9 5l7 7-7 7"
                  />
               </svg>
            </button>
         </div>
      );
   };

   const navLinks = [
      {
         name: 'Home',
         path: '/',
         icon: (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-sm bg-gray-800/60">
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     strokeWidth={1.5}
                     d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
               </svg>
            </span>
         ),
      },
      {
         name: 'Articles',
         path: '/articles',
         icon: (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-sm bg-gray-800/60">
               <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M19 5V19H5V5H19ZM21 3H3V21H21V3Z" fill="currentColor" />
                  <path d="M7 7H12V12H7V7Z" fill="currentColor" />
                  <path d="M14 7H17V9H14V7Z" fill="currentColor" />
                  <path d="M14 10H17V12H14V10Z" fill="currentColor" />
                  <path d="M7 13H17V15H7V13Z" fill="currentColor" />
                  <path d="M7 16H17V18H7V16Z" fill="currentColor" />
               </svg>
            </span>
         ),
      },
      {
         name: 'Podcasts',
         path: '/podcasts',
         icon: (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-sm bg-gray-800/60">
               <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                     d="M12 1C8.14 1 5 4.14 5 8V11C5 14.86 8.14 18 12 18C15.86 18 19 14.86 19 11V8C19 4.14 15.86 1 12 1Z"
                     stroke="currentColor"
                     strokeWidth="1.5"
                  />
                  <path
                     d="M12 18V23"
                     stroke="currentColor"
                     strokeWidth="1.5"
                     strokeLinecap="round"
                  />
                  <path
                     d="M8 23H16"
                     stroke="currentColor"
                     strokeWidth="1.5"
                     strokeLinecap="round"
                  />
                  <path
                     d="M13.5 6.5C13.5 7.33 12.83 8 12 8C11.17 8 10.5 7.33 10.5 6.5C10.5 5.67 11.17 5 12 5C12.83 5 13.5 5.67 13.5 6.5Z"
                     fill="currentColor"
                  />
                  <path
                     d="M16 11V11.25C16 13.32 14.32 15 12.25 15H11.75C9.68 15 8 13.32 8 11.25V11"
                     stroke="currentColor"
                     strokeWidth="1.5"
                     strokeLinecap="round"
                  />
               </svg>
            </span>
         ),
      },
      {
         name: 'Studio',
         path: '/studio',
         icon: (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-sm bg-gray-800/60">
               <svg className="w-4 h-4" viewBox="0 0 100 100" fill="none" stroke="currentColor">
                  <rect x="20" y="20" width="60" height="60" rx="5" strokeWidth="1" />
                  <line x1="35" y1="30" x2="35" y2="70" strokeWidth="3" strokeLinecap="round" />
                  <line x1="50" y1="30" x2="50" y2="70" strokeWidth="3" strokeLinecap="round" />
                  <line x1="65" y1="30" x2="65" y2="70" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="35" cy="40" r="4" fill="currentColor" />
                  <circle cx="50" cy="60" r="4" fill="currentColor" />
                  <circle cx="65" cy="50" r="4" fill="currentColor" />
               </svg>
            </span>
         ),
      },
      {
         name: 'Sources',
         path: '/sources',
         icon: (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-sm bg-gray-800/60">
               <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                     d="M12 8C16.4183 8 20 6.65685 20 5C20 3.34315 16.4183 2 12 2C7.58172 2 4 3.34315 4 5C4 6.65685 7.58172 8 12 8Z"
                     stroke="currentColor"
                     strokeWidth="1.5"
                     strokeLinecap="round"
                     strokeLinejoin="round"
                  />
                  <path
                     d="M4 5V12C4 13.66 7.58 15 12 15C16.42 15 20 13.66 20 12V5"
                     stroke="currentColor"
                     strokeWidth="1.5"
                     strokeLinecap="round"
                     strokeLinejoin="round"
                  />
                  <path
                     d="M4 12V19C4 20.66 7.58 22 12 22C16.42 22 20 20.66 20 19V12"
                     stroke="currentColor"
                     strokeWidth="1.5"
                     strokeLinecap="round"
                     strokeLinejoin="round"
                  />
               </svg>
            </span>
         ),
      },
      {
         name: 'Voyager',
         path: '/voyager',
         icon: (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-sm bg-gray-800/60">
               <svg
                  className="w-4 h-4"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  stroke="currentColor"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
               >
                  <circle cx="50" cy="50" r="35" />
                  <path d="M30 70 A 35 35 0 0 1 70 70" />
                  <line x1="50" y1="50" x2="35" y2="35" strokeWidth="1.5" />
                  <circle cx="50" cy="50" r="5" fill="currentColor" />
               </svg>
            </span>
         ),
      },
   ];

   return (
      <div className="h-full flex flex-col">
         <div className="p-4 border-b border-gray-700 bg-[#0A0E14]">
            <Link to="/" className="flex items-center group">
               <div className="w-12 h-12 relative mr-3 flex-shrink-0">
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                     <span
                        className="text-2xl filter transition-transform group-hover:scale-110"
                        style={{
                           textShadow: '0 0 10px rgba(16, 185, 129, 0.5)',
                           fontSize: '1.5rem',
                        }}
                     >
                        🦉
                     </span>
                  </div>
                  <div className="absolute inset-0 bg-emerald-500 opacity-10 rounded-full blur-md group-hover:opacity-20 transition-opacity"></div>
                  <div className="absolute inset-0 rounded-full border border-gray-700 bg-[#121824]"></div>
               </div>
               <div>
                  <h1 className="text-lg font-semibold text-white">
                     <span className="text-emerald-400">Bei</span>fong
                  </h1>
                  <p className="text-xs text-gray-400">AI Podcast Studio</p>
               </div>
            </Link>
         </div>
         <div className="px-4 py-2 border-b border-gray-700">
            <button
               onClick={() => setNavExpanded(!navExpanded)}
               className="w-full flex items-center justify-between text-sm text-gray-400 hover:text-white p-1 transition-colors rounded-sm"
            >
               <span className="font-medium flex items-center">
                  <svg
                     className="w-4 h-4 mr-1.5 text-emerald-500"
                     fill="none"
                     viewBox="0 0 24 24"
                     stroke="currentColor"
                  >
                     <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                     />
                  </svg>
                  Quick Access
               </span>
               <svg
                  className={`w-4 h-4 transform transition-transform ${
                     navExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
               >
                  <path
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     strokeWidth={2}
                     d="M19 9l-7 7-7-7"
                  />
               </svg>
            </button>
            <div
               className={`overflow-hidden transition-all duration-300 ${
                  navExpanded ? 'max-h-100 mt-2' : 'max-h-0'
               }`}
            >
               <div className="space-y-1 py-1">
                  {navLinks.map(link => (
                     <Link
                        key={link.path}
                        to={link.path}
                        className="flex items-center p-2 text-sm text-gray-400 hover:text-white rounded-sm hover:bg-gray-800 transition-colors group"
                        onClick={onSessionSelect}
                     >
                        <span className="text-gray-500 group-hover:text-emerald-400 transition-colors mr-3">
                           {link.icon}
                        </span>
                        {link.name}
                     </Link>
                  ))}
               </div>
            </div>
         </div>
         <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
            <div className="text-xs text-gray-400 mb-3 flex items-center justify-between">
               <span>Chats</span>
               <button
                  onClick={() => loadSessions(true)}
                  className="p-1 text-gray-500 hover:text-emerald-400 transition-colors"
                  title="Refresh sessions"
               >
                  <svg
                     className="h-3.5 w-3.5"
                     fill="none"
                     viewBox="0 0 24 24"
                     stroke="currentColor"
                  >
                     <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                     />
                  </svg>
               </button>
            </div>
            <div className="space-y-2.5">
               {loading ? (
                  <div className="text-center py-6">
                     <div className="inline-flex items-center space-x-2">
                        <svg
                           className="animate-spin h-4 w-4 text-emerald-500"
                           viewBox="0 0 24 24"
                           fill="none"
                        >
                           <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                           />
                           <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                           />
                        </svg>
                        <span className="text-gray-400 text-sm">Loading...</span>
                     </div>
                  </div>
               ) : error ? (
                  <div className="p-4 text-center">
                     <div className="text-red-400 text-sm mb-2">{error}</div>
                     <button
                        onClick={() => loadSessions(true)}
                        className="px-3 py-1.5 bg-[#121824] hover:bg-gray-800 text-gray-300 text-xs rounded-sm border border-gray-700 transition-colors"
                     >
                        Retry
                     </button>
                  </div>
               ) : sessions.length === 0 ? (
                  <div className="text-center py-8 px-4">
                     <svg
                        className="h-12 w-12 text-gray-600 mx-auto mb-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                     >
                        <path
                           strokeLinecap="round"
                           strokeLinejoin="round"
                           strokeWidth={1}
                           d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                     </svg>
                     <p className="text-gray-400 text-sm">No saved podcasts yet</p>
                     <p className="text-gray-500 text-xs mt-1">Start by creating a new one</p>
                  </div>
               ) : (
                  <>
                     {sessions.map(session => {
                        const statusBadge = getStatusBadge(session.stage);
                        return (
                           <div
                              key={session.session_id}
                              className={`group p-3 rounded-sm cursor-pointer transition transform hover:shadow-md ${
                                 session.session_id === sessionId
                                    ? 'bg-[#121824] border border-gray-700'
                                    : 'bg-[#0f1621] hover:bg-[#121824] border border-transparent hover:border-gray-700'
                              }`}
                              onClick={() => handleSessionSelect(session.session_id)}
                           >
                              <div className="flex justify-between items-start">
                                 <div className="font-medium text-white text-sm truncate pr-2">
                                    {session.topic || 'Untitled Podcast'}
                                 </div>
                                 <button
                                    onClick={e => openDeleteModal(e, session)}
                                    className="p-1 text-gray-500 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-gray-800 rounded transition-all focus:opacity-100"
                                    title="Delete session"
                                 >
                                    <svg
                                       className="h-4 w-4"
                                       fill="none"
                                       viewBox="0 0 24 24"
                                       stroke="currentColor"
                                    >
                                       <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={1.5}
                                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                       />
                                    </svg>
                                 </button>
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                 <span className="text-xs text-gray-400">
                                    {formatSessionDate(session.updated_at)}
                                 </span>
                                 <span
                                    className={`text-xs px-2 py-0.5 rounded-sm ${statusBadge.class} border`}
                                 >
                                    {statusBadge.label}
                                 </span>
                              </div>
                           </div>
                        );
                     })}
                     {renderPagination()}
                  </>
               )}
            </div>
         </div>
         <div className="p-4 border-t border-gray-700 bg-[#0A0E14]">
            <button
               onClick={handleNewSession}
               disabled={isCreating}
               className={`w-full flex items-center justify-center py-2.5 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-sm transition text-sm font-medium ${
                  isCreating ? 'opacity-70 cursor-not-allowed' : ''
               }`}
            >
               {isCreating ? (
                  <>
                     <svg
                        className="animate-spin h-4 w-4 mr-2 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                     >
                        <circle
                           className="opacity-25"
                           cx="12"
                           cy="12"
                           r="10"
                           stroke="currentColor"
                           strokeWidth="4"
                        />
                        <path
                           className="opacity-75"
                           fill="currentColor"
                           d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                     </svg>
                     Creating...
                  </>
               ) : (
                  <>
                     <svg className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path
                           fillRule="evenodd"
                           d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                           clipRule="evenodd"
                        />
                     </svg>
                     Create New Podcast
                  </>
               )}
            </button>
         </div>
         {showDeleteModal && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
               <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-md max-w-md w-full p-6 shadow-2xl animate-fade-in-up">
                  <div className="flex items-center mb-4 text-red-400">
                     <svg
                        className="h-6 w-6 mr-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                     >
                        <path
                           strokeLinecap="round"
                           strokeLinejoin="round"
                           strokeWidth={2}
                           d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                     </svg>
                     <h3 className="text-lg font-semibold">Delete Chat</h3>
                  </div>
                  <p className="text-gray-300 mb-4">
                     Are you sure you want to delete the chat "
                     {sessionToDelete?.topic || 'Untitled Podcast'}"?
                     {sessionToDelete?.stage === 'complete'
                        ? ' This will remove the session from your list, but preserve the generated podcast assets.'
                        : ' This will permanently remove all associated data including any generated audio and images.'}
                  </p>
                  <div className="flex justify-end space-x-3 mt-6">
                     <button
                        onClick={cancelDelete}
                        className="px-4 py-2 text-gray-300 hover:text-white bg-gray-800/80 hover:bg-gray-700 rounded-md transition-colors border border-gray-700"
                     >
                        Cancel
                     </button>
                     <button
                        onClick={confirmDelete}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-md transition-colors flex items-center justify-center min-w-24"
                     >
                        {isDeleting ? (
                           <>
                              <svg
                                 className="animate-spin h-4 w-4 mr-2"
                                 viewBox="0 0 24 24"
                                 fill="none"
                              >
                                 <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                 />
                                 <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                 />
                              </svg>
                              Deleting...
                           </>
                        ) : (
                           'Delete'
                        )}
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default Sidebar;
