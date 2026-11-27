export const estados = ['nuevo', 'contactado', 'cotizado', 'ganado', 'perdido'] as const
export const fuentes = ['whatsapp', 'instagram', 'facebook', 'web', 'presencial', 'referido', 'otro'] as const
export const tipos = ['llamada', 'whatsapp', 'correo', 'reunion'] as const
type Estado = typeof estados[number]
type Fuente = typeof fuentes[number]
export type Tipo = typeof tipos[number]
export type Session = { access: string; usuario: { username: string; rol: 'vendedor' | 'administrador' } }
export type Input = { nombre: string; correo: string; telefono: string; interes: string; mensaje: string; fuente: Fuente; asignado_a?: string | null }
export type Lead = Input & { id: number; creado_en: string; actualizado_en: string; estado: Estado; asignado_a: string | null }
export type Interaction = { id: number; lead: number; tipo: Tipo; nota: string; fecha: string; registrada_por: string | null }
type Filters = { q: string; estado: string; fuente: string }
type Metrics = { total: number; por_estado: Record<string, number>; por_fuente: Record<string, number>; tasa_conversion: number }
export const demo = import.meta.env.VITE_USE_MOCKS !== 'false'
const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
export const getSession = (): Session | null => JSON.parse(sessionStorage.getItem('crm-session') || 'null')
export function session(value: Session | null) {
  if (value) sessionStorage.setItem('crm-session', JSON.stringify(value))
  else sessionStorage.removeItem('crm-session')
}
async function request<T>(path: string, method = 'GET', data?: object): Promise<T> {
  const token = getSession()?.access
  const response = await fetch(base + '/api' + path, {
    method, headers: { Accept: 'application/json', ...(data && { 'Content-Type': 'application/json' }), ...(token && { Authorization: 'Bearer ' + token }) },
    ...(data && { body: JSON.stringify(data) }),
  })
  const isJson = response.headers.get('content-type')?.includes('application/json')
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/token/') { session(null); window.location.hash = '/login' }
    const result = isJson ? await response.json().catch(() => null) : null
    const detail = result && typeof result === 'object'
      ? result.detail || Object.values(result).flat().join(' ')
      : ''
    throw new Error(detail || 'La API respondió con un error HTTP ' + response.status + '.')
  }
  if (!isJson) throw new Error('La API devolvió una respuesta en un formato inesperado.')
  return response.json()
}
const names = ['Alicia Robles', 'Bruno Duarte', 'Clara Fuentes', 'Daniel Pineda', 'Elisa Castillo', 'Fabio Sequeira', 'Gabriela Valle', 'Hugo Mora', 'Inés Prado', 'Javier Cruz', 'Karen Soto', 'Leo Reyes', 'Marina Selva', 'Nicolás Ríos', 'Olivia Cano']
const products = ['Taza con nombre', 'Arreglo de rosas', 'Caja sorpresa', 'Peluche personalizado', 'Regalo de graduación']
const initial: Lead[] = names.map((nombre, i) => {
  const day = new Date(Date.UTC(2026, 10, 26 - i, 16)).toISOString()
  return { id: i+1, nombre, correo: 'lead'+(i+1)+'@example.test', telefono: '8000'+String(i+1).padStart(4,'0'), interes: products[i%5], mensaje: '', asignado_a: 'vendedor', estado: estados[i%5], fuente: fuentes[i%7], creado_en: day, actualizado_en: day }
})
const leads = (): Lead[] => JSON.parse(localStorage.getItem('crm-leads-v1') || 'null') ?? initial
const log = (): Interaction[] => JSON.parse(localStorage.getItem('crm-log-v1') || '[]')
const storeLeads = (items: Lead[]) => localStorage.setItem('crm-leads-v1', JSON.stringify(items))
const path = (id: number) => '/leads/' + id + '/'
async function find(id: number) {
  if (!demo) return request<Lead>(path(id))
  const found = leads().find(lead => lead.id === id)
  if (!found) throw new Error('No se encontró el lead.')
  return found
}
export const api = {
  async login(username: string, password: string): Promise<Session> {
    if (!demo) return request('/auth/token/', 'POST', {username, password})
    if (!['vendedor','admin'].includes(username) || password !== 'demo') throw new Error('Usuario o contraseña incorrectos.')
    return { access: 'demo', usuario: { username, rol: username === 'admin' ? 'administrador' : 'vendedor' } }
  },
  async list(filters: Filters) {
    if (!demo) return request<Lead[]>('/leads/?'+new URLSearchParams(filters))
    const q = filters.q.trim().toLowerCase()
    return leads().filter(item => (!filters.estado || item.estado === filters.estado) && (!filters.fuente || item.fuente === filters.fuente) &&
      [item.nombre,item.correo,item.telefono,item.interes].some(v => v.toLowerCase().includes(q)))
  },
  find,
  async save(input: Input, id?: number) {
    if (!demo) return request<Lead>(id ? path(id) : '/leads/', id ? 'PUT' : 'POST', input)
    const prior = id ? await find(id) : undefined
    const all = leads()
    const now = new Date().toISOString()
    const item: Lead = { ...input, id: id ?? Math.max(0, ...all.map(x => x.id))+1, estado: prior?.estado ?? 'nuevo',
      creado_en: prior?.creado_en ?? now, actualizado_en: now, asignado_a: input.asignado_a ?? null }
    storeLeads(prior ? all.map(x => x.id === id ? item : x) : [item, ...all])
    return item
  },
  async status(id: number, estado: Estado) {
    if (!demo) return request<Lead>(path(id)+'estado/', 'PATCH', {estado})
    const item = { ...await find(id), estado, actualizado_en: new Date().toISOString() }
    storeLeads(leads().map(x => x.id === id ? item : x))
    return item
  },
  async interactions(id: number) {
    if (!demo) return request<Interaction[]>(path(id)+'interacciones/')
    return log().filter(item => item.lead === id).sort((a,b) => b.fecha.localeCompare(a.fecha) || b.id-a.id)
  },
  async add(id: number, input: Pick<Interaction,'tipo'|'nota'|'fecha'>) {
    if (!demo) return request<Interaction>(path(id)+'interacciones/', 'POST', input)
    await find(id)
    const items = log()
    const item = {...input, lead: id, id: Math.max(0,...items.map(x=>x.id))+1, registrada_por: getSession()?.usuario.username ?? null}
    localStorage.setItem('crm-log-v1',JSON.stringify([...items,item]))
    return item
  },
  async metrics(): Promise<Metrics> {
    if (!demo) return request('/metricas/')
    const all = leads()
    const count = (keys: readonly string[], field: 'estado'|'fuente') => Object.fromEntries(keys.map(key => [key,all.filter(x=>x[field]===key).length]))
    const por_estado = count(estados,'estado')
    return {total:all.length,por_estado,por_fuente:count(fuentes,'fuente'),tasa_conversion: all.length ? Math.round(10000*por_estado.ganado/all.length)/100 : 0}
  },
}
