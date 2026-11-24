import { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface ResilientImageProps {
  src?: string;
  alt: string;
  fallbackTitle: string;
  className?: string;
}

export function ResilientImage({ src, alt, fallbackTitle, className = '' }: ResilientImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 text-slate-600 p-6 text-center ${className}`}
      >
        <BookOpen className="w-8 h-8 text-blue-800/70 mb-2" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-700">{fallbackTitle}</p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
