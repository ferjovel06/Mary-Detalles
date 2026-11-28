import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { FormEvent } from 'react'
import { api, demo, estados, fuentes, tipos, getSession, session } from './api'
import type { Input, Lead, Session, Tipo } from './api'
import './crm.css'

const route = () => window.location.hash.slice(1) || '/leads'
const go = (path: string) => { window.location.hash = path }
const label = (value: string) => ({ whatsapp: 'WhatsApp', web: 'Formulario web', reunion: 'Reunión' }[value] || value.charAt(0).toUpperCase()+value.slice(1))
const options = (items: readonly string[]) => items.map(value => <option key={value} value={value}>{label(value)}</option>)
const formatDate = (value: string) => new Intl.DateTimeFormat('es-NI', {dateStyle:'medium'}).format(new Date(value))
const message = (error: unknown) => error instanceof Error ? error.message : 'Ocurrió un error.'
const notice = (error: string) => error && <p className="error" role="alert">{error}</p>
const badge = (estado: string) => <span className={'badge '+estado}>{label(estado)}</span>

function useData<T>(request: () => Promise<T>) {
  const [data,setData] = useState<T>()
  const [error,setError] = useState('')
  useEffect(() => {
    let active = true
    request().then(result => { if(active){setData(result);setError('')} }).catch(reason => { if(active)setError(message(reason)) })
    return () => { active = false }
  },[request])
  return {data,error,setData}
}

function Login({onLogin}:{onLogin:(value: Session)=>void}) {
  const [error,setError] = useState('')
  const [busy,setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setBusy(true); setError('')
    try { onLogin(await api.login(String(data.get('user')).trim(),String(data.get('pass')))) }
    catch (reason) { setError(message(reason)) }
    finally { setBusy(false) }
  }
  return <main className="login"><section className="panel login-card">
    <span className="mark">MD</span><h1>Mary Detalles</h1><p>Acceso al CRM</p>
    <form className="stack" onSubmit={submit}>
      <label>Usuario<input name="user" autoComplete="username" required /></label>
      <label>Contraseña<input name="pass" type="password" autoComplete="current-password" required /></label>
      {notice(error)}<button disabled={busy}>{busy?'Ingresando…':'Iniciar sesión'}</button>
    </form>
    {demo && <p className="demo">Demostración · Usuario <b>vendedor</b> o <b>admin</b>, contraseña <b>demo</b>.</p>}
  </section></main>
}

function Listing() {
  const [filters,setFilters] = useState({q:'',estado:'',fuente:''})
  return <><div className="heading"><div><h1>Leads</h1><p>Contactos y oportunidades comerciales</p></div><a className="button" href="#/leads/nuevo">Registrar lead</a></div>
    <section className="panel"><div className="filters">
      <label>Buscar<input placeholder="Nombre, correo, teléfono o interés" value={filters.q} onChange={e=>setFilters({...filters,q:e.target.value})}/></label>
      <label>Estado<select value={filters.estado} onChange={e=>setFilters({...filters,estado:e.target.value})}><option value="">Todos</option>{options(estados)}</select></label>
      <label>Fuente<select value={filters.fuente} onChange={e=>setFilters({...filters,fuente:e.target.value})}><option value="">Todas</option>{options(fuentes)}</select></label>
    </div><Results key={JSON.stringify(filters)} filters={filters}/></section></>
}
function Results({filters}:{filters:{q:string;estado:string;fuente:string}}) {
  const [request] = useState(() => () => api.list(filters))
  const {data,error} = useData(request)
  if(error) return notice(error)
  if(!data) return <p role="status">Cargando leads…</p>
  if(!data.length) return <p role="status">No se encontraron leads con estos filtros.</p>
  return <div className="table-wrap"><table><thead><tr><th>Nombre</th><th>Interés</th><th>Fuente</th><th>Estado</th><th>Fecha de registro</th></tr></thead>
    <tbody>{data.map(item=><tr key={item.id}><td><a href={'#/leads/'+item.id}>{item.nombre}</a></td><td>{item.interes}</td><td>{label(item.fuente)}</td><td>{badge(item.estado)}</td><td>{formatDate(item.creado_en)}</td></tr>)}</tbody></table></div>
}

