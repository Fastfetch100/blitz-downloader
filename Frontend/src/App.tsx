import { useState, useRef } from 'react';
import InputBar from './components/InputBar';
import { VideoPreview } from './components/VideoPreview';
import { FormatTabs } from './components/FormatTabs';
import { QualitySelector } from './components/QualitySelector';
import { Download, Pause, Play, Check } from 'lucide-react';
import './index.css';

function App() {
  // --- Video Info ---
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [videoThumbnail, setVideoThumbnail] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // --- Format & Quality ---
  const [selectedFormat, setSelectedFormat] = useState<'MP3' | 'MP4'>('MP3');
  const [selectedQuality, setSelectedQuality] = useState<string>('320kbps');

  // --- Download State ---
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [speed, setSpeed] = useState<string>('0 MB/s');
  const [downloaded, setDownloaded] = useState<string>('0 MB');
  const [total, setTotal] = useState<string>('Unknown');
  const [eta, setEta] = useState<string>('--:--');

  const abortControllerRef = useRef<AbortController | null>(null);

  // --- Helper: Extract Video ID ---
  const extractVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  // --- FULL RESET to Screen 1 ---
  const fullReset = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setVideoUrl('');
    setVideoTitle('');
    setVideoThumbnail('');
    setIsDownloading(false);
    setIsPaused(false);
    setProgress(0);
    setSpeed('0 MB/s');
    setDownloaded('0 MB');
    setTotal('Unknown');
    setEta('--:--');
    setIsLoading(false);
  };

  // --- CANCEL (Stops download, stays on Screen 2) ---
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsDownloading(false);
    setIsPaused(false);
    setProgress(0);
    setSpeed('0 MB/s');
    setDownloaded('0 MB');
    setTotal('Unknown');
    setEta('--:--');
  };

  // --- Handle URL Entry ---
  const handleEnter = async (url: string) => {
    handleCancel();
    
    setVideoUrl(url);
    setIsLoading(true);
    setVideoTitle('');
    setVideoThumbnail('');

    try {
      const response = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
      );
      if (!response.ok) throw new Error('Failed to fetch video info');
      const data = await response.json();
      setVideoTitle(data.title);
      setVideoThumbnail(data.thumbnail_url);
    } catch (error) {
      console.error('Error fetching video:', error);
      const videoId = extractVideoId(url);
      if (videoId) {
        setVideoTitle('YouTube Video');
        setVideoThumbnail(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
      } else {
        setVideoTitle('Invalid YouTube URL');
        setVideoThumbnail('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- START Download ---
  const startDownload = async () => {
    if (!videoUrl || isDownloading) return;

    setIsDownloading(true);
    setIsPaused(false);
    setProgress(0);
    setSpeed('Connecting...');
    setDownloaded('0 MB');
    setEta('Preparing...');

    abortControllerRef.current = new AbortController();

    try {
      // Use the current hostname (works on phone and desktop)
      const backendHost = window.location.hostname;
      const backendUrl = `http://${backendHost}:8000/download?url=${encodeURIComponent(videoUrl)}&format=${selectedFormat}&quality=${encodeURIComponent(selectedQuality)}`;

      const response = await fetch(backendUrl, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Download failed');
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? Number.parseInt(contentLength, 10) : 0;
      if (totalBytes > 0) {
        const totalSizeMB = totalBytes / (1024 * 1024);
        setTotal(`${totalSizeMB.toFixed(2)} MB`);
      } else {
        setTotal('Unknown');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let receivedLength = 0;
      const chunks = [];
      let startTime = Date.now();
      let lastUpdateTime = startTime;
      let lastReceived = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        if (totalBytes > 0) {
          const currentProgress = (receivedLength / totalBytes) * 100;
          setProgress(Math.min(currentProgress, 100));
        }

        const now = Date.now();
        const timeDelta = (now - lastUpdateTime) / 1000;
        if (timeDelta >= 0.5) {
          const bytesDelta = receivedLength - lastReceived;
          const currentSpeed = bytesDelta / timeDelta / (1024 * 1024);
          setSpeed(currentSpeed > 0.5 ? `${currentSpeed.toFixed(2)} MB/s` : `${(currentSpeed * 1024).toFixed(0)} KB/s`);
          lastUpdateTime = now;
          lastReceived = receivedLength;
        }

        const downloadedMB = receivedLength / (1024 * 1024);
        setDownloaded(downloadedMB > 1 ? `${downloadedMB.toFixed(2)} MB` : `${(downloadedMB * 1024).toFixed(0)} KB`);

        if (totalBytes > 0 && receivedLength > 0) {
          const elapsedSeconds = (now - startTime) / 1000;
          const remainingBytes = totalBytes - receivedLength;
          const speedBps = receivedLength / elapsedSeconds;
          if (speedBps > 0) {
            const etaSeconds = remainingBytes / speedBps;
            if (etaSeconds > 0 && etaSeconds < 3600) {
              const mins = Math.floor(etaSeconds / 60);
              const secs = Math.floor(etaSeconds % 60);
              setEta(mins > 0 ? `${mins} min ${secs} sec` : `${secs} sec`);
            } else {
              setEta('Streaming...');
            }
          }
        } else {
          setEta('Streaming...');
        }
      }

      const blob = new Blob(chunks);
      const urlObject = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlObject;

      const contentDisposition = response.headers.get('content-disposition');
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      let filename = 'download.mp4';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }
      
      // Create blob with correct media type to prevent corruption
      const properBlob = new Blob(chunks, { type: contentType });
      const properUrl = URL.createObjectURL(properBlob);
      a.href = properUrl;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(properUrl);
      URL.revokeObjectURL(urlObject);

      setProgress(100);
      setSpeed('Done!');
      setEta('✅ Complete');
      setIsDownloading(false);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Download aborted');
      } else {
        console.error('Download error:', error);
        alert(`Download failed: ${error.message}\n\nMake sure the backend is running on port 8000.`);
        handleCancel();
      }
    }
  };

  // --- PAUSE / RESUME ---
  const handlePauseResume = () => {
    if (isPaused) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setIsPaused(false);
      startDownload();
    } else {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setIsPaused(true);
      setSpeed('Paused');
      setEta('⏸️ Paused');
      setIsDownloading(false);
    }
  };

  // --- Format & Quality ---
  const handleFormatChange = (format: 'MP3' | 'MP4') => {
    setSelectedFormat(format);
    if (format === 'MP3') setSelectedQuality('320kbps');
    else setSelectedQuality('1080P');
  };

  const handleQualityChange = (quality: string) => {
    setSelectedQuality(quality);
  };

  const isComplete = progress === 100 && !isDownloading;

  return (
    <main className="app-shell">
      <div className="app-panel">
        {/* Header */}
        <h1 className="brand-mark">
          BLITZ<span>.NET</span>
        </h1>

        {/* Input Bar - Always visible */}
        <InputBar onEnter={handleEnter} />

        {/* --- Screen 2, 3, 4: Video Loaded --- */}
        {videoUrl && (
          <>
            {isLoading ? (
              <div className="loading-state">Loading video info...</div>
            ) : (
              videoTitle && videoTitle !== 'Invalid YouTube URL' && (
                <>
                  {/* VIDEO PREVIEW Heading */}
                  <h2 className="section-heading">
                    VIDEO PREVIEW
                  </h2>

                  <div className="workspace-grid">
                    <div className="preview-column">
                      <VideoPreview
                        title={videoTitle}
                        thumbnail={videoThumbnail}
                        onRemove={fullReset}
                      />
                    </div>

                    <div className="controls-column">
                      <FormatTabs
                        format={selectedFormat}
                        onFormatChange={handleFormatChange}
                      />
                      <QualitySelector
                        format={selectedFormat}
                        selectedQuality={selectedQuality}
                        onQualityChange={handleQualityChange}
                      />
                    </div>
                  </div>

                  {/* --- Progress Card (Screen 3 & 4) --- */}
                  {(isDownloading || progress > 0 || isComplete) && (
                    <div className="progress-card animate-fadeIn">
                      {/* Progress Bar */}
                      <div className="progress-track">
                        <div 
                          className={`progress-fill ${
                            isDownloading && !isPaused && progress < 100 ? 'animate-shimmer' : ''
                          }`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        >
                          {progress > 5 && `${Math.round(progress)}%`}
                        </div>
                        {progress <= 5 && (
                          <span className="progress-label">
                            {Math.round(progress)}%
                          </span>
                        )}
                      </div>

                      {/* Stats Row */}
                      <div className="stats-row">
                        <span>
                          <span className="stat-label">Speed:</span>{' '}
                          <span className="stat-value speed-value">{speed}</span>
                        </span>
                        <span>
                          <span className="stat-label">ETA:</span>{' '}
                          <span className="stat-value eta-value">{eta}</span>
                        </span>
                        <span>
                          <span className="stat-label">Size:</span>{' '}
                          <span className="stat-value">{downloaded} / {total}</span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* --- Action Buttons (Matches Canva Design) --- */}
                  <div className="action-row">
                    {/* If Complete (Screen 4) -> Show DONE (full width, no CANCEL) */}
                    {isComplete ? (
                      <button
                        onClick={fullReset}
                        className="action-button done-button"
                      >
                        <Check size={20} />
                        DONE
                      </button>
                    ) : (
                      /* If Downloading (Screen 3) -> PAUSE/RESUME (side-by-side, no CANCEL) */
                      isDownloading ? (
                        <>
                          <button
                            onClick={handlePauseResume}
                            className={`action-button pause-button ${
                              isPaused
                                ? 'resume-button'
                                : 'pause-button'
                            }`}
                          >
                            {isPaused ? <Play size={20} /> : <Pause size={20} />}
                            {isPaused ? 'RESUME' : 'PAUSE'}
                          </button>
                        </>
                      ) : (
                        /* If Ready (Screen 2) -> START (full width) */
                        <button
                          onClick={startDownload}
                          className="action-button start-button"
                        >
                          <Download size={20} />
                          START
                        </button>
                      )
                    )}
                  </div>

                  {/* Footer Info */}
                  <p className="format-summary">
                    Format: <strong>{selectedFormat}</strong> <span>|</span> Quality: <strong>{selectedQuality}</strong>
                  </p>
                </>
              )
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default App;