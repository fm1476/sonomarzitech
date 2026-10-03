import {useEffect,useState} from 'react';import {request} from '../api/client';import type {MeResponse,Membership} from '../api/contracts';import {selectWorkspace} from '../hooks/useAuth';
export function WorkspaceSwitcher(){const [items,setItems]=useState<Membership[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{void request<MeResponse>('/me').then(me=>setItems(me.memberships.filter(m=>m.status==='active'))).catch(e=>setError(e instanceof Error?e.message:'Workspaces unavailable.'));},[]);
 if(items.length<2)return null;
 const current=window.SonoMarziLegacy.context();return <div className="workspace-switcher"><label htmlFor="workspace-switch">Workspace</label><select id="workspace-switch" value={`${current.tenantId}/${current.agencyId}`} disabled={busy} onChange={async e=>{const [tenant,agency]=e.target.value.split('/');setBusy(true);setError('');try{await window.SonoMarziLegacy.changeContext(tenant,agency);selectWorkspace(tenant,agency);}catch(err){setError(err instanceof Error?err.message:'Could not switch workspace.');}finally{setBusy(false);}}}>
 {items.map(m=><option key={`${m.tenant_id}/${m.agency_id}`} value={`${m.tenant_id}/${m.agency_id}`}>{m.tenant_name??m.tenant_id} · {m.agency_name??m.agency_id}</option>)}
 </select>{error&&<span role="alert">{error}</span>}</div>;
}
