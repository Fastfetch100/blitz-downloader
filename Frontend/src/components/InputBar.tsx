import { Download } from 'lucide-react';

interface InputBarProps {
  onEnter: (url: string) => void;
}

function InputBar({ onEnter }: InputBarProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const url = formData.get('url') as string;
    if (url.trim()) onEnter(url.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="input-form">
      <input
        name="url"
        type="text"
        placeholder="https://youtu.be/..."
        className="url-input"
      />
      <button
        type="submit"
        className="enter-button"
      >
        <Download size={24} />
        ENTER
      </button>
    </form>
  );
}

export default InputBar;