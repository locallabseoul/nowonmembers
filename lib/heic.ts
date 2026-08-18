// 아이폰 기본 카메라 포맷(HEIC)은 브라우저 표시도, 서버 저장도 지원하지 않아
// 업로드 전에 JPEG로 변환한다. 변환 라이브러리는 필요할 때만 내려받는다.
// 서버 액션은 JPG/PNG/WEBP만 받으므로 폼 제출 전에 input.files까지 바꿔야 한다.

export const uploadableImageTypes = ["image/jpeg", "image/png", "image/webp"];

export const HEIC_CONVERSION_FAILED_MESSAGE =
  "아이폰 사진(HEIC) 변환에 실패했습니다. 사진을 JPG로 저장한 뒤 다시 올려주세요.";

export function isHeicFile(file: File) {
  return /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

export async function convertHeicToJpeg(file: File) {
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

// HEIC이면 JPEG로 바꿔 input.files까지 교체하고, 실패하면 안내 문구를 돌려준다.
export async function replaceHeicSelection(input: HTMLInputElement, file: File) {
  if (!isHeicFile(file)) return { file, error: "" };

  try {
    const convertedFile = await convertHeicToJpeg(file);
    const transfer = new DataTransfer();
    transfer.items.add(convertedFile);
    input.files = transfer.files;
    return { file: convertedFile, error: "" };
  } catch {
    input.value = "";
    return { file: null, error: HEIC_CONVERSION_FAILED_MESSAGE };
  }
}
