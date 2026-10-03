import {useEffect,useState} from 'react';
import {beginCognito} from '../api/cognito';
import {post,request,TOKEN_KEY} from '../api/client';
import type {MeResponse,Membership} from '../api/contracts';
export const WORKSPACE_TENANT='sonomarzi.workspace.tenant',WORKSPACE_AGENCY='sonomarzi.workspace.agency';
export function selectWorkspace(tenant:string,agency:string){sessionStorage.setItem(WORKSPACE_TENANT,tenant);sessionStorage.setItem(WORKSPACE_AGENCY,agency);}
export function useAuth(){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[memberships,setMemberships]=useState<Membership[]>([]),[manual,setManual]=useState(false);
 const resolve=async()=>{
  const me=await request<MeResponse>('/me');const active=me.memberships.filter(m=>m.status==='active');
  if(active.length===1){selectWorkspace(active[0].tenant_id,active[0].agency_id);if(!document.getElementById('app')?.classList.contains('authenticated'))await window.SonoMarziLegacy.signIn();return;}
  if(active.length>1){setMemberships(active);return;}
  if(me.user.platform_admin){setManual(true);return;}
  throw Error('No active agency membership is assigned to this account.');
 };
 useEffect(()=>{if(sessionStorage.getItem(TOKEN_KEY))void resolve().catch(e=>setError(e instanceof Error?e.message:'Session could not be restored.'));},[]);
 const signIn=async(email:string,password:string)=>{
  if(busy)return;setBusy(true);setError('');
  try{
   if(window.SonoMarziConfig.mode==='aws'&&!sessionStorage.getItem(TOKEN_KEY)){await beginCognito(window.SonoMarziConfig);return;}
   if(window.SonoMarziConfig.mode==='local'){const data=await post<{token:string}>('/auth/login',{email:email.trim(),password});sessionStorage.setItem(TOKEN_KEY,data.token);}
   await resolve();
  }catch(e){setError(e instanceof Error?e.message:'Sign-in failed.');}finally{setBusy(false);}
 };
 const choose=async(tenant:string,agency:string)=>{
  if(busy)return;setBusy(true);setError('');try{selectWorkspace(tenant,agency);await window.SonoMarziLegacy.signIn();}catch(e){setError(e instanceof Error?e.message:'Workspace could not be opened.');}finally{setBusy(false);}
 };
 const reset=()=>{sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(WORKSPACE_TENANT);sessionStorage.removeItem(WORKSPACE_AGENCY);setMemberships([]);setManual(false);setError('');};
 return {busy,error,signIn,choose,memberships,manual,reset};
}
