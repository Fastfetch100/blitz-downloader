import { useState, useRef } from 'react';
import InputBar from './components/InputBar';
import { VideoPreview } from './components/VideoPreview';
import { QualitySelector } from './components/QualitySelector';
import { ProgressBar } from './components/ProgressBar';
import { Download, Pause, Play, X } from 'lucide-react';
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

  // Ref for abort controller to actually cancel the fetch
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- Helper: Extract Video ID ---
  const extractVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  // --- Handle URL Entry ---
  const handleEnter = async (url: string) => {
    // Cancel any ongoing download
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setProgress(0);
    setIsDownloading(false);
    setIsPaused(false);
    setSpeed('0 MB/s');
    setDownloaded('0 MB');
    setEta('--:--');

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

  // --- REAL Download (Connects to Python Backend) ---
  const startDownload = async () => {
    if (!videoUrl || isDownloading) return;

    // Reset states
    setIsDownloading(true);
    setIsPaused(false);
    setProgress(0);
    setSpeed('Connecting...');
    setDownloaded('0 MB');
    setEta('Preparing...');

    // Create a new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      // 1. Build the backend URL
const backendUrl = `http://localhost:8000/download?url=${encodeURIComponent(videoUrl)}&format=${selectedFormat}&quality=${encodeURIComponent(selectedQuality)}`;
console.log('Calling backend:', backendUrl);

      // 2. Fetch the file with the abort signal
      const response = await fetch(backendUrl, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Download failed');
      }

      // 3. Get the total file size from headers (if available)
      const contentLength = response.headers.get('content-length');
      const totalSizeMB = contentLength ? parseInt(contentLength) / (1024 * 1024) : 0;
      if (totalSizeMB > 0) {
        setTotal(`${totalSizeMB.toFixed(2)} MB`);
      } else {
        setTotal('Unknown');
      }

      // 4. Read the stream
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

        // Check if paused (we handle pause by just not reading? 
        // Actually, pause is tricky with fetch streams. For now, 
        // we just read everything. To implement true pause, we'd need to 
        // stop reading and resume later, but that's complex. 
        // We'll keep the PAUSE button as UI feedback but it won't stop the download 
        // unless we abort and resume. For a better UX, we'll let the user abort and restart.
        // We'll just keep it simple: PAUSE aborts and we let them resume by clicking START again.
        // But for proper pause/resume, we would use Range headers. 
        // Let's just keep the UI for now as a visual toggle.

        chunks.push(value);
        receivedLength += value.length;

        // Update progress
        if (totalSizeMB > 0) {
          const currentProgress = (receivedLength / (totalSizeMB * 1024 * 1024)) * 100;
          setProgress(Math.min(currentProgress, 100));
        } else {
          // If no content-length, just show indeterminate progress
          setProgress(50);
        }

        // Calculate speed
        const now = Date.now();
        const timeDelta = (now - lastUpdateTime) / 1000;
        if (timeDelta >= 0.5) {
          const bytesDelta = receivedLength - lastReceived;
          const currentSpeed = bytesDelta / timeDelta / (1024 * 1024); // MB/s
          setSpeed(currentSpeed > 0.5 ? `${currentSpeed.toFixed(1)} MB/s` : `${(currentSpeed * 1024).toFixed(0)} KB/s`);
          lastUpdateTime = now;
          lastReceived = receivedLength;
        }

        // Update downloaded size
        const downloadedMB = receivedLength / (1024 * 1024);
        setDownloaded(downloadedMB > 1 ? `${downloadedMB.toFixed(2)} MB` : `${(downloadedMB * 1024).toFixed(0)} KB`);

        // Calculate ETA
        if (totalSizeMB > 0 && receivedLength > 0) {
          const elapsedSeconds = (now - startTime) / 1000;
          const remainingBytes = (totalSizeMB * 1024 * 1024) - receivedLength;
          const speedBps = receivedLength / elapsedSeconds;
          if (speedBps > 0) {
            const etaSeconds = remainingBytes / speedBps;
            if (etaSeconds > 0 && etaSeconds < 3600) {
              const mins = Math.floor(etaSeconds / 60);
              const secs = Math.floor(etaSeconds % 60);
              setEta(mins > 0 ? `${mins} min ${secs} sec` : `${secs} sec`);
            } else {
              setEta('Calculating...');
            }
          }
        } else {
          setEta('Streaming...');
        }
      }

      // 5. Create a download link for the file
      const blob = new Blob(chunks);
      const urlObject = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlObject;

      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'download.mp4';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(urlObject);

      setProgress(100);
      setSpeed('Done!');
      setEta('✅ Complete');
      setIsDownloading(false);
      setDownloaded(totalSizeMB > 0 ? `${totalSizeMB.toFixed(2)} MB` : 'Done');

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Download aborted by user');
        setSpeed('Cancelled');
        setEta('⏸️ Paused');
        // Don't reset downloading flag so user can resume? 
        // We'll treat abort as cancel.
        setIsDownloading(false);
        setProgress(0);
      } else {
        console.error('Download error:', error);
        alert(`Download failed: ${error.message}\n\nMake sure the backend is running on port 8000.`);
        setIsDownloading(false);
        setProgress(0);
        setSpeed('Error');
        setEta('❌ Failed');
      }
    }
  };

  // --- Cancel Download ---
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
    setEta('--:--');
    setTotal('Unknown');
  };

  // --- Pause/Resume (UI toggle only - actual pause requires Range requests, we just abort for simplicity) ---
  const handlePauseResume = () => {
    if (isPaused) {
      // Resume: Actually, we can't resume a fetch stream easily.
      // For now, let's just restart the download from scratch.
      // We'll abort current and call startDownload again.
      // But for better UX, we'll tell the user.
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setIsPaused(false);
      // We need to restart the download
      startDownload();
    } else {
      // Pause: abort the current request
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

  // --- Remove Link ---
  const handleRemove = () => {
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
    setEta('--:--');
    setTotal('Unknown');
  };

  // --- Format & Quality handlers ---
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
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-between p-4">
      <div className="w-full flex flex-col items-center gap-6 max-w-4xl mt-8">
        <h1 className="text-white text-5xl font-bold tracking-tight">
          BLITZ<span className="text-blue-500">.NET</span>
        </h1>

        <InputBar onEnter={handleEnter} />

        {videoUrl && (
          <>
            {isLoading ? (
              <div className="text-gray-400 text-lg py-8">Loading video info...</div>
            ) : (
              videoTitle && videoTitle !== 'Invalid YouTube URL' && (
                <>
                  <VideoPreview 
                    title={videoTitle}
                    thumbnail={videoThumbnail}
                    onFormatChange={handleFormatChange}
                    onRemove={handleRemove}
                  />
                  
                  <QualitySelector 
                    format={selectedFormat}
                    selectedQuality={selectedQuality}
                    onQualityChange={handleQualityChange}
                  />

                  {/* Stats Row: Speed + ETA + Size */}
                  {(isDownloading || progress > 0 || isComplete) && (
                    <div className="w-full max-w-3xl flex flex-wrap items-center justify-between gap-4 bg-gray-800 rounded-xl px-6 py-3">
                      <div className="flex items-center gap-6">
                        <span className="text-gray-400 text-sm">Speed:</span>
                        <span className="text-green-400 font-mono font-bold">{speed}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-gray-400 text-sm">ETA:</span>
                        <span className="text-yellow-400 font-mono font-bold">{eta}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-gray-400 text-sm">Size:</span>
                        <span className="text-white font-mono">{downloaded} / {total}</span>
                      </div>
                    </div>
                  )}

                  {/* Progress Bar */}
                  {(isDownloading || progress > 0 || isComplete) && (
                    <ProgressBar 
                      progress={progress}
                      speed={speed}
                      downloaded={downloaded}
                      total={total}
                      eta={eta}
                    />
                  )}

                  {/* ACTION BUTTONS */}
                  <div className="w-full max-w-3xl flex flex-wrap gap-4">
                    {!isComplete && (
                      <button
                        onClick={isDownloading ? handlePauseResume : startDownload}
                        className={`flex-1 min-w-[120px] py-4 rounded-xl font-bold text-xl flex items-center justify-center gap-3 transition-all ${
                          isDownloading
                            ? isPaused
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isDownloading ? (
                          isPaused ? <Play size={24} /> : <Pause size={24} />
                        ) : (
                          <Download size={24} />
                        )}
                        {isDownloading ? (isPaused ? 'RESUME' : 'PAUSE') : 'START'}
                      </button>
                    )}

                    {(isDownloading || progress > 0) && (
                      <button
                        onClick={handleCancel}
                        className="flex-1 min-w-[120px] bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-bold text-xl flex items-center justify-center gap-3 transition-all"
                      >
                        <X size={24} />
                        CANCEL
                      </button>
                    )}
                  </div>

                  <p className="text-gray-500 text-sm">
                    Format: {selectedFormat} | Quality: {selectedQuality}
                  </p>
                </>
              )
            )}
          </>
        )}
      </div>

      {/* Footer: 1 2 3 Pagination */}
      <div className="w-full max-w-4xl flex justify-center gap-4 py-6 mt-8 border-t border-gray-800">
        <button className="w-10 h-10 rounded-full bg-gray-700 hover:bg-blue-600 text-white font-bold transition-all">
          1
        </button>
        <button className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold transition-all">
          2
        </button>
        <button className="w-10 h-10 rounded-full bg-gray-700 hover:bg-blue-600 text-white font-bold transition-all">
          3
        </button>
      </div>
    </div>
  );
}

export default App;