import React, { useState, useRef } from 'react';
import api from '../services/api';

const ActivePodcastPreview = React.memo(
   ({
      podcastTitle,
      bannerUrl,
      scriptContent,
      audioUrl,
      webSearchRecording,
      sessionId,
      onClose,
   }) => {
      const [showRecordingPlayer, setShowRecordingPlayer] = useState(false);
      const [activeTab, setActiveTab] = useState('banner');
      const bannerRef = useRef(null);
      const recordingRef = useRef(null);
      const scriptRef = useRef(null);
      const audioRef = useRef(null);

      const scrollToSection = sectionId => {
         setActiveTab(sectionId);
         const refs = {
            banner: bannerRef,
            recording: recordingRef,
            script: scriptRef,
            audio: audioRef,
         };
         if (refs[sectionId]?.current) {
            refs[sectionId].current.scrollIntoView({ behavior: 'smooth' });
         }
      };

      const formatScriptPreview = text => {
         if (!text) return '';
         const preview = text.split('\n').slice(0, 10).join('\n');
         return preview;
      };

      let recordingUrl = null;
      if (webSearchRecording && sessionId) {
         const filename = webSearchRecording.split('/').pop();
         recordingUrl = `${api.API_BASE_URL}/stream-recording/${sessionId}/${filename}`;
      } else if (webSearchRecording) {
         console.warn('SessionId is missing when constructing recording URL');
      }

      const SectionHeader = ({ title, icon, id }) => (
         <div
            ref={
               id === 'banner'
                  ? bannerRef
                  : id === 'recording'
                  ? recordingRef
                  : id === 'script'
                  ? scriptRef
                  : audioRef
            }
            className="flex items-center text-xs text-gray-400 font-medium mb-2 mt-4 first:mt-0 pt-1"
         >
            {icon}
            <span>{title}</span>
         </div>
      );

      const EmptyContent = ({ message = 'No content yet' }) => (
         <div className="w-full h-20 bg-[#121824] rounded-sm border border-dashed border-gray-600 flex items-center justify-center">
            <p className="text-xs text-gray-500">{message}</p>
         </div>
      );

      const BannerIcon = ({ className }) => (
         <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
               strokeLinecap="round"
               strokeLinejoin="round"
               strokeWidth={2}
               d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
         </svg>
      );

      const VideoIcon = ({ className }) => (
         <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={className}
         >
            <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm4.555 2.168A1 1 0 006 9v2a1 1 0 001.555.832l3-1.5a1 1 0 000-1.664l-3-1.5z" />
         </svg>
      );

      const ScriptIcon = ({ className }) => (
         <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
               strokeLinecap="round"
               strokeLinejoin="round"
               strokeWidth={2}
               d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
         </svg>
      );

      const AudioIcon = ({ className }) => (
         <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
               strokeLinecap="round"
               strokeLinejoin="round"
               strokeWidth={2}
               d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 017.072 0m-9.9-2.828a9 9 0 0112.728 0M6 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
         </svg>
      );

      const TabNav = () => (
         <div className="flex items-center justify-between px-2 py-2 border-b border-gray-700 bg-gray-800 sticky top-0 z-10">
            <NavigationButton
               isActive={activeTab === 'banner'}
               onClick={() => scrollToSection('banner')}
               icon={<BannerIcon className="h-4 w-4" />}
               label="Banner"
            />
            {recordingUrl && (
               <NavigationButton
                  isActive={activeTab === 'recording'}
                  onClick={() => scrollToSection('recording')}
                  icon={<VideoIcon className="h-4 w-4" />}
                  label="Search"
               />
            )}
            <NavigationButton
               isActive={activeTab === 'script'}
               onClick={() => scrollToSection('script')}
               icon={<ScriptIcon className="h-4 w-4" />}
               label="Script"
            />
            <NavigationButton
               isActive={activeTab === 'audio'}
               onClick={() => scrollToSection('audio')}
               icon={<AudioIcon className="h-4 w-4" />}
               label="Audio"
            />
         </div>
      );

      const NavigationButton = ({ isActive, onClick, icon, label }) => (
         <button
            onClick={onClick}
            className={`flex flex-col items-center px-2 py-1 rounded-md transition ${
               isActive
                  ? 'text-emerald-400 bg-gray-700'
                  : 'text-gray-400 hover:text-emerald-300 hover:bg-gray-700/50'
            }`}
         >
            {React.cloneElement(icon, {
               className: `${icon.props.className} ${
                  isActive ? 'text-emerald-400' : 'text-gray-400'
               }`,
            })}
            <span className="text-xs mt-1">{label}</span>
         </button>
      );

      return (
         <div className="h-full flex flex-col relative bg-gray-900">
            {!showRecordingPlayer && (
               <>
                  <div className="px-4 py-3 border-b border-gray-700">
                     <div className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium bg-gray-800 text-emerald-300 border border-gray-700">
                        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500"></span>
                        AI Podcast Studio
                     </div>
                  </div>
                  <TabNav />
                  <div className="overflow-y-auto flex-1 custom-scrollbar p-4">
                     <SectionHeader
                        title="Banner"
                        icon={<BannerIcon className="h-3.5 w-3.5 mr-1 text-emerald-500" />}
                        id="banner"
                     />
                     {bannerUrl ? (
                        <div className="overflow-hidden rounded-sm border border-gray-700 mb-5">
                           <img
                              src={bannerUrl}
                              alt={`${podcastTitle} Banner`}
                              className="w-full object-cover"
                           />
                        </div>
                     ) : (
                        <div className="mb-5">
                           <EmptyContent message="No banner yet" />
                        </div>
                     )}
                     {recordingUrl && (
                        <>
                           <SectionHeader
                              title="Web Search Recording"
                              icon={<VideoIcon className="h-3.5 w-3.5 mr-1 text-emerald-500" />}
                              id="recording"
                           />

                           <button
                              onClick={() => setShowRecordingPlayer(true)}
                              className="w-full bg-[#121824] hover:bg-gray-800 rounded-sm border border-gray-700 p-2 flex items-center justify-between transition-colors mb-5"
                           >
                              <span className="text-xs text-gray-300 flex items-center">
                                 <svg
                                    className="h-4 w-4 mr-1.5 text-emerald-400"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                 >
                                    <path
                                       fillRule="evenodd"
                                       d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                                       clipRule="evenodd"
                                    />
                                 </svg>
                                 View search recording
                              </span>
                              <svg
                                 className="h-3 w-3 text-gray-500"
                                 viewBox="0 0 20 20"
                                 fill="currentColor"
                              >
                                 <path
                                    fillRule="evenodd"
                                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                    clipRule="evenodd"
                                 />
                              </svg>
                           </button>
                        </>
                     )}
                     <SectionHeader
                        title="Script"
                        icon={<ScriptIcon className="h-3.5 w-3.5 mr-1 text-emerald-500" />}
                        id="script"
                     />
                     {scriptContent ? (
                        <div className="bg-[#121824] p-3 rounded-sm border border-gray-700 max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent mb-5">
                           <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words">
                              {formatScriptPreview(scriptContent)}
                           </pre>
                        </div>
                     ) : (
                        <div className="mb-5">
                           <EmptyContent message="No script yet" />
                        </div>
                     )}
                     <SectionHeader
                        title="Audio"
                        icon={<AudioIcon className="h-3.5 w-3.5 mr-1 text-emerald-500" />}
                        id="audio"
                     />
                     {audioUrl ? (
                        <div className="bg-[#121824] p-2 rounded-sm border border-gray-700">
                           <audio controls src={audioUrl} className="w-full h-10">
                              Your browser does not support the audio element.
                           </audio>
                        </div>
                     ) : (
                        <EmptyContent message="No audio yet" />
                     )}
                  </div>
                  {audioUrl && (
                     <div className="border-t border-gray-700 p-2 bg-gray-800/90 backdrop-blur-sm">
                        <div className="flex items-center justify-between px-2 py-0.5">
                           <div className="flex items-center">
                              <AudioIcon className="h-3.5 w-3.5 text-emerald-400 mr-2" />
                              <span className="text-xs text-gray-300 truncate max-w-[120px]">
                                 {podcastTitle}
                              </span>
                           </div>
                           <button
                              onClick={() => scrollToSection('audio')}
                              className="text-xs text-emerald-400 hover:text-emerald-300"
                           >
                              View
                           </button>
                        </div>
                     </div>
                  )}
               </>
            )}
            {showRecordingPlayer && recordingUrl && (
               <div
                  className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 z-40 flex flex-col"
                  style={{ animation: 'fadeIn 0.2s ease-out forwards' }}
               >
                  <div className="w-full h-full flex flex-col">
                     <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center">
                           <VideoIcon className="h-5 w-5 text-emerald-500 mr-2" />
                           <p className="text-xs text-white">Web Search Recording</p>
                        </div>
                        <button
                           onClick={() => setShowRecordingPlayer(false)}
                           className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
                        >
                           <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path
                                 fillRule="evenodd"
                                 d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                 clipRule="evenodd"
                              />
                           </svg>
                        </button>
                     </div>
                     <div className="relative w-full bg-black flex-grow">
                        <video
                           className="w-full h-full object-contain"
                           src={recordingUrl}
                           controls
                           autoPlay
                        >
                           Your browser does not support the video tag.
                        </video>
                     </div>
                     <div className="p-4 border-t border-gray-700 flex-shrink-0">
                        <p className="text-xs text-gray-400 mb-3">
                           This recording shows the AI searching the web for information to include
                           in your podcast.
                        </p>
                        <div className="flex justify-end">
                           <button
                              onClick={() => setShowRecordingPlayer(false)}
                              className="text-xs px-4 py-1 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium rounded-md transition"
                           >
                              Close
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            )}
            <style jsx>{`
               @keyframes fadeIn {
                  from {
                     opacity: 0;
                  }
                  to {
                     opacity: 1;
                  }
               }

               .custom-scrollbar {
                  scrollbar-width: thin;
                  scrollbar-color: rgba(75, 85, 99, 0.5) transparent;
               }

               .custom-scrollbar::-webkit-scrollbar {
                  width: 4px;
               }

               .custom-scrollbar::-webkit-scrollbar-track {
                  background: transparent;
               }

               .custom-scrollbar::-webkit-scrollbar-thumb {
                  background-color: rgba(75, 85, 99, 0.5);
                  border-radius: 20px;
               }
            `}</style>
         </div>
      );
   }
);

ActivePodcastPreview.displayName = 'ActivePodcastPreview';

export default ActivePodcastPreview;
