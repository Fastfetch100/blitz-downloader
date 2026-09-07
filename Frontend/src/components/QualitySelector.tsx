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
      return ['2160P (4K)', '1080P', '720P', '480P'];
    }
  };

  const qualities = getQualities();

  return (
    <div className="quality-list">
      {qualities.map((quality) => (
        <button
          key={quality}
          onClick={() => onQualityChange(quality)}
          className={`quality-pill ${
            selectedQuality === quality
              ? 'selected'
              : ''
          }`}
        >
          {quality}
        </button>
      ))}
    </div>
  );
}