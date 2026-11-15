import type { WCand, WWil } from '../../../domain/winners/winners';
import { shareLink } from '../../../shared/ui/share';
import { titled } from '../winners.model';
import { wf } from './wf-strings';
import { candShare, wilShare, wilUrl } from './winners-flow.model';

export async function shareWinner(gov: string, w: WWil, c: WCand | null): Promise<string> {
  const url = wilUrl(location.origin + location.pathname, gov, w.id);
  const r = await shareLink({
    title: c ? c.name : titled(w.name, wf('wnWilayat')),
    text: c ? candShare(c, w) : wilShare(w),
    url,
  });
  return r === 'copied' ? wf('shareCopied') : r === 'shown' ? wf('shareShown') + ' ' + url : '';
}

export function toggleFullscreen(): void {
  try {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void document.documentElement.requestFullscreen?.();
  } catch {
  }
}
