import type { Metadata } from "next";
import { LegalPage } from "@/app/components/legal-page";
import { LEGAL_EFFECTIVE_DATE, privacySections } from "@/lib/legal";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 노원멤버스",
  description: "노원멤버스 개인정보처리방침"
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="개인정보처리방침"
      description={`시행일: ${LEGAL_EFFECTIVE_DATE}. 노원멤버스가 처리하는 개인정보 항목, 목적, 보유 기간과 회원 권리를 정리한 기본 방침입니다.`}
      sections={privacySections}
      companionLink={{ href: "/terms", label: "이용약관 보기" }}
    />
  );
}
