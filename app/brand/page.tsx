import type { Metadata } from "next";
import { Download } from "lucide-react";

export const metadata: Metadata = {
  title: "브랜드 리소스",
  description: "노원멤버스 로고와 아이콘을 내려받을 수 있습니다."
};

const assets = [
  {
    title: "로고 (기본)",
    description: "밝은 배경에서 사용하는 기본 워드마크입니다.",
    preview: "/brand/nowonmembers-logo.svg",
    dark: false,
    files: [
      { label: "SVG (벡터)", href: "/brand/nowonmembers-logo.svg" },
      { label: "PNG (2598×300)", href: "/brand/nowonmembers-logo.png" }
    ]
  },
  {
    title: "로고 (흰색)",
    description: "어두운 배경 위에 올리는 흰색 워드마크입니다.",
    preview: "/brand/nowonmembers-logo-white.svg",
    dark: true,
    files: [
      { label: "SVG (벡터)", href: "/brand/nowonmembers-logo-white.svg" },
      { label: "PNG (2598×300)", href: "/brand/nowonmembers-logo-white.png" }
    ]
  },
  {
    title: "아이콘",
    description: "파비콘·프로필용 아이콘입니다. 카카오채널, SNS 프로필에 쓰기 좋습니다.",
    preview: "/brand/nowonmembers-icon.svg",
    dark: false,
    icon: true,
    files: [
      { label: "SVG (벡터)", href: "/brand/nowonmembers-icon.svg" },
      { label: "PNG (1024×1024)", href: "/brand/nowonmembers-icon-1024.png" },
      { label: "PNG (512×512)", href: "/brand/nowonmembers-icon-512.png" }
    ]
  }
];

export default function BrandPage() {
  return (
    <main className="bg-[#F8F9FA] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10">
          <p className="text-sm font-black text-primary">NOWON MEMBERS</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-charcoal sm:text-4xl">브랜드 리소스</h1>
          <p className="mt-4 text-sm leading-6 text-gray-500">
            노원멤버스 로고와 아이콘을 내려받아 사용할 수 있습니다. 인쇄물·디자인 작업에는 SVG를, 문서나 메신저에는 PNG를 권장합니다.
            로고의 비율과 색상은 변형하지 말아주세요.
          </p>
        </div>

        <div className="space-y-6">
          {assets.map((asset) => (
            <section key={asset.title} className="overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className={`flex items-center justify-center p-10 ${asset.dark ? "bg-charcoal" : "bg-gray-50"}`}>
                <img src={asset.preview} alt={asset.title} className={asset.icon ? "h-24 w-24" : "h-8 w-auto sm:h-10"} />
              </div>
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <h2 className="font-black text-charcoal">{asset.title}</h2>
                  <p className="mt-1 text-sm text-gray-500">{asset.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {asset.files.map((file) => (
                    <a
                      key={file.href}
                      href={file.href}
                      download
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition-colors hover:border-primary hover:text-primary"
                    >
                      <Download size={13} />
                      {file.label}
                    </a>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          사용 문의: locallab.seoul@gmail.com
        </p>
      </div>
    </main>
  );
}
