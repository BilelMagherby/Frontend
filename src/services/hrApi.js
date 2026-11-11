import { api, request } from './api.js'

export const hrApi = {
  getEmployees: async (params = {}) => {
    const query = new URLSearchParams()
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        query.set(key, String(val))
      }
    }
    const queryStr = query.toString() ? `?${query.toString()}` : ''

    try {
      return await request(`/api/hr/employees${queryStr}`)
    } catch {
      // Graceful fallback to document collection
      const docs = await api.list('hr')
      const allEmployees = docs
        .map((row) => ({ id: row.id, ...row.data }))
        .filter((row) => row.module === 'employees' && !row.archivedAt)

      return {
        employees: allEmployees,
        total: allEmployees.length,
        stats: {
          total: allEmployees.length,
          active: allEmployees.filter((e) => (e.data?.status || 'Active') === 'Active').length,
          inactive: allEmployees.filter((e) => e.data?.status === 'Inactive').length,
          onLeave: allEmployees.filter((e) => e.data?.status === 'On leave').length,
          newEmployees: allEmployees.filter((e) => {
            const date = e.data?.startDate || e.createdAt?.slice(0, 10) || ''
            return date && date >= new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
          }).length,
        },
      }
    }
  },

  getEmployee: async (id) => {
    try {
      const res = await request(`/api/hr/employees/${encodeURIComponent(id)}`)
      return res.employee
    } catch {
      const doc = await api.get(`hr/${id}`)
      return doc.exists ? { id, ...doc.data } : null
    }
  },

  createEmployee: async (employeeData) => {
    try {
      const res = await request('/api/hr/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData),
      })
      return res.employee
    } catch (error) {
      // If error is 409 or 400 from backend, throw it directly
      if (error.message && (error.message.includes('already in use') || error.message.includes('required'))) {
        throw error
      }
      // Fallback
      const id = `hr-emp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const record = {
        id,
        module: 'employees',
        company: employeeData.company || 'Natheelco',
        branch: employeeData.branch || 'Main',
        data: {
          ...employeeData,
          name: `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim() || employeeData.name,
          employeeId: employeeData.serialNumber || employeeData.employeeId,
          serialNumber: employeeData.serialNumber || employeeData.employeeId,
          documents: employeeData.documents || [],
        },
        createdAt: new Date().toISOString(),
      }
      await api.put(`hr/${id}`, record)
      return record
    }
  },

  updateEmployee: async (id, employeeData) => {
    try {
      const res = await request(`/api/hr/employees/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData),
      })
      return res.employee
    } catch (error) {
      if (error.message && (error.message.includes('already in use') || error.message.includes('required'))) {
        throw error
      }
      const existing = await api.get(`hr/${id}`)
      const currentData = existing.exists ? existing.data : {}
      const record = {
        ...currentData,
        company: employeeData.company || currentData.company || 'Natheelco',
        branch: employeeData.branch || currentData.branch || 'Main',
        data: {
          ...(currentData.data || {}),
          ...employeeData,
          name: `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim() || employeeData.name,
          employeeId: employeeData.serialNumber || employeeData.employeeId,
          serialNumber: employeeData.serialNumber || employeeData.employeeId,
        },
        updatedAt: new Date().toISOString(),
      }
      await api.put(`hr/${id}`, record)
      return record
    }
  },

  deleteEmployee: async (id) => {
    try {
      await request(`/api/hr/employees/${encodeURIComponent(id)}`, { method: 'DELETE' })
      return { ok: true }
    } catch {
      await api.remove(`hr/${id}`)
      return { ok: true }
    }
  },

  importEmployees: async (employees) => {
    try {
      const res = await request('/api/hr/employees/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees }),
      })
      return res
    } catch {
      // Fallback batch import
      const records = employees.map((emp, index) => {
        const id = `hr-emp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${index}`
        return {
          id,
          module: 'employees',
          company: emp.company || 'Natheelco',
          branch: emp.branch || 'Main',
          data: {
            ...emp,
            name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name,
            employeeId: emp.serialNumber || emp.employeeId,
            serialNumber: emp.serialNumber || emp.employeeId,
            documents: emp.documents || [],
          },
          createdAt: new Date().toISOString(),
        }
      })

      for (let index = 0; index < records.length; index += 500) {
        const batch = records.slice(index, index + 500)
        await request('/api/docs?collection=hr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collection: 'hr',
            items: batch.map((r) => ({ id: r.id, data: r })),
          }),
        })
      }

      return {
        success: true,
        importedCount: records.length,
        failedCount: 0,
        failedRows: [],
        imported: records,
      }
    }
  },

  uploadEmployeeDocument: async (employeeId, file, category = 'Other') => {
    // 1. Upload physical file to private backend storage
    const uploadedFile = await api.uploadFile(file, 'hr')

    // 2. Attach document reference to employee profile
    try {
      const res = await request(`/api/hr/employees/${encodeURIComponent(employeeId)}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: uploadedFile.id,
          name: file.name,
          category,
          size: file.size,
          type: file.type || 'application/octet-stream',
        }),
      })
      return res.document
    } catch {
      // Fallback update
      const existing = await api.get(`hr/${employeeId}`)
      if (existing.exists) {
        const docItem = {
          id: `doc-${Date.now()}`,
          fileId: uploadedFile.id,
          name: file.name,
          category,
          size: file.size,
          type: file.type || 'application/octet-stream',
          uploadedAt: new Date().toISOString(),
          url: uploadedFile.url || `/api/files/${uploadedFile.id}`,
        }
        const updated = {
          ...existing.data,
          data: {
            ...existing.data.data,
            documents: [...(existing.data.data?.documents || []), docItem],
          },
          updatedAt: new Date().toISOString(),
        }
        await api.put(`hr/${employeeId}`, updated)
        return docItem
      }
      throw new Error('Could not attach document to employee profile.')
    }
  },

  deleteEmployeeDocument: async (employeeId, docId, fileId) => {
    try {
      await request(`/api/hr/employees/${encodeURIComponent(employeeId)}/documents/${encodeURIComponent(docId)}`, {
        method: 'DELETE',
      })
    } catch {
      // Fallback
      const existing = await api.get(`hr/${employeeId}`)
      if (existing.exists) {
        const docs = existing.data.data?.documents || []
        const updated = {
          ...existing.data,
          data: {
            ...existing.data.data,
            documents: docs.filter((d) => d.id !== docId && d.fileId !== docId),
          },
          updatedAt: new Date().toISOString(),
        }
        await api.put(`hr/${employeeId}`, updated)
        if (fileId) await api.deleteFile(fileId).catch(() => {})
      }
    }
    return { ok: true }
  },
}
