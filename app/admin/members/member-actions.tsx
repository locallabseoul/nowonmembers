"use client";

import type { AdminMember } from "@/lib/supabase/queries";
import { ConfirmButton } from "@/app/components/confirm-button";
import { setMemberAdmin, setMemberRole, setMemberStatus, setMemberVerification } from "../actions";

const subtleButton = "rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50";
const primaryButton = "rounded-lg bg-primary px-2.5 py-1.5 text-xs font-black text-white transition-colors hover:bg-primaryHover";
const dangerButton = "rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-black text-white transition-colors hover:bg-red-700";
const dangerOutlineButton = "rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-50";

export function MemberActions({ member, returnTo, isSelf = false }: { member: AdminMember; returnTo: string; isSelf?: boolean }) {
  // 자기 계정의 역할·상태 변경은 서버에서도 거부된다. 눌러봐야 에러만 보이므로
  // 버튼 대신 표시만 한다.
  if (isSelf) {
    return <p className="text-right text-xs font-bold text-gray-400">본인 계정</p>;
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {member.role !== "resident" && member.verificationStatus === "pending" ? (
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
      {member.role !== "resident" && member.verificationStatus === "rejected" ? (
        <form action={setMemberVerification} className="inline">
          <input type="hidden" name="user_id" value={member.id} />
          <input type="hidden" name="verification" value="verified" />
          <input type="hidden" name="return_to" value={returnTo} />
          <button className={subtleButton}>인증 승인</button>
        </form>
      ) : null}
      {member.role !== "resident" && member.verificationStatus === "verified" ? (
        <form action={setMemberVerification} className="inline">
          <input type="hidden" name="user_id" value={member.id} />
          <input type="hidden" name="verification" value="pending" />
          <input type="hidden" name="return_to" value={returnTo} />
          <button className={subtleButton}>인증 해제</button>
        </form>
      ) : null}

      {(["resident", "creator", "business"] as const).filter((role) => role !== member.role).map((role) => (
        <ConfirmButton
          key={role}
          label={`${role === "resident" ? "주민" : role === "creator" ? "크리에이터" : "가게"}로 변경`}
          confirmLabel="회원 역할을 변경합니다. 역할 관련 활동 이력이 있으면 변경할 수 없습니다."
          className={subtleButton}
        >
          <form action={setMemberRole} className="inline">
            <input type="hidden" name="user_id" value={member.id} />
            <input type="hidden" name="role" value={role} />
            <input type="hidden" name="return_to" value={returnTo} />
            <button className={primaryButton}>변경 확정</button>
          </form>
        </ConfirmButton>
      ))}

      {member.isAdmin ? (
        <ConfirmButton label="관리자 해제" confirmLabel="관리자 권한을 해제합니다" className={subtleButton}>
          <form action={setMemberAdmin} className="inline">
            <input type="hidden" name="user_id" value={member.id} />
            <input type="hidden" name="make_admin" value="false" />
            <input type="hidden" name="return_to" value={returnTo} />
            <button className={dangerButton}>해제 확정</button>
          </form>
        </ConfirmButton>
      ) : member.role !== "resident" ? (
        <ConfirmButton label="관리자 지정" confirmLabel="관리자 권한을 부여합니다" className={subtleButton}>
          <form action={setMemberAdmin} className="inline">
            <input type="hidden" name="user_id" value={member.id} />
            <input type="hidden" name="make_admin" value="true" />
            <input type="hidden" name="return_to" value={returnTo} />
            <button className={primaryButton}>지정 확정</button>
          </form>
        </ConfirmButton>
      ) : null}

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
