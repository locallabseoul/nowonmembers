import Link from "next/link";
import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getUserNotifications } from "@/lib/supabase/queries";
import { SectionHeader } from "@/app/components/ui";
import { FeedKindBadge } from "@/app/components/notice-menu";

export const metadata: Metadata = {
  title: "알림",
  description: "캠페인 진행 상황에 대한 개인 알림"
};

function formatDateTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export default async function NotificationsPage() {
  await requireUser("/notifications");
  const notifications = await getUserNotifications();

  return (
    <main className="bg-[#F8F9FA] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <SectionHeader
          title="알림"
          description="캠페인 진행 상황에 따라 나에게만 전달되는 소식입니다."
          action={
            <Link href="/notices" className="text-sm font-black text-primary hover:underline">
              공지사항 보기
            </Link>
          }
        />

        <div className="space-y-3">
          {notifications.map((notification) => {
            const content = (
              <>
                <div className="flex items-center gap-2">
                  <FeedKindBadge kind="notification" />
                  {!notification.isRead ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                  <span className="ml-auto text-xs font-bold text-gray-400">{formatDateTime(notification.createdAt)}</span>
                </div>
                <p className="mt-3 font-black text-charcoal">{notification.title}</p>
                <p className="mt-2 text-sm leading-6 text-gray-500">{notification.body}</p>
              </>
            );

            const className = `block rounded-[20px] border bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${
              notification.isRead ? "border-gray-100" : "border-primary/20"
            }`;

            return notification.link ? (
              <Link key={notification.id} href={notification.link} className={`${className} transition-colors hover:border-primary/40`}>
                {content}
              </Link>
            ) : (
              <div key={notification.id} className={className}>
                {content}
              </div>
            );
          })}

          {notifications.length === 0 ? (
            <div className="rounded-[20px] border border-gray-100 bg-white p-10 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Bell size={22} />
              </div>
              <p className="font-bold text-charcoal">아직 받은 알림이 없습니다.</p>
              <p className="mt-2 text-sm text-gray-500">
                지원자가 들어오거나 캠페인 상태가 바뀌면 이곳에 쌓입니다.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
