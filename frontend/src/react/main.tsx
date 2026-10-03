import {createRoot} from 'react-dom/client';import type {Root} from 'react-dom/client';
import {configuration,createCompatibilityClient} from '../api/client';import {completeCognito} from '../api/cognito';import {Login} from './Login';import {WorkspaceSwitcher} from './WorkspaceSwitcher';import {request,TOKEN_KEY} from '../api/client';import type {MeResponse} from '../api/contracts';import {selectWorkspace} from '../hooks/useAuth';
import {WorkspaceLauncher} from './WorkspaceLauncher';
import {SuiteNavigation} from './SuiteNavigation';
import {ActionGrid} from './ActionGrid';
import {WorkDashboard} from './WorkDashboard';
import {SHARED_SORT,sharedSortHeader,wireSharedSortHeaders,applySharedSort} from '../shared/components/sortable-table';
import {escapeHtml,money} from '../shared/utils/html';
import {toast} from '../shared/components/toast';
const workspaceRoots=new WeakMap<HTMLElement,Root>();
const navigationRoots=new WeakMap<HTMLElement,Root>();
const actionRoots=new WeakMap<HTMLElement,Root>();
const dashboardRoots=new WeakMap<HTMLElement,Root>();
window.SonoMarziReact={renderWorkspaces(host,modules){let root=workspaceRoots.get(host);if(!root){root=createRoot(host);workspaceRoots.set(host,root);}root.render(<WorkspaceLauncher modules={modules}/>);},renderNavigation(host,model){let root=navigationRoots.get(host);if(!root){root=createRoot(host);navigationRoots.set(host,root);}root.render(<SuiteNavigation model={model}/>);},renderActionGrid(host,items,emptyMessage){let root=actionRoots.get(host);if(!root){root=createRoot(host);actionRoots.set(host,root);}root.render(<ActionGrid items={items} emptyMessage={emptyMessage}/>);},renderWorkDashboard(host,model){let root=dashboardRoots.get(host);if(!root){root=createRoot(host);dashboardRoots.set(host,root);}root.render(<WorkDashboard model={model}/>);}};
window.SonoMarziShared={SHARED_SORT,sharedSortHeader,wireSharedSortHeaders,applySharedSort,escapeHtml,money,toast};
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
