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
   Download,
   Edit3,
   Trash2,
   Info,
   Pause
} from 'lucide-react';
import apiService from '../services/api';
import SpootIcon from '../icons/Spoot'

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
      // Generate frequency bars
      const initialWaveform = Array.from({ length: 32 }, () => Math.random() * 80 + 20);
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
         const animateWaveform = () => {
            setWaveform(prevWaveform =>
               prevWaveform.map((height, index) => {
                  let newHeight = height + (Math.random() * 20 - 10);
                  newHeight = Math.max(20, Math.min(100, newHeight));
                  return newHeight;
               })
            );
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
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
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
      <div className="min-h-screen  py-4 px-4 relative overflow-hidden">
         {/* Background effects */}
         <div className="absolute inset-0 opacity-20">
            <div className="absolute top-20 left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
         </div>

         <div className="max-w-lg mx-auto relative z-10">
            {/* Back Button */}
            <button
               onClick={handleGoBack}
               className="text-gray-300 hover:text-emerald-300 flex items-center mb-3 transition-colors duration-200 group"
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

            {/* Ultra Compact Card */}
            <div className="bg-gradient-to-br from-gray-900 via-gray-850 to-gray-800 rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50 transition-all duration-300 hover:shadow-3xl">
               
               {/* Compact Header with Banner */}
               <div className="relative">
                  {/* Banner as header background if available */}
                  {hasBanner && (
                     <div className="h-80 relative overflow-hidden">
                        <img
                           src={`${apiService.API_BASE_URL}/podcast_img/${podcastData.banner_img}`}
                           alt={content.title || 'Podcast'}
                           className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/95 via-gray-900/70 to-gray-900/30" />
                     </div>
                  )}
                  
                  {/* Header content overlay */}
                  <div className={`${hasBanner ? 'absolute bottom-0 left-0 right-0' : ''} px-4 py-3 bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur border-b border-gray-700/30`}>
                     <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-teal-600/5" />
                     <div className="relative flex justify-between items-center">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                           <div className={`p-1.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-lg transition-all duration-300 ${
                              isPlaying ? 'scale-110 shadow-lg shadow-emerald-500/25' : ''
                           }`}>
                              <Volume2 className={`w-4 h-4 text-emerald-400 transition-all duration-300 ${
                                 isPlaying ? 'scale-110' : ''
                              }`} />
                           </div>
                           <div className="min-w-0">
                              <h3 className="text-base font-semibold text-white truncate">
                                 {content.title || `Podcast - ${formatDate(podcastData.date)}`}
                              </h3>
                              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                                 <Calendar className="w-3 h-3" />
                                 {formatDate(podcastData.date)}
                                 {isPlaying && (
                                    <span className="flex items-center gap-1 text-emerald-400 ml-1">
                                       <Play className="w-2.5 h-2.5" />
                                       <span className="text-xs">Playing</span>
                                    </span>
                                 )}
                              </p>
                           </div>
                        </div>
                        <div className="flex gap-1">
                           <button
                              onClick={() => setShowEditModal(true)}
                              className="p-1.5 text-gray-400 hover:text-blue-400 transition-all duration-200 hover:bg-gray-700/30 rounded"
                              title="Edit Title"
                           >
                              <Edit3 className="w-3.5 h-3.5" />
                           </button>
                           <button
                              onClick={handleDelete}
                              className="p-1.5 text-gray-400 hover:text-red-400 transition-all duration-200 hover:bg-gray-700/30 rounded"
                              title="Delete Podcast"
                           >
                              <Trash2 className="w-3.5 h-3.5" />
                           </button>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Compact Metadata Tags */}
               <div className="px-4 py-2">
                  <div className="flex flex-wrap justify-center gap-1.5">
                     {podcastData.language_code && (
                        <div className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-900/80 to-blue-800/80 text-blue-200 border border-blue-800/50">
                           <Globe className="w-3 h-3 mr-1" />
                           <span>{getLanguageName(podcastData.language_code)}</span>
                        </div>
                     )}
                     {podcastData.tts_engine && (
                        <div className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-900/80 to-purple-800/80 text-purple-200 border border-purple-800/50">
                           <Sparkles className="w-3 h-3 mr-1" />
                           <span>{formatTtsEngineName(podcastData.tts_engine)}</span>
                        </div>
                     )}
                     {hasSources && (
                        <div className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-gray-900/80 to-gray-800/80 text-gray-400 border border-gray-700/50">
                           <ExternalLink className="w-3 h-3 mr-1 text-emerald-500" />
                           <span>{sources.length} source{sources.length !== 1 ? 's' : ''}</span>
                        </div>
                     )}
                  </div>
               </div>

               {/* Compact Audio Section */}
               {hasAudio && (
                  <div className="px-4 py-3">
                     <div className="relative">
                        {/* Simplified frequency visualization */}
                        <div className="absolute inset-0 overflow-hidden rounded-lg">
                           <div className="flex items-end justify-center h-full gap-px p-2">
                              {waveform.map((height, index) => (
                                 <div
                                    key={index}
                                    className={`bg-gradient-to-t from-emerald-600/30 to-teal-400/30 rounded-full transition-all duration-300 ${
                                       isPlaying 
                                          ? 'animate-pulse' 
                                          : 'opacity-40'
                                    }`}
                                    style={{
                                       width: '2px',
                                       height: isPlaying ? `${height}%` : '20%',
                                       animationDelay: `${index * 30}ms`,
                                       animationDuration: `${1000 + Math.random() * 300}ms`,
                                    }}
                                 />
                              ))}
                           </div>
                        </div>

                        {/* Audio Controls */}
                        <div className="relative bg-gradient-to-r from-gray-800/90 to-gray-700/90 rounded-lg p-3 border border-gray-600/30 backdrop-blur-sm">
                           {audioError ? (
                              <div className="flex items-center gap-2 text-red-400">
                                 <Info className="w-4 h-4" />
                                 <span className="text-xs">{audioError}</span>
                              </div>
                           ) : (
                              <audio 
                                 ref={audioRef}
                                 controls 
                                 className="w-full h-8"
                                 src={streamingAudioUrl}
                                 onPlay={() => setIsPlaying(true)}
                                 onPause={() => setIsPlaying(false)}
                                 onEnded={() => setIsPlaying(false)}
                                 onError={e => {
                                    console.error('Audio playback error:', e);
                                    setAudioError('There was an error playing this audio file.');
                                 }}
                              >
                                 Your browser does not support the audio element.
                              </audio>
                           )}
                        </div>

                        {/* Pulsing Ring Animation when playing */}
                        {isPlaying && (
                           <div className="absolute inset-0 rounded-lg pointer-events-none">
                              <div className="absolute inset-0 border border-emerald-500/20 rounded-lg animate-ping" />
                              <div className="absolute inset-1 border border-emerald-400/10 rounded-lg animate-pulse" />
                           </div>
                        )}
                     </div>

                     {/* Compact Audio Info */}
                     <div className="mt-2 text-center">
                        <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
                           <Sparkles className={`w-3 h-3 transition-all duration-300 ${
                              isPlaying ? 'text-emerald-400' : ''
                           }`} />
                           High-quality podcast audio
                           {isPlaying && (
                              <span className="ml-1 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded">
                                 ♪ Playing
                              </span>
                           )}
                        </p>
                     </div>
                  </div>
               )}

               {/* Compact Actions Section */}
               <div className="px-4 py-3 bg-gradient-to-r from-gray-900/50 to-gray-800/50 backdrop-blur border-t border-gray-700/30">
                  <div className="flex justify-center gap-3">
                     {hasScript && (
                        <button
                           onClick={() => setIsFullScriptOpen(true)}
                           className="group flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white text-xs font-medium rounded-lg transition-all duration-200 hover:scale-105 border border-gray-600/30"
                        >
                           <FileText className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                           Script
                        </button>
                     )}
                     {hasSources && (
                        <button
                           onClick={() => setIsSourcesOpen(true)}
                           className="group flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white text-xs font-medium rounded-lg transition-all duration-200 hover:scale-105 border border-gray-600/30"
                        >
                           <Globe className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                           Sources
                        </button>
                     )}
                  </div>

                  {/* Keyboard shortcuts - More compact */}
                  {hasAudio && (
                     <div className="mt-2 text-center">
                        <div className="flex justify-center text-xs text-gray-500 gap-2">
                           <span className="flex items-center gap-1">
                              <kbd className="px-1.5 py-0.5 bg-gray-700/50 rounded text-xs">Space</kbd>
                              Play
                           </span>
                           <span className="flex items-center gap-1">
                              <kbd className="px-1.5 py-0.5 bg-gray-700/50 rounded text-xs">←→</kbd>
                              Seek
                           </span>
                           <span className="flex items-center gap-1">
                              <kbd className="px-1.5 py-0.5 bg-gray-700/50 rounded text-xs">M</kbd>
                              Mute
                           </span>
                        </div>
                     </div>
                  )}
               </div>

               {/* Floating Audio Waves Animation when playing */}
               {isPlaying && hasAudio && (
                  <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden rounded-2xl">
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64">
                        <div className="absolute inset-0 border border-emerald-500/10 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                        <div className="absolute inset-8 border border-teal-400/10 rounded-full animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                        <div className="absolute inset-16 border border-emerald-300/10 rounded-full animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }} />
                     </div>
                  </div>
               )}
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