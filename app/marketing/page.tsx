import type { Metadata } from "next";
import { LegalPage } from "@/app/components/legal-page";
import { LEGAL_EFFECTIVE_DATE, marketingSections } from "@/lib/legal";

export const metadata: Metadata = {
  title: "마케팅 정보 수신 동의",
  description: "노원멤버스 마케팅 정보 수신 동의 안내"
};

export default function MarketingConsentPage() {
  return (
    <LegalPage
      title="마케팅 정보 수신 동의"
      description={`시행일: ${LEGAL_EFFECTIVE_DATE}. 노원멤버스가 발송하는 마케팅 정보의 종류, 수신 방법과 철회 방법을 안내합니다. 선택 동의이며 거부해도 서비스 이용에 제한이 없습니다.`}
      sections={marketingSections}
      companionLink={{ href: "/privacy", label: "개인정보처리방침 보기" }}
    />
  );
}
