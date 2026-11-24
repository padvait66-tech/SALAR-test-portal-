import type { ExamPaper, QuestionItem, TestFolder } from '../types/portal';

export interface HydratedExamBundle {
  exam: ExamPaper;
  questions: QuestionItem[];
  folder: TestFolder | null;
}

export interface ParsedRoute {
  type: 'exam' | 'scorecard' | 'owner-login' | 'none';
  id: string;
  autoQuickJoin: boolean;
  hydrateToken?: string;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function isDevPreviewHost(origin = window.location.origin): boolean {
  return origin.includes('://ais-dev-');
}

export function getShareOrigin(usePublicHost = true): string {
  const origin = window.location.origin;
  if (usePublicHost && isDevPreviewHost(origin)) {
    return origin.replace('://ais-dev-', '://ais-pre-');
  }
  return origin;
}

export function buildShortExamUrl(
  exam: Pick<ExamPaper, 'id' | 'code'>,
  mode: 'overview' | 'cbt' = 'overview',
  usePublicHost = true
): string {
  const origin = getShareOrigin(usePublicHost);
  const identifier = exam.code?.trim() || exam.id;
  const param = mode === 'cbt' ? 'cbt' : 'exam';
  return `${origin}/?${param}=${encodeURIComponent(identifier)}`;
}

export async function encodeHydratedBundle(bundle: HydratedExamBundle): Promise<string | null> {
  try {
    const slimQuestions = bundle.questions.map((q) => {
      // Keep imageDataUrl when compact enough so URL stays shareable on browsers & WhatsApp
      const img =
        q.imageDataUrl && q.imageDataUrl.length <= 24000 ? q.imageDataUrl : undefined;
      return { ...q, imageDataUrl: img };
    });

    const payloadJson = JSON.stringify({
      v: 1,
      exam: bundle.exam,
      questions: slimQuestions,
      folder: bundle.folder,
    });
    const rawBytes = new TextEncoder().encode(payloadJson);

    if (typeof CompressionStream !== 'undefined') {
      const stream = new Blob([rawBytes]).stream().pipeThrough(new CompressionStream('gzip'));
      const compressedBuffer = await new Response(stream).arrayBuffer();
      const token = `gz.${toBase64Url(new Uint8Array(compressedBuffer))}`;
      return token.length <= 32000 ? token : null;
    }

    const token = `raw.${toBase64Url(rawBytes)}`;
    return token.length <= 32000 ? token : null;
  } catch {
    return null;
  }
}

export async function decodeHydratedBundle(token: string): Promise<HydratedExamBundle | null> {
  try {
    if (!token) return null;
    let jsonText = '';

    if (token.startsWith('gz.') && typeof DecompressionStream !== 'undefined') {
      const bytes = fromBase64Url(token.slice(3));
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      const stream = new Blob([copy]).stream().pipeThrough(new DecompressionStream('gzip'));
      const decompressedBuffer = await new Response(stream).arrayBuffer();
      jsonText = new TextDecoder().decode(decompressedBuffer);
    } else if (token.startsWith('raw.')) {
      jsonText = new TextDecoder().decode(fromBase64Url(token.slice(4)));
    } else {
      return null;
    }

    const parsed = JSON.parse(jsonText) as Partial<HydratedExamBundle>;
    if (!parsed.exam || !parsed.exam.id || !Array.isArray(parsed.questions)) {
      return null;
    }
    return {
      exam: parsed.exam,
      questions: parsed.questions,
      folder: parsed.folder ?? null,
    };
  } catch {
    return null;
  }
}

export function parseRouteFromLocation(): ParsedRoute {
  const searchParams = new URLSearchParams(window.location.search);
  const hashRaw = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;

  // Extract optional #hydrate= token from hash
  let hydrateToken: string | undefined;
  let hashWithoutHydrate = hashRaw;
  const hydrateMatch = hashRaw.match(/(?:^|&)hydrate=([^&]+)/);
  if (hydrateMatch) {
    hydrateToken = decodeURIComponent(hydrateMatch[1]);
    hashWithoutHydrate = hashRaw.replace(/(?:^|&)hydrate=[^&]+/, '').replace(/^&/, '');
  }

  // 1. Scorecard links (?scorecard=id or #scorecard=id)
  const scQuery = searchParams.get('scorecard');
  if (scQuery) {
    return { type: 'scorecard', id: scQuery.trim(), autoQuickJoin: false };
  }
  if (hashWithoutHydrate.startsWith('scorecard=')) {
    const id = decodeURIComponent(hashWithoutHydrate.slice('scorecard='.length).split('&')[0]).trim();
    if (id) return { type: 'scorecard', id, autoQuickJoin: false };
  }

  // 2. Query string exam / cbt links (?cbt=CODE, ?exam=ID_OR_CODE, ?test=CODE, ?code=CODE)
  const cbtParam = searchParams.get('cbt');
  if (cbtParam?.trim()) {
    return {
      type: 'exam',
      id: cbtParam.trim(),
      autoQuickJoin: true,
      hydrateToken,
    };
  }
  const examParam =
    searchParams.get('exam') || searchParams.get('test') || searchParams.get('code');
  if (examParam?.trim()) {
    const isCbtMode = searchParams.get('mode') === 'cbt';
    return {
      type: 'exam',
      id: examParam.trim(),
      autoQuickJoin: isCbtMode,
      hydrateToken,
    };
  }

  // 3. Clean path links (/exam/:id, /cbt/:id, /shared/:id)
  const pathMatch = window.location.pathname.match(/^\/(exam|cbt|shared)\/([^/]+)\/?$/i);
  if (pathMatch) {
    return {
      type: 'exam',
      id: decodeURIComponent(pathMatch[2]).trim(),
      autoQuickJoin: pathMatch[1].toLowerCase() === 'cbt',
      hydrateToken,
    };
  }

  // 4. Legacy hash links (#exam=id, #cbt=id)
  if (hashWithoutHydrate.startsWith('exam=') || hashWithoutHydrate.startsWith('cbt=')) {
    const isHashCbt = hashWithoutHydrate.startsWith('cbt=');
    const val = hashWithoutHydrate.slice(isHashCbt ? 4 : 5);
    const [idPart, ...rest] = val.split('&');
    const examId = decodeURIComponent(idPart).trim();
    const isDirectCbt = isHashCbt || rest.some((seg) => seg === 'mode=cbt');
    if (examId) {
      return {
        type: 'exam',
        id: examId,
        autoQuickJoin: isDirectCbt,
        hydrateToken,
      };
    }
  }

  // 5. Hidden Owner Console access (?owner=1, /owner, #owner)
  const ownerParam = searchParams.get('owner');
  if (
    ownerParam === '1' ||
    ownerParam === 'true' ||
    /^\/owner\/?$/i.test(window.location.pathname) ||
    hashWithoutHydrate.toLowerCase() === 'owner'
  ) {
    return { type: 'owner-login', id: '', autoQuickJoin: false };
  }

  return { type: 'none', id: '', autoQuickJoin: false };
}
