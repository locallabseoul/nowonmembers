"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Plus, X } from "lucide-react";

type ApplicationDatePickerProps = {
  minDate: string;
  maxDate: string;
  defaultValue?: string;
};

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(date);
}

function getDateOptions(minDate: string, maxDate: string) {
  const start = new Date(`${minDate}T00:00:00+09:00`);
  const end = new Date(`${maxDate}T00:00:00+09:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

  const dates: string[] = [];
  const current = new Date(start);
  while (current <= end && dates.length < 21) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export function ApplicationDatePicker({ minDate, maxDate, defaultValue = "" }: ApplicationDatePickerProps) {
  const dateOptions = useMemo(() => getDateOptions(minDate, maxDate), [minDate, maxDate]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [dateValue, setDateValue] = useState(dateOptions[0] ?? minDate);
  const [note, setNote] = useState(defaultValue);

  function addDate(value: string) {
    if (!value || selectedDates.includes(value)) return;
    setSelectedDates((current) => [...current, value].sort());
  }

  function removeDate(value: string) {
    setSelectedDates((current) => current.filter((date) => date !== value));
  }

  const availableDatesText = [
    ...selectedDates.map(formatDate),
    note.trim()
  ].filter(Boolean).join(", ");

  return (
    <section className="rounded-xl border border-line bg-white p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CalendarDays size={20} />
        </div>
        <div>
          <h2 className="text-sm font-black text-charcoal">방문 가능한 날짜</h2>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            선정 발표일 이후부터 콘텐츠 등록 마감일까지 선택할 수 있습니다.
          </p>
          <p className="mt-1 text-xs font-bold text-primary">
            가능 범위: {formatDate(minDate)} ~ {formatDate(maxDate)}
          </p>
        </div>
      </div>

      <input type="hidden" name="available_date_values" value={selectedDates.join(",")} />
      <input type="hidden" name="available_dates" value={availableDatesText} />
      <input type="hidden" name="available_dates_note" value={note.trim()} />

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="date"
          value={dateValue}
          min={minDate}
          max={maxDate}
          onChange={(event) => setDateValue(event.currentTarget.value)}
          className="min-h-12 flex-1 rounded-lg border border-line px-4 text-sm font-bold text-charcoal focus-ring"
        />
        <button
          type="button"
          onClick={() => addDate(dateValue)}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-primary px-4 text-sm font-black text-primary transition-colors hover:bg-primary hover:text-white"
        >
          <Plus size={17} />
          날짜 추가
        </button>
      </div>

      {dateOptions.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {dateOptions.slice(0, 10).map((date) => (
            <button
              key={date}
              type="button"
              onClick={() => addDate(date)}
              className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-primary/10 hover:text-primary"
            >
              {formatDate(date)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {selectedDates.length ? selectedDates.map((date) => (
          <span key={date} className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-black text-primary">
            {formatDate(date)}
            <button type="button" onClick={() => removeDate(date)} aria-label={`${formatDate(date)} 삭제`} className="rounded-full p-0.5 hover:bg-primary/10">
              <X size={14} />
            </button>
          </span>
        )) : (
          <span className="text-sm font-bold text-gray-400">가능한 날짜를 1개 이상 선택해주세요.</span>
        )}
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-xs font-black text-slate-500">시간대/추가 메모</span>
        <input
          value={note}
          onChange={(event) => setNote(event.currentTarget.value)}
          className="w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring"
          placeholder="예: 평일 오후 2시 이후 가능, 주말 오전 선호"
        />
      </label>
    </section>
  );
}
