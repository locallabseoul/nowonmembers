import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import { CourseEditor, type Course } from './course-editor';
export default async function CoursesPage({ searchParams }: { searchParams: Promise<{id?:string;saved?:string}> }) {
 const {id,saved}=await searchParams;
 const {supabase}=await requireAdmin('/admin/courses');
 const [{data,error},{data:shops,error:shopError}]=await Promise.all([
  supabase.from('walking_courses').select('*,walking_course_stops(*)').order('sort_order').order('id'),
  supabase.from('business_profiles').select('id,business_name,is_public,user_id').order('business_name')
 ]);
 const ownerIds=[...new Set((shops??[]).map(s=>s.user_id).filter((id): id is string=>Boolean(id)))];
 const {data:owners,error:ownerError}=ownerIds.length ? await supabase.from('profiles').select('id,status').in('id',ownerIds) : {data:[],error:null};
 const shopOptions=(shops??[]).map(s=>({...s,active:owners?.some(o=>o.id===s.user_id&&o.status==='active')??false}));
 const courses=(data??[]) as Course[];
 const course=courses.find(c=>c.id===id);
 return <main className="space-y-6"><h1 className="text-3xl font-black">산책코스 관리</h1><p>주민 앱의 코스와 오늘의 추천을 편집합니다.</p>
 {saved==='1'&&<p role="status" className="text-green-700">코스를 저장했습니다.</p>}
 {error||shopError||ownerError?<p role="alert">코스 관리 정보를 불러오지 못했습니다. 데이터 연결 및 마이그레이션 적용 상태를 확인해주세요.</p>:<>
 <nav className="flex flex-wrap gap-3"><Link className="rounded-lg border p-2" href="/admin/courses">새 코스</Link>{courses.map(c=><Link className="rounded-lg border p-2" key={c.id} href={`/admin/courses?id=${c.id}`}>{c.title} · {c.status==='published'?'공개':c.status==='archived'?'종료':'초안'}{c.featured?' · 추천':''}</Link>)}</nav>
 {id&&!course?<p>해당 코스를 찾을 수 없습니다.</p>:<CourseEditor key={course?.updated_at??'new'} course={course} shops={shopOptions} mapClientId={process.env.NAVER_MAPS_CLIENT_ID ?? process.env.NAVER_CLOUD_MAPS_CLIENT_ID}/>}
 </>}
 </main>;
}
