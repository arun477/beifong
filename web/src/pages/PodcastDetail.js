import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiService from '../services/api';

const formatTtsEngineName = engine => {
   if (!engine) return '';
   return engine;
};

const getLanguageName = code => {
   if (!code) return '';
   return code;
};

const SourceIcon = ({ url }) => {
   const [iconUrl, setIconUrl] = useState(null);
   const [isIconReady, setIsIconReady] = useState(false);
   const defaultIconSvg = (
      <svg
         className="w-4 h-4 text-emerald-400 transition-transform duration-200 group-hover:scale-110"
         fill="none"
         viewBox="0 0 24 24"
         stroke="currentColor"
      >
         <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
         />
      </svg>
   );

   useEffect(() => {
      let isMounted = true;
      const preloadFavicon = () => {
         try {
            const domain = new URL(url).hostname;
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
            const img = new Image();
            img.src = faviconUrl;
            img.onload = () => {
               if (isMounted) {
                  setIconUrl(faviconUrl);
                  setIsIconReady(true);
               }
            };
            img.onerror = () => {
               if (isMounted) {
                  setIconUrl(null);
                  setIsIconReady(true);
               }
            };
         } catch (e) {
            if (isMounted) {
               setIconUrl(null);
               setIsIconReady(true);
            }
         }
      };

      preloadFavicon();
      return () => {
         isMounted = false;
      };
   }, [url]);
   if (!isIconReady || !iconUrl) {
      return defaultIconSvg;
   }
   return (
      <img
         src={iconUrl}
         alt="Source icon"
         className="w-4 h-4 object-contain transition-transform duration-200 group-hover:scale-110"
      />
   );
};

