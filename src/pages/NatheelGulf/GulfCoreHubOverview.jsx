import { Icon } from '../../components/ui/Icon.jsx'
import { Button } from '../../components/ui/Button.jsx'

export function GulfCoreHubOverview({ assets = [], nodes = [], onOpenAssets }) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const byId = new Map(assets.map((asset) => [asset.id, asset]))
  const projectStorage = [
    { name: 'Natheel Gulf', size: '3.6 MB', count: 3, color: '#2563eb', ratio: 46 },
    { name: 'Hajiss Cafe Outlet', size: '3.0 MB', count: 2, color: '#d97706', ratio: 39 },
    { name: 'Dani Square', size: '1.1 MB', count: 1, color: '#0891b2', ratio: 14 },
    { name: 'Hajiss Cafe Holding Block', size: '32.1 KB', count: 1, color: '#7c3aed', ratio: 1 },
  ]
  const recent = [
    ['gulf-zatca'],
    ['gulf-crn'],
    ['gulf-presentations'],
    ['gulf-dani-presentation'],
    ['gulf-hajiss-spreadsheet', 'Hail_Cafes_Influencers_Database.xlsx'],
    ['gulf-hajiss-suppliers'],
  ]
    .map(([id, name]) => ({ ...byId.get(id), name: name || byId.get(id)?.name }))
    .filter((asset) => asset.id)
  const activity = [8, 12, 9, 15, 11, 18, 12, 22, 16, 14, 25, 18, 21, 17, 29, 20, 24, 19, 32, 23, 27, 21, 35, 29, 24, 38, 31, 35, 43, 48]

  return (
    <section aria-labelledby="gulf-overview-title" className="gulf-overview">
      <header className="gulf-overview-heading">
        <div>
          <span className="gulf-eyebrow">
            <Icon name="dashboard" size={14} /> CORE HUB
          </span>
          <h1 id="gulf-overview-title">Overview</h1>
          <p>Everything stored in the Data Bank.</p>
        </div>
        <Button onClick={onOpenAssets}>
          <Icon name="folder" size={15} /> Browse files
        </Button>
      </header>
      <div className="gulf-overview-metrics">
        <article className="gulf-overview-metric">
          <span className="gulf-overview-metric-icon blue">
            <Icon name="file-text" size={18} />
          </span>
          <span className="gulf-overview-metric-label">Files stored</span>
          <strong>7</strong>
        </article>
        <article className="gulf-overview-metric">
          <span className="gulf-overview-metric-icon green">
            <Icon name="database" size={18} />
          </span>
          <span className="gulf-overview-metric-label">Total size</span>
          <strong>7.7 MB</strong>
        </article>
        <article className="gulf-overview-metric">
          <span className="gulf-overview-metric-icon violet">
            <Icon name="folder" size={18} />
          </span>
          <span className="gulf-overview-metric-label">Active projects</span>
          <strong>8 / 8</strong>
        </article>
        <article className="gulf-overview-metric">
          <span className="gulf-overview-metric-icon amber">
            <Icon name="clock" size={18} />
          </span>
          <span className="gulf-overview-metric-label">Added in the last 7 days</span>
          <strong>4</strong>
        </article>
      </div>
      <div className="gulf-overview-grid">
        <section className="gulf-overview-card">
          <div className="gulf-overview-card-heading">
            <div>
              <h2>Storage by project</h2>
              <p>Files and storage used</p>
            </div>
            <Icon name="chart" size={18} />
          </div>
          <div className="gulf-storage-list">
            {projectStorage.map((project) => (
              <div className="gulf-storage-item" key={project.name}>
                <div className="gulf-storage-label">
                  <span>
                    <i style={{ background: project.color }} />
                    {project.name}
                  </span>
                  <b>
                    {project.size} · {project.count}
                  </b>
                </div>
                <div className="gulf-storage-track">
                  <i style={{ width: `${project.ratio}%`, background: project.color }} />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="gulf-overview-card gulf-file-types-card">
          <div className="gulf-overview-card-heading">
            <div>
              <h2>File types</h2>
              <p>Breakdown by format</p>
            </div>
            <Icon name="file-text" size={18} />
          </div>
          <div className="gulf-type-row">
            <span className="gulf-type-icon pdf">
              <Icon name="file-text" size={17} />
            </span>
            <span>PDF</span>
            <b>5</b>
          </div>
          <div className="gulf-type-row">
            <span className="gulf-type-icon spreadsheet">
              <Icon name="table" size={17} />
            </span>
            <span>Spreadsheets &amp; data</span>
            <b>2</b>
          </div>
        </section>
        <section className="gulf-overview-card gulf-activity-card">
          <div className="gulf-overview-card-heading">
            <div>
              <h2>Added, last 30 days</h2>
              <p>Asset activity over time</p>
            </div>
            <Icon name="chart" size={18} />
          </div>
          <div aria-label="File activity from October 3, 2026 to today" className="gulf-activity-chart" role="img">
            {activity.map((height, index) => (
              <i key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
          <div className="gulf-chart-axis">
            <span>Oct 3, 2026</span>
            <span>Today</span>
          </div>
        </section>
        <section className="gulf-overview-card gulf-recent-card">
          <div className="gulf-overview-card-heading">
            <div>
              <h2>Recent files</h2>
              <p>Latest assets added to the Data Bank</p>
            </div>
            <Button className="gulf-recent-link" onClick={onOpenAssets}>
              View all <Icon name="arrow-right" size={14} />
            </Button>
          </div>
          <div className="gulf-recent-list">
            {recent.map((asset) => (
              <button className="gulf-recent-file" key={asset.id} onClick={onOpenAssets} type="button">
                <span className={`gulf-file-type ${asset.type === 'PDF' ? 'pdf' : 'sheet'}`}>
                  <Icon name="file-text" size={17} />
                </span>
                <span className="gulf-recent-file-main">
                  <b dir="auto" title={asset.name}>
                    {asset.name}
                  </b>
                  <small>
                    {nodeById.get(asset.node)?.name || 'Natheel Gulf'} · {asset.size} · {asset.added}
                  </small>
                </span>
                <Icon className="gulf-recent-chevron" name="chevron-right" size={15} />
              </button>
            ))}
          </div>
        </section>
      </div>
      <footer className="gulf-footnote">
        <Icon name="lock" size={14} /> Protected by an access code. Labels such as Confidential describe a file; they do not hide it.
      </footer>
    </section>
  )
}

