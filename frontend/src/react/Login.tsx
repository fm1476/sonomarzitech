import {useState} from 'react';import {useAuth} from '../hooks/useAuth';import {Button} from '../components/Button';import {FormField} from '../components/FormField';
export function Login(){const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[tenant,setTenant]=useState(''),[agency,setAgency]=useState('');const {busy,error,signIn,choose,memberships,manual,reset}=useAuth();const local=window.SonoMarziConfig.mode==='local';
 if(memberships.length||manual)return <div><h2>Choose a workspace</h2>{memberships.map(m=><Button key={`${m.tenant_id}/${m.agency_id}`} type="button" disabled={busy} onClick={()=>void choose(m.tenant_id,m.agency_id)} style={{display:'block',width:'100%',marginTop:8}}>{m.tenant_name??m.tenant_id} · {m.agency_name??m.agency_id}</Button>)}
 {manual&&<form onSubmit={event=>{event.preventDefault();void choose(tenant.trim(),agency.trim());}}><FormField label="Tenant ID" value={tenant} required onChange={e=>setTenant(e.target.value)}/><FormField label="Agency ID" value={agency} required onChange={e=>setAgency(e.target.value)}/><Button disabled={busy}>Open workspace</Button></form>}
 {error&&<p role="alert" className="field-error">{error}</p>}<button type="button" className="btn btn-outline" onClick={reset}>Use another account</button></div>;
 return <form onSubmit={event=>{event.preventDefault();void signIn(email,password);}}>
 {local&&<><FormField label="Email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/><FormField label="Password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></>}
 {error&&<p role="alert" className="field-error">{error}</p>}
 <Button type="submit" disabled={busy} style={{width:'100%',justifyContent:'center'}}>{busy?'Signing in…':local?'Sign in':'Sign in with Cognito'}</Button>
 {local&&<p className="hint">Local test workspace</p>}
 </form>;
}
