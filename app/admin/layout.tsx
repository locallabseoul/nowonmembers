import { requireAdmin } from "@/lib/auth/guards";
import { AdminSidebar } from "./components/admin-sidebar";

// /admin 전체의 접근 가드. 이전에는 서버 액션만 막혀 있고 페이지는 비관리자에게도
// 렌더링됐다. 모든 페이지가 쿠키를 읽어 동적 렌더링되므로 요청마다 여기를 지난다.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    // w-full이 없으면 세로 flex 부모 안에서 mx-auto가 박스를 내용물 폭으로 줄여,
    // 페이지마다 컨테이너 폭이 달라지고 사이드바가 좌우로 움직인다.
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:px-8">
      <AdminSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
