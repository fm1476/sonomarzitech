export interface ActionItem { id:string; name:string; icon:string; tagline?:string; enter():void; }

export function ActionGrid({items,emptyMessage,emptyDescription}:{items:ActionItem[];emptyMessage:string;emptyDescription?:string}) {
 return <>
  <div className="workspace-grid">{items.map(item=><button key={item.id} type="button" className="workspace-tile" data-enter-module={item.id} onClick={item.enter}>
   <span aria-hidden="true" dangerouslySetInnerHTML={{__html:item.icon}}/><strong>{item.name}</strong>{item.tagline&&<span>{item.tagline}</span>}
  </button>)}</div>
  {!items.length&&<div className="empty-state"><div className="msg">{emptyMessage}</div>{emptyDescription&&<div className="sub">{emptyDescription}</div>}</div>}
 </>;
}
