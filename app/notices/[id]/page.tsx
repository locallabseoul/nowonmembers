import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentSessionProfile } from "@/lib/auth/guards";
import { getPublishedNotice } from "@/lib/supabase/queries";
import { NoticeReadMarker } from "../notice-read-marker";

export const metadata: Metadata = {
  title: "공지사항",
  description: "노원멤버스 공지사항 상세"
};

function formatDate(value: string) {
  if (!value) return "게시일 미정";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [notice, session] = await Promise.all([getPublishedNotice(id), getCurrentSessionProfile()]);
  if (!notice) notFound();

  return (
    <main className="bg-[#F8F9FA] px-4 py-10 sm:px-6 lg:px-8">
      {session.user ? <NoticeReadMarker noticeId={notice.id} /> : null}
      <article className="mx-auto max-w-3xl rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
        <p className="text-sm font-black text-primary">공지사항</p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-charcoal">{notice.title}</h1>
        <p className="mt-3 text-sm font-bold text-gray-400">{formatDate(notice.publishedAt || notice.createdAt)}</p>
        <div className="mt-8 whitespace-pre-line text-base leading-8 text-gray-700">{notice.body}</div>
        <div className="mt-10 border-t border-gray-100 pt-6">
          <Link href="/notices" className="text-sm font-black text-primary hover:underline">공지 전체보기</Link>
        </div>
      </article>
    </main>
  );
}
