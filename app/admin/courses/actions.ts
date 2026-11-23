"use server";
import { randomUUID } from "node:crypto";
import { COURSE_IMAGE_BUCKET, COURSE_IMAGE_EXTENSIONS, courseImageError } from "@/lib/course-images";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";

export async function saveCourse(_state: { error: string }, form: FormData): Promise<{ error: string }> {
  const { supabase, user } = await requireAdmin('/admin/courses');
  let stops: unknown;
  try { stops = JSON.parse(String(form.get('stops') ?? '[]')); }
  catch { return { error: '장소 입력을 확인해주세요.' }; }
  let coverUrl = String(form.get('cover_url') ?? '').trim();
  let uploadedPath: string | null = null;
  const file = form.get('cover_file');
  if (file instanceof File && file.size > 0) {
    const validation = courseImageError(file);
    if (validation) return { error: validation };
    uploadedPath = `${user.id}/courses/${randomUUID()}.${COURSE_IMAGE_EXTENSIONS[file.type]}`;
    const bucket = supabase.storage.from(COURSE_IMAGE_BUCKET);
    const { error: uploadError } = await bucket.upload(uploadedPath, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
    if (uploadError) return { error: '사진을 업로드하지 못했습니다. 잠시 후 다시 시도해주세요.' };
    coverUrl = bucket.getPublicUrl(uploadedPath).data.publicUrl;
    if (!coverUrl.startsWith('https://')) {
      await bucket.remove([uploadedPath]);
      return { error: '사진 저장소의 HTTPS 주소가 필요합니다. 로컬 환경에서는 HTTPS 이미지 주소로 연결을 확인해주세요.' };
    }
  }
  const { data, error } = await supabase.rpc('admin_save_walking_course', { payload: {
    id: String(form.get('id') ?? '') || null,
    updated_at: String(form.get('updated_at') ?? '') || null,
    title: String(form.get('title') ?? '').trim(), summary: String(form.get('summary') ?? '').trim(),
    district: String(form.get('district') ?? ''), cover_url: coverUrl,
    status: String(form.get('status') ?? 'draft'), featured: form.get('featured') === 'on',
    sort_order: Number(form.get('sort_order') || 0), travel_minutes: Number(form.get('travel_minutes') || 0), stops
  }});
  if (error) {
    if (uploadedPath) await supabase.storage.from(COURSE_IMAGE_BUCKET).remove([uploadedPath]);
    const known = ['공개 코스에는 2~20개의 장소가 필요합니다.', '비공개 가게가 연결되어 있어 공개할 수 없습니다.', '다른 변경이 있습니다. 새로고침 후 다시 수정해주세요.', '코스를 찾을 수 없습니다.'];
    return { error: known.includes(error.message) ? error.message : '저장하지 못했습니다. 필수 항목·좌표·시간을 확인해주세요.' };
  }
  revalidatePath('/admin/courses');
  redirect(`/admin/courses?id=${encodeURIComponent(String(data))}&saved=1`);
}
