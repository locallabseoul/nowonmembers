"use client";
import { useActionState, useState } from 'react';
import { saveCourse } from './actions';
export type Stop = { title: string; description: string; address: string; stay_minutes: number; latitude: number | null; longitude: number | null; business_id: string | null; position?: number };
export type Course = { id: string; updated_at: string; title: string; summary: string; district: string; cover_url: string | null; status: string; featured: boolean; sort_order: number; travel_minutes: number; walking_course_stops: Stop[] };
type Shop = { id: string; business_name: string; is_public: boolean; active: boolean };
const blank = (): Stop => ({ title: '', description: '', address: '', stay_minutes: 0, latitude: null, longitude: null, business_id: null });
const input = 'w-full rounded-lg border border-slate-300 p-2';
export function CourseEditor({ course, shops }: { course?: Course; shops: Shop[] }) {
  const [state, action, pending] = useActionState(saveCourse, { error: '' });
  const [stops, setStops] = useState<Stop[]>(course?.walking_course_stops?.slice().sort((a,b)=>(a.position??0)-(b.position??0)) ?? [blank(),blank()]);
  function update(i: number, patch: Partial<Stop>) { setStops(stops.map((s,n)=>n===i?{...s,...patch}:s)); }
  function move(i: number, delta: number) { const next=[...stops]; [next[i],next[i+delta]]=[next[i+delta],next[i]]; setStops(next); }
  return <form action={action} className="space-y-5 rounded-2xl bg-white p-6">
    <h2 className="text-xl font-bold">{course ? '코스 수정' : '새 산책코스'}</h2>
    {state.error && <p role="alert" className="text-red-700">{state.error}</p>}
    <fieldset disabled={pending} className="space-y-4">
      <input type="hidden" name="id" value={course?.id??''}/><input type="hidden" name="updated_at" value={course?.updated_at??''}/>
      <input type="hidden" name="stops" value={JSON.stringify(stops)}/>
      <label className="block">코스 제목<input className={input} name="title" required maxLength={120} defaultValue={course?.title}/></label>
      <label className="block">소개<textarea className={input} name="summary" required maxLength={1000} defaultValue={course?.summary}/></label>
      <label className="block">동네<select className={input} name="district" defaultValue={course?.district??'공릉동'}>{['공릉동','월계동','하계동','중계동','상계동'].map(d=><option key={d}>{d}</option>)}</select></label>
      <label className="block">대표 이미지 주소 (선택, HTTPS)<input className={input} type="url" pattern="https://.*" name="cover_url" maxLength={2000} defaultValue={course?.cover_url??''}/></label>
      <div className="grid gap-4 sm:grid-cols-2"><label>공개 상태<select className={input} name="status" defaultValue={course?.status??'draft'}><option value="draft">초안 / 비공개</option><option value="published">공개</option><option value="archived">종료</option></select></label>
      <label>총 이동 시간 (분, 운영자 예상)<input className={input} type="number" name="travel_minutes" min={0} max={1440} required defaultValue={course?.travel_minutes??0}/></label></div>
      <label className="block"><input type="checkbox" name="featured" defaultChecked={course?.featured}/> 오늘의 추천 코스로 표시</label>
      <label className="block">노출 순서 (작은 값 우선)<input className={input} name="sort_order" type="number" min={0} max={9999} required defaultValue={course?.sort_order??0}/></label>
      <h3 className="font-bold">방문 장소 · {stops.length}곳</h3>
      <p className="text-sm text-gray-600">예상 총 시간은 각 장소의 체류 시간과 총 이동 시간을 합산합니다. 공개 시 2~20곳이 필요합니다. 연결 가게가 비공개·정지되면 주민 화면에서 해당 장소 정보는 숨겨집니다.</p>
      {stops.map((s,i)=><section key={i} className="space-y-3 rounded-xl border p-4">
        <div className="flex flex-wrap gap-3"><b>{i+1}번째 장소</b><button type="button" disabled={i===0} onClick={()=>move(i,-1)}>위로</button><button type="button" disabled={i===stops.length-1} onClick={()=>move(i,1)}>아래로</button><button type="button" onClick={()=>setStops(stops.filter((_,n)=>n!==i))}>장소 삭제</button></div>
        <label className="block">장소 종류<select className={input} value={s.business_id??''} onChange={e=>update(i,{business_id:e.target.value||null,title:shops.find(b=>b.id===e.target.value)?.business_name??s.title})}><option value="">일반 산책 장소</option>{shops.map(b=><option value={b.id} key={b.id}>{b.business_name}{b.is_public&&b.active?'':' (비공개·이용 제한)'}</option>)}</select></label>
        <label className="block">장소명<input className={input} required maxLength={120} value={s.title} onChange={e=>update(i,{title:e.target.value})}/></label>
        {s.business_id && !shops.some(b=>b.id===s.business_id&&b.is_public&&b.active) && <p role="alert" className="text-red-700">연결 가게의 공개 상태가 변경되었습니다. 장소 연결을 수정하거나 코스를 비공개로 전환해주세요.</p>}
        {s.business_id && <p className="text-sm text-gray-600">주민 화면에는 연결 가게의 최신 이름·주소·좌표가 표시됩니다.</p>}
        <label className="block">이 장소에서 할 일<textarea className={input} maxLength={1000} value={s.description} onChange={e=>update(i,{description:e.target.value})}/></label>
        <label className="block">예상 체류 시간 (분)<input className={input} type="number" required min={0} max={1440} value={s.stay_minutes} onChange={e=>update(i,{stay_minutes:Number(e.target.value)})}/></label>
        {!s.business_id && <><label className="block">주소<input className={input} maxLength={300} value={s.address} onChange={e=>update(i,{address:e.target.value})}/></label><div className="grid gap-3 sm:grid-cols-2">{(['latitude','longitude'] as const).map(k=><label key={k}>{k==='latitude'?'위도':'경도'} (선택)<input className={input} type="number" step="any" min={k==='latitude'?-90:-180} max={k==='latitude'?90:180} value={s[k]??''} onChange={e=>update(i,{[k]:e.target.value===''?null:Number(e.target.value)})}/></label>)}</div></>}
      </section>)}
      <button className="rounded-lg border px-4 py-2" type="button" disabled={stops.length>=20} onClick={()=>setStops([...stops,blank()])}>장소 추가</button>
      <p className="text-sm text-gray-600">공개로 저장하면 앱에 노출됩니다. 비공개·종료로 바꾸어도 회원은 저장 목록에서 해제할 수 있습니다.</p>
      <button className="rounded-xl bg-primary px-6 py-3 font-bold text-white" type="submit">{pending?'저장 중…':'코스 저장'}</button>
    </fieldset>
  </form>;
}
