import { ConflictInfoResp, tieAck } from '../conflict/conflict';
import { Ref } from '../stats/stats';
import { Checked, Notes, uniq } from './answers';
import { wholeId } from './figure';

export function checkConflictInfo(id: number, r: ConflictInfoResp): Checked<ConflictInfoResp> {
  const notes = new Notes('conflict/info/' + id);
  notes.figures(r);
  if (r?.w && wholeId(r.w.i) !== id)
    notes.add('wilayat:' + String(r.w.i), 'answers wilayat ' + JSON.stringify(r.w.i));
  const tied = uniq(
      notes,
      r?.conflictCandidateList as (ConflictInfoResp['conflictCandidateList'][number] & {
        c: Ref;
      })[],
      'c',
      'tied candidate',
    ),
    wins = uniq(notes, r?.selectedCandidateList, 'c', 'draw winner');
  if (!Array.isArray(tied)) notes.add('list', 'no tied candidates list');
  for (const x of Array.isArray(tied) ? tied : [])
    if (x.notificationAcceptStatus !== undefined && !tieAck(x.notificationAcceptStatus))
      notes.add(
        'ack:' + String(x.notificationAcceptStatus),
        'notificationAcceptStatus ' + JSON.stringify(x.notificationAcceptStatus),
      );
  const rounds = r?.notificationList;
  if (rounds !== undefined && !Array.isArray(rounds))
    notes.add('rounds', 'notificationList not a list');
  return {
    value: {
      ...r,
      notificationList: Array.isArray(rounds) ? rounds : [],
      conflictCandidateList: Array.isArray(tied) ? tied : [],
      selectedCandidateList: Array.isArray(wins) ? wins : [],
    },
    issues: notes.issues,
  };
}
