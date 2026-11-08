export default function StatusBadge({ status }) {
  const key = status.toLowerCase();
  const style = key.includes("approv") || key.includes("complete") || key.includes("synced") || key.includes("reviewed") || key.includes("posted")
    ? "bg-emerald-50 text-emerald-700"
    : key.includes("reject") || key.includes("fail") || key.includes("attention")
      ? "bg-rose-50 text-rose-700"
      : key.includes("progress") || key.includes("process") || key.includes("queue")
        ? "bg-sky-50 text-sky-700"
        : "bg-amber-50 text-amber-700";
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${style}`}>{status}</span>;
}
