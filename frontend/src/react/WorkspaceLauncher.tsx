import type {WorkspaceModule} from '../api/contracts';

// Adapted from the React module launcher on feature/csharp-typescript-saas.
export function WorkspaceLauncher({modules}:{modules:WorkspaceModule[]}){
 return <>
  <div className="work-hero"><div><div className="work-eyebrow">Public safety suite</div><h2>Everything your team needs.</h2><p>Open a workspace. Pick up where you left off.</p></div></div>
  <div className="workspace-grid">{modules.map(module=><button key={module.id} type="button" className="workspace-tile" data-enter-module={module.id} onClick={module.enter}>
   <span aria-hidden="true" dangerouslySetInnerHTML={{__html:module.icon}}/><strong>{module.name}</strong><span>{module.tagline}</span>
  </button>)}</div>
  {!modules.length&&<div className="empty-state"><div className="msg">No modules available</div><div className="sub">This role has no module access. Ask an administrator to grant access.</div></div>}
 </>;
}
