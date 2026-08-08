import { redirect } from "next/navigation";

// 광고 문자에 넣는 짧은 주소. 문자 길이가 요금을 가르므로 /account/notifications 대신
// 이 경로를 적고, 여기서 실제 설정 화면으로 보낸다.
export default function OptOutPage() {
  redirect("/account/notifications");
}
