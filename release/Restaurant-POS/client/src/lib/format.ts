export function lak(n: string | number) {
  return `${Number(n).toLocaleString("lo-LA")} ກີບ`;
}

export function dateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("lo-LA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
