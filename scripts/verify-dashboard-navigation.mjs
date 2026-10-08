import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync('frontend/assets/js/modules/civil.js','utf8');
class Element {
  constructor(tag){this.tagName=tag;this.children=[];this.style={};this.dataset={};this.className='';this.parentElement=null;this.classList={add:()=>{},remove:()=>{},contains:()=>false};}
  append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}}
  prepend(child){child.parentElement=this;this.children.unshift(child);}
  set innerHTML(value){this.html=value;this.children=[];}get innerHTML(){return this.html||'';}
  setAttribute(){}addEventListener(){}closest(){return null;}querySelector(){return null;}querySelectorAll(){return [];}remove(){}
}
const nodes=Object.fromEntries(['suiteNav','navlist','sidebar'].map(id=>[id,new Element('div')]));
const metas={fleet:{name:'Fleet',icon:'truck'},scheduling:{name:'Scheduling',icon:'calendar'},personnel:{name:'Personnel Administration',icon:'idcard'}};
const views={fleet:{NAV_ITEMS:[{id:'fleet-dashboard'},{id:'fleet-vehicles'},{id:'fleet-admin'}]},scheduling:{NAV_ITEMS:[{id:'sched-dashboard'},{id:'pm-scheduling'}]},personnel:{NAV_ITEMS:[{id:'pm-dashboard'},{id:'pm-records'}]}};
let entered=null;
const context={document:{getElementById:id=>nodes[id],createElement:tag=>new Element(tag),createTextNode:()=>new Element('text')},window:{innerWidth:1200,matchMedia:()=>({matches:false})},ICONS:{},route:'view/pm-scheduling',ACTIVE_MODULE:'scheduling',NAV_FILTER_TEXT:'',preferences:{get:(key,fallback)=>key==='pins'?['fleet-admin']:fallback,set:()=>{}},accessibleModules:()=>Object.keys(metas),MODULE_META:metas,modules:()=>views,FieldTraining:{available:()=>false},WorkOperations:{available:()=>false},SuiteStore:{mode:()=> 'local'},allowedView:()=>true,adminDestinations:()=>[],home:()=>{},workspaces:()=>{},readinessView:()=>{},workflowView:()=>{},fieldTrainingView:()=>{},reports:()=>{},administration:()=>{},applyNavFilter:()=>{},setSidebarCollapsed:()=>{},enterModule:key=>{entered=key;},button:(label,icon,action,cls)=>{const el=new Element('button');el.label=label;el.onclick=action;el.className=cls;return el;}};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('  function navigation(){'),source.indexOf('  function tasks(){')),context);
context.navigation();
const descendants=node=>[node,...node.children.flatMap(descendants)];
const tree=descendants(nodes.suiteNav);
assert.equal(tree.filter(n=>n.tagName==='details'||n.tagName==='summary').length,0,'No sidebar module accordions');
const links=tree.filter(n=>n.className==='navline module-direct');assert.equal(links.length,3);
assert.deepEqual(links.map(n=>n.children[0].label),['Fleet','Personnel Administration','Scheduling']);
assert(!tree.some(n=>n.label==='fleet-admin'),'Saved pins must not revive submenu links');
assert(links[2].children[0].className.includes('active'),'Scheduling stays selected inside roster');
links[0].children[0].onclick();assert.equal(entered,'fleet');
assert.equal(nodes.navlist.style.display,'none');
// Module entry always opens the permitted dashboard, even with an old remembered subview.
const entryLine=source.split('\n').find(line=>line.startsWith('enterModule=function(key)'));
let destination=null;
context.moduleAccess=()=>true;context.SuiteUX={modules:()=>views,lastViews:{fleet:'fleet-vehicles'},allowedView:()=>true,go:id=>{destination=id;}};
vm.runInContext(entryLine,context);context.enterModule('fleet');assert.equal(destination,'fleet-dashboard');context.enterModule('scheduling');assert.equal(destination,'sched-dashboard');
// Supplemental hubs preserve access after removing sidebar submenus.
const root=new Element('div');context.esc=s=>s;context.go=id=>{destination=id;};context.allowedView=id=>id!=='fleet-admin';
vm.runInContext(source.slice(source.indexOf('  function renderModuleHub('),source.indexOf('  function ensureDashboardReturn(')),context);
context.renderModuleHub(root,'fleet','fleet-dashboard');assert.equal(root.children[0].children.length,1);root.children[0].children[0].onclick();assert.equal(destination,'fleet-vehicles');
console.log('Shared sidebar execution checks passed: flat module links, no nested menus or stale pins, active module selection, dashboard-first entry, hidden legacy submenu, and permission-filtered dashboard cards.');
