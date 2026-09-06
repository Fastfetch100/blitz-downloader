import { useState } from 'react';
import { Trash2 } from 'lucide-react';

interface VideoPreviewProps {
  title: string;
  thumbnail: string;
  onFormatChange: (format: 'MP3' | 'MP4') => void;
  onRemove: () => void; // <-- New prop for REMOVE LINK
}

export function VideoPreview({ title, thumbnail, onFormatChange, onRemove }: VideoPreviewProps) {
  const [selectedFormat, setSelectedFormat] = useState<'MP3' | 'MP4'>('MP3');

  const handleFormatClick = (format: 'MP3' | 'MP4') => {
    setSelectedFormat(format);
    onFormatChange(format);
  };

  return (
    <div className="w-full max-w-3xl bg-gray-800 rounded-xl p-6 flex flex-col md:flex-row gap-6">
      {/* Thumbnail */}
      <div className="flex-shrink-0">
        <img 
          src={thumbnail} 
          alt="Video thumbnail" 
          className="w-full md:w-48 rounded-lg aspect-video object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex justify-between items-start gap-4">
          <h2 className="text-white text-xl font-semibold overflow-hidden text-ellipsis whitespace-nowrap">
            {title}
          </h2>
          {/* REMOVE LINK Button - matches your mockup */}
          <button
            onClick={onRemove}
            className="text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 text-sm font-semibold flex-shrink-0"
          >
            <Trash2 size={16} />
            REMOVE LINK
          </button>
        </div>

        {/* Format Tabs */}
        <div className="flex gap-2 bg-gray-700 rounded-lg p-1 w-fit">
          <button
            onClick={() => handleFormatClick('MP3')}
            className={`px-6 py-2 rounded-md font-semibold transition-all ${
              selectedFormat === 'MP3' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            MP3
          </button>
          <button
            onClick={() => handleFormatClick('MP4')}
            className={`px-6 py-2 rounded-md font-semibold transition-all ${
              selectedFormat === 'MP4' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            MP4
          </button>
        </div>
      </div>
    </div>
  );
}