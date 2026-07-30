import { Clock, MapPin, Phone, Store } from "lucide-react";
import { VisitDateForm } from "@/app/creator/visit-date-form";

export type StoreContact = {
  name: string;
  address: string;
  contact: string;
  businessHours: string;
};

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10 && digits.startsWith("02")) return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 9 && digits.startsWith("02")) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;

  return value;
}

// 선정된 크리에이터가 방문 일정을 잡으려면 매장에 직접 연락해야 한다. 협업이 시작된
// 뒤에만 보여준다.
export function StoreContactCard({
  store,
  compact = false,
  collaborationId,
  visitDate = "",
  submissionDue = ""
}: {
  store: StoreContact;
  compact?: boolean;
  // 방문 일정을 기록할 수 있는 화면에서만 넘긴다.
  collaborationId?: string;
  visitDate?: string;
  submissionDue?: string;
}) {
  if (!store.name && !store.contact && !store.address) return null;

  const phone = store.contact ? formatPhone(store.contact) : "";

  return (
    <section className={`rounded-[20px] border border-primary/20 bg-primaryLight/60 ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-center gap-2">
        <Store size={16} className="text-primary" />
        <p className="font-black text-charcoal">{store.name || "매장 정보"}</p>
      </div>
      <p className="mt-2 text-xs leading-5 text-gray-600">
        방문 일정은 매장에 직접 연락해 정해주세요.
      </p>

      <dl className="mt-4 space-y-2.5 text-sm">
        {store.address ? (
          <div className="flex items-start gap-2.5">
            <MapPin size={15} className="mt-0.5 shrink-0 text-primary" />
            <dd className="break-keep text-charcoal">{store.address}</dd>
          </div>
        ) : null}
        {store.businessHours ? (
          <div className="flex items-start gap-2.5">
            <Clock size={15} className="mt-0.5 shrink-0 text-primary" />
            <dd className="break-keep text-charcoal">{store.businessHours}</dd>
          </div>
        ) : null}
      </dl>

      {phone ? (
        <a
          href={`tel:${store.contact.replace(/\D/g, "")}`}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-black text-white transition-colors hover:bg-primaryHover"
        >
          <Phone size={16} />
          {phone}
        </a>
      ) : (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800">
          매장 연락처가 등록되지 않았습니다. 운영자에게 문의해주세요.
        </p>
      )}

      {collaborationId ? (
        <VisitDateForm collaborationId={collaborationId} visitDate={visitDate} maxDate={submissionDue} />
      ) : null}
    </section>
  );
}