function Editor({lead}:{lead?:Lead}) {
  const [error,setError] = useState('')
  const [busy,setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const value = (key:string) => String(values.get(key) || '').trim()
    const input: Input = {nombre:value('nombre'),correo:value('correo'),telefono:value('telefono'),interes:value('interes'),
      fuente:value('fuente') as Input['fuente'],mensaje:value('mensaje'),asignado_a:value('asignado_a') || null}
    if(!input.nombre || !input.correo || !input.telefono || !input.interes){setError('Completá los campos obligatorios.');return}
    setBusy(true);setError('')
    try { go('/leads/'+(await api.save(input,lead?.id)).id) }
    catch(reason){setError(message(reason))}
    finally{setBusy(false)}
  }
  return <><a href={lead?'#/leads/'+lead.id:'#/leads'}>← Volver</a><h1>{lead?'Editar lead':'Registrar lead'}</h1>
    <form className="panel grid" onSubmit={submit}>
      <label>Nombre<input name="nombre" required maxLength={120} defaultValue={lead?.nombre}/></label>
      <label>Correo<input name="correo" type="email" required maxLength={254} defaultValue={lead?.correo}/></label>
      <label>Teléfono<input name="telefono" type="tel" required maxLength={25} defaultValue={lead?.telefono}/></label>
      <label>Interés<input name="interes" required maxLength={200} defaultValue={lead?.interes}/></label>
      <label>Fuente<select name="fuente" defaultValue={lead?.fuente || 'web'}>{options(fuentes)}</select></label>
      <label>Usuario vendedor (opcional)<input name="asignado_a" maxLength={150} defaultValue={lead?.asignado_a ?? ''}/></label>
      <label className="wide">Mensaje (opcional)<textarea name="mensaje" rows={4} maxLength={2000} defaultValue={lead?.mensaje}/></label>
      <div className="wide">{notice(error)}<button disabled={busy}>{busy?'Guardando…':'Guardar lead'}</button></div>
    </form></>
}

function LeadPage({id,edit}:{id:number;edit:boolean}) {
  const [request] = useState(() => () => api.find(id))
  const {data,error} = useData(request)
  return error ? notice(error) : !data ? <p role="status">Cargando lead…</p> : edit ? <Editor lead={data}/> : <Detail initial={data}/>
}

function Detail({initial}:{initial:Lead}) {
  const [lead,setLead] = useState(initial)
  const [error,setError] = useState('')
  const [busy,setBusy] = useState(false)
  async function change(event:FormEvent<HTMLFormElement>){
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setBusy(true);setError('')
    try{setLead(await api.status(lead.id,data.get('estado') as Lead['estado']))}
    catch(reason){setError(message(reason))}
    finally{setBusy(false)}
  }
  return <><a href="#/leads">← Volver a leads</a><div className="heading"><div><h1>{lead.nombre}</h1><p>{lead.interes}</p></div>
    <a className="button secondary" href={'#/leads/'+lead.id+'/editar'}>Editar lead</a></div>
    <div className="grid"><section className="panel"><h2>Datos de contacto</h2><dl>
      <dt>Correo</dt><dd>{lead.correo}</dd><dt>Teléfono</dt><dd>{lead.telefono}</dd><dt>Fuente</dt><dd>{label(lead.fuente)}</dd>
      <dt>Fecha de registro</dt><dd>{formatDate(lead.creado_en)}</dd><dt>Vendedor</dt><dd>{lead.asignado_a || 'Sin asignar'}</dd>
      {lead.mensaje && <><dt>Mensaje</dt><dd>{lead.mensaje}</dd></>}</dl></section>
      <section className="panel"><h2>Estado actual</h2>{badge(lead.estado)}{demo ? <form className="stack after" onSubmit={change}>
        <label>Nuevo estado<select name="estado" defaultValue={lead.estado}>{options(estados)}</select></label>
        {notice(error)}<button disabled={busy}>Cambiar estado</button>
      </form> : <p className="after">El cambio de estado estará disponible en Semana 5.</p>}</section></div>
    {demo ? <Interactions id={lead.id}/> : <section className="panel after"><h2>Interacciones</h2><p>El historial y el registro de interacciones estarán disponibles en Semana 5.</p></section>}</>
}

