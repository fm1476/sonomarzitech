import type {WorkspaceModule} from '../api/contracts';
import {ActionGrid} from './ActionGrid';

// Adapted from the React module launcher on feature/csharp-typescript-saas.
export function WorkspaceLauncher({modules}:{modules:WorkspaceModule[]}){
 return <>
  <div className="work-hero"><div><div className="work-eyebrow">Public safety suite</div><h2>Everything your team needs.</h2><p>Open a workspace. Pick up where you left off.</p></div></div>
  <ActionGrid items={modules} emptyMessage="No modules available" emptyDescription="This role has no module access. Ask an administrator to grant access."/>
 </>;
}
