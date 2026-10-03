import {createRoot} from 'react-dom/client';
import {configuration,createCompatibilityClient} from '../api/client';import {completeCognito} from '../api/cognito';import {Login} from './Login';import {WorkspaceSwitcher} from './WorkspaceSwitcher';import {request,TOKEN_KEY} from '../api/client';import type {MeResponse} from '../api/contracts';import {selectWorkspace} from '../hooks/useAuth';
async function script(path:string){await new Promise<void>((resolve,reject)=>{const element=document.createElement('script');element.src=path;element.onload=()=>resolve();element.onerror=()=>reject(new Error('The application could not be loaded.'));document.body.append(element);});}
async function boot(){
 window.SonoMarziConfig=await configuration();window.SonoMarziClient=createCompatibilityClient();
 if(window.SonoMarziConfig.mode==='aws')await completeCognito(window.SonoMarziConfig);
 if(sessionStorage.getItem(TOKEN_KEY)){try{const me=await request<MeResponse>('/me');const active=me.memberships.filter(m=>m.status==='active');if(active.length===1)selectWorkspace(active[0].tenant_id,active[0].agency_id);}catch{/* The React login screen reports the reason after startup. */}}
 await script('/assets/vendor.js');await script('/assets/app.js');await window.SonoMarziReady;
 const container=document.getElementById('loginFormFields');if(!container)throw new Error('The login container is missing.');createRoot(container).render(<Login/>);
 const switcher=document.getElementById('workspaceReactSlot');if(switcher)createRoot(switcher).render(<WorkspaceSwitcher/>);
}
void boot().catch(e=>{const host=document.getElementById('loginLoading');if(host){host.style.display='';host.textContent=e instanceof Error?e.message:'Application startup failed.';host.setAttribute('role','alert');}});
