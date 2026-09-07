import { Trash2 } from 'lucide-react';

interface VideoPreviewProps {
  title: string;
  thumbnail: string;
  onRemove: () => void;
}

export function VideoPreview({ title, thumbnail, onRemove }: VideoPreviewProps) {
  return (
    <div className="video-preview">
      <div className="thumbnail-frame">
        <img 
          src={thumbnail} 
          alt="Video thumbnail" 
          className="thumbnail"
        />
      </div>
      <div className="preview-details">
        <h2 className="video-title" title={title}>{title}</h2>
          <button
            onClick={onRemove}
            className="remove-button"
          >
            <Trash2 size={16} />
            REMOVE LINK
          </button>
      </div>
    </div>
  );
}