import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatMessage, { LoadingIndicator } from '../components/ChatMessage';
import SourceSelection from '../components/SourceSelection';
import ScriptConfirmation from '../components/ScriptConfirmation';
import BannerConfirmation from '../components/BannerConfirmation';
import AudioConfirmation from '../components/AudioConfirmation';
import FinalPresentation from '../components/FinalPresentation';
import ActivePodcastPreview from '../components/ActivePodcastPreview';
import { PodcastAssetsToggle } from '../components/AssetPannelToggle';
import api from '../services/api';

// Enhanced Progress Indicator component with smoother animations
const ProgressIndicator = ({ progress, message, type }) => {
   const progressWidth = `${progress}%`;
   
   return (
      <div className="mb-4 px-4 py-3 bg-gray-800/80 border border-gray-700 text-gray-200 text-sm rounded-md shadow-md">
         <div className="flex flex-col">
            <div className="flex items-center mb-2">
               <div className="mr-2 h-4 w-4 relative">
                  <svg 
                     className="animate-spin" 
                     viewBox="0 0 24 24" 
                     fill="none" 
                     xmlns="http://www.w3.org/2000/svg"
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
               </div>
               <span className="font-medium">
                  {type ? `Processing ${type}...` : 'Processing...'}
               </span>
               {progress > 0 && (
                  <span className="ml-2 text-xs bg-gray-700 px-2 py-0.5 rounded-full">
                     {progress}%
                  </span>
               )}
            </div>
            
            {message && message !== `Processing ${type}...` && (
               <p className="text-xs text-gray-300 ml-6 mb-2">{message}</p>
            )}
            
            <div className="w-full bg-gray-700 rounded-full h-2 ml-6 overflow-hidden">
               <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: progressWidth }}
               ></div>
            </div>
         </div>
      </div>
   );
};

