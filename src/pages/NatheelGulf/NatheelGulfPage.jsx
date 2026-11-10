import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { api } from '../../services/api.js'
import { GulfCoreHubOverview } from './GulfCoreHubOverview.jsx'
import { EmailClientPage } from './EmailClientPage.jsx'

export function NatheelGulfPage({
  nodes = [],
  setNodes,
  assets = [],
  setAssets,
  contacts = [],
  onSaveContacts,
  selectedNode,
  setSelectedNode,
  activeSection,
  setActiveSection,
  onLock,
  onToast,
  config = {},
  currentUser,
  onError,
}) {
  const [query, setQuery] = useState('')
  const [pendingFiles, setPendingFiles] = useState([])
  const [uploadLabel, setUploadLabel] = useState('Internal')
  const [uploadTags, setUploadTags] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
  const [uploading, setUploading] = useState(false)
  const uploadInput = useRef(null)
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const getDescendantIds = (nodeId) => {
    const children = nodes.filter((node) => node.parent === nodeId)
    return [nodeId, ...children.flatMap((child) => getDescendantIds(child.id))]
  }
  const scopedNodeIds = new Set(getDescendantIds(selectedNode))
  const visibleAssets = assets.filter(
    (asset) =>
      scopedNodeIds.has(asset.node) &&
      (!query ||
        `${asset.name} ${asset.description} ${nodeById.get(asset.node)?.name || ''}`
          .toLowerCase()
          .includes(query.toLowerCase()))
  )
  useEffect(() => setQuery(''), [selectedNode])
  const selected = nodeById.get(selectedNode) || nodes[0]
  const isRoot = selectedNode === 'natheel-gulf'
  const sizeLabel = (size) =>
    size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`
  const getNodePath = (node) => {
    const parts = []
    let current = node
    while (current) {
      parts.unshift(current.name)
      current = nodeById.get(current.parent)
    }
    return parts.join(' › ')
  }
  const addPendingFiles = (fileList) => {
    const validFiles = []
    const oversizedNames = []
    for (const file of fileList) {
      if (file.size > 100 * 1024 * 1024) oversizedNames.push(file.name)
      else validFiles.push(file)
    }
    if (oversizedNames.length) {
      onToast(
        `${oversizedNames.join(', ')} ${oversizedNames.length === 1 ? 'exceeds' : 'exceed'} the 100 MB per-file limit.`
      )
    }
    if (validFiles.length) setPendingFiles((current) => [...current, ...validFiles])
  }
  const addProject = async (parent) => {
    const name = window.prompt(parent ? 'New sub-project name' : 'New core project name')
    if (!name?.trim()) return
    const id = `gulf-${Date.now()}`
    const nextNodes = [...nodes, { id, name: name.trim(), parent, color: '#0f766e' }]
    try {
      await api.patch('gulf/main', { nodes: nextNodes })
      setNodes(nextNodes)
      setSelectedNode(id)
      onToast(`${name.trim()} added to the asset structure.`)
    } catch (error) {
      onError?.(`Could not save the project: ${error.message}`)
    }
  }
  const uploadFiles = async () => {
    setUploading(true)
    const records = []
    let completed = 0
    let saved = false
    try {
      for (const file of pendingFiles) {
        const uploaded = await api.uploadFile(file, 'gulf')
        records.push({
          id: `upload-${Date.now()}-${completed}`,
          fileId: uploaded.id,
          name: file.name,
          description: uploadDescription.trim() || file.type || 'Uploaded asset',
          node: selectedNode,
          security: uploadLabel,
          size: sizeLabel(file.size),
          uploadedBy: currentUser?.name || 'Unknown user',
          added: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
          type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
          tags: uploadTags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        })
        completed += 1
      }
      if (records.length) {
        await api.patch('gulf/main', { assets: [...records, ...assets] })
        setAssets((current) => [...records, ...current])
        saved = true
      }
    } catch (error) {
      const cleanup = await Promise.allSettled(records.map((record) => api.deleteFile(record.fileId)))
      const cleanupFailed = cleanup.some((result) => result.status === 'rejected')
      onError?.(
        `Could not upload ${pendingFiles[completed]?.name || 'file'}: ${error.message}${
          cleanupFailed ? ' Some uploaded files could not be removed.' : ''
        }`
      )
    } finally {
      if (saved) {
        setPendingFiles((current) => current.slice(completed))
        setUploadTags('')
        setUploadDescription('')
        onToast(`${records.length} file${records.length === 1 ? '' : 's'} uploaded to the shared asset library.`)
      }
      setUploading(false)
    }
  }
  return (
    <div className="gulf-asset-page">
      <header className="gulf-brand-bar">
        <div className="gulf-brand">
          <img
            alt=""
            onError={(event) => {
              event.currentTarget.hidden = true
            }}
            src="/img/logo.png"
          />
          <div>
            <b lang="ar" dir="rtl">
              مؤسسة نثيل الخليج للخدمات التجارية
            </b>
            <span>Natheel Gulf Commercial Services</span>
          </div>
        </div>
        <div className="gulf-brand-actions">
          <span className="gulf-user">
            <Icon name="user" size={15} /> {currentUser?.name || 'Signed-in user'}
          </span>
          <span className="gulf-protected">
            <Icon name="lock" size={14} /> Protected
          </span>
          <Button className="gulf-lock-btn" onClick={onLock}>
            <Icon name="lock" size={14} /> Lock
          </Button>
        </div>
      </header>
      <nav aria-label="Asset workspace navigation" className="gulf-workspace-nav">
        <button
          aria-current={activeSection === 'overview' ? 'page' : undefined}
          className={activeSection === 'overview' ? 'active' : ''}
          onClick={() => setActiveSection('overview')}
          type="button"
        >
          <Icon name="dashboard" size={15} /> Core Hub
        </button>
        <button
          aria-current={activeSection === 'files' ? 'page' : undefined}
          className={activeSection === 'files' ? 'active' : ''}
          onClick={() => setActiveSection('files')}
          type="button"
        >
          <Icon name="folder" size={15} /> Matrix Hierarchy &amp; Files
        </button>
        <button
          aria-current={activeSection === 'ingestion' ? 'page' : undefined}
          className={activeSection === 'ingestion' ? 'active' : ''}
          onClick={() => setActiveSection('ingestion')}
          type="button"
        >
          <Icon name="upload" size={15} /> Asset Ingestion
        </button>
        <button
          aria-current={activeSection === 'email' ? 'page' : undefined}
          className={activeSection === 'email' ? 'active' : ''}
          onClick={() => setActiveSection('email')}
          type="button"
        >
          <Icon name="mail" size={15} /> Email Client
        </button>
      </nav>
      <input
        aria-label="Choose files to upload"
        className="gulf-upload-input"
        multiple
        onChange={(event) => {
          addPendingFiles(event.target.files || [])
          event.target.value = ''
        }}
        ref={uploadInput}
        type="file"
      />
      {activeSection === 'overview' ? (
        <GulfCoreHubOverview assets={assets} nodes={nodes} onOpenAssets={() => setActiveSection('files')} />
      ) : activeSection === 'ingestion' ? (
        <section aria-labelledby="gulf-upload-title" className="gulf-ingestion">
          <header className="gulf-page-heading">
            <div>
              <span className="gulf-eyebrow">
                <Icon name="upload" size={14} /> ASSET INGESTION
              </span>
              <h1 id="gulf-upload-title">Upload</h1>
              <p>Any file type. Files open in a new tab or can be saved back to your computer.</p>
            </div>
          </header>
          <div className="gulf-ingestion-card">
            <div className="gulf-ingestion-fields">
              <label className="gulf-ingestion-field">
                <span>Project</span>
                <select onChange={(event) => setSelectedNode(event.target.value)} value={selectedNode}>
                  {nodes
                    .filter((node) => node.id !== 'unfiled')
                    .map((node) => (
                      <option key={node.id} value={node.id}>
                        {getNodePath(node)}
                      </option>
                    ))}
                  <option value="unfiled">No project (unfiled)</option>
                </select>
              </label>
              <fieldset className="gulf-ingestion-field gulf-label-field">
                <legend>Label</legend>
                <div className="gulf-label-options">
                  {['Internal', 'Confidential', 'Restricted'].map((label) => (
                    <button
                      aria-pressed={uploadLabel === label}
                      className={`gulf-label-option${uploadLabel === label ? ' selected' : ''}`}
                      key={label}
                      onClick={() => setUploadLabel(label)}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="gulf-ingestion-field">
                <span>Tags, comma separated</span>
                <input
                  onChange={(event) => setUploadTags(event.target.value)}
                  placeholder="e.g. invoice, 2026, finance"
                  value={uploadTags}
                />
              </label>
              <label className="gulf-ingestion-field">
                <span>Description for this batch</span>
                <textarea
                  onChange={(event) => setUploadDescription(event.target.value)}
                  placeholder="Add a description shared by these files"
                  rows={3}
                  value={uploadDescription}
                />
              </label>
            </div>
            <div
              className={`gulf-dropzone${isDraggingFiles ? ' dragging' : ''}`}
              onClick={() => uploadInput.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault()
                setIsDraggingFiles(true)
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setIsDraggingFiles(false)
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                setIsDraggingFiles(false)
                addPendingFiles(event.dataTransfer.files)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  uploadInput.current?.click()
                }
              }}
              role="button"
              tabIndex={0}
            >
              <span className="gulf-dropzone-icon">
                <Icon name="upload" size={23} />
              </span>
              <strong>Drop files here or click to choose</strong>
              <span>Any file type, up to 100 MB each</span>
            </div>
            {pendingFiles.length > 0 && (
              <ul aria-label="Files selected for upload" className="gulf-pending-files">
                {pendingFiles.map((file, index) => (
                  <li key={`${file.name}-${file.size}-${file.lastModified}-${index}`}>
                    <Icon name="file-text" size={17} />
                    <span>
                      <b title={file.name}>{file.name}</b>
                      <small>{sizeLabel(file.size)}</small>
                    </span>
                    <button
                      aria-label={`Remove ${file.name}`}
                      className="btn-icon-close"
                      onClick={() => setPendingFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                      type="button"
                    >
                      <Icon name="close" size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="gulf-ingestion-actions">
              <Button className="p" disabled={!pendingFiles.length || uploading} onClick={uploadFiles}>
                <Icon name="upload" size={15} /> {uploading ? 'Uploading…' : 'Upload'}
              </Button>
              <Button
                disabled={!pendingFiles.length && !uploadTags && !uploadDescription}
                onClick={() => {
                  setPendingFiles([])
                  setUploadTags('')
                  setUploadDescription('')
                }}
              >
                Clear list
              </Button>
            </div>
            <p className="gulf-ingestion-note">
              <Icon name="lock" size={14} /> Files and details are uploaded to the protected TaskFlow backend.
            </p>
          </div>
        </section>
      ) : activeSection === 'email' ? (
        <EmailClientPage contacts={contacts} onSaveContacts={onSaveContacts} onToast={onToast} />
      ) : (
        <>
          <header className="gulf-page-heading">
            <div>
              <span className="gulf-eyebrow">
                <Icon name="folder" size={14} /> ENTERPRISE WORKSPACE
              </span>
              <h1>Enterprise Asset Architecture</h1>
              <p>Structure for core operations, child projects and the files filed under each.</p>
            </div>
            <div className="gulf-heading-actions">
              <Button onClick={() => setActiveSection('ingestion')}>
                <Icon name="upload" size={15} /> Upload files
              </Button>
              <Button onClick={() => addProject('natheel-gulf')}>
                <Icon name="plus" size={15} /> New Core Project
              </Button>
              <Button disabled={selectedNode === 'unfiled'} onClick={() => addProject(selectedNode)}>
                <Icon name="plus" size={15} /> New Sub-Project
              </Button>
            </div>
          </header>
          <div className="gulf-layout">
            <section className="gulf-assets-panel card">
              <div className="gulf-assets-heading">
                <div>
                  <span className="gulf-eyebrow">ASSET REGISTER</span>
                  <h2>{selected?.name || 'Natheel Gulf'}</h2>
                  <p>
                    {visibleAssets.length} file{visibleAssets.length === 1 ? '' : 's'}
                    {query ? ' matching your search' : ' in this structure'}
                  </p>
                </div>
                <label className="gulf-search">
                  <Icon name="search" size={16} />
                  <input
                    aria-label="Search assets"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search files or descriptions"
                    value={query}
                  />
                </label>
              </div>
              <div className="gulf-active-filter">
                <span>
                  Active filter: <b>{selected?.name || 'Natheel Gulf'}{isRoot ? ' (All)' : ''}</b>
                </span>
                <Button
                  className="gulf-clear-btn"
                  onClick={() => {
                    setSelectedNode('natheel-gulf')
                    setQuery('')
                  }}
                >
                  Clear
                </Button>
              </div>
              <div aria-label="Enterprise assets" className="gulf-asset-table" role="table">
                <div className="gulf-asset-columns" role="row">
                  {['Data asset structure', 'Assigned path node', 'Security', 'Size', 'Uploaded by', 'Ecosystem action'].map(
                    (label) => (
                      <span key={label} role="columnheader">
                        {label}
                      </span>
                    )
                  )}
                </div>
                {visibleAssets.map((asset) => (
                  <article className="gulf-asset-row" key={asset.id} role="row">
                    <div className="gulf-asset-name" data-label="Data asset structure" role="cell">
                      <span className={`gulf-file-type ${asset.type === 'PDF' ? 'pdf' : 'sheet'}`}>
                        <Icon name="file-text" size={18} />
                      </span>
                      <span>
                        <b dir="auto" title={asset.name}>
                          {asset.name}
                        </b>
                        <small dir="auto">{asset.description || asset.type}</small>
                        {asset.added && <small className="gulf-asset-uploaded">Uploaded {asset.added}</small>}
                      </span>
                    </div>
                    <span className="gulf-path-cell" data-label="Assigned path node" role="cell">
                      <Icon name="folder" size={14} /> {nodeById.get(asset.node)?.name || 'Unfiled files'}
                    </span>
                    <span data-label="Security" role="cell">
                      <span className="gulf-security">
                        <Icon name="lock" size={12} /> {asset.security}
                      </span>
                    </span>
                    <span className="gulf-data-cell" data-label="Size" role="cell">
                      {asset.size}
                    </span>
                    <span className="gulf-data-cell" data-label="Uploaded by" role="cell">
                      {asset.uploadedBy}
                    </span>
                    <span className="gulf-action-cell" data-label="Ecosystem action" role="cell">
                      <span>
                        {asset.fileId && (
                          <button
                            onClick={async () => {
                              try {
                                const blob = await api.downloadFile(asset.fileId)
                                const url = URL.createObjectURL(blob)
                                const link = document.createElement('a')
                                link.href = url
                                link.download = asset.name
                                link.click()
                                URL.revokeObjectURL(url)
                              } catch (error) {
                                onError?.(`Could not download ${asset.name}: ${error.message}`)
                              }
                            }}
                            type="button"
                          >
                            <Icon name="download" size={13} /> Download
                          </button>
                        )}
                      </span>
                    </span>
                  </article>
                ))}
                {!visibleAssets.length && (
                  <div className="gulf-empty" role="row">
                    <span role="cell">
                      <Icon name={query ? 'search' : 'folder'} size={22} />
                      <b>{query ? 'No matching assets' : 'No assets in this project yet'}</b>
                      <span>{query ? 'Try another search.' : 'Files added to this project will appear here.'}</span>
                    </span>
                  </div>
                )}
              </div>
              <footer className="gulf-footnote">
                <Icon name="lock" size={14} /> Security labels are organizational labels, not access controls. Uploaded assets are stored by the backend and require an authenticated account with Natheel Gulf access. Email links open a draft; attach files manually.
              </footer>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
