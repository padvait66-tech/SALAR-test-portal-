import { useMemo } from 'react';
import { parseMathSegments, renderKatexHtml } from '../utils/latex';

interface MathTextProps {
  text: string;
  className?: string;
}

export function MathText({ text, className = '' }: MathTextProps) {
  const segments = useMemo(() => parseMathSegments(text), [text]);

  return (
    <span className={className}>
      {segments.map((seg, index) => {
        if (seg.type === 'text') {
          return <span key={index}>{seg.content}</span>;
        }
        const html = renderKatexHtml(seg.content, seg.type === 'display');
        return (
          <span
            key={index}
            className={seg.type === 'display' ? 'block my-2 overflow-x-auto' : 'inline-block align-middle mx-0.5'}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
}