function Interactions({id}:{id:number}) {
  const [request] = useState(() => () => api.interactions(id))
  const {data,error,setData} = useData(request)
  const [formError,setFormError] = useState('')
  const [busy,setBusy] = useState(false)
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault()
    const form=event.currentTarget
    const values=new FormData(form)
    const nota=String(values.get('nota')).trim()
    if(!nota){setFormError('Escribí una nota.');return}
    setBusy(true);setFormError('')
    try{
      const item=await api.add(id,{nota,tipo:values.get('tipo') as Tipo,fecha:new Date(String(values.get('fecha'))).toISOString()})
      setData(old=>[...(old??[]),item].sort((a,b)=>b.fecha.localeCompare(a.fecha)||b.id-a.id));form.reset()
    }catch(reason){setFormError(message(reason))}
    finally{setBusy(false)}
  }
  return <section className="panel after"><h2>Interacciones</h2>{notice(error)}
    {data && (data.length ? <ul>{data.map(item=><li key={item.id}><strong>{label(item.tipo)}</strong> · {formatDate(item.fecha)}<p>{item.nota}</p></li>)}</ul> : <p>Aún no hay interacciones.</p>)}
    <form className="grid" onSubmit={submit}><label>Tipo<select name="tipo">{options(tipos)}</select></label>
      <label>Fecha<input name="fecha" type="datetime-local" required/></label><label className="wide">Nota<textarea name="nota" rows={3} maxLength={2000} required/></label>
      <div className="wide">{notice(formError)}<button disabled={busy}>Registrar interacción</button></div>
    </form></section>
}

function Metrics() {
  const {data,error}=useData(api.metrics)
  const chart=(title:string,counts:Record<string,number>)=><section className="panel"><h2>{title}</h2><ul className="chart">
    {Object.entries(counts).map(([key,count])=><li key={key}><span>{label(key)}</span><span className="bar"><span style={{width:(data?.total ? count/data.total*100 : 0)+'%'}}/></span><b>{count}</b></li>)}</ul></section>
  return <><h1>Métricas</h1>{notice(error)}{data && <>
    <div className="grid summary"><section className="panel"><h2>Total de leads</h2><strong>{data.total}</strong></section>
      <section className="panel"><h2>Tasa de conversión</h2><strong>{data.tasa_conversion}%</strong><p>Leads ganados sobre el total.</p></section></div>
    <div className="grid">{chart('Leads por estado',data.por_estado)}{chart('Leads por fuente',data.por_fuente)}</div></>}</>
}

function App(){
  const [path,setPath]=useState(route)
  const [user,setUser]=useState(getSession)
  useEffect(()=>{
    const sync=()=>{setPath(route());setUser(getSession())}
    window.addEventListener('hashchange',sync)
    return ()=>window.removeEventListener('hashchange',sync)
  },[])
  useEffect(()=>{if(!user&&path!=='/login')go('/login');if(user&&path==='/login')go('/leads')},[path,user])
  if(!user)return <Login onLogin={value=>{session(value);setUser(value);go('/leads')}}/>
  const match=path.match(/^\/leads\/(\d+)(\/editar)?$/)
  const content=path==='/metricas'
    ? (demo ? <Metrics/> : <><h1>Métricas</h1><p>Las métricas con datos reales estarán disponibles en Semana 5.</p></>)
    : path==='/leads/nuevo'?<Editor/>:match?<LeadPage key={path} id={Number(match[1])} edit={!!match[2]}/>:<Listing/>
  return <><header><div className="shell nav"><a className="brand" href="#/leads"><span className="mark">MD</span>Mary Detalles CRM</a>
    <nav aria-label="Menú principal"><a href="#/leads" aria-current={path.startsWith('/leads')?'page':undefined}>Leads</a><a href="#/metricas" aria-current={path==='/metricas'?'page':undefined}>Métricas</a></nav>
    <div className="account"><span>{user.usuario.username} · {label(user.usuario.rol)}</span><button className="secondary" onClick={()=>{session(null);setUser(null);go('/login')}}>Cerrar sesión</button></div></div></header>
    <main className="shell content">{content}</main></>
}

createRoot(document.getElementById('root')!).render(<App/>)
