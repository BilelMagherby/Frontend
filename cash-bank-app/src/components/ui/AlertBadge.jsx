import { AlertTriangle } from "lucide-react";

export default function AlertBadge({ children }) {
  return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"><AlertTriangle size={13} />{children}</span>;
}
