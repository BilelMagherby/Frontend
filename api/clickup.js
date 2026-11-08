const CLICKUP_API = 'https://api.clickup.com/api/v2'
const CACHE_DURATION = 20_000
const PAGE_SIZE = 100
const TASK_LIMIT = 1_000

let cachedData
let cachedAt = 0
let pendingRequest

class ClickUpRequestError extends Error {
  constructor(message, statusCode = 502) {
    super(message)
    this.statusCode = statusCode
  }
}

async function clickupGet(path, token) {
  let response
  try {
    response = await fetch(`${CLICKUP_API}${path}`, {
      headers: { Accept: 'application/json', Authorization: token },
      signal: AbortSignal.timeout(12_000),
    })
  } catch {
    throw new ClickUpRequestError('Could not connect to ClickUp. Try again shortly.')
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new ClickUpRequestError('ClickUp returned an invalid response.')
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new ClickUpRequestError('ClickUp rejected the configured token. Check CLICKUP_API_TOKEN in Vercel.', 502)
    }
    if (response.status === 429) {
      throw new ClickUpRequestError('ClickUp rate limit reached. Wait briefly, then sync again.', 503)
    }
    throw new ClickUpRequestError(`ClickUp request failed (${response.status}).`)
  }
  return data
}

async function loadClickup(token) {
  const { teams = [] } = await clickupGet('/team', token)
  if (!Array.isArray(teams)) throw new ClickUpRequestError('ClickUp returned an invalid workspace list.')

  const workspaces = teams.map((team) => ({
    id: String(team.id),
    name: team.name || 'ClickUp workspace',
    url: `https://app.clickup.com/${encodeURIComponent(team.id)}`,
  }))
  const membersById = new Map()
  const tasksById = new Map()
  let truncated = false

  for (const team of teams) {
    for (const entry of team.members || []) {
      const user = entry.user || entry
      const id = String(user.id || user.username || user.email || '')
      const name = user.username || user.email || user.name || id
      if (id && name && !membersById.has(id)) {
        membersById.set(id, {
          id,
          name,
          username: user.username || name,
          profilePicture: user.profilePicture || '',
        })
      }
    }

    for (let page = 0; page < TASK_LIMIT / PAGE_SIZE; page += 1) {
      const result = await clickupGet(
        `/team/${encodeURIComponent(team.id)}/task?include_closed=true&page=${page}`,
        token,
      )
      const pageTasks = Array.isArray(result.tasks) ? result.tasks : []
      const remaining = TASK_LIMIT - tasksById.size

      for (const task of pageTasks.slice(0, remaining)) {
        if (task.id) tasksById.set(String(task.id), task)
        for (const assignee of task.assignees || []) {
          const id = String(assignee.id || assignee.username || '')
          const name = assignee.username || assignee.email || assignee.name || id
          if (id && name && !membersById.has(id)) {
            membersById.set(id, {
              id,
              name,
              username: assignee.username || name,
              profilePicture: assignee.profilePicture || '',
            })
          }
        }
      }

      if (pageTasks.length > remaining) truncated = true
      if (tasksById.size >= TASK_LIMIT) {
        if (teams.indexOf(team) < teams.length - 1 || pageTasks.length > remaining) truncated = true
        break
      }
      if (result.last_page || pageTasks.length < PAGE_SIZE) break
      if (page === TASK_LIMIT / PAGE_SIZE - 1) truncated = true
    }
    if (tasksById.size >= TASK_LIMIT) break
  }

  const tasks = [...tasksById.values()]
  const spaces = [...new Map(tasks
    .filter((task) => task.space?.id && task.space?.name)
    .map((task) => [String(task.space.id), { id: String(task.space.id), name: task.space.name }])).values()]

  return {
    configured: true,
    tasks,
    members: [...membersById.values()],
    workspaces,
    spaces,
    truncated,
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store')

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const token = process.env.CLICKUP_API_TOKEN
  if (!token) {
    return res.status(200).json({ configured: false, tasks: [], members: [], workspaces: [], spaces: [] })
  }

  const force = req.query?.force === '1'
  if (!force && cachedData && Date.now() - cachedAt < CACHE_DURATION) {
    return res.status(200).json(cachedData)
  }
  if (pendingRequest) {
    try {
      return res.status(200).json(await pendingRequest)
    } catch (error) {
      return res.status(error.statusCode || 502).json({ error: error.message })
    }
  }

  const request = loadClickup(token)
  pendingRequest = request
  try {
    const data = await request
    cachedData = data
    cachedAt = Date.now()
    return res.status(200).json(data)
  } catch (error) {
    return res.status(error.statusCode || 502).json({ error: error.message || 'ClickUp sync failed.' })
  } finally {
    if (pendingRequest === request) pendingRequest = null
  }
}
