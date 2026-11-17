import {
  AcceptLink,
  acceptQuery,
  hasAcceptKeys,
  parseAcceptLink,
} from '../../domain/conflict/accept';

const KEY = 'majlis.accept';

export function takeAcceptLink(doc: Document): AcceptLink | null {
  const loc = doc.location;
  if (!hasAcceptKeys(loc.search)) return parseAcceptLink(read() ?? '');
  const link = parseAcceptLink(loc.search);
  if (link && keep(acceptQuery(link)))
    doc.defaultView?.history.replaceState(
      doc.defaultView.history.state,
      '',
      loc.pathname + loc.hash,
    );
  else if (!link) keep(null);
  return link;
}

function read(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}
function keep(q: string | null): boolean {
  try {
    if (q === null) sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, q);
    return q === null || sessionStorage.getItem(KEY) === q;
  } catch {
    return false;
  }
}
