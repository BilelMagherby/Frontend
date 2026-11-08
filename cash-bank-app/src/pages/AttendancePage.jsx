import AttendanceKPIs from "../components/sections/AttendanceKPIs";
import BranchBreakdown from "../components/sections/BranchBreakdown";
export default function AttendancePage() { return <div className="grid gap-5 xl:grid-cols-2"><AttendanceKPIs /><BranchBreakdown /></div>; }
