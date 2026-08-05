import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import { Badge } from "@/app/components/ui";
import { formatPoints } from "@/lib/points";
import type { AdminMemberDetail } from "@/lib/supabase/queries";

function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;

  return value || "-";
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2">
      <dt className="w-24 shrink-0 text-xs font-bold text-gray-400">{label}</dt>
      <dd className="min-w-0 flex-1 break-keep text-sm text-charcoal">{children}</dd>
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-gray-400">없음</span>;

  return (
    <span className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">{item}</span>
      ))}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-gray-100 p-5">
      <h3 className="mb-2 text-sm font-black text-charcoal">{title}</h3>
      <dl className="divide-y divide-gray-50">{children}</dl>
    </section>
  );
}

export function MemberDetailModal({ member, closeHref }: { member: AdminMemberDetail; closeHref: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 py-6 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="member-detail-title">
      <Link href={closeHref} className="absolute inset-0 bg-charcoal/50" aria-label="회원 상세 닫기" />
      <section className="relative z-10 flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[20px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
          <div className="flex min-w-0 items-center gap-3">
            {member.creator?.avatarUrl ? (
              <img src={member.creator.avatarUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-black text-primary">
                {(member.nickname || member.business?.businessName || "?").slice(0, 1)}
              </span>
            )}
            <div className="min-w-0">
              <h2 id="member-detail-title" className="truncate text-lg font-black text-charcoal">
                {member.nickname || member.business?.businessName || "(이름 없음)"}
              </h2>
              <span className="mt-1 flex flex-wrap gap-1">
                <Badge tone={member.role === "business" ? "blue" : "green"}>{member.role === "business" ? "가게" : "크리에이터"}</Badge>
                {member.isAdmin ? <Badge tone="amber">관리자</Badge> : null}
                {member.status === "suspended" ? <Badge tone="red">정지됨</Badge> : null}
              </span>
            </div>
          </div>
          <Link href={closeHref} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100" aria-label="닫기">
            <X size={18} />
          </Link>
        </div>

        <div className="overflow-y-auto">
          <Section title="계정">
            <Row label="이름">{member.name || "-"}</Row>
            <Row label="전화번호">{formatPhone(member.phone)}</Row>
            <Row label="이메일">{member.email || "-"}</Row>
            <Row label="가입일">{formatDateTime(member.createdAt)}</Row>
            <Row label="인증">
              {member.verificationStatus === "verified" ? "인증 완료" : member.verificationStatus === "rejected" ? "인증 반려" : "인증 대기"}
            </Row>
            <Row label="마케팅 수신">{member.marketingOptIn ? "동의" : "미동의"}</Row>
          </Section>

          {member.creator ? (
            <>
              <Section title="크리에이터 프로필">
                <Row label="소개">{member.creator.bio || <span className="text-gray-400">없음</span>}</Row>
                <Row label="활동 지역"><TagList items={member.creator.activityAreas} /></Row>
                <Row label="관심사"><TagList items={member.creator.interests} /></Row>
                <Row label="콘텐츠 유형"><TagList items={member.creator.contentTypes} /></Row>
                <Row label="가능 요일"><TagList items={member.creator.availableDays} /></Row>
              </Section>

              <Section title="활동">
                <Row label="지원">{member.creator.applicationCount}건</Row>
                <Row label="협업">{member.creator.collaborationCount}건</Row>
                <Row label="기한 준수율">{member.creator.deadlineRate}%</Row>
                <Row label="완료율">{member.creator.completionRate}%</Row>
              </Section>

              <Section title={`채널 (${member.creator.channels.length})`}>
                {member.creator.channels.length ? (
                  member.creator.channels.map((channel) => (
                    <Row key={channel.channelUrl} label={channel.platform}>
                      <a href={channel.channelUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline">
                        {channel.channelName || channel.channelUrl}
                        <ExternalLink size={13} />
                      </a>
                      {channel.followerCount ? (
                        <span className="ml-2 text-xs text-gray-400">팔로워 {channel.followerCount.toLocaleString("ko-KR")}명</span>
                      ) : null}
                    </Row>
                  ))
                ) : (
                  <p className="py-2 text-sm text-gray-400">등록된 채널이 없습니다.</p>
                )}
              </Section>

              {member.creator.portfolios.length ? (
                <Section title={`포트폴리오 (${member.creator.portfolios.length})`}>
                  {member.creator.portfolios.map((item) => (
                    <Row key={item.url} label={item.contentType}>
                      <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline">
                        {item.title || item.url}
                        <ExternalLink size={13} />
                      </a>
                    </Row>
                  ))}
                </Section>
              ) : null}
            </>
          ) : member.role === "creator" ? (
            <Section title="크리에이터 프로필">
              <p className="py-2 text-sm text-amber-600">아직 프로필을 만들지 않았습니다. 캠페인에 지원할 수 없는 상태입니다.</p>
            </Section>
          ) : null}

          {member.business ? (
            <>
              <Section title="가게 정보">
                <Row label="상호">{member.business.businessName || "-"}</Row>
                <Row label="업종">{member.business.category || "-"}</Row>
                <Row label="주소">{member.business.address || "-"}</Row>
                <Row label="연락처">{formatPhone(member.business.contact)}</Row>
                <Row label="영업시간">{member.business.businessHours || "-"}</Row>
              </Section>

              <Section title="운영">
                <Row label="캠페인">{member.business.campaignCount}건</Row>
                <Row label="보유 포인트">{formatPoints(member.business.availablePoints)}</Row>
                <Row label="예약 포인트">{formatPoints(member.business.reservedPoints)}</Row>
              </Section>
            </>
          ) : member.role === "business" ? (
            <Section title="가게 정보">
              <p className="py-2 text-sm text-amber-600">아직 가게 프로필을 만들지 않았습니다. 캠페인을 만들 수 없는 상태입니다.</p>
            </Section>
          ) : null}
        </div>
      </section>
    </div>
  );
}
