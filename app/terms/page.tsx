import type { Metadata } from "next";
import { LegalPage } from "@/app/components/legal-page";
import { LEGAL_EFFECTIVE_DATE, termsSections } from "@/lib/legal";

export const metadata: Metadata = {
  title: "이용약관",
  description: "노원멤버스 서비스 이용약관"
};

export default function TermsPage() {
  return (
    <LegalPage
      title="이용약관"
      description={`시행일: ${LEGAL_EFFECTIVE_DATE}. 노원멤버스 서비스 이용과 캠페인 협업에 적용되는 기본 약관입니다.`}
      sections={termsSections}
      companionLink={{ href: "/privacy", label: "개인정보처리방침 보기" }}
    />
  );
}
