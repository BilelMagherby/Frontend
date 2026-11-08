import OdooExportStatus from "../components/sections/OdooExportStatus";
import AuditLog from "../components/sections/AuditLog";
export default function OdooPage() { return <div className="grid gap-5 xl:grid-cols-2"><OdooExportStatus /><AuditLog /></div>; }
