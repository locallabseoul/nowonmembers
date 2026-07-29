import Link from "next/link";
import type { Metadata } from "next";
import { SectionHeader } from "@/app/components/ui";
import { getPublishedNotices } from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "공지사항",
  description: "노원멤버스 공지사항"
};

function formatDate(value: string) {
  if (!value) return "게시일 미정";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

export default async function NoticesPage() {
  const notices = await getPublishedNotices();

  return (
    <main className="bg-[#F8F9FA] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <SectionHeader title="공지사항" description="노원멤버스 운영 안내와 업데이트를 확인하세요." />
        <div className="overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          {notices.length ? notices.map((notice) => (
            <Link key={notice.id} href={`/notices/${notice.id}`} className="block border-b border-gray-100 p-5 transition-colors last:border-b-0 hover:bg-gray-50 sm:p-6">
              <p className="text-xs font-black text-primary">{formatDate(notice.publishedAt || notice.createdAt)}</p>
              <h2 className="mt-2 text-lg font-black text-charcoal">{notice.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">{notice.body}</p>
            </Link>
          )) : (
            <div className="p-10 text-center">
              <h2 className="text-xl font-black text-charcoal">등록된 공지가 없습니다</h2>
              <p className="mt-2 text-sm text-gray-500">새로운 공지가 등록되면 이곳에 표시됩니다.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
