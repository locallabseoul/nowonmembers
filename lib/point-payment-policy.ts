export function isPointPaymentAllowed(
  userId: string,
  modeValue?: string,
  reviewUserIdsValue?: string
) {
  const mode = (modeValue ?? "review").trim().toLowerCase();
  if (mode === "open") return true;
  if (mode !== "review") return false;

  return (reviewUserIdsValue ?? "")
    .split(",")
    .some((candidate) => candidate.trim() === userId);
}