const PodcastDetail = () => {
   const { identifier } = useParams();
   const navigate = useNavigate();
   const [podcast, setPodcast] = useState(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const [isPlaying, setIsPlaying] = useState(false);
   const [audioError, setAudioError] = useState(null);
   const [audioLoading, setAudioLoading] = useState(false);
   const [waveform, setWaveform] = useState([]);
   const [pulseSize, setPulseSize] = useState(1);
   const audioRef = useRef(null);
   const animationRef = useRef(null);
   const pulseRef = useRef(null);
   const [showEditModal, setShowEditModal] = useState(false);
   const [isSaving, setIsSaving] = useState(false);
   const [actionError, setActionError] = useState(null);
   const [newTitle, setNewTitle] = useState('');

   useEffect(() => {
      const fetchPodcast = async () => {
         setLoading(true);
         setError(null);
         setAudioError(null);
         try {
            const response = await apiService.podcasts.getByIdentifier(identifier);
            setPodcast(response.data);
            if (response.data && response.data.podcast && response.data.podcast.title) {
               setNewTitle(response.data.podcast.title);
            }
         } catch (err) {
            setError(`Failed to fetch podcast: ${err.message}`);
         } finally {
            setLoading(false);
         }
      };
      fetchPodcast();
      const initialWaveform = Array.from({ length: 40 }, () => Math.random() * 0.4 + 0.1);
      setWaveform(initialWaveform);
      return () => {
         if (animationRef.current) cancelAnimationFrame(animationRef.current);
         if (pulseRef.current) cancelAnimationFrame(pulseRef.current);
      };
   }, [identifier]);

   useEffect(() => {
      const handleKeyPress = e => {
         if ((e.key === ' ' || e.key === 'k') && audioRef.current) {
            e.preventDefault();
            if (audioRef.current.paused) {
               audioRef.current.play();
            } else {
               audioRef.current.pause();
            }
         } else if (e.key === 'ArrowLeft' && audioRef.current) {
            e.preventDefault();
            audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
         } else if (e.key === 'ArrowRight' && audioRef.current) {
            e.preventDefault();
            audioRef.current.currentTime = Math.min(
               audioRef.current.duration,
               audioRef.current.currentTime + 10
            );
         } else if (e.key === 'm' && audioRef.current) {
            e.preventDefault();
            audioRef.current.muted = !audioRef.current.muted;
         }
      };
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
   }, []);

   useEffect(() => {
      if (isPlaying) {
         let frameCount = 0;
         const animateWaveform = () => {
            frameCount++;
            if (frameCount % 3 === 0) {
               setWaveform(prevWaveform =>
                  prevWaveform.map(height => {
                     let newHeight = height + (Math.random() * 0.2 - 0.1);
                     newHeight = Math.max(0.1, Math.min(0.8, newHeight));
                     return newHeight;
                  })
               );
            }
            const pulseFrequency = 1000;
            const pulseAmount =
               Math.sin(((Date.now() % pulseFrequency) / pulseFrequency) * Math.PI * 2) * 0.05 + 1;
            setPulseSize(pulseAmount);
            animationRef.current = requestAnimationFrame(animateWaveform);
         };
         animationRef.current = requestAnimationFrame(animateWaveform);
      } else {
         if (animationRef.current) cancelAnimationFrame(animationRef.current);
         setPulseSize(1);
      }
      return () => {
         if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
   }, [isPlaying]);

   const handleGoBack = () => navigate(-1);

   const handleDelete = async () => {
      const confirmDelete = window.confirm(
         'Are you sure you want to delete this podcast? This action cannot be undone.'
      );
      if (!confirmDelete) {
         return;
      }
      try {
         await apiService.podcasts.delete(podcast.podcast.id);
         navigate('/podcasts');
      } catch (err) {
         alert(`Failed to delete podcast: ${err.message}`);
      }
   };

   const handleTitleUpdate = async () => {
      if (!newTitle.trim()) {
         setActionError('Title cannot be empty');
         return;
      }
      setIsSaving(true);
      setActionError(null);
      try {
         const currentContent = { ...podcast.content };
         currentContent.title = newTitle.trim();
         const updateData = {
            title: newTitle.trim(),
            content: currentContent,
         };
         await apiService.podcasts.update(podcast.podcast.id, updateData);
         const refreshedData = await apiService.podcasts.getByIdentifier(identifier);
         setPodcast(refreshedData.data);
         setShowEditModal(false);
      } catch (err) {
         setActionError(`Failed to update title: ${err.message}`);
      } finally {
         setIsSaving(false);
      }
   };

   const formatDate = dateString => {
      if (!dateString) return '';
      const date = new Date(dateString.replace(' ', 'T'));
      if (isNaN(date)) return 'Invalid Date';
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return date.toLocaleDateString(undefined, options);
   };

   if (loading) {
      return (
         <div className="max-w-4xl mx-auto py-12 text-center">
            <div className="w-12 h-12 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-400">Loading podcast...</p>
         </div>
      );
   }

   if (error) {
      return (
         <div className="max-w-4xl mx-auto p-4">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-l-4 border-red-500 p-4 rounded-sm shadow-sm mb-4 text-red-400">
               {error}
            </div>
            <button
               onClick={handleGoBack}
               className="text-gray-300 hover:text-emerald-300 flex items-center transition-colors duration-200 group"
            >
               <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-1 group-hover:transform group-hover:-translate-x-1 transition-transform duration-200"
                  viewBox="0 0 20 20"
                  fill="currentColor"
               >
                  <path
                     fillRule="evenodd"
                     d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
                     clipRule="evenodd"
                  />
               </svg>
               Back
            </button>
         </div>
      );
   }

   if (!podcast) {
      return (
         <div className="max-w-4xl mx-auto p-4">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-l-4 border-yellow-500 p-4 rounded-sm shadow-sm mb-4 text-yellow-300">
               Podcast not found.
            </div>
            <Link
               to="/podcasts"
               className="text-gray-300 hover:text-emerald-300 flex items-center transition-colors duration-200 group"
            >
               <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-1 group-hover:transform group-hover:-translate-x-1 transition-transform duration-200"
                  viewBox="0 0 20 20"
                  fill="currentColor"
               >
                  <path
                     fillRule="evenodd"
                     d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
                     clipRule="evenodd"
                  />
               </svg>
               Back to podcasts
            </Link>
         </div>
      );
   }

   const { podcast: podcastData, content, audio_url, sources } = podcast;
   const hasAudio = podcastData.audio_generated && audio_url;
   const hasBanner = !!podcastData.banner_img;
   const hasSources = Array.isArray(sources) && sources.length > 0;
   let streamingAudioUrl = '';
   if (hasAudio) {
      const originalAudioUrl = audio_url;
      const filename = originalAudioUrl.split('/').pop();
      streamingAudioUrl = `${apiService.API_BASE_URL}/stream-audio/${filename}`;
   }

   return (
      <div className="max-w-5xl mx-auto p-3">
         <button
            onClick={handleGoBack}
            className="text-gray-300 hover:text-emerald-300 flex items-center mb-4 transition-colors duration-200 group"
         >
            <svg
               xmlns="http://www.w3.org/2000/svg"
               className="h-4 w-4 mr-1 group-hover:transform group-hover:-translate-x-1 transition-transform duration-200"
               viewBox="0 0 20 20"
               fill="currentColor"
            >
               <path
                  fillRule="evenodd"
                  d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
               />
            </svg>
            Back
         </button>
         <div className={`${hasSources ? 'grid grid-cols-1 lg:grid-cols-4 gap-4' : ''}`}>
            <div className={`${hasSources ? 'lg:col-span-3' : ''}`}>
               <div className="bg-gradient-to-br from-gray-800 to-gray-900 shadow-md rounded-sm overflow-hidden mb-5 relative">
                  <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-emerald-800 to-transparent opacity-60"></div>
                  <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-gray-300 p-4 border-b border-gray-700 relative">
                     <div className="absolute top-2 right-2 flex space-x-2 z-10">
                        <button
                           onClick={() => setShowEditModal(true)}
                           className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-blue-400 transition-colors duration-200 shadow-md"
                           title="Edit Title"
                        >
                           <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                           >
                              <path
                                 strokeLinecap="round"
                                 strokeLinejoin="round"
                                 strokeWidth={2}
                                 d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                           </svg>
                        </button>
                        <button
                           onClick={handleDelete}
                           className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-red-400 transition-colors duration-200 shadow-md"
                           title="Delete Podcast"
                        >
                           <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
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
                        </button>
                     </div>
                     <div className="flex items-start">
                        <div className="flex-shrink-0 mr-4">
                           {hasBanner ? (
                              <div className="w-32 h-32 relative transform perspective-800 transition-all duration-300 hover:rotate-y-6 hover:rotate-x-2 group">
                                 <div className="w-full h-full rounded-md overflow-hidden shadow-xl border border-gray-600 transform -rotate-y-1 -rotate-x-1 hover:scale-105 transition-transform duration-500 relative z-20">
                                    <img
                                       src={
                                          apiService.API_BASE_URL +
                                          '/podcast_img/' +
                                          podcastData.banner_img
                                       }
                                       alt={content.title || 'Podcast'}
                                       className="w-full h-full object-cover"
                                    />
                                 </div>
                                 <div className="absolute -bottom-2 -right-2 w-full h-full bg-gray-900 rounded-md opacity-40 blur-sm z-10 transform scale-95 transition-transform duration-300 group-hover:scale-100"></div>
                                 <div className="absolute inset-0 bg-emerald-500 opacity-0 group-hover:opacity-10 rounded-md blur-md z-0 transition-opacity duration-300"></div>
                              </div>
                           ) : (
                              <div className="w-32 h-32 bg-gradient-to-b from-gray-700 to-gray-800 rounded-md flex items-center justify-center border border-gray-600 shadow-lg transform hover:rotate-y-6 hover:rotate-x-2 transition-all duration-300 relative perspective-800">
                                 <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-14 w-14 text-emerald-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                 >
                                    <path
                                       strokeLinecap="round"
                                       strokeLinejoin="round"
                                       strokeWidth={2}
                                       d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                                    />
                                 </svg>
                                 <div className="absolute -bottom-2 -right-2 w-full h-full bg-gray-900 rounded-md opacity-40 blur-sm z-10 transform scale-95"></div>
                              </div>
                           )}
                        </div>
                        <div className="flex-grow pt-2">
                           <h1 className="text-xl md:text-2xl font-medium mb-2 leading-tight text-gray-100">
                              {content.title || `Podcast - ${formatDate(podcastData.date)}`}
                           </h1>
                           <div className="flex flex-wrap items-start gap-2 mb-1">
                              <div className="flex items-center px-2 py-1 rounded-sm text-xs font-medium bg-gradient-to-r from-gray-800 to-gray-700 text-gray-300 border border-gray-700">
                                 <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3.5 w-3.5 mr-1 text-gray-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                 >
                                    <path
                                       strokeLinecap="round"
                                       strokeLinejoin="round"
                                       strokeWidth={2}
                                       d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                 </svg>
                                 <span>{formatDate(podcastData.date)}</span>
                              </div>
                              {podcastData.language_code && (
                                 <div className="flex items-center px-2 py-1 rounded-sm text-xs font-medium bg-gradient-to-r from-blue-900 to-blue-800 text-blue-200 border border-blue-800">
                                    <svg
                                       xmlns="http://www.w3.org/2000/svg"
                                       className="h-3.5 w-3.5 mr-1"
                                       fill="none"
                                       viewBox="0 0 24 24"
                                       stroke="currentColor"
                                    >
                                       <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                                       />
                                    </svg>
                                    <span>{getLanguageName(podcastData.language_code)}</span>
                                 </div>
                              )}
                              {podcastData.tts_engine && (
                                 <div className="flex items-center px-2 py-1 rounded-sm text-xs font-medium bg-gradient-to-r from-purple-900 to-purple-800 text-purple-200 border border-purple-800">
                                    <svg
                                       xmlns="http://www.w3.org/2000/svg"
                                       className="h-3 w-3 mr-0.5"
                                       fill="none"
                                       viewBox="0 0 24 24"
                                       stroke="currentColor"
                                       strokeWidth={2}
                                    >
                                       <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M3 7 Q9 2 12 7 T21 7 M3 12 Q9 9 12 12 T21 12 M3 17 Q9 13 12 17 T21 17"
                                       />
                                    </svg>
                                    <span>{formatTtsEngineName(podcastData.tts_engine)}</span>
                                 </div>
                              )}
                              {podcastData.audio_generated && (
                                 <div className="flex items-center px-2 py-1 rounded-sm text-xs font-medium bg-gradient-to-r from-emerald-900 to-emerald-800 text-emerald-200 border border-emerald-800">
                                    <svg
                                       xmlns="http://www.w3.org/2000/svg"
                                       className="h-3.5 w-3.5 mr-1"
                                       fill="none"
                                       viewBox="0 0 24 24"
                                       stroke="currentColor"
                                    >
                                       <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                                       />
                                    </svg>
                                    <span>Audio</span>
                                 </div>
                              )}
                              {hasSources && (
                                 <div className="flex items-center px-2 py-1 rounded-sm text-xs font-medium bg-gradient-to-r from-gray-900 to-gray-800 text-gray-400 border border-gray-700">
                                    <svg
                                       className="h-3.5 w-3.5 mr-1 text-emerald-500"
                                       fill="none"
                                       viewBox="0 0 24 24"
                                       stroke="currentColor"
                                    >
                                       <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={1.5}
                                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                                       />
                                    </svg>
                                    <span>
                                       {sources.length} source
                                       {sources.length !== 1 ? 's' : ''}
                                    </span>
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>
                  </div>
                  {hasAudio && (
                     <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-4 py-4 border-b border-gray-700">
                        <div className="flex flex-col">
                           {audioError ? (
                              <div className="bg-gradient-to-r from-gray-900 to-gray-800 border-l-4 border-red-500 p-3 rounded-sm mb-2">
                                 <div className="flex">
                                    <div className="flex-shrink-0">
                                       <svg
                                          className="h-5 w-5 text-red-400"
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 20 20"
                                          fill="currentColor"
                                          aria-hidden="true"
                                       >
                                          <path
                                             fillRule="evenodd"
                                             d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.707-4.707a1 1 0 001.414 0L12 12.07l1.293 1.293a1 1 0 001.414-1.414L13.414 10l1.293-1.293a1 1 0 00-1.414-1.414L12 8.586l-1.293-1.293a1 1 0 00-1.414 1.414L10.586 10l-1.293 1.293a1 1 0 000 1.414z"
                                             clipRule="evenodd"
                                          />
                                       </svg>
                                    </div>
                                    <div className="ml-3">
                                       <p className="text-sm text-red-300 font-medium">
                                          Audio Error
                                       </p>
                                       <p className="text-sm text-red-200">{audioError}</p>
                                    </div>
                                 </div>
                              </div>
                           ) : (
                              <>
                                 <div className="bg-gray-900 rounded-md border border-gray-700 p-3 mb-3">
                                    <audio
                                       ref={audioRef}
                                       className="w-full"
                                       src={streamingAudioUrl}
                                       controls
                                       preload="auto"
                                       onPlay={() => setIsPlaying(true)}
                                       onPause={() => setIsPlaying(false)}
                                       onEnded={() => setIsPlaying(false)}
                                       onError={e => {
                                          console.error('Audio playback error:', e);
                                          setAudioError(
                                             'There was an error playing this audio file.'
                                          );
                                       }}
                                       style={{
                                          height: '40px',
                                          borderRadius: '4px',
                                          backgroundColor: '#111827',
                                          color: '#10B981',
                                       }}
                                    />
                                 </div>
                                 <div className="bg-gray-900 rounded-sm h-10 overflow-hidden relative border border-gray-700 mb-1">
                                    <div className="flex h-full items-center justify-center gap-px px-2">
                                       {waveform.map((height, index) => (
                                          <div
                                             key={index}
                                             style={{
                                                height: `${height * 100}%`,
                                                transition: 'height 0.1s ease-in-out',
                                             }}
                                             className={`w-0.5 ${
                                                index < waveform.length / 3
                                                   ? 'bg-gradient-to-t from-emerald-900 to-emerald-500'
                                                   : index < (2 * waveform.length) / 3
                                                   ? 'bg-gradient-to-t from-emerald-800 to-emerald-400'
                                                   : 'bg-gradient-to-t from-emerald-900 to-emerald-500'
                                             } rounded-sm`}
                                          />
                                       ))}
                                    </div>
                                 </div>
                                 <div className="flex justify-center text-xs text-gray-600 flex-wrap gap-2">
                                    <span className="inline-flex items-center">
                                       <kbd className="px-1 bg-gray-700 rounded-sm text-xs">
                                          Space
                                       </kbd>
                                       <span className="mx-1 text-xs">Play/Pause</span>
                                    </span>
                                    <span className="mx-1 hidden sm:inline">|</span>
                                    <span className="inline-flex items-center">
                                       <kbd className="px-1 bg-gray-700 rounded-sm text-xs">←</kbd>
                                       <kbd className="px-1 bg-gray-700 rounded-sm ml-1 text-xs">
                                          →
                                       </kbd>
                                       <span className="mx-1 text-xs">Seek</span>
                                    </span>
                                    <span className="mx-1 hidden sm:inline">|</span>
                                    <span className="inline-flex items-center">
                                       <kbd className="px-1 bg-gray-700 rounded-sm text-xs">M</kbd>
                                       <span className="mx-1 text-xs">Mute</span>
                                    </span>
                                 </div>
                              </>
                           )}
                        </div>
                     </div>
                  )}
                  <div className="p-5 max-w-none">
                     {content.sections &&
                        content.sections.map((section, sectionIndex) => (
                           <div key={sectionIndex} className="mb-5 last:mb-0">
                              {section.type && section.type !== 'dialog' && (
                                 <h2 className="text-base font-medium text-gray-100 border-b border-gray-700 pb-2 mb-3">
                                    {section.type.charAt(0).toUpperCase() + section.type.slice(1)}
                                 </h2>
                              )}
                              {section.dialog &&
                                 section.dialog.map((line, lineIndex) => (
                                    <div
                                       key={lineIndex}
                                       className="mb-3 flex items-start space-x-2.5"
                                    >
                                       <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-gradient-to-r from-gray-900 to-gray-800 text-emerald-300 border border-gray-700 mt-1">
                                          {line.speaker}
                                       </span>
                                       <p className="text-gray-400 text-sm leading-relaxed">
                                          {line.text}
                                       </p>
                                    </div>
                                 ))}
                           </div>
                        ))}
                  </div>
               </div>
            </div>
            {hasSources && (
               <div className="lg:col-span-1">
                  <div className="sticky top-4">
                     <div className="bg-gradient-to-br from-gray-800 to-gray-900 shadow-md rounded-sm border border-gray-700/40 overflow-hidden">
                        {/* Sources Header */}
                        <div className="flex items-center px-3 py-2 bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700/60">
                           <svg
                              className="w-3.5 h-3.5 text-emerald-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                           >
                              <path
                                 strokeLinecap="round"
                                 strokeLinejoin="round"
                                 strokeWidth={1.5}
                                 d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                              />
                           </svg>
                           <span className="text-xs text-emerald-500 font-medium ml-1.5 uppercase tracking-wider">
                              Sources
                           </span>
                           <div className="ml-auto text-xs text-gray-500">{sources.length}</div>
                        </div>
                        <div className="max-h-[70vh] overflow-y-auto p-2 space-y-1.5">
                           {sources.map((source, index) => {
                              let sourceUrl, sourceTitle, sourceHost;
                              if (typeof source === 'string') {
                                 sourceUrl = source;
                                 sourceTitle = source;
                              } else {
                                 sourceUrl = source.url || '';
                                 sourceTitle = source.title || 'Untitled Source';
                                 sourceHost = source.source || '';
                              }
                              let hostname;
                              try {
                                 hostname = new URL(sourceUrl).hostname.replace(/^www\./, '');
                              } catch (e) {
                                 hostname = sourceHost || 'Unknown Source';
                              }
                              const displayUrl =
                                 sourceUrl.length > 36
                                    ? sourceUrl.substring(0, 36) + '...'
                                    : sourceUrl;
                              return (
                                 <a
                                    key={index}
                                    href={sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={sourceTitle}
                                    className="group flex flex-col p-2 rounded bg-gray-800/40 hover:bg-gray-800/80 text-gray-300 
                           hover:text-emerald-300 transition-all duration-150 border border-gray-700/20 
                           hover:border-emerald-600/30 hover:shadow-sm block"
                                 >
                                    {sourceTitle && sourceTitle !== sourceUrl && (
                                       <div className="text-xs font-medium text-emerald-400 mb-1 truncate group-hover:text-emerald-300">
                                          {sourceTitle}
                                       </div>
                                    )}
                                    <div className="flex items-center">
                                       <div className="flex-shrink-0 w-4 h-4 mr-1.5 opacity-80 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <SourceIcon url={sourceUrl} />
                                       </div>
                                       <span className="text-xs truncate flex-grow font-medium">
                                          {hostname}
                                       </span>
                                       <svg
                                          className="w-3 h-3 text-gray-500 group-hover:text-emerald-400 ml-1 opacity-0 
                                 group-hover:opacity-100 transition-all"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                       >
                                          <path
                                             strokeLinecap="round"
                                             strokeLinejoin="round"
                                             strokeWidth={2}
                                             d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                          />
                                       </svg>
                                    </div>
                                    <div className="mt-0.5 ml-5 text-[9px] text-gray-500 group-hover:text-gray-400 truncate">
                                       {displayUrl}
                                    </div>
                                 </a>
                              );
                           })}
                        </div>
                     </div>
                  </div>
               </div>
            )}
         </div>
         {showEditModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
               <div className="bg-gray-800 border border-gray-700 rounded-sm shadow-lg max-w-md w-full p-6">
                  <h3 className="text-xl font-medium text-gray-100 mb-3">Edit Podcast Title</h3>
                  {actionError && (
                     <div className="bg-red-900 border-l-4 border-red-500 text-red-300 p-4 mb-4 rounded-sm">
                        {actionError}
                     </div>
                  )}
                  <div className="mb-4">
                     <label
                        htmlFor="podcastTitle"
                        className="block text-sm font-medium text-gray-300 mb-1"
                     >
                        Title
                     </label>
                     <input
                        type="text"
                        id="podcastTitle"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="Enter podcast title"
                     />
                  </div>
                  <div className="flex justify-end space-x-3">
                     <button
                        onClick={() => setShowEditModal(false)}
                        className="px-4 py-2 bg-gray-700 text-gray-300 rounded-sm hover:bg-gray-600"
                        disabled={isSaving}
                     >
                        Cancel
                     </button>
                     <button
                        onClick={handleTitleUpdate}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-sm hover:bg-emerald-700 flex items-center"
                        disabled={isSaving}
                     >
                        {isSaving ? (
                           <>
                              <svg
                                 className="animate-spin h-4 w-4 mr-2 text-white"
                                 xmlns="http://www.w3.org/2000/svg"
                                 fill="none"
                                 viewBox="0 0 24 24"
                              >
                                 <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                 ></circle>
                                 <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                 ></path>
                              </svg>
                              Saving...
                           </>
                        ) : (
                           'Save Changes'
                        )}
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default PodcastDetail;
