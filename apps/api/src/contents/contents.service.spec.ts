import { Types } from 'mongoose';

// ── isAllowedUrl (job crawler) ──────────────────────────────────────────────
// Inline the logic here since crawler is a separate package without Jest setup
function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'www.wanted.co.kr' && parsed.pathname.startsWith('/wd/');
  } catch {
    return false;
  }
}

// ── extractYoutubeVideoId (mobile [id].tsx) ─────────────────────────────────
function extractYoutubeVideoId(url: string): string | null {
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  const longMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  return longMatch?.[1] ?? null;
}

// ── getRecommended dedup logic ──────────────────────────────────────────────
function dedup(byTag: any[], byChannel: any[]): { merged: any[]; seen: Set<string> } {
  const seen = new Set<string>();
  const merged: any[] = [];
  for (const item of [...byTag, ...byChannel]) {
    const id = String(item._id);
    if (!seen.has(id)) {
      seen.add(id);
      merged.push({ ...item, id });
    }
  }
  return { merged, seen };
}

// ────────────────────────────────────────────────────────────────────────────

describe('isAllowedUrl (job crawler SSRF guard)', () => {
  it('allows valid Wanted job URL', () => {
    expect(isAllowedUrl('https://www.wanted.co.kr/wd/12345')).toBe(true);
  });

  it('blocks different domain', () => {
    expect(isAllowedUrl('https://evil.com/wd/12345')).toBe(false);
  });

  it('blocks Wanted URL without /wd/ prefix', () => {
    expect(isAllowedUrl('https://www.wanted.co.kr/companies/123')).toBe(false);
  });

  it('blocks internal network URL', () => {
    expect(isAllowedUrl('http://169.254.169.254/latest/meta-data')).toBe(false);
  });

  it('blocks malformed URL', () => {
    expect(isAllowedUrl('not-a-url')).toBe(false);
  });

  it('blocks subdomain bypass attempt', () => {
    expect(isAllowedUrl('https://attacker.wanted.co.kr/wd/123')).toBe(false);
  });
});

describe('extractYoutubeVideoId', () => {
  const ID = 'dQw4w9WgXcQ';

  it('extracts from standard watch URL', () => {
    expect(extractYoutubeVideoId(`https://www.youtube.com/watch?v=${ID}`)).toBe(ID);
  });

  it('extracts from youtu.be short URL', () => {
    expect(extractYoutubeVideoId(`https://youtu.be/${ID}`)).toBe(ID);
  });

  it('extracts from URL with extra params', () => {
    expect(extractYoutubeVideoId(`https://www.youtube.com/watch?v=${ID}&t=30`)).toBe(ID);
  });

  it('returns null for non-YouTube URL', () => {
    expect(extractYoutubeVideoId('https://vimeo.com/123456')).toBeNull();
  });

  it('returns null for short invalid video id', () => {
    expect(extractYoutubeVideoId('https://youtu.be/short')).toBeNull();
  });

  it('extracts from embedded URL with &v=', () => {
    expect(extractYoutubeVideoId(`https://www.youtube.com/embed?v=${ID}`)).toBe(ID);
  });
});

describe('getRecommended dedup logic', () => {
  const makeItem = (id: string) => ({ _id: new Types.ObjectId(id.padStart(24, '0')) });

  it('deduplicates items appearing in both byTag and byChannel', () => {
    const sharedId = '0'.repeat(24);
    const a = makeItem(sharedId);
    const b = makeItem('1'.repeat(24));
    const { merged } = dedup([a], [a, b]);
    expect(merged).toHaveLength(2);
  });

  it('preserves order: byTag items come first', () => {
    const tagItem = makeItem('a'.repeat(24));
    const channelItem = makeItem('b'.repeat(24));
    const { merged } = dedup([tagItem], [channelItem]);
    expect(String(merged[0]._id)).toBe(String(tagItem._id));
  });

  it('seen set contains all merged ids as strings', () => {
    const a = makeItem('a'.repeat(24));
    const b = makeItem('b'.repeat(24));
    const { seen } = dedup([a, b], []);
    expect(seen.size).toBe(2);
    expect(seen.has(String(a._id))).toBe(true);
  });

  it('handles empty byTag', () => {
    const b = makeItem('b'.repeat(24));
    const { merged } = dedup([], [b]);
    expect(merged).toHaveLength(1);
  });

  it('handles both empty', () => {
    const { merged } = dedup([], []);
    expect(merged).toHaveLength(0);
  });
});
