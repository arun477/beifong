import React, { useState } from 'react';

// Custom SVG icons as components
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const IconLoader = () => (
  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="6"></line>
    <line x1="12" y1="18" x2="12" y2="22"></line>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
    <line x1="2" y1="12" x2="6" y2="12"></line>
    <line x1="18" y1="12" x2="22" y2="12"></line>
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
  </svg>
);

const IconMaximize = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
  </svg>
);

const IconInfo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

const BannerConfirmation = ({ bannerUrl, topic, onApprove, onReject, isProcessing }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className="fade-in mb-4 max-w-md mx-auto">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden shadow-xl border border-gray-700 transition-all">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-sm font-medium text-white">Podcast Banner Preview</h3>
        </div>

        {/* Banner Image */}
        <div className="p-4 flex items-center justify-center relative">
          {isProcessing && (
            <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center z-10 rounded-md">
              <div className="text-white">
                <IconLoader />
              </div>
            </div>
          )}
          
          {imageError ? (
            <div className="h-40 w-full flex items-center justify-center bg-gray-800 rounded text-gray-400">
              <span className="mr-2"><IconInfo /></span>
              <span>Failed to load image</span>
            </div>
          ) : (
            <div className="relative group">
              <img
                src={bannerUrl}
                alt={`Podcast banner for ${topic}`}
                className="max-h-40 rounded shadow-md transition-transform"
                onError={handleImageError}
              />
              <button
                onClick={() => setIsPreviewOpen(true)}
                className="absolute inset-0 w-full h-full bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="View full size banner"
              >
                <div className="text-white">
                  <IconMaximize />
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Banner Info */}
        <div className="px-4 pb-4 text-center">
          <div className="text-sm text-gray-300 font-medium mb-1">{topic}</div>
          <div className="text-xs text-gray-400">Click the image to view in full size</div>
        </div>

        {/* Actions */}
        <div className="px-4 py-3 bg-gradient-to-r from-gray-800 to-gray-900 flex justify-between">
          <button
            onClick={onReject}
            disabled={isProcessing}
            className="text-sm px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded transition flex items-center"
            aria-disabled={isProcessing}
          >
            <span className="mr-1.5"><IconX /></span>
            Reject
          </button>
          
          <button
            onClick={onApprove}
            disabled={isProcessing}
            className={`text-sm px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded transition flex items-center ${
              isProcessing ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            aria-disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="mr-1.5">
                  <IconLoader />
                </span>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span className="mr-1.5">
                  <IconCheck />
                </span>
                <span>Approve Banner</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Full Size Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl max-h-screen overflow-auto relative">
            <button
              onClick={() => setIsPreviewOpen(false)}
              className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors"
              aria-label="Close full preview"
            >
              <IconX />
            </button>
            <img
              src={bannerUrl}
              alt={`Full size podcast banner for ${topic}`}
              className="max-w-full h-auto shadow-2xl rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Set default props
BannerConfirmation.defaultProps = {
  onReject: () => {},
  isProcessing: false
};

export default BannerConfirmation;