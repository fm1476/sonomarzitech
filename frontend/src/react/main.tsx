import type {ReactNode} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {configuration, createCompatibilityClient, request, TOKEN_KEY} from '../api/client';
import type {MeResponse} from '../api/contracts';
import {completeCognito} from '../api/cognito';
import {selectWorkspace} from '../hooks/useAuth';
import {SHARED_SORT, sharedSortHeader, wireSharedSortHeaders, applySharedSort} from '../shared/components/sortable-table';
import {escapeHtml, money} from '../shared/utils/html';
import {toast} from '../shared/components/toast';
import {ActionGrid} from './ActionGrid';
import {Login} from './Login';
import {ReadinessView} from './ReadinessView';
import {SuiteNavigation} from './SuiteNavigation';
import {WorkDashboard} from './WorkDashboard';
import {WorkspaceLauncher} from './WorkspaceLauncher';
import {WorkspaceSwitcher} from './WorkspaceSwitcher';

const roots = new WeakMap<HTMLElement, Root>();
function renderInto(host: HTMLElement, view: ReactNode): void {
  let root = roots.get(host);
  if (!root) {
    root = createRoot(host);
    roots.set(host, root);
  }
  root.render(view);
}

window.SonoMarziReact = {
  renderWorkspaces: (host, modules) => renderInto(host, <WorkspaceLauncher modules={modules}/>),
  renderNavigation: (host, model) => renderInto(host, <SuiteNavigation model={model}/>),
  renderActionGrid: (host, items, emptyMessage) => renderInto(host, <ActionGrid items={items} emptyMessage={emptyMessage}/>),
  renderWorkDashboard: (host, model) => renderInto(host, <WorkDashboard model={model}/>),
  renderReadiness: (host, model) => renderInto(host, <ReadinessView model={model}/>),
};
window.SonoMarziShared = {SHARED_SORT, sharedSortHeader, wireSharedSortHeaders, applySharedSort, escapeHtml, money, toast};

async function script(path: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const element = document.createElement('script');
    element.src = path;
    element.onload = () => resolve();
    element.onerror = () => reject(new Error('The application could not be loaded.'));
    document.body.append(element);
  });
}

async function boot(): Promise<void> {
  window.SonoMarziConfig = await configuration();
  window.SonoMarziClient = createCompatibilityClient();
  if (window.SonoMarziConfig.mode === 'aws') await completeCognito(window.SonoMarziConfig);
  if (sessionStorage.getItem(TOKEN_KEY)) {
    try {
      const me = await request<MeResponse>('/me');
      const active = me.memberships.filter(m => m.status === 'active');
      if (active.length === 1) selectWorkspace(active[0].tenant_id, active[0].agency_id);
    } catch {
      // The React login screen reports the reason after startup.
    }
  }
  await script('/assets/vendor.js');
  await script('/assets/app.js');
  await window.SonoMarziReady;
  const login = document.getElementById('loginFormFields');
  if (!login) throw new Error('The login container is missing.');
  renderInto(login, <Login/>);
  const switcher = document.getElementById('workspaceReactSlot');
  if (switcher) renderInto(switcher, <WorkspaceSwitcher/>);
}

void boot().catch(error => {
  const host = document.getElementById('loginLoading');
  if (!host) return;
  host.style.display = '';
  host.textContent = error instanceof Error ? error.message : 'Application startup failed.';
  host.setAttribute('role', 'alert');
});
