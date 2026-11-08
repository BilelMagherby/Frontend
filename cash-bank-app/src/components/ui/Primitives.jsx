import { ChevronDown } from "lucide-react";

export function Card({ className = "", children }) {
  return <section className={`rounded-xl border border-slate-100 bg-white shadow-card ${className}`}>{children}</section>;
}

export function Button({ className = "", variant = "primary", children, ...props }) {
  const variants = {
    primary: "bg-navy text-white hover:bg-[#294d76]",
    outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
  };
  return <button className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`} {...props}>{children}</button>;
}

export function Field({ label, className = "", ...props }) {
  return <label className={`flex min-w-0 flex-col gap-1.5 text-xs font-medium text-slate-500 ${className}`}>
    {label && <span>{label}</span>}
    <input className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10" {...props} />
  </label>;
}

export function SelectField({ label, className = "", children, ...props }) {
  return <label className={`flex min-w-0 flex-col gap-1.5 text-xs font-medium text-slate-500 ${className}`}>
    {label && <span>{label}</span>}
    <span className="relative">
      <select className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pe-8 text-sm text-slate-800 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10" {...props}>{children}</select>
      <ChevronDown size={15} className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
    </span>
  </label>;
}

export function SectionTitle({ title, subtitle, action }) {
  return <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
    <div><h2 className="text-lg font-bold text-slate-800">{title}</h2>{subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}</div>
    {action}
  </div>;
}
