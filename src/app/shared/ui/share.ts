export interface ShareData {
  title: string;
  text: string;
  url: string;
}
export interface ShareHost {
  share?: (d: ShareData) => Promise<void>;
  canShare?: (d: ShareData) => boolean;
  writeText?: (t: string) => Promise<void>;
}
export type Shared = 'shared' | 'copied' | 'shown' | 'cancelled';

export function browserShareHost(): ShareHost {
  const n = navigator as Navigator & Partial<ShareHost>;
  const host: ShareHost = {};
  if (typeof n.share === 'function') host.share = (d) => n.share!(d);
  if (typeof n.canShare === 'function') host.canShare = (d) => n.canShare!(d);
  if (typeof n.clipboard?.writeText === 'function')
    host.writeText = (t) => n.clipboard.writeText(t);
  return host;
}

export async function shareLink(
  d: ShareData,
  host: ShareHost = browserShareHost(),
): Promise<Shared> {
  const data = { title: d.title, text: d.text, url: d.url };
  if (host.share && (!host.canShare || host.canShare(data))) {
    try {
      await host.share(data);
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  if (host.writeText) {
    try {
      await host.writeText(d.url);
      return 'copied';
    } catch {
    }
  }
  return 'shown';
}
