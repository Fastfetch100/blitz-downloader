import { Pause, Play, X } from 'lucide-react';

interface ActionButtonsProps {
  isDownloading: boolean;
  isPaused: boolean;
  onPauseResume: () => void;
  onCancel: () => void;
}

export function ActionButtons({ 
  isDownloading, 
  isPaused, 
  onPauseResume, 
  onCancel 
}: ActionButtonsProps) {
  return (
    <div className="w-full max-w-3xl flex flex-wrap gap-3 mt-2">
      {/* Pause / Resume Button - only show if downloading */}
      {isDownloading && (
        <button
          onClick={onPauseResume}
          className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all ${
            isPaused
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-yellow-600 hover:bg-yellow-700 text-white'
          }`}
        >
          {isPaused ? <Play size={18} /> : <Pause size={18} />}
          {isPaused ? 'RESUME' : 'PAUSE'}
        </button>
      )}

      {/* Cancel Button - only show if downloading */}
      {isDownloading && (
        <button
          onClick={onCancel}
          className="px-6 py-3 rounded-lg font-semibold bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 transition-all"
        >
          <X size={18} />
          CANCEL
        </button>
      )}
    </div>
  );
}