import { AcceptLink } from '../../domain/conflict/accept';
import { ConflictInfoResp } from '../../domain/conflict/conflict';
import { CountOverallResp, CountRegionResp, CountWilayatResp } from '../../domain/count/count';
import { InterimResp } from '../../domain/interim/interim';
import { WinnerResp } from '../../domain/winners/winners';
import { OverallResp, RegionResp, VillageResp, WilayatResp } from '../../domain/stats/stats';

export interface Endpoint<T> {
  readonly path: string;
  readonly base?: string;
  readonly fresh?: boolean;
  readonly body?: unknown;
  readonly bare?: boolean;
  readonly payload?: T;
}

export interface ElectionDetail {
  gVS?: string;
  gVF?: string;
  vCS?: string;
  sT?: string;
  iRF?: string | null;
  iRT?: string | null;
}

const at = <T>(path: string): Endpoint<T> => ({ path });

export const endpoints = {
  electionDetail: { path: 'election/detail', fresh: true } as Endpoint<ElectionDetail>,
  statsOverall: at<OverallResp>('statistics/overall'),
  statsRegion: (id: number) => at<RegionResp>('statistics/region/' + id),
  statsWilayat: (id: number) => at<WilayatResp>('statistics/wilayat/' + id),
  statsVillage: (id: number) => at<VillageResp>('statistics/village/' + id),
  countOverall: at<CountOverallResp>('counting/overall'),
  countRegion: (id: number) => at<CountRegionResp>('counting/region/' + id),
  countWilayat: (id: number) => at<CountWilayatResp>('counting/wilayat/' + id),
  interimWilayat: (id: number) => at<InterimResp>('intermediate/result/get/wilayat/' + id),
  conflictInfo: (id: number) => at<ConflictInfoResp>('conflict/get/info/wilayat/' + id),
  conflictAccept: (l: AcceptLink): Endpoint<{ s?: number; m?: string }> => ({
    path: `conflict/c/${l.cid}/w/${l.wid}/cc/${l.ccid}/n/${l.nid}/s/${encodeURIComponent(l.sec)}`,
    fresh: true,
    bare: true,
  }),
  winners: (regionId: number): Endpoint<WinnerResp> => ({
    path: 'result/get/winner',
    body: { regionId, wilayatId: 0 },
  }),
};
