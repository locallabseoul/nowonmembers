import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RESET_FLOW_COOKIE } from "../constants";
import { NewPasswordForm } from "./new-password-form";

export default async function NewPasswordPage() {
  const cookieStore = await cookies();
  const resetUserId = cookieStore.get(RESET_FLOW_COOKIE)?.value;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!resetUserId || !data.user || resetUserId !== data.user.id) {
    redirect("/auth/reset-password?message=" + encodeURIComponent("인증이 필요하거나 만료되었습니다."));
  }
  return (
    <main className="flex items-center justify-center bg-[#F8F9FA] px-4 py-14 sm:px-6 lg:px-8">
      <section className="w-full max-w-md rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><KeyRound size={22} /></div>
          <h1 className="text-2xl font-black text-charcoal">새 비밀번호 설정</h1>
          <p className="mt-2 text-sm text-gray-500">앞으로 로그인할 때 사용할 비밀번호를 입력해주세요.</p>
        </div>
        <NewPasswordForm />
      </section>
    </main>
  );
}
