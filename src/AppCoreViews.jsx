// Re-export shared UI & data for backward compatibility
export { Metric } from './components/ui/Metric.jsx'
export { ProjectSelect } from './components/ui/ProjectSelect.jsx'
export { PersonSelect } from './components/ui/PersonSelect.jsx'
export { NotificationButton } from './components/ui/NotificationButton.jsx'
export { FilterChips } from './components/ui/FilterChips.jsx'
export { TaskTable } from './components/shared/TaskTable.jsx'
export { TaskCard } from './components/shared/TaskCard.jsx'
export { KpiTable } from './components/shared/KpiTable.jsx'

// Re-export page components
export { ClickUpPage as ClickupPage } from './pages/ClickUp/ClickUpPage.jsx'
export { ProjectsPage } from './pages/Projects/ProjectsPage.jsx'
export { TeamPage } from './pages/Team/TeamPage.jsx'
export { HRWorkspace as HumanResourcesPage } from './pages/HR/HRWorkspace.jsx'
export { AnalyticsTrendChart } from './pages/KPIAnalytics/AnalyticsTrendChart.jsx'
export { AnalyticsCompletionChart } from './pages/KPIAnalytics/AnalyticsCompletionChart.jsx'
export { AnalyticsTeamChart } from './pages/KPIAnalytics/AnalyticsTeamChart.jsx'
export { KPIAnalyticsPage as AnalyticsPage } from './pages/KPIAnalytics/KPIAnalyticsPage.jsx'
