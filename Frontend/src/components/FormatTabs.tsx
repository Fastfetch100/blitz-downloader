interface FormatTabsProps {
  format: 'MP3' | 'MP4';
  onFormatChange: (format: 'MP3' | 'MP4') => void;
}

export function FormatTabs({ format, onFormatChange }: FormatTabsProps) {
  return (
    <div className="format-tabs">
      <button
        onClick={() => onFormatChange('MP3')}
        className={`format-tab ${
          format === 'MP3'
            ? 'selected'
            : ''
        }`}
      >
        MP3
      </button>
      <button
        onClick={() => onFormatChange('MP4')}
        className={`format-tab ${
          format === 'MP4'
            ? 'selected'
            : ''
        }`}
      >
        MP4
      </button>
    </div>
  );
}