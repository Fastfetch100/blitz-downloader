interface QualitySelectorProps {
  format: 'MP3' | 'MP4';
  selectedQuality: string;
  onQualityChange: (quality: string) => void;
}

export function QualitySelector({ format, selectedQuality, onQualityChange }: QualitySelectorProps) {
  const getQualities = () => {
    if (format === 'MP3') {
      return ['320kbps', '256kbps', '128kbps'];
    } else {
      // Added 1080P and 4K
      return ['2160P (4K)', '1080P', '720P', '480P'];
    }
  };

  const qualities = getQualities();

  return (
    <div className="w-full max-w-3xl flex flex-wrap gap-3 mt-2">
      {qualities.map((quality) => (
        <button
          key={quality}
          onClick={() => onQualityChange(quality)}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            selectedQuality === quality
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
          }`}
        >
          {quality}
        </button>
      ))}
    </div>
  );
}