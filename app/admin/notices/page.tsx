import { getAdminNotices } from "@/lib/supabase/queries";
import { createNotice, updateNotice } from "../actions";
import { NoticeManagementSection } from "../notice-management-section";
import { FormBanner } from "@/app/components/form-field";

export default async function AdminNoticesPage({ searchParams }: { searchParams: Promise<{ error?: string; noticeCreated?: string; noticeUpdated?: string }> }) {
  const { error, noticeCreated, noticeUpdated } = await searchParams;
  const notices = await getAdminNotices();

  return (
    <main>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-charcoal">공지 관리</h1>
        <p className="mt-2 text-gray-500">사이트 상단과 알림 메뉴에 노출되는 공지사항을 작성하고 관리합니다.</p>
      </div>
      {error ? <div className="mb-6"><FormBanner>{error}</FormBanner></div> : null}
      {noticeCreated ? <p className="mb-6 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">공지가 등록되었습니다.</p> : null}
      {noticeUpdated ? <p className="mb-6 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">공지가 수정되었습니다.</p> : null}

      <NoticeManagementSection notices={notices} createAction={createNotice} updateAction={updateNotice} />
    </main>
  );
}
