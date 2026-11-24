import katex from 'katex';

interface MathSegment {
  type: 'text' | 'inline' | 'display';
  content: string;
}

const LATEX_COMMAND_HINT = /\\(?:frac|sqrt|int|sum|prod|lim|sin|cos|tan|cot|sec|csc|log|ln|alpha|beta|gamma|theta|pi|infty|cdot|times|pm|le|ge|ne|approx|rightarrow|Rightarrow|left|right|vec|bar|hat)|[\^_]\{?[a-zA-Z0-9\\+\-]+\}?/;

export function parseMathSegments(input: string): MathSegment[] {
  if (!input) return [];

  // If explicit $...$ or $$...$$ delimiters are present, tokenize around them
  if (input.includes('$')) {
    const segments: MathSegment[] = [];
    const regex = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(input)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', content: input.slice(lastIndex, match.index) });
      }
      if (match[1] !== undefined) {
        segments.push({ type: 'display', content: match[1].trim() });
      } else if (match[2] !== undefined) {
        segments.push({ type: 'inline', content: match[2].trim() });
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < input.length) {
      segments.push({ type: 'text', content: input.slice(lastIndex) });
    }
    return segments;
  }

  // If the entire string is a compact formula expression (options / formulaNote)
  const trimmed = input.trim();
  if (
    LATEX_COMMAND_HINT.test(trimmed) &&
    !trimmed.includes('. ') &&
    trimmed.length < 140 &&
    !/^[A-Z][a-z]+\s[a-z]+\s[a-z]+/.test(trimmed)
  ) {
    return [{ type: 'inline', content: trimmed }];
  }

  // Mixed prose with inline backslash commands (e.g. \frac{...}{...}, \sqrt{...}, \tan 56^\circ)
  if (LATEX_COMMAND_HINT.test(input)) {
    const inlineTokenRegex =
      /(\\(?:frac|sqrt|left|right|int|sum|lim|tan|sin|cos|cot|sec|csc|log|theta|alpha|beta|pi|infty|times|cdot|Rightarrow|approx|circ)[^.,;:?!\n]*(?:\{[^}]*\}[^.,;:?!\n]*)*)/g;
    const segments: MathSegment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = inlineTokenRegex.exec(input)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', content: input.slice(lastIndex, match.index) });
      }
      segments.push({ type: 'inline', content: match[1].trim() });
      lastIndex = inlineTokenRegex.lastIndex;
    }
    if (lastIndex < input.length) {
      segments.push({ type: 'text', content: input.slice(lastIndex) });
    }
    return segments;
  }

  return [{ type: 'text', content: input }];
}

export function renderKatexHtml(latex: string, displayMode = false): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: false,
    });
  } catch {
    return latex;
  }
}
