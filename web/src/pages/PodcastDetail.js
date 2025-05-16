import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
   ChevronDown, 
   ChevronUp, 
   Eye, 
   FileText, 
   Globe,
   Calendar,
   Volume2,
   Play,
   ExternalLink,
   Users,
   Sparkles,
   X,
   Download
} from 'lucide-react';
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
      <ExternalLink className="w-4 h-4 text-emerald-400 transition-transform duration-200 group-hover:scale-110" />
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
   const [waveform, setWaveform] = useState([]);
   const audioRef = useRef(null);
   const animationRef = useRef(null);
   const [showEditModal, setShowEditModal] = useState(false);
   const [isSaving, setIsSaving] = useState(false);
   const [actionError, setActionError] = useState(null);
   const [newTitle, setNewTitle] = useState('');
   
   // New states for collapsible sections
   const [isFullScriptOpen, setIsFullScriptOpen] = useState(false);
   const [isSourcesOpen, setIsSourcesOpen] = useState(false);

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
            animationRef.current = requestAnimationFrame(animateWaveform);
         };
         animationRef.current = requestAnimationFrame(animateWaveform);
      } else {
         if (animationRef.current) cancelAnimationFrame(animationRef.current);
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

   // Speaker color mapping
   const speakerColors = {
      ALEX: 'from-slate-600 to-slate-700',
      MORGAN: 'from-gray-600 to-gray-700',
      default: 'from-zinc-600 to-zinc-700'
   };

   const getSpeakerColor = (speaker) => {
      return speakerColors[speaker] || speakerColors.default;
   };

   if (loading) {
      return (
         <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="text-center">
               <div className="w-12 h-12 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
               <p className="text-gray-400">Loading podcast...</p>
            </div>
         </div>
      );
   }

   if (error) {
      return (
         <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-l-4 border-red-500 p-4 rounded-sm shadow-sm mb-4 text-red-400">
               {error}
            </div>
         </div>
      );
   }

   if (!podcast) {
      return (
         <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-l-4 border-yellow-500 p-4 rounded-sm shadow-sm mb-4 text-yellow-300">
               Podcast not found.
            </div>
         </div>
      );
   }

   const { podcast: podcastData, content, audio_url, sources } = podcast;
   const hasAudio = podcastData.audio_generated && audio_url;
   const hasBanner = !!podcastData.banner_img;
   const hasSources = Array.isArray(sources) && sources.length > 0;
   const hasScript = content && content.sections && content.sections.length > 0;
   let streamingAudioUrl = '';
   if (hasAudio) {
      const originalAudioUrl = audio_url;
      const filename = originalAudioUrl.split('/').pop();
      streamingAudioUrl = `${apiService.API_BASE_URL}/stream-audio/${filename}`;
   }

   return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 py-8 px-4 relative overflow-hidden">
         {/* Background effects */}
         <div className="absolute inset-0 opacity-20">
            <div className="absolute top-20 left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
         </div>

         <div className="max-w-6xl mx-auto relative z-10">
            {/* Back Button */}
            <button
               onClick={handleGoBack}
               className="text-gray-300 hover:text-emerald-300 flex items-center mb-8 transition-colors duration-200 group"
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

            {/* Main Card with Frosted Glass Effect */}
            <div className="backdrop-blur-xl bg-gray-900/50 border border-gray-700/50 rounded-3xl overflow-hidden shadow-2xl relative">
               {/* Frosted glass overlay */}
               <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 via-gray-800/60 to-gray-900/80 backdrop-blur-lg"></div>
               
               {/* Content */}
               <div className="relative z-10">
                  {/* Header */}
                  <div className="px-8 py-6 border-b border-gray-700/30 backdrop-blur-sm">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl backdrop-blur-sm border border-emerald-500/30">
                              <Volume2 className="w-6 h-6 text-emerald-400" />
                           </div>
                           <div>
                              <h1 className="text-2xl font-bold text-white">
                                 {content.title || `Podcast - ${formatDate(podcastData.date)}`}
                              </h1>
                              <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                                 <Calendar className="w-4 h-4" />
                                 {formatDate(podcastData.date)}
                              </p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <button
                              onClick={() => setShowEditModal(true)}
                              className="p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl text-gray-400 hover:text-blue-400 transition-all duration-200 backdrop-blur-sm border border-gray-700/30"
                              title="Edit Title"
                           >
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
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                 />
                              </svg>
                           </button>
                           <button
                              onClick={handleDelete}
                              className="p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl text-gray-400 hover:text-red-400 transition-all duration-200 backdrop-blur-sm border border-gray-700/30"
                              title="Delete Podcast"
                           >
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
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                 />
                              </svg>
                           </button>
                        </div>
                     </div>

                     {/* Metadata Tags */}
                     <div className="flex flex-wrap items-center gap-3 mt-6">
                        {podcastData.language_code && (
                           <div className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-blue-900/80 to-blue-800/80 text-blue-200 border border-blue-800/50 backdrop-blur-sm">
                              <Globe className="w-4 h-4 mr-2" />
                              <span>{getLanguageName(podcastData.language_code)}</span>
                           </div>
                        )}
                        {podcastData.tts_engine && (
                           <div className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-purple-900/80 to-purple-800/80 text-purple-200 border border-purple-800/50 backdrop-blur-sm">
                              <Sparkles className="w-4 h-4 mr-2" />
                              <span>{formatTtsEngineName(podcastData.tts_engine)}</span>
                           </div>
                        )}
                        {hasAudio && (
                           <div className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-emerald-900/80 to-emerald-800/80 text-emerald-200 border border-emerald-800/50 backdrop-blur-sm">
                              <Volume2 className="w-4 h-4 mr-2" />
                              <span>Audio</span>
                           </div>
                        )}
                        {hasSources && (
                           <div className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-gray-900/80 to-gray-800/80 text-gray-400 border border-gray-700/50 backdrop-blur-sm">
                              <ExternalLink className="w-4 h-4 mr-2 text-emerald-500" />
                              <span>{sources.length} source{sources.length !== 1 ? 's' : ''}</span>
                           </div>
                        )}
                     </div>
                  </div>

                  {/* Banner and Content Section */}
                  <div className="px-8 py-8">
                     <div className="flex flex-col lg:flex-row items-center gap-8">
                        {/* Prominent Banner Image */}
                        <div className="flex-shrink-0">
                           {hasBanner ? (
                              <div className="relative group">
                                 <div className="w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden shadow-2xl transform transition-all duration-500 hover:scale-105 hover:rotate-1 relative">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10"></div>
                                    <img
                                       src={`${apiService.API_BASE_URL}/podcast_img/${podcastData.banner_img}`}
                                       alt={content.title || 'Podcast'}
                                       className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/10 transition-all duration-300 rounded-2xl"></div>
                                 </div>
                                 {/* Reflection effect */}
                                 <div className="absolute -bottom-4 -inset-x-4 h-20 bg-gradient-to-t from-emerald-500/10 to-transparent rounded-2xl blur-xl opacity-60"></div>
                              </div>
                           ) : (
                              <div className="w-64 h-64 md:w-80 md:h-80 bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-2xl flex items-center justify-center border border-gray-600/30 shadow-2xl backdrop-blur-sm">
                                 <div className="text-center">
                                    <svg
                                       xmlns="http://www.w3.org/2000/svg"
                                       className="h-20 w-20 text-emerald-400 mx-auto mb-4"
                                       fill="none"
                                       viewBox="0 0 24 24"
                                       stroke="currentColor"
                                    >
                                       <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={1.5}
                                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                                       />
                                    </svg>
                                    <p className="text-gray-400 text-sm">No cover art</p>
                                 </div>
                              </div>
                           )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex-1 w-full">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Script Button */}
                              {hasScript && (
                                 <button
                                    onClick={() => setIsFullScriptOpen(true)}
                                    className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-lg border border-gray-700/30 p-6 hover:border-emerald-500/50 transition-all duration-300 hover:scale-105"
                                 >
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    <div className="relative z-10">
                                       <div className="flex items-center gap-3 mb-3">
                                          <div className="p-2 bg-emerald-500/20 rounded-lg">
                                             <FileText className="w-6 h-6 text-emerald-400" />
                                          </div>
                                          <span className="text-lg font-semibold text-white">View Script</span>
                                       </div>
                                       <p className="text-gray-400 text-sm">
                                          {content.sections.length} sections • Complete transcript
                                       </p>
                                       <div className="mt-4 flex items-center gap-2 text-emerald-400 text-sm group-hover:text-emerald-300 transition-colors">
                                          <span>Read full podcast script</span>
                                          <ExternalLink className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                                       </div>
                                    </div>
                                 </button>
                              )}

                              {/* Sources Button */}
                              {hasSources && (
                                 <button
                                    onClick={() => setIsSourcesOpen(true)}
                                    className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-lg border border-gray-700/30 p-6 hover:border-teal-500/50 transition-all duration-300 hover:scale-105"
                                 >
                                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    <div className="relative z-10">
                                       <div className="flex items-center gap-3 mb-3">
                                          <div className="p-2 bg-teal-500/20 rounded-lg">
                                             <Globe className="w-6 h-6 text-teal-400" />
                                          </div>
                                          <span className="text-lg font-semibold text-white">View Sources</span>
                                       </div>
                                       <p className="text-gray-400 text-sm">
                                          {sources.length} source{sources.length !== 1 ? 's' : ''} • External references
                                       </p>
                                       <div className="mt-4 flex items-center gap-2 text-teal-400 text-sm group-hover:text-teal-300 transition-colors">
                                          <span>Explore all sources</span>
                                          <ExternalLink className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                                       </div>
                                    </div>
                                 </button>
                              )}
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Audio Player Section */}
                  {hasAudio && (
                     <div className="px-8 py-6 border-t border-gray-700/30 backdrop-blur-sm">
                        <div className="flex flex-col">
                           {audioError ? (
                              <div className="bg-gradient-to-r from-red-900/30 to-red-800/30 border border-red-500/50 p-4 rounded-xl mb-4 backdrop-blur-sm">
                                 <div className="flex">
                                    <div className="flex-shrink-0">
                                       <svg
                                          className="h-5 w-5 text-red-400"
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 20 20"
                                          fill="currentColor"
                                       >
                                          <path
                                             fillRule="evenodd"
                                             d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.707-4.707a1 1 0 001.414 0L12 12.07l1.293 1.293a1 1 0 001.414-1.414L13.414 10l1.293-1.293a1 1 0 00-1.414-1.414L12 8.586l-1.293-1.293a1 1 0 00-1.414 1.414L10.586 10l-1.293 1.293a1 1 0 000 1.414z"
                                             clipRule="evenodd"
                                          />
                                       </svg>
                                    </div>
                                    <div className="ml-3">
                                       <p className="text-sm text-red-300 font-medium">Audio Error</p>
                                       <p className="text-sm text-red-200">{audioError}</p>
                                    </div>
                                 </div>
                              </div>
                           ) : (
                              <>
                                 <div className="bg-gray-800/30 rounded-2xl border border-gray-700/30 p-6 mb-4 backdrop-blur-sm">
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
                                          setAudioError('There was an error playing this audio file.');
                                       }}
                                       style={{
                                          height: '50px',
                                          borderRadius: '12px',
                                          backgroundColor: 'transparent',
                                       }}
                                    />
                                 </div>
                                 
                                 {/* Enhanced Waveform Visualization */}
                                 <div className="relative bg-gray-800/20 rounded-2xl h-16 overflow-hidden border border-gray-700/30 backdrop-blur-sm">
                                    <div className="flex h-full items-center justify-center gap-1 px-4">
                                       {waveform.map((height, index) => (
                                          <div
                                             key={index}
                                             style={{
                                                height: `${height * 100}%`,
                                                transition: 'height 0.15s ease-in-out',
                                             }}
                                             className={`w-1 ${
                                                index < waveform.length / 3
                                                   ? 'bg-gradient-to-t from-emerald-900 to-emerald-400'
                                                   : index < (2 * waveform.length) / 3
                                                   ? 'bg-gradient-to-t from-emerald-800 to-emerald-300'
                                                   : 'bg-gradient-to-t from-emerald-900 to-emerald-400'
                                             } rounded-full`}
                                          />
                                       ))}
                                    </div>
                                    
                                    {/* Audio visualization effects */}
                                    {isPlaying && (
                                       <div className="absolute inset-0 overflow-hidden rounded-2xl">
                                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64">
                                             <div className="absolute inset-0 border border-emerald-500/20 rounded-full animate-ping" style={{ animationDuration: '4s' }} />
                                             <div className="absolute inset-8 border border-emerald-400/15 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                                             <div className="absolute inset-16 border border-emerald-400/10 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                                          </div>
                                       </div>
                                    )}
                                 </div>
                                 
                                 <div className="mt-4 text-center">
                                    <div className="flex justify-center text-xs text-gray-500 flex-wrap gap-3">
                                       <span className="inline-flex items-center gap-1">
                                          <kbd className="px-2 py-1 bg-gray-700/50 rounded-lg text-xs backdrop-blur-sm">Space</kbd>
                                          <span>Play/Pause</span>
                                       </span>
                                       <span className="hidden sm:inline">•</span>
                                       <span className="inline-flex items-center gap-1">
                                          <kbd className="px-2 py-1 bg-gray-700/50 rounded-lg text-xs backdrop-blur-sm">←</kbd>
                                          <kbd className="px-2 py-1 bg-gray-700/50 rounded-lg text-xs backdrop-blur-sm">→</kbd>
                                          <span>Seek</span>
                                       </span>
                                       <span className="hidden sm:inline">•</span>
                                       <span className="inline-flex items-center gap-1">
                                          <kbd className="px-2 py-1 bg-gray-700/50 rounded-lg text-xs backdrop-blur-sm">M</kbd>
                                          <span>Mute</span>
                                       </span>
                                    </div>
                                 </div>
                              </>
                           )}
                        </div>
                     </div>
                  )}
               </div>
            </div>

            {/* Full Script Modal */}
            {isFullScriptOpen && (
               <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-50 flex items-center justify-center p-4">
                  <div className="bg-gray-900/95 backdrop-blur-xl rounded-3xl border border-gray-700/50 w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl">
                     {/* Modal Header */}
                     <div className="px-8 py-6 border-b border-gray-700/30 flex items-center justify-between backdrop-blur-sm">
                        <div>
                           <h3 className="text-2xl font-bold text-white">Complete Podcast Script</h3>
                           <p className="text-sm text-gray-400 mt-1">{content.title}</p>
                        </div>
                        <button
                           onClick={() => setIsFullScriptOpen(false)}
                           className="p-3 text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 rounded-xl transition-all duration-200 backdrop-blur-sm"
                        >
                           <X className="w-6 h-6" />
                        </button>
                     </div>

                     {/* Script Content */}
                     <div className="flex-1 overflow-y-auto p-8">
                        {content.sections.map((section, sectionIndex) => (
                           <div key={sectionIndex} className="mb-12">
                              <div className="mb-6">
                                 <h2 className="text-xl font-bold text-white mb-2">
                                    {section.type?.charAt(0).toUpperCase() + section.type?.slice(1)}
                                 </h2>
                                 <div className="h-px bg-gradient-to-r from-emerald-500/60 via-emerald-500/30 to-transparent" />
                              </div>
                              {section.dialog && (
                                 <div className="space-y-6">
                                    {section.dialog.map((line, lineIndex) => (
                                       <div key={lineIndex} className="flex gap-6 items-start">
                                          <div className={`flex-shrink-0 px-4 py-2 text-sm font-semibold bg-gradient-to-r ${getSpeakerColor(line.speaker)} text-white rounded-full min-w-24 text-center backdrop-blur-sm border border-gray-600/30`}>
                                             {line.speaker}
                                          </div>
                                          <div className="flex-1 text-gray-300 leading-relaxed pt-1 text-lg">
                                             {line.text}
                                          </div>
                                       </div>
                                    ))}
                                 </div>
                              )}
                           </div>
                        ))}

                        {/* Sources in Modal */}
                        {hasSources && (
                           <div className="mt-12 pt-8 border-t border-gray-700/30">
                              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                 <Globe className="w-6 h-6" />
                                 Sources
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 {sources.map((source, index) => {
                                    const sourceUrl = typeof source === 'string' ? source : source.url;
                                    const sourceTitle = typeof source === 'string' ? sourceUrl : source.title;
                                    return (
                                       <a
                                          key={index}
                                          href={sourceUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="group flex items-center gap-4 p-4 bg-gray-800/30 rounded-xl border border-gray-700/30 hover:border-gray-600/50 hover:bg-gray-700/30 transition-all duration-200 backdrop-blur-sm"
                                       >
                                          <div className="flex-shrink-0">
                                             <SourceIcon url={sourceUrl} />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                             <div className="text-emerald-400 group-hover:text-emerald-300 text-sm font-medium truncate">
                                                {new URL(sourceUrl).hostname}
                                             </div>
                                             <div className="text-gray-500 text-xs truncate mt-1">
                                                {sourceUrl}
                                             </div>
                                          </div>
                                       </a>
                                    );
                                 })}
                              </div>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            )}

            {/* Sources Modal */}
            {isSourcesOpen && hasSources && (
               <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-50 flex items-center justify-center p-4">
                  <div className="bg-gray-900/95 backdrop-blur-xl rounded-3xl border border-gray-700/50 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                     {/* Modal Header */}
                     <div className="px-8 py-6 border-b border-gray-700/30 flex items-center justify-between backdrop-blur-sm">
                        <div>
                           <h3 className="text-2xl font-bold text-white">Podcast Sources</h3>
                           <p className="text-sm text-gray-400 mt-1">{sources.length} external references</p>
                        </div>
                        <button
                           onClick={() => setIsSourcesOpen(false)}
                           className="p-3 text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 rounded-xl transition-all duration-200 backdrop-blur-sm"
                        >
                           <X className="w-6 h-6" />
                        </button>
                     </div>

                     {/* Sources Content */}
                     <div className="flex-1 overflow-y-auto p-8">
                        <div className="grid grid-cols-1 gap-4">
                           {sources.map((source, index) => {
                              const sourceUrl = typeof source === 'string' ? source : source.url;
                              const sourceTitle = typeof source === 'string' ? sourceUrl : source.title;
                              let hostname = '';
                              try {
                                 hostname = new URL(sourceUrl).hostname.replace(/^www\./, '');
                              } catch (e) {
                                 hostname = 'Unknown';
                              }
                              return (
                                 <a
                                    key={index}
                                    href={sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group block p-6 bg-gray-800/30 rounded-2xl border border-gray-700/30 hover:border-gray-600/50 hover:bg-gray-700/30 transition-all duration-200 backdrop-blur-sm"
                                 >
                                    <div className="flex items-start gap-4">
                                       <div className="flex-shrink-0 p-2 bg-gray-700/50 rounded-lg">
                                          <SourceIcon url={sourceUrl} />
                                       </div>
                                       <div className="flex-1 min-w-0">
                                          <div className="text-emerald-400 group-hover:text-emerald-300 font-semibold truncate">
                                             {hostname}
                                          </div>
                                          <div className="text-gray-300 text-sm truncate mt-1">
                                             {sourceUrl}
                                          </div>
                                          <div className="flex items-center gap-2 mt-3 text-gray-500 text-xs">
                                             <span>Click to visit source</span>
                                             <ExternalLink className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" />
                                          </div>
                                       </div>
                                    </div>
                                 </a>
                              );
                           })}
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
               <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50 p-4">
                  <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl max-w-md w-full p-8">
                     <h3 className="text-xl font-bold text-gray-100 mb-4">Edit Podcast Title</h3>
                     {actionError && (
                        <div className="bg-red-900/30 border border-red-500/50 text-red-300 p-4 mb-4 rounded-xl backdrop-blur-sm">
                           {actionError}
                        </div>
                     )}
                     <div className="mb-6">
                        <label
                           htmlFor="podcastTitle"
                           className="block text-sm font-medium text-gray-300 mb-2"
                        >
                           Title
                        </label>
                        <input
                           type="text"
                           id="podcastTitle"
                           value={newTitle}
                           onChange={e => setNewTitle(e.target.value)}
                           className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 backdrop-blur-sm transition-all"
                           placeholder="Enter podcast title"
                        />
                     </div>
                     <div className="flex justify-end space-x-3">
                        <button
                           onClick={() => setShowEditModal(false)}
                           className="px-6 py-3 bg-gray-800/50 text-gray-300 rounded-xl hover:bg-gray-700/50 transition-all backdrop-blur-sm border border-gray-700/50"
                           disabled={isSaving}
                        >
                           Cancel
                        </button>
                        <button
                           onClick={handleTitleUpdate}
                           className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center transition-all"
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
      </div>
   );
};

export default PodcastDetail;