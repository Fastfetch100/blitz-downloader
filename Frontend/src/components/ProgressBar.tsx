interface ProgressBarProps {
  progress: number;
  speed: string;
  downloaded: string;
  total: string;
  eta: string;
}

export function ProgressBar({ progress, speed, downloaded, total, eta }: ProgressBarProps) {
  return (
    <div className="w-full max-w-3xl bg-gray-800 rounded-xl p-6">
      {/* Progress Bar */}
      <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-600 transition-all duration-300 rounded-full"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex flex-wrap justify-between items-center mt-4 text-gray-300 text-sm">
        <span>{Math.round(progress)}%</span>
        <span className="font-mono">
          {downloaded} / {total}
        </span>
        <span className="font-mono text-blue-400">{speed}</span>
        <span className="font-mono text-yellow-400">⏱️ {eta}</span>
      </div>
    </div>
  );
}