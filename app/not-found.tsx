import Link from "next/link";
import { Compass, MapPinOff } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-[#F8F9FA] px-4">
      <section className="w-full max-w-md rounded-[20px] border border-gray-100 bg-white p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
        <MapPinOff size={42} className="mx-auto text-slate-300" />
        <p className="mt-5 text-sm font-black text-primary">404</p>
        <h1 className="mt-2 text-xl font-black text-charcoal">페이지를 찾을 수 없습니다</h1>
        <p className="mt-3 text-sm leading-6 text-gray-500">
          주소가 바뀌었거나 삭제된 페이지입니다. 마감된 캠페인은 목록에서 내려갈 수 있습니다.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/campaigns"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-black text-white transition-colors hover:bg-primaryHover"
          >
            <Compass size={17} />
            캠페인 둘러보기
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-6 py-3 font-bold text-slate-600 transition-colors hover:border-primary hover:text-primary"
          >
            홈으로
          </Link>
        </div>
      </section>
    </main>
  );
}
