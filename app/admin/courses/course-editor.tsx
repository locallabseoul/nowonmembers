"use client";
import { useActionState, useEffect, useState } from 'react';
import { saveCourse } from './actions';
import { PlacePicker } from './place-picker';
import { courseImageError } from '@/lib/course-images';
export type Stop = { title: string; description: string; address: string; stay_minutes: number; latitude: number | null; longitude: number | null; business_id: string | null; position?: number };
export type Course = { id: string; updated_at: string; title: string; summary: string; district: string; cover_url: string | null; status: string; featured: boolean; sort_order: number; travel_minutes: number; walking_course_stops: Stop[] };
type Shop = { id: string; business_name: string; is_public: boolean; active: boolean };
type EditorStop = Stop & { editorId: string };
const blank = (): EditorStop => ({ editorId: crypto.randomUUID(), title: '', description: '', address: '', stay_minutes: 0, latitude: null, longitude: null, business_id: null });
const input = 'mt-1 w-full rounded-lg border border-slate-300 p-2';
export function CourseEditor({ course, shops, mapClientId }: { course?: Course; shops: Shop[]; mapClientId?: string }) {
  const [fields, setFields] = useState({ title: course?.title ?? '', summary: course?.summary ?? '', district: course?.district ?? '공릉동', cover_url: course?.cover_url ?? '', status: course?.status ?? 'draft', featured: course?.featured ?? false, sort_order: course?.sort_order ?? 0, travel_minutes: course?.travel_minutes ?? 0 });
  const [stops, setStops] = useState<EditorStop[]>(() => course ? course.walking_course_stops.slice().sort((a,b)=>(a.position??0)-(b.position??0)).map((s,i) => ({ ...s, editorId: `existing-${i}` })) : [{ ...blank(), editorId: 'first' }, { ...blank(), editorId: 'second' }]);
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [imageError, setImageError] = useState('');
  const [review, setReview] = useState(false);
  const [state, action, pending] = useActionState(async (_: { error: string }, form: FormData) => {
    if (file) form.set('cover_file', file); else form.delete('cover_file');
    return saveCourse(_, form);
  }, { error: '' });
  useEffect(() => { if (!file) { setFileUrl(''); return; } const url = URL.createObjectURL(file); setFileUrl(url); return () => URL.revokeObjectURL(url); }, [file]);
  function update(id: string, patch: Partial<Stop>) { setReview(false); setStops(current => current.map(s => s.editorId === id ? { ...s, ...patch } : s)); }
  function move(i: number, delta: number) { setReview(false); setStops(current => { const next = [...current]; [next[i], next[i+delta]] = [next[i+delta], next[i]]; return next; }); }
  const cover = fileUrl || (fields.cover_url.startsWith('https://') ? fields.cover_url : '');
  const totalMinutes = fields.travel_minutes + stops.reduce((sum,s) => sum + s.stay_minutes, 0);
  const warnings = [!fields.title.trim() && '제목을 입력해주세요.', !fields.summary.trim() && '소개를 입력해주세요.', (stops.length < 2 || stops.length > 20) && '공개하려면 방문 장소가 2~20곳 필요해요.', stops.some(s => !s.title.trim()) && '모든 장소명을 입력해주세요.', stops.some(s => s.business_id && !shops.some(b => b.id === s.business_id && b.active && b.is_public)) && '비공개·이용 제한 가게를 변경해주세요.', stops.some(s => (s.latitude == null) !== (s.longitude == null)) && '위도와 경도를 함께 입력해주세요.'].filter(Boolean);
  return <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
    <form action={action} onReset={e => e.preventDefault()} onChange={e => { if (!(e.target instanceof HTMLInputElement && e.target.name === "review")) setReview(false); }} className="space-y-5 rounded-2xl bg-white p-4 sm:p-6">
      <h2 className="text-xl font-bold">{course ? '코스 수정' : '새 산책코스'}</h2>
      <p className="text-sm text-slate-500">초안 저장 → 미리보기 확인 → 공개 순서로 등록하세요.</p>
      {state.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{state.error}</p>}
      <fieldset disabled={pending} className="space-y-5">
        <input type="hidden" name="id" value={course?.id ?? ''}/><input type="hidden" name="updated_at" value={course?.updated_at ?? ''}/>
        <input type="hidden" name="stops" value={JSON.stringify(stops.map(s => ({ title: s.title, description: s.description, address: s.address, stay_minutes: s.stay_minutes, latitude: s.latitude, longitude: s.longitude, business_id: s.business_id })))}/>
        <label className="block">코스 제목<input className={input} name="title" required maxLength={120} value={fields.title} onChange={e => setFields({ ...fields, title: e.target.value })}/></label>
        <label className="block">소개<textarea className={input} name="summary" required maxLength={1000} rows={3} value={fields.summary} onChange={e => setFields({ ...fields, summary: e.target.value })}/></label>
        <label className="block">동네<select className={input} name="district" value={fields.district} onChange={e => setFields({ ...fields, district: e.target.value })}>{['공릉동','월계동','하계동','중계동','상계동'].map(d => <option key={d}>{d}</option>)}</select></label>
        <section className="space-y-3 rounded-xl border p-4"><h3 className="font-bold">대표 사진</h3>
          <label className="block text-sm">사진 선택 · JPG, PNG, WEBP / 8MB 이하<input type="file" accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full" onChange={e => { const selected = e.target.files?.[0]; if (!selected) return; const error = courseImageError(selected); setImageError(error); if (error) { e.target.value = ''; return; } setFile(selected); }}/></label>
          {imageError && <p role="alert" className="text-sm text-red-700">{imageError}</p>}
          {file && <div className="flex gap-3 text-sm"><span>{file.name}</span><button type="button" className="underline" onClick={() => { setFile(null); setImageError(''); setReview(false); }}>선택 취소</button></div>}
          <details><summary className="cursor-pointer text-sm">이미지 주소로 등록</summary><input aria-label="대표 이미지 주소" className={input} name="cover_url" type="url" pattern="https://.*" maxLength={2000} value={fields.cover_url} onChange={e => { setFile(null); setFields({ ...fields, cover_url: e.target.value }); }}/></details>
          <button type="button" className="text-sm underline" onClick={() => { setFile(null); setFields({ ...fields, cover_url: '' }); setImageError(''); setReview(false); }}>대표 사진 제거</button>
          <p className="text-xs text-slate-500">사진은 코스 저장 시 업로드됩니다. 공개 가능한 사진을 사용해주세요.</p>
        </section>
        <div className="grid gap-4 sm:grid-cols-2"><label>공개 상태<select className={input} name="status" value={fields.status} onChange={e => setFields({ ...fields, status: e.target.value })}><option value="draft">초안 / 비공개</option><option value="published">공개</option><option value="archived">종료</option></select></label><label>총 이동 시간 (분)<input className={input} name="travel_minutes" type="number" min={0} max={1440} required value={fields.travel_minutes} onChange={e => setFields({ ...fields, travel_minutes: Number(e.target.value) })}/></label></div>
        <label className="block"><input name="featured" type="checkbox" checked={fields.featured} onChange={e => setFields({ ...fields, featured: e.target.checked })}/> 오늘의 추천 코스로 표시</label>
        <label className="block">노출 순서 (작은 값 우선)<input className={input} name="sort_order" type="number" min={0} max={9999} required value={fields.sort_order} onChange={e => setFields({ ...fields, sort_order: Number(e.target.value) })}/></label>
        <h3 className="font-bold">방문 장소 · {stops.length}곳 / 약 {totalMinutes}분</h3>
        {stops.map((s,i) => <section key={s.editorId} className="space-y-3 rounded-xl border p-4">
          <div className="flex flex-wrap items-center gap-3"><b>{i+1}번째 장소</b><button type="button" disabled={i === 0} onClick={() => move(i,-1)}>위로</button><button type="button" disabled={i === stops.length-1} onClick={() => move(i,1)}>아래로</button><button type="button" className="ml-auto text-red-700" onClick={() => { setStops(stops.filter(t => t.editorId !== s.editorId)); setReview(false); }}>장소 삭제</button></div>
          <label className="block">장소 종류<select className={input} value={s.business_id ?? ''} onChange={e => update(s.editorId, { business_id: e.target.value || null, title: shops.find(b => b.id === e.target.value)?.business_name ?? s.title, address: '', latitude: null, longitude: null })}><option value="">일반 산책 장소</option>{shops.map(b => <option key={b.id} value={b.id}>{b.business_name}{b.is_public && b.active ? '' : ' (비공개·이용 제한)'}</option>)}</select></label>
          <label className="block">장소명<input className={input} required maxLength={120} value={s.title} onChange={e => update(s.editorId, { title: e.target.value })}/></label>
          {s.business_id && <p className="text-sm text-slate-500">연결 가게의 최신 이름·주소·좌표를 앱에서 사용합니다.</p>}
          <label className="block">이 장소에서 할 일<textarea className={input} maxLength={1000} value={s.description} onChange={e => update(s.editorId, { description: e.target.value })}/></label>
          <label className="block">예상 체류 시간 (분)<input className={input} type="number" min={0} max={1440} required value={s.stay_minutes} onChange={e => update(s.editorId, { stay_minutes: Number(e.target.value) })}/></label>
          {!s.business_id && <PlacePicker stop={s} clientId={mapClientId} onChange={patch => update(s.editorId, patch)}/>}
        </section>)}
        <button className="rounded-lg border px-4 py-2" type="button" disabled={stops.length >= 20} onClick={() => { setStops([...stops, blank()]); setReview(false); }}>장소 추가</button>
        {warnings.length > 0 && <ul className="space-y-1 text-sm text-amber-800">{warnings.map(w => <li key={String(w)}>{w}</li>)}</ul>}
        {fields.status === 'published' && <label className="block rounded-xl bg-green-50 p-4"><input name="review" type="checkbox" checked={review} onChange={e => setReview(e.target.checked)}/> 미리보기와 방문 순서를 확인했으며 앱에 공개합니다.</label>}
        <button className="w-full rounded-xl bg-slate-900 px-6 py-3 font-bold text-white disabled:opacity-40" disabled={pending || Boolean(imageError) || (fields.status === 'published' && (!review || warnings.length > 0))} type="submit">{pending ? '저장 중…' : fields.status === 'published' ? '공개로 저장' : fields.status === 'archived' ? '종료로 저장' : '초안 저장'}</button>
      </fieldset>
    </form>
    <aside className="xl:sticky xl:top-6"><h2 className="mb-3 font-bold">앱 콘텐츠 미리보기</h2><p className="mb-3 text-xs text-slate-500">입력 내용을 확인하는 미리보기이며 실제 앱의 화면 크기에 따라 배치가 달라집니다.</p><div className="overflow-hidden rounded-[30px] border bg-slate-50 shadow-sm">
      {cover ? <img src={cover} alt="코스 대표 사진 미리보기" className="h-60 w-full object-cover"/> : <div className="flex h-60 items-center justify-center bg-slate-200 text-slate-500">대표 사진을 선택해주세요</div>}
      <div className="space-y-5 p-6"><p className="text-xs font-bold tracking-widest">{fields.featured ? "EDITOR'S WALK" : 'NEIGHBORHOOD WALK'}</p><h3 className="break-words text-3xl font-bold">{fields.title || '코스 제목'}</h3><p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{fields.summary || '동네를 걷는 즐거움을 소개해주세요.'}</p><p className="border-y py-3 text-sm">{fields.district} · {stops.length}곳 · 약 {totalMinutes}분</p><ol className="space-y-3">{stops.map((s,i) => <li key={s.editorId} className="rounded-2xl bg-white p-4"><div className="flex gap-3"><b className="text-2xl">{String(i+1).padStart(2,'0')}</b><div className="min-w-0"><h4 className="break-words font-bold">{s.business_id ? shops.find(b => b.id === s.business_id)?.business_name ?? '연결 가게 확인 필요' : s.title || '방문 장소'}</h4><p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-500">{s.description} · 약 {s.stay_minutes}분</p>{s.business_id && <span className="mt-2 block text-xs text-green-700">가게 상세·혜택으로 연결</span>}</div></div></li>)}</ol><div className="rounded-full bg-slate-900 p-3 text-center text-sm font-bold text-white">이 코스 저장하기</div></div>
    </div></aside>
  </div>;
}
