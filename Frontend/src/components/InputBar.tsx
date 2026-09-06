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
    <form onSubmit={handleSubmit} className="flex gap-3 w-full max-w-3xl">
      <input
        name="url"
        type="text"
        placeholder="ENTER LINK"
        className="flex-1 bg-gray-800 text-white text-lg px-6 py-4 rounded-xl border border-gray-700 
                   focus:outline-none focus:border-blue-500 placeholder-gray-400 uppercase tracking-wider"
      />
      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl 
                   flex items-center gap-2 transition-colors font-semibold"
      >
        <Download size={20} />
        ENTER
      </button>
    </form>
  );
}

export default InputBar;