"use client";

import { useState } from "react";
import type { AdminMember } from "@/lib/supabase/queries";
import { setMemberRole, setMemberStatus, setMemberVerification } from "../actions";

// 승격·정지처럼 무게 있는 동작은 한 번 더 확인을 받는다. 인증 승인·반려는
// 언제든 되돌릴 수 있으므로 바로 실행한다.
function ConfirmButton({
  label,
  confirmLabel,
  className,
  children
}: {
  label: string;
  confirmLabel: string;
  className: string;
  children: React.ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={className}>
        {label}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <button type="button" onClick={() => setConfirming(false)} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50">
        취소
      </button>
      {children}
      <span className="sr-only">{confirmLabel}</span>
    </span>
  );
}

const subtleButton = "rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50";
const primaryButton = "rounded-lg bg-primary px-2.5 py-1.5 text-xs font-black text-white transition-colors hover:bg-primaryHover";
const dangerButton = "rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-black text-white transition-colors hover:bg-red-700";
const dangerOutlineButton = "rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-50";

export function MemberActions({ member, returnTo, isSelf = false }: { member: AdminMember; returnTo: string; isSelf?: boolean }) {
  // 관리자 해제 시 되돌릴 역할: 가게 프로필이 있으면 가게, 아니면 크리에이터.
  const demotedRole = member.businessName ? "business" : "creator";

  // 자기 계정의 역할·상태 변경은 서버에서도 거부된다. 눌러봐야 에러만 보이므로
  // 버튼 대신 표시만 한다.
  if (isSelf) {
    return <p className="text-right text-xs font-bold text-gray-400">본인 계정</p>;
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {member.verificationStatus === "pending" ? (
        <>
          <form action={setMemberVerification} className="inline">
            <input type="hidden" name="user_id" value={member.id} />
            <input type="hidden" name="verification" value="verified" />
            <input type="hidden" name="return_to" value={returnTo} />
            <button className={primaryButton}>인증 승인</button>
          </form>
          <form action={setMemberVerification} className="inline">
            <input type="hidden" name="user_id" value={member.id} />
            <input type="hidden" name="verification" value="rejected" />
            <input type="hidden" name="return_to" value={returnTo} />
            <button className={dangerOutlineButton}>인증 반려</button>
          </form>
        </>
      ) : null}
      {member.verificationStatus === "rejected" ? (
        <form action={setMemberVerification} className="inline">
          <input type="hidden" name="user_id" value={member.id} />
          <input type="hidden" name="verification" value="verified" />
          <input type="hidden" name="return_to" value={returnTo} />
          <button className={subtleButton}>인증 승인</button>
        </form>
      ) : null}
      {member.verificationStatus === "verified" ? (
        <form action={setMemberVerification} className="inline">
          <input type="hidden" name="user_id" value={member.id} />
          <input type="hidden" name="verification" value="pending" />
          <input type="hidden" name="return_to" value={returnTo} />
          <button className={subtleButton}>인증 해제</button>
        </form>
      ) : null}

      {member.role !== "admin" ? (
        <ConfirmButton label="관리자 승격" confirmLabel="관리자로 승격합니다" className={subtleButton}>
          <form action={setMemberRole} className="inline">
            <input type="hidden" name="user_id" value={member.id} />
            <input type="hidden" name="role" value="admin" />
            <input type="hidden" name="return_to" value={returnTo} />
            <button className={primaryButton}>승격 확정</button>
          </form>
        </ConfirmButton>
      ) : (
        <ConfirmButton label="관리자 해제" confirmLabel="관리자 권한을 해제합니다" className={subtleButton}>
          <form action={setMemberRole} className="inline">
            <input type="hidden" name="user_id" value={member.id} />
            <input type="hidden" name="role" value={demotedRole} />
            <input type="hidden" name="return_to" value={returnTo} />
            <button className={dangerButton}>해제 확정</button>
          </form>
        </ConfirmButton>
      )}

      {member.status === "suspended" ? (
        <form action={setMemberStatus} className="inline">
          <input type="hidden" name="user_id" value={member.id} />
          <input type="hidden" name="status" value="active" />
          <input type="hidden" name="return_to" value={returnTo} />
          <button className={subtleButton}>정지 해제</button>
        </form>
      ) : (
        <ConfirmButton label="계정 정지" confirmLabel="계정을 정지합니다" className={dangerOutlineButton}>
          <form action={setMemberStatus} className="inline">
            <input type="hidden" name="user_id" value={member.id} />
            <input type="hidden" name="status" value="suspended" />
            <input type="hidden" name="return_to" value={returnTo} />
            <button className={dangerButton}>정지 확정</button>
          </form>
        </ConfirmButton>
      )}
    </div>
  );
}
