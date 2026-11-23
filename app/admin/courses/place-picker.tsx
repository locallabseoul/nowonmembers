"use client";
import { useEffect, useRef, useState } from 'react';
import { CampaignMap } from '@/app/campaigns/[id]/campaign-map';
import type { Stop } from './course-editor';
type Address = { address: string; latitude: string; longitude: string };
export function PlacePicker({ stop, onChange, clientId }: { stop: Stop; onChange: (patch: Partial<Stop>) => void; clientId?: string }) {
  const [query, setQuery] = useState(stop.address);
  const [results, setResults] = useState<Address[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function search() {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setResults([]); setMessage('');
    try {
      const response = await fetch(`/api/maps/geocode?query=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '주소를 검색하지 못했습니다.');
      if (controller.signal.aborted) return;
      const addresses = (data.addresses ?? []) as Address[];
      setResults(addresses); if (!addresses.length) setMessage('검색 결과가 없어요. 도로명 주소로 다시 검색해주세요.');
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : '주소 검색에 실패했습니다.');
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <div className="space-y-3">
    <label className="block">주소 검색<div className="mt-1 flex gap-2"><input className="min-w-0 flex-1 rounded-lg border p-2" value={query} maxLength={100} placeholder="예: 서울 노원구 동일로 1229" onChange={e => { request.current?.abort(); setBusy(false); setQuery(e.target.value); setResults([]); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (query.trim().length >= 2) void search(); } }}/><button className="shrink-0 rounded-lg border px-3" type="button" disabled={busy || query.trim().length < 2} onClick={search}>{busy ? '검색 중…' : '검색'}</button></div></label>
    {message && <p role="status" className="text-sm text-red-700">{message}</p>}
    {results.length > 0 && <ul className="divide-y rounded-lg border">{results.map((r, i) => <li key={i}><button type="button" className="w-full p-3 text-left hover:bg-slate-50" onClick={() => { onChange({ address: r.address, latitude: Number(r.latitude), longitude: Number(r.longitude) }); setQuery(r.address); setResults([]); }}>{r.address}</button></li>)}</ul>}
    <label className="block">표시할 주소<input className="mt-1 w-full rounded-lg border p-2" maxLength={300} value={stop.address} onChange={e => onChange({ address: e.target.value })}/></label>
    <p className="text-sm text-slate-500">주소를 선택한 뒤 지도에서 정확한 장소를 눌러 핀 위치를 조정하세요. 핀을 옮겨도 주소 문구는 유지됩니다.</p>
    <CampaignMap latitude={stop.latitude ?? 37.6542} longitude={stop.longitude ?? 127.0568} address={stop.title || '방문 장소'} clientId={clientId} onPick={(latitude, longitude) => onChange({ latitude, longitude })}/>
    <div className="flex items-center gap-3 text-sm"><span>{stop.latitude != null && stop.longitude != null ? `선택 위치 ${stop.latitude.toFixed(6)}, ${stop.longitude.toFixed(6)}` : '아직 위치를 선택하지 않았어요.'}</span><button type="button" className="underline" onClick={() => onChange({ latitude: null, longitude: null })}>위치 지우기</button></div>
    <details><summary className="cursor-pointer text-sm text-slate-500">좌표 직접 입력</summary><div className="mt-2 grid grid-cols-2 gap-3">{(['latitude', 'longitude'] as const).map(k => <label key={k}>{k === 'latitude' ? '위도' : '경도'}<input className="w-full rounded-lg border p-2" type="number" step="any" min={k === 'latitude' ? -90 : -180} max={k === 'latitude' ? 90 : 180} value={stop[k] ?? ''} onChange={e => onChange({ [k]: e.target.value === '' ? null : Number(e.target.value) })}/></label>)}</div></details>
  </div>;
}
