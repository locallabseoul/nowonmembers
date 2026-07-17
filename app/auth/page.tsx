import { RoleAwareActionLink } from "@/app/components/role-aware-action-link";
import { getCurrentSessionProfile } from "@/lib/auth/guards";
import { signIn, signUp } from "./actions";

function getSafeNext(next?: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "";
  }

  return next;
}

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; next?: string }> }) {
  const { error, message, next } = await searchParams;
  const safeNext = getSafeNext(next);
  const { profile } = await getCurrentSessionProfile();
  const role = profile?.role;

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-charcoal">로그인</h1>
        <p className="mt-2 text-sm text-gray-500">가입한 이메일로 캠페인과 프로필을 관리합니다.</p>
        {error ? <p className="mt-4 rounded-lg bg-primary/10 p-3 text-sm font-bold text-primary">{error}</p> : null}
        {message ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p> : null}
        <form action={signIn} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={safeNext} />
          <label className="block">
            <span className="mb-2 block text-sm font-black text-charcoal">이메일</span>
            <input name="email" type="email" required className="w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring" placeholder="you@example.com" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-black text-charcoal">비밀번호</span>
            <input name="password" type="password" required className="w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring" placeholder="••••••••" />
          </label>
          <button className="w-full rounded-lg bg-primary px-5 py-3 font-black text-white hover:bg-primaryHover">로그인</button>
        </form>
        <div className="mt-5 grid gap-2 text-sm">
          <RoleAwareActionLink
            href="/creator/profile"
            unauthenticatedHref="/auth?next=/creator/profile"
            currentRole={role}
            requiredRole="creator"
            className="font-bold text-primary"
          >
            크리에이터 프로필 만들기
          </RoleAwareActionLink>
          <RoleAwareActionLink
            href="/business/campaigns/new"
            unauthenticatedHref="/auth?next=/business/campaigns/new"
            currentRole={role}
            requiredRole="business"
            className="font-bold text-primary"
          >
            가게 캠페인 시작하기
          </RoleAwareActionLink>
        </div>
      </div>
      <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black text-charcoal">회원가입</h2>
        <p className="mt-2 text-sm text-gray-500">파일럿 참여 역할을 선택하고 프로필을 이어서 완성합니다.</p>
        <form action={signUp} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-charcoal">역할</span>
            <select name="role" className="w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring">
              <option value="creator">크리에이터</option>
              <option value="business">가게·브랜드</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-black text-charcoal">이름 또는 닉네임</span>
            <input name="nickname" required className="w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring" placeholder="김노원" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-black text-charcoal">이메일</span>
            <input name="email" type="email" required className="w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring" placeholder="you@example.com" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-black text-charcoal">비밀번호</span>
            <input name="password" type="password" required minLength={6} className="w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring" placeholder="6자 이상" />
          </label>
          <button className="w-full rounded-lg border border-primary bg-white px-5 py-3 font-black text-primary hover:bg-primary/5">가입하고 프로필 작성</button>
        </form>
      </div>
    </main>
  );
}