const PodcastSession = () => {
   const { sessionId } = useParams();
   const navigate = useNavigate();
   const [messages, setMessages] = useState([]);
   const [inputMessage, setInputMessage] = useState('');
   const [loading, setLoading] = useState(false);
   const [isProcessing, setIsProcessing] = useState(false);
   const [processingType, setProcessingType] = useState(null);
   const [processingProgress, setProcessingProgress] = useState(0);
   const [processingMessage, setProcessingMessage] = useState('');
   const [sessionState, setSessionState] = useState({});
   const [currentStage, setCurrentStage] = useState('welcome');
   const [error, setError] = useState(null);
   const [showCompletionModal, setShowCompletionModal] = useState(false);
   const [isPreviewVisible, setIsPreviewVisible] = useState(window.innerWidth >= 1024);
   const [selectedSourceIndices, setSelectedSourceIndices] = useState([]);
   const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
   const [isFinalScriptModalOpen, setIsFinalScriptModalOpen] = useState(false);
   const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
   const [showRecordingPlayer, setShowRecordingPlayer] = useState(false);
   const [selectedLanguageCode, setSelectedLanguageCode] = useState('en');
   const [availableLanguages, setAvailableLanguages] = useState([
      { code: 'en', name: 'English' },
      { code: 'zh', name: 'Chinese (Mandarin)' },
      { code: 'hi', name: 'Hindi' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'ar', name: 'Arabic' },
      { code: 'bn', name: 'Bengali' },
      { code: 'ru', name: 'Russian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'id', name: 'Indonesian' },
   ]);
   
   const chatContainerRef = useRef(null);
   const pollTimerRef = useRef(null);
   const messagesEndRef = useRef(null);
   const inputRef = useRef(null);

   // Init effect
   useEffect(() => {
      if (sessionId) {
         console.log('Session ID available:', sessionId);
         initializeSession(sessionId);
      } else {
         console.error('No sessionId available from URL params!');
      }
      
      const handleResize = () => {
         setIsPreviewVisible(window.innerWidth >= 1024);
         if (window.innerWidth >= 768) {
            setIsMobileSidebarOpen(false);
         }
      };
      
      window.addEventListener('resize', handleResize);
      
      return () => {
         if (pollTimerRef.current) clearInterval(pollTimerRef.current);
         window.removeEventListener('resize', handleResize);
      };
   }, [sessionId]);

   // Scroll to bottom effect
   useEffect(() => {
      if (messagesEndRef.current) {
         messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
   }, [messages]);

   // Session state effect
   useEffect(() => {
      if (sessionState.show_sources_for_selection && sessionState.search_results) {
         // Pre-select all sources by default
         setSelectedSourceIndices(
            Array.from({ length: sessionState.search_results.length }, (_, i) => i)
         );
      }
      
      if (sessionState.show_recording_player !== undefined) {
         setShowRecordingPlayer(sessionState.show_recording_player);
      }
      
      if (sessionState.available_languages && sessionState.available_languages.length > 0) {
         setAvailableLanguages(sessionState.available_languages);
      }
      
      if (sessionState.selected_language && sessionState.selected_language.code) {
         setSelectedLanguageCode(sessionState.selected_language.code);
      }
   }, [sessionState]);

   // Helper to parse session state
   const parseSessionState = stateString => {
      if (!stateString) return null;
      try {
         return typeof stateString === 'string' ? JSON.parse(stateString) : stateString;
      } catch (err) {
         console.error('Error parsing session state:', err);
         return null;
      }
   };

   // Initialize session
   const initializeSession = async id => {
      try {
         setError(null);
         const sessionResponse = await api.podcastAgent.createSession(id);
         
         if (!sessionResponse?.data?.session_id) {
            throw new Error('Failed to activate session');
         }
         
         const historyData = await api.podcastAgent.getSessionHistory(id);
         
         // Process message history
         const uniqueMessages = historyData.data.messages?.filter(
            (msg, idx, self) =>
               msg.content &&
               msg.role &&
               idx === self.findIndex(m => m.role === msg.role && m.content === msg.content)
         ) || [];
         
         // Set initial messages
         setMessages(
            uniqueMessages.length
               ? uniqueMessages
               : [
                    {
                       role: 'assistant',
                       content: "Hi there! I'm your podcast creation assistant. What topic would you like to create a podcast about?",
                    },
                 ]
         );
         
         // Process session state
         if (historyData.data.state) {
            const parsedState = parseSessionState(historyData.data.state);
            if (parsedState) {
               setSessionState(parsedState);
               setCurrentStage(parsedState.stage || 'welcome');
               
               // Check for active processing
               const statusResponse = await api.podcastAgent.checkStatus(id);
               setIsProcessing(statusResponse.data.is_processing);
               
               if (statusResponse.data.is_processing) {
                  console.log('Active processing detected, starting polling');
                  setProcessingType(statusResponse.data.process_type || 'operation');
                  setProcessingProgress(statusResponse.data.progress || 0);
                  setProcessingMessage(statusResponse.data.message || '');
                  startPollingForCompletion();
               }
            }
         }
      } catch (error) {
         console.error('Error initializing session:', error);
         setError('Failed to load session. Please try again.');
         setMessages([
            {
               role: 'assistant',
               content: `Sorry, I couldn't load the session: ${error.message}`,
            },
            {
               role: 'assistant',
               content: "Let's start a new conversation instead.",
            },
         ]);
      }
   };

   // Start a new session
   const startNewSession = async () => {
      try {
         setError(null);
         setLoading(true);
         setMessages([]);
         setSessionState({});
         setCurrentStage('welcome');
         
         if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
         }
         
         setIsProcessing(false);
         setProcessingType(null);
         setProcessingProgress(0);
         setProcessingMessage('');
         setSelectedSourceIndices([]);
         setIsScriptModalOpen(false);
         setIsFinalScriptModalOpen(false);
         setShowCompletionModal(false);
         setIsMobileSidebarOpen(false);
         setShowRecordingPlayer(false);
         
         const response = await api.podcastAgent.createSession(null);
         
         if (response?.data?.session_id) {
            navigate(`/studio/chat/${response.data.session_id}`, { replace: true });
            setMessages([
               {
                  role: 'assistant',
                  content: "Hi there! I'm your podcast creation assistant. What topic would you like to create a podcast about?",
               },
            ]);
         } else {
            throw new Error('Failed to create new session - no session ID returned');
         }
      } catch (error) {
         console.error('Error creating new session:', error);
         setError('Failed to create new session. Please try again.');
      } finally {
         setLoading(false);
      }
   };

   // Improved polling with adaptive intervals
   const startPollingForCompletion = () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      
      let pollInterval = 1000; // Start with 1 second
      const maxPollInterval = 5000; // Max 5 seconds between polls
      const maxPolls = 180; // 15 minutes max at 5s intervals
      let pollCount = 0;
      
      const pollForCompletion = async () => {
         try {
            const statusResponse = await api.podcastAgent.checkStatus(sessionId);
            
            // Update progress information
            if (statusResponse.data.progress) {
               setProcessingProgress(statusResponse.data.progress);
            }
            
            if (statusResponse.data.message) {
               setProcessingMessage(statusResponse.data.message);
            }
            
            // Check if processing is complete
            if (!statusResponse.data.is_processing) {
               // Processing completed
               clearInterval(pollTimerRef.current);
               pollTimerRef.current = null;
               
               setIsProcessing(false);
               setProcessingType(null);
               setProcessingProgress(0);
               setProcessingMessage('');
               
               // Update session state
               if (statusResponse.data.session_state) {
                  updateSessionState(statusResponse.data.session_state);
               }
               
               // Check for completion message
               if (statusResponse.data.response) {
                  setMessages(prev => [
                     ...prev,
                     { role: 'assistant', content: statusResponse.data.response }
                  ]);
               }
               return;
            }
            
            // Adjust poll interval based on progress
            if (statusResponse.data.progress > 70) {
               // Poll more frequently as we near completion
               pollInterval = 1000;
            } else {
               // Gradual backoff
               pollInterval = Math.min(maxPollInterval, pollInterval * 1.2);
            }
            
            // Increment poll count
            pollCount++;
            
            // If we've been polling too long, give up
            if (pollCount > maxPolls) {
               clearInterval(pollTimerRef.current);
               pollTimerRef.current = null;
               
               setIsProcessing(false);
               setProcessingType(null);
               setProcessingProgress(0);
               setProcessingMessage('');
               
               setError("The process is taking longer than expected. Please try again.");
               return;
            }
         } catch (err) {
            console.error("Error during status polling:", err);
            // On error, back off more aggressively
            pollInterval = Math.min(10000, pollInterval * 2);
         }
      };
      
      // Start polling immediately
      pollForCompletion();
      
      // Then set up interval
      pollTimerRef.current = setInterval(pollForCompletion, pollInterval);
   };

   // Send a message
   const handleSendMessage = async () => {
      if (!inputMessage.trim() || !sessionId || isProcessing) return;
      
      setInputMessage('');
      const userMessage = { role: 'user', content: inputMessage };
      setMessages(prev => [...prev, userMessage]);
      hideAllConfirmationUIs();
      
      try {
         setLoading(true);
         setError(null);
         
         // Predict what type of processing this might be
         const predictedType = predictProcessingType(inputMessage, currentStage);
         if (predictedType) {
            setIsProcessing(true);
            setProcessingType(predictedType);
            setProcessingProgress(0);
            setProcessingMessage(`Starting ${predictedType}...`);
         }
         
         // Send message to API
         const response = await api.podcastAgent.chat(sessionId, inputMessage);
         
         // Check for content in the response
         if (response.data.response) {
            setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
         }
         
         // Update session state if provided
         if (response.data.session_state) {
            updateSessionState(response.data.session_state);
         }
         
         // If response indicates processing is still ongoing
         if (response.data.is_processing) {
            // Make sure we're tracking the processing state
            setIsProcessing(true);
            setProcessingType(response.data.process_type || predictedType || 'operation');
            // Start polling for completion
            startPollingForCompletion();
         } else {
            // Processing completed immediately
            setIsProcessing(false);
            setProcessingType(null);
            setProcessingProgress(0);
            setProcessingMessage('');
         }
      } catch (error) {
         console.error('Error sending message:', error);
         
         setMessages(prev => [
            ...prev, 
            { 
               role: 'assistant', 
               content: `I'm sorry, there was an error processing your request: ${error.message}. Please try again.` 
            }
         ]);
         
         setError(`Failed to send message: ${error.message}`);
         setIsProcessing(false);
         setProcessingType(null);
         setProcessingProgress(0);
         setProcessingMessage('');
      } finally {
         setLoading(false);
      }
   };

   // Hide all confirmation UIs
   const hideAllConfirmationUIs = useCallback(() => {
      setSessionState(prevState => ({
         ...prevState,
         show_sources_for_selection: false,
         show_script_for_confirmation: false,
         show_banner_for_confirmation: false,
         show_audio_for_confirmation: false,
         show_recording_player: false,
      }));
   }, []);

   // Update session state
   const updateSessionState = stateString => {
      const parsedState = parseSessionState(stateString);
      if (parsedState) {
         setSessionState(parsedState);
         setCurrentStage(parsedState.stage || currentStage);
         
         if (parsedState.podcast_generated) {
            setShowCompletionModal(true);
         }
         
         if (parsedState.show_recording_player !== undefined) {
            setShowRecordingPlayer(parsedState.show_recording_player);
         }
      }
   };

   // Predict processing type based on message content and current stage
   const predictProcessingType = useCallback((message, stage) => {
      const lowerMessage = message.toLowerCase();
      
      if (stage === 'source_selection' && /\d/.test(message)) {
         return 'script_generation';
      }
      
      if (stage === 'script' && 
         (lowerMessage.includes('approve') || lowerMessage.includes('looks good'))) {
         return 'banner_generation';
      }
      
      if (stage === 'banner' && 
         (lowerMessage.includes('approve') || lowerMessage.includes('looks good'))) {
         return 'audio_generation';
      }
      
      if (lowerMessage.includes('search') && 
         (lowerMessage.includes('web') || lowerMessage.includes('internet'))) {
         return 'web_search';
      }
      
      return 'chat';
   }, []);

   // Source selection handlers
   const handleToggleSourceSelection = useCallback(
      index => {
         if (isProcessing) return;
         setSelectedSourceIndices(prev =>
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
         );
      },
      [isProcessing]
   );

   const handleToggleSelectAllSources = useCallback(() => {
      if (isProcessing || !sessionState.search_results) return;
      
      setSelectedSourceIndices(
         selectedSourceIndices.length === sessionState.search_results.length
            ? []
            : Array.from({ length: sessionState.search_results.length }, (_, i) => i)
      );
   }, [isProcessing, selectedSourceIndices.length, sessionState.search_results]);

   const handleSourceSelectionConfirm = async () => {
      if (isProcessing || selectedSourceIndices.length === 0) {
         setError('Please select at least one source.');
         return;
      }
      
      const selectedLang = availableLanguages.find(lang => lang.code === selectedLanguageCode);
      const langName = selectedLang ? selectedLang.name : 'English';
      
      // Convert to 1-based indices for the message
      const oneBasedIndices = selectedSourceIndices.map(idx => idx + 1);
      const selectionString = `I've selected sources ${oneBasedIndices.join(
         ', '
      )} and I want the podcast in ${langName}.`;
      
      // Add user message to chat
      setMessages(prev => [...prev, { role: 'user', content: selectionString }]);
      
      // Start processing
      setLoading(true);
      setIsProcessing(true);
      setProcessingType('script_generation');
      setProcessingProgress(0);
      setProcessingMessage('Starting script generation...');
      
      try {
         // Send selection to API
         const response = await api.podcastAgent.chat(sessionId, selectionString);
         
         // Handle the response
         if (response.data.response) {
            setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
         }
         
         if (response.data.session_state) {
            updateSessionState(response.data.session_state);
         }
         
         // If still processing, start polling
         if (response.data.is_processing) {
            startPollingForCompletion();
         } else {
            setIsProcessing(false);
            setProcessingType(null);
            setProcessingProgress(0);
            setProcessingMessage('');
         }
      } catch (error) {
         console.error('Error confirming sources:', error);
         
         setMessages(prev => [
            ...prev, 
            { 
               role: 'assistant', 
               content: `I'm sorry, there was an error processing your selection: ${error.message}. Please try again.` 
            }
         ]);
         
         setError(`Failed to confirm sources: ${error.message}`);
         setIsProcessing(false);
         setProcessingType(null);
         setProcessingProgress(0);
         setProcessingMessage('');
      } finally {
         setLoading(false);
      }
   };

   // Language selection
   const handleLanguageSelection = useCallback(languageCode => {
      setSelectedLanguageCode(languageCode);
   }, []);

   // Confirmation handlers
   const handleScriptConfirm = useCallback(() => {
      setSessionState(prevState => ({
         ...prevState,
         show_script_for_confirmation: false,
      }));
      sendDirectMessage('I approve this script. It looks good!');
   }, []);

   const handleBannerConfirm = useCallback(() => {
      setSessionState(prevState => ({
         ...prevState,
         show_banner_for_confirmation: false,
      }));
      sendDirectMessage('I approve this banner. It looks good!');
   }, []);

   const handleAudioConfirm = useCallback(() => {
      setSessionState(prevState => ({
         ...prevState,
         show_audio_for_confirmation: false,
      }));
      sendDirectMessage("The audio sounds great! I'm happy with the final podcast.");
   }, []);

   const handleCloseRecording = useCallback(() => {
      setShowRecordingPlayer(false);
      sendDirectMessage("I've viewed the web search recording. Let's continue with the podcast.");
   }, []);

   const handleViewRecording = useCallback(() => {
      if (sessionState.web_search_recording) {
         setShowRecordingPlayer(true);
      }
   }, [sessionState.web_search_recording]);

   // Send a message directly (without typing in the input)
   const sendDirectMessage = async message => {
      if (!message.trim() || !sessionId || isProcessing) return;
      
      setMessages(prev => [...prev, { role: 'user', content: message }]);
      hideAllConfirmationUIs();
      
      try {
         setLoading(true);
         setError(null);
         
         // Predict what type of processing this might be
         const predictedType = predictProcessingType(message, currentStage);
         if (predictedType) {
            setIsProcessing(true);
            setProcessingType(predictedType);
            setProcessingProgress(0);
            setProcessingMessage(`Starting ${predictedType}...`);
         }
         
         // Send message to API
         const response = await api.podcastAgent.chat(sessionId, message);
         
         // Check for content in the response
         if (response.data.response) {
            setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
         }
         
         // Update session state if provided
         if (response.data.session_state) {
            updateSessionState(response.data.session_state);
         }
         
         // If response indicates processing is still ongoing
         if (response.data.is_processing) {
            // Make sure we're tracking the processing state
            setIsProcessing(true);
            setProcessingType(response.data.process_type || predictedType || 'operation');
            // Start polling for completion
            startPollingForCompletion();
         } else {
            // Processing completed immediately
            setIsProcessing(false);
            setProcessingType(null);
            setProcessingProgress(0);
            setProcessingMessage('');
         }
      } catch (error) {
         console.error('Error sending message:', error);
         
         setMessages(prev => [
            ...prev, 
            { 
               role: 'assistant', 
               content: `I'm sorry, there was an error processing your request: ${error.message}. Please try again.` 
            }
         ]);
         
         setError(`Failed to send message: ${error.message}`);
         setIsProcessing(false);
         setProcessingType(null);
         setProcessingProgress(0);
         setProcessingMessage('');
      } finally {
         setLoading(false);
      }
   };

   // Prepare podcast data
   const podcastInfo = useMemo(() => {
      let title = 'AI Podcast Studio';
      let scriptText = '';
      let bannerUrl = '';
      let audioUrl = '';
      
      if (sessionState.generated_script?.title) {
         title = sessionState.generated_script.title;
      } else if (sessionState.podcast_info?.topic) {
         title = sessionState.podcast_info.topic;
      }
      
      if (sessionState.generated_script) {
         if (typeof sessionState.generated_script === 'object') {
            try {
               const scriptLines = [];
               if (sessionState.generated_script.title) {
                  scriptLines.push(sessionState.generated_script.title);
               }
               
               sessionState.generated_script.sections?.forEach(section => {
                  scriptLines.push(` ${section.title || section.type}\n`);
                  section.dialog?.forEach(line =>
                     scriptLines.push(`[${line.speaker}]: ${line.text}\n`)
                  );
                  scriptLines.push('\n');
               });
               
               scriptText = scriptLines.join('');
            } catch (error) {
               console.error('Error formatting script:', error);
               scriptText = JSON.stringify(sessionState.generated_script, null, 2);
            }
         } else {
            scriptText = sessionState.generated_script;
         }
      }
      
      if (sessionState.banner_url) bannerUrl = sessionState.banner_url;
      if (sessionState.audio_url) audioUrl = sessionState.audio_url;
      
      return { title, scriptText, bannerUrl, audioUrl };
   }, [sessionState]);

   // Full URLs for assets
   const bannerUrlFull = useMemo(() => {
      return podcastInfo.bannerUrl
         ? `${api.API_BASE_URL}/podcast_img/${podcastInfo.bannerUrl}`
         : '';
   }, [podcastInfo.bannerUrl]);

   const audioUrlFull = useMemo(() => {
      return podcastInfo.audioUrl ? `${api.API_BASE_URL}/audio/${podcastInfo.audioUrl}` : '';
   }, [podcastInfo.audioUrl]);

   // Preview panel handlers
   const handleClosePreview = useCallback(() => {
      setIsPreviewVisible(false);
   }, []);

   const handleTogglePreview = useCallback(() => {
      setIsPreviewVisible(prev => !prev);
   }, []);

   // Determine if we should show the final presentation
   const showFinalPresentation = sessionState.podcast_generated === true;

   // Sidebar class based on mobile visibility
   const sidebarClass = isMobileSidebarOpen
      ? 'translate-x-0 shadow-lg'
      : '-translate-x-full md:translate-x-0';
      
   // Content class based on preview visibility
   const contentClass = isPreviewVisible ? 'lg:mr-72' : 'lg:mr-0';

   // Status display for header
   const renderStatusDisplay = () => {
      if (isProcessing) {
         return (
            <div className="flex items-center space-x-1">
               <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
               <span className="max-w-xs truncate text-xs">
                  {processingMessage || `Processing ${processingType || ''}...`}
               </span>
               {processingProgress > 0 && (
                  <span className="text-xs bg-gray-700/80 px-1.5 rounded-full">
                     {processingProgress}%
                  </span>
               )}
            </div>
         );
      }
      
      return (
         <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-gray-500"></span>
            <span>{`Stage: ${currentStage}`}</span>
         </div>
      );
   };

   return (
      <div className="min-h-screen flex bg-[#0A0E14]">
         {/* Mobile sidebar backdrop */}
         {isMobileSidebarOpen && (
            <div
               className="fixed inset-0 bg-black/70 z-20 md:hidden"
               onClick={() => setIsMobileSidebarOpen(false)}
               aria-hidden="true"
            />
         )}
         
         {/* Sidebar */}
         <div
            className={`fixed md:sticky top-0 left-0 h-full md:h-screen w-72 bg-gradient-to-b from-gray-800 to-gray-900 border-r border-gray-700 z-30 transform transition-transform duration-300 ease-in-out ${sidebarClass}`}
         >
            <Sidebar
               onNewSession={startNewSession}
               onSessionSelect={() => setIsMobileSidebarOpen(false)}
            />
         </div>
         
         {/* Main content */}
         <div
            className={`flex-1 min-h-screen flex flex-col ml-0 md:ml-72 relative ${contentClass} transition-all duration-300`}
            style={{ marginLeft: 0 }}
         >
            {/* Header */}
            <header className="sticky top-0 z-10 bg-[#0A0E14] border-b border-gray-700 shadow-md">
               <div className="h-16 px-4 flex items-center justify-between">
                  <div className="flex items-center">
                     {/* Mobile menu button */}
                     <button
                        className="md:hidden mr-3 p-2 text-gray-400 hover:text-white rounded-md hover:bg-gray-700 transition-colors"
                        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                        aria-label={isMobileSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                     >
                        {isMobileSidebarOpen ? (
                           <svg
                              className="h-6 w-6"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                           >
                              <path
                                 strokeLinecap="round"
                                 strokeLinejoin="round"
                                 strokeWidth={2}
                                 d="M6 18L18 6M6 6l12 12"
                              />
                           </svg>
                        ) : (
                           <svg
                              className="h-6 w-6"
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
                        )}
                     </button>
                     
                     {/* Podcast title */}
                     <div className="flex items-center">
                        <div className="w-10 h-10 relative mr-3 flex-shrink-0">
                           <div className="absolute inset-0 flex items-center justify-center z-10">
                              <svg
                                 viewBox="0 0 24 24"
                                 className="w-7 h-7 text-emerald-500"
                                 fill="none"
                                 stroke="currentColor"
                                 strokeWidth="1.5"
                                 strokeLinecap="round"
                                 strokeLinejoin="round"
                              >
                                 <rect x="4" y="4" width="16" height="16" rx="2" />
                                 <line x1="8" y1="4" x2="8" y2="20" />
                                 <line x1="12" y1="4" x2="12" y2="20" />
                                 <line x1="16" y1="4" x2="16" y2="20" />
                                 <circle cx="8" cy="9" r="1" fill="currentColor" />
                                 <circle cx="12" cy="13" r="1" fill="currentColor" />
                                 <circle cx="16" cy="11" r="1" fill="currentColor" />
                              </svg>
                           </div>
                           <div className="absolute inset-0 rounded-full border border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900"></div>
                        </div>
                        <h1 className="text-lg font-semibold text-white truncate max-w-[180px] sm:max-w-xs">
                           {podcastInfo.title}
                        </h1>
                     </div>
                  </div>
                  
                  {/* Status and preview toggle */}
                  <div className="flex items-center space-x-2">
                     <div className="hidden sm:flex items-center px-3 py-1 bg-[#121824] rounded-full border border-gray-700 text-xs text-gray-300">
                        {renderStatusDisplay()}
                     </div>
                     <PodcastAssetsToggle
                        isVisible={isPreviewVisible}
                        onClick={handleTogglePreview}
                     />
                  </div>
               </div>
               
               {/* Mobile status display */}
               <div className="sm:hidden px-4 py-1.5 border-t border-gray-700 flex items-center justify-center bg-[#121824]/50">
                  <div className="text-xs text-gray-400 flex items-center">
                     {renderStatusDisplay()}
                  </div>
               </div>
            </header>
            
            {/* Main content area */}
            <main className="flex-1 flex flex-col max-h-[calc(100vh-4rem)] overflow-hidden">
               {showFinalPresentation ? (
                  /* Final presentation view */
                  <div className="flex-1 overflow-y-auto p-4 md:p-6">
                     <FinalPresentation
                        podcastTitle={podcastInfo.title}
                        bannerUrl={bannerUrlFull}
                        audioUrl={audioUrlFull}
                        recordingUrl={
                           sessionState.web_search_recording && sessionId
                              ? `${
                                   api.API_BASE_URL
                                }/stream-recording/${sessionId}/${sessionState.web_search_recording
                                   .split('/')
                                   .pop()}`
                              : ''
                        }
                        sessionId={sessionId}
                        scriptContent={podcastInfo.scriptText}
                        onNewPodcast={startNewSession}
                        isScriptModalOpen={isFinalScriptModalOpen}
                        onToggleScriptModal={() => setIsFinalScriptModalOpen(prev => !prev)}
                        podcastId={sessionState.podcast_id || null}
                     />
                  </div>
               ) : (
                  /* Chat interface */
                  <>
                     {/* Chat messages */}
                     <div
                        ref={chatContainerRef}
                        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4"
                     >
                        {/* Processing indicator */}
                        {isProcessing && (
                           <ProgressIndicator 
                              progress={processingProgress} 
                              message={processingMessage} 
                              type={processingType} 
                           />
                        )}
                        
                        {/* Messages and UI components */}
                        <div className="space-y-4">
                           {messages.map((msg, index) => (
                              <ChatMessage 
                                 key={index} 
                                 message={msg.content} 
                                 role={msg.role} 
                              />
                           ))}
                           
                           {loading && <LoadingIndicator />}
                           
                           {/* Source selection UI */}
                           {sessionState.show_sources_for_selection &&
                              sessionState.search_results && (
                                 <SourceSelection
                                    sources={sessionState.search_results}
                                    selectedIndices={selectedSourceIndices}
                                    onToggleSelection={handleToggleSourceSelection}
                                    onToggleSelectAll={handleToggleSelectAllSources}
                                    onConfirm={handleSourceSelectionConfirm}
                                    isProcessing={isProcessing}
                                    languages={availableLanguages}
                                    selectedLanguage={selectedLanguageCode}
                                    onSelectLanguage={handleLanguageSelection}
                                 />
                              )}
                           
                           {/* Script confirmation UI */}
                           {sessionState.show_script_for_confirmation &&
                              sessionState.generated_script && (
                                 <ScriptConfirmation
                                    scriptText={podcastInfo.scriptText}
                                    onApprove={() => handleScriptConfirm(true)}
                                    onRequestChanges={() => handleScriptConfirm(false)}
                                    isProcessing={isProcessing}
                                    isModalOpen={isScriptModalOpen}
                                    onToggleModal={() => setIsScriptModalOpen(prev => !prev)}
                                 />
                              )}
                           
                           {/* Banner confirmation UI */}
                           {sessionState.show_banner_for_confirmation &&
                              sessionState.banner_url && (
                                 <BannerConfirmation
                                    bannerUrl={bannerUrlFull}
                                    topic={podcastInfo.title}
                                    onApprove={() => handleBannerConfirm(true)}
                                    onRequestChanges={() => handleBannerConfirm(false)}
                                    isProcessing={isProcessing}
                                 />
                              )}
                           
                           {/* Audio confirmation UI */}
                           {sessionState.show_audio_for_confirmation && 
                              sessionState.audio_url && (
                                 <AudioConfirmation
                                    audioUrl={audioUrlFull}
                                    topic={podcastInfo.title}
                                    onApprove={() => handleAudioConfirm(true)}
                                    onRequestChanges={() => handleAudioConfirm(false)}
                                    isProcessing={isProcessing}
                                 />
                              )}
                           
                           {/* Error message */}
                           {error && (
                              <div className="p-3 bg-red-900/30 border border-red-800/50 rounded-md text-red-400 text-sm">
                                 <div className="flex items-center">
                                    <svg
                                       className="w-5 h-5 mr-2 flex-shrink-0"
                                       viewBox="0 0 20 20"
                                       fill="currentColor"
                                    >
                                       <path
                                          fillRule="evenodd"
                                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                          clipRule="evenodd"
                                       />
                                    </svg>
                                    <span>{error}</span>
                                 </div>
                              </div>
                           )}
                           
                           {/* Scroll anchor */}
                           <div ref={messagesEndRef} />
                        </div>
                     </div>
                     
                     {/* Input area */}
                     <div className="sticky bottom-0 border-t border-gray-700 bg-[#0A0E14] shadow-lg">
                        <div className="px-4 py-4">
                           <div className="max-w-4xl mx-auto">
                              {/* Message input */}
                              <div className="relative flex items-center">
                                 <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputMessage}
                                    onChange={e => !isProcessing && setInputMessage(e.target.value)}
                                    onKeyPress={e => {
                                       if (
                                          e.key === 'Enter' &&
                                          !isProcessing &&
                                          inputMessage.trim()
                                       ) {
                                          handleSendMessage();
                                          e.preventDefault();
                                       }
                                    }}
                                    placeholder={
                                       isProcessing || loading
                                          ? `Processing ${processingType || 'request'}...`
                                          : 'Type your message...'
                                    }
                                    disabled={isProcessing || loading}
                                    readOnly={isProcessing || loading}
                                    className={`w-full bg-[#121824] text-white border ${
                                       loading ? 'border-gray-600' : 'border-gray-700'
                                    } rounded-md py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 placeholder-gray-500 ${
                                       loading ? 'opacity-60 cursor-not-allowed bg-gray-800/50' : ''
                                    } shadow-sm`}
                                 />
                                 
                                 {/* Send button */}
                                 <button
                                    onClick={handleSendMessage}
                                    disabled={!inputMessage.trim() || isProcessing || loading}
                                    aria-disabled={!inputMessage.trim() || isProcessing || loading}
                                    className={`absolute right-2 h-9 w-9 flex items-center justify-center bg-gradient-to-r ${
                                       !inputMessage.trim() || isProcessing || loading
                                          ? 'from-gray-700 to-gray-800 opacity-50 cursor-not-allowed'
                                          : 'from-emerald-700 to-emerald-800 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-md'
                                    } text-white rounded-md transition-all`}
                                    aria-label="Send message"
                                 >
                                    {loading ? (
                                       <svg
                                          className="animate-spin h-5 w-5 text-white"
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
                                          />
                                          <path
                                             className="opacity-75"
                                             fill="currentColor"
                                             d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                          />
                                       </svg>
                                    ) : (
                                       <svg
                                          className="h-5 w-5"
                                          viewBox="0 0 20 20"
                                          fill="currentColor"
                                       >
                                          <path
                                             fillRule="evenodd"
                                             d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                                             clipRule="evenodd"
                                          />
                                       </svg>
                                    )}
                                 </button>
                              </div>
                              
                              {/* Footer text and new podcast button */}
                              <div className="mt-1.5 px-1 flex justify-between items-center">
                                 <span className="text-xs text-gray-500">
                                    {isProcessing
                                       ? 'Processing... Please wait'
                                       : 'Ask about your podcast or give instructions'}
                                 </span>
                                 <button
                                    onClick={startNewSession}
                                    disabled={isProcessing}
                                    className={`text-xs ${
                                       isProcessing
                                          ? 'text-gray-500 cursor-not-allowed'
                                          : 'text-emerald-400 hover:text-emerald-300 hover:bg-gray-800'
                                    } transition-colors px-2 py-1 rounded`}
                                 >
                                    New Podcast
                                 </button>
                              </div>
                           </div>
                        </div>
                     </div>
                  </>
               )}
            </main>
         </div>
         
         {/* Preview panel */}
         {isPreviewVisible && (
            <div className="fixed right-0 top-0 bottom-0 w-full sm:w-80 md:w-72 bg-[#0A0E14] border-l border-gray-700 overflow-hidden z-40 shadow-xl transform transition-transform duration-300 ease-in-out">
               <div className="flex items-center justify-between p-4 border-b border-gray-700">
                  <div className="flex items-center">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></div>
                     <h3 className="text-sm font-semibold text-white">Active Assets</h3>
                  </div>
                  <button
                     onClick={handleClosePreview}
                     className="text-gray-400 hover:text-white transition-colors duration-200 p-1 rounded-full hover:bg-gray-700"
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
               <ActivePodcastPreview
                  podcastTitle={podcastInfo.title}
                  bannerUrl={bannerUrlFull}
                  audioUrl={audioUrlFull}
                  sessionId={sessionId || ''}
                  webSearchRecording={sessionState.web_search_recording || null}
                  scriptContent={podcastInfo.scriptText}
                  onClose={handleClosePreview}
               />
            </div>
         )}
         
         {/* Completion modal */}
         {showCompletionModal && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
               <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-md max-w-md w-full p-6 text-center shadow-2xl">
                  <div className="relative w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                     <svg
                        className="h-8 w-8 text-emerald-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                     >
                        <path
                           fillRule="evenodd"
                           d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                           clipRule="evenodd"
                        />
                     </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Podcast Creation Complete!</h2>
                  <p className="text-gray-400 mb-6">
                     Your podcast is ready! You can now view and download all components.
                  </p>
                  <button
                     onClick={() => setShowCompletionModal(false)}
                     className="w-full py-3 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium rounded-md transition-all flex items-center justify-center shadow-lg hover:shadow-emerald-900/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                  >
                     <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path
                           fillRule="evenodd"
                           d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                           clipRule="evenodd"
                        />
                     </svg>
                     View My Podcast
                  </button>
               </div>
            </div>
         )}
      </div>
   );
};

export default PodcastSession;