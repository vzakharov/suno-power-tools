window.templates = {"colony":"<head>\n  <style>\n    body { \n      margin: 0;\n      font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif;\n    }\n\n    #sidebar {\n      position: fixed;\n      padding: 10px;\n      top: 0;\n      left: 0;\n      bottom: 0;\n      width: 200px;\n      background-color: #333;\n      color: #eee;\n      display: flex;\n      flex-direction: column;\n      justify-content: space-between;\n    }\n\n    .f-row {\n      display: flex;\n      flex-direction: row;\n    }\n\n    .f-col {\n      display: flex;\n      flex-direction: column;\n    }\n\n    .smol {\n      font-size: 0.8em;\n      color: #aaa;\n    }\n\n    .relative {\n      position: relative;\n    }\n\n    .absolute {\n      position: absolute;\n    }\n\n    .topleft {\n      top: 0;\n      left: 0;\n    }\n\n    .p-1 {\n      padding: 1rem;\n    };\n\n    .p-2 {\n      padding: 2rem;\n    }\n\n    .w-100 {\n      width: 100%;\n    }\n    \n    .h-100 {\n      height: 100%;\n    }\n\n    .j-between {\n      justify-content: space-between;\n    }\n\n    .settings > div {\n      margin-top: 5px;\n    }\n\n  </style>\n  <script src=\"https://unpkg.com/___graph_url_slug___\"></script>\n</head>\n\n<body>\n  <div id=\"graph\">\n  </div>\n  <div id=\"sidebar\">\n    <div class=\"settings f-col\">\n      <h3>Settings</h3>\n      <!-- Use next links -->\n      <div>\n        <input type=\"checkbox\" id=\"useNextLinks\" data-type=\"linkToggle\" data-kind=\"next\" checked>\n        <label for=\"useNextLinks\">Attract based on time</label>\n      </div>\n      <!-- Show next links -->\n      <div id=\"showNextLinksContainer\">\n        <input type=\"checkbox\" id=\"showNextLinks\" data-type=\"linkToggle\" data-kind=\"descendant\">\n        <label for=\"showNextLinks\">Show time-based links</label>\n      </div>\n      <!-- Use descendant links -->\n      <div>\n        <input type=\"checkbox\" id=\"useDescendantLinks\" data-type=\"linkToggle\" data-kind=\"descendant\" checked>\n        <label for=\"useDescendantLinks\">Attract to root clip</label>\n      </div>\n      <!-- Filter -->\n      <div>\n        <input type=\"text\" id=\"filter\" placeholder=\"Filter by name, style or ID\">\n        <p class=\"smol\">\n          Enter to apply. (Filter will include both matching nodes and any nodes belonging to the same root clip.)\n        </p>\n      </div>\n    </div>\n    <div id=\"audioContainer\" class=\"w-100\" style=\"display: none;\">\n      <div class=\"relative\">\n        <a id=\"audioLink\" target=\"_blank\">\n          <img id=\"audioImage\" style=\"opacity: 0.5\" class=\"w-100\">\n        </a>\n        <div class=\"absolute topleft\" style=\"width: 190px; padding: 5px;\">\n          <div id=\"audioName\"></div>\n          <div class=\"smol\" id=\"audioTags\"></div>\n        </div>\n      </div>\n      <audio controls id=\"audio\" class=\"w-100\"></audio>\n    </div>\n  </div>    \n  <div id=\"data\" style=\"display: none;\">\n    ___data___\n  </div>\n  <script>\n\n    const use3DGraph = ___use3DGraph___;\n    const data = JSON.parse(document.getElementById('data').innerText);\n    let graph = renderGraph(data);\n    Object.assign(window, { data, graph });\n\n    function visibilityChecker(link) {\n      return !{\n        descendant: true,\n        next: !document.getElementById('showNextLinks').checked\n      }[link.kind];\n    };\n\n    function renderGraph(data) {\n      const graph = new ___GraphRenderer___()\n        (document.getElementById('graph'))\n        .graphData(data)\n        .backgroundColor('#001')\n        .linkAutoColorBy('kind')\n        .nodeAutoColorBy('rootId')\n        .linkLabel('kind')\n        .linkVisibility(visibilityChecker)\n        .linkDirectionalParticles(1)\n        .nodeLabel(({ id, name, tags, image_url }) => `\n          <div class=\"relative\" style=\"width: 200px;\">\n            <img src=\"${image_url}\" style=\"opacity: 0.5; width: 200px\">\n            <div class=\"absolute topleft\" style=\"width: 190px; padding: 5px;\">\n              <div>${name || '[Untitled]'}</div>\n              <div class=\"smol\">${tags || '(no style)'}</div>\n            </div>\n          </div>\n          <div class=\"smol\">\n            Click to play, right-click to open in Suno\n          </div>\n        `)\n        .onNodeClick(({ id, name, tags, image_url, audio_url }) => {\n          document.getElementById('audioContainer').style.display = 'block';\n          document.getElementById('audioLink').href = `https://suno.com/song/${id}`;\n          document.getElementById('audioImage').src = image_url;\n          document.getElementById('audioName').innerText = name || '[Untitled]';\n          document.getElementById('audioTags').innerText = tags || '(no style)';\n          const audio = document.getElementById('audio');\n          audio.src = audio_url;\n          audio.play();\n        })\n        .onNodeRightClick(({ id }) => {\n          window.open(`https://suno.com/song/${id}`);\n        });\n      if ( use3DGraph ) {\n        graph.linkOpacity(l => l.isMain ? 1 : 0.2)\n      } else {\n        graph.linkLineDash(l => l.isMain ? undefined : [1, 2])\n      }\n      return graph;\n    };\n\n    document.querySelectorAll('[data-type=\"linkToggle\"]').forEach(checkbox => {\n      checkbox.addEventListener('change', () => {\n        const kind = checkbox.getAttribute('data-kind');\n        applyLinkFilter(checkbox);\n        if ( kind === 'next' ) {\n          document.getElementById('showNextLinksContainer').style.display = useLinks ? 'block' : 'none';\n        };\n      });\n    });\n\n    function applyLinkFilter(checkbox) {\n      const kind = checkbox.getAttribute('data-kind');\n      const useLinks = checkbox.checked;\n      let { nodes, links } = graph.graphData();\n      if ( !useLinks ) {\n        links = links.filter(l => l.kind !== kind);\n      } else {\n        links.push(...data.links.filter(l => l.kind === kind));\n      }\n      graph.graphData({ nodes, links });\n    };\n\n    document.getElementById('showNextLinks').addEventListener('change', () => {\n      graph.linkVisibility(visibilityChecker);\n    });\n    \n    // Filter (on Enter key)\n    document.getElementById('filter').addEventListener('keyup', e => {\n      if (e.keyCode === 13) {\n        const filter = e.target.value.toLowerCase();\n        const matchingNodes = filter \n          ? data.nodes.filter(node => `${node.id} ${node.name} ${node.tags} ${node.created_at}`.toLowerCase().includes(filter))\n          : data.nodes;\n        // const sameRootNodes = data.nodes.filter(node => matchingNodes.some(n => n.id !== node.id && n.rootId === node.rootId));\n        // const relevantNodes = [...matchingNodes, ...sameRootNodes];\n        const existing = graph.graphData();\n        const nodes = [\n          ...matchingNodes.map(node => existing.nodes.find(n => n.id === node.id) ?? node),\n          ...filter \n            ? data.nodes.filter(node => matchingNodes.some(n => n.rootId === node.rootId && n.id !== node.id))\n            : []\n        ].map(node => existing.nodes.find(n => n.id === node.id) ?? node);\n        const links = data.links\n          .filter(link => nodes.some(n => n.id === link.source.id) && nodes.some(n => n.id === link.target.id))\n          .map(({ source: { id: source }, target: { id: target }, ...rest }) => ({ source, target, ...rest }))\n          .map(link => existing.links.find(l => l.source.id === link.source.id && l.target.id === link.target.id) ?? link);\n        graph.graphData({ nodes, links });\n        if ( filter )\n          graph.nodeVal(node => matchingNodes.some(n => n.id === node.id) ? 3 : node.val);\n        else\n          graph.nodeVal('val');\n        document.querySelectorAll('[data-type=\"linkToggle\"]').forEach(applyLinkFilter);\n      };\n    });\n\n  </script>\n</body>"};
(()=>{function K(){return[]}function te(n,e){return e(n)}function ne(n){return JSON.parse(JSON.stringify(n))}function oe(n,e){Object.assign(n,e)}var Z=0;function H(n){let e=Math.max(0,n-(Date.now()-Z));return new Promise(t=>{setTimeout(()=>{Z=Date.now(),t()},e)})}function T(n){throw new Error(n)}async function ie(){let n=document.createElement("input");return n.type="file",n.click(),new Promise(e=>{n.onchange=()=>{let t=n.files?.[0];if(!t)return e(void 0);let o=new FileReader;o.onload=()=>{e(o.result),n.remove()},o.readAsText(t)}})}function ee(n){return n?new Date(n).getTime():0}function E(n,e=t=>t.created_at){return n.sort((t,o)=>ee(e(t))-ee(e(o)))}async function se(n,e){for(let t of e.slice(e.findIndex(o=>o.id===n.id)+1))if(t!==n&&t.metadata.tags===n.metadata.tags&&await Ee(t.image_url,n.image_url))return console.warn(`Found potential base clip for cropped clip ${n.id}: ${t.id} (this is not guaranteed to be correct)`),t.id;console.warn(`Could not find a base clip for cropped clip ${n.id}, the clip will be mistakenly marked as a root clip.`)}async function re(n){let t=await(await fetch(n)).blob();return new Promise((o,r)=>{let i=new Image;i.onload=()=>{URL.revokeObjectURL(i.src),o(i)},i.onerror=r,i.src=URL.createObjectURL(t)})}async function Ee(n,e){let t=await re(n),o=await re(e),r=document.createElement("canvas");r.width=t.width,r.height=t.height;let i=r.getContext("2d")??T("Canvas 2D context not supported");i.drawImage(t,0,0);let s=i.getImageData(0,0,t.width,t.height);i.drawImage(o,0,0);let c=i.getImageData(0,0,o.width,o.height),d=s.data,w=c.data,C=d.length,x=0;for(let b=0;b<C;b+=4)for(let k=0;k<3;k++)x+=Math.abs(d[b+k]-w[b+k]);let _=x/(C/4);return r.remove(),_<32;}function P(n,e){return n.find(Ie(e))}function Ie(n){return function(e){return Object.entries(n).every(([t,o])=>e[t]===o)}}var Se=0;function ae(n=""){return`${n}${++Se}`}function le(n){return typeof n=="function"}function G(){return window.suno??T("`suno` object not found in `window`. Have you followed the setup instructions?")}var R=class{resolve;reject;promise;constructor(){this.promise=new Promise((e,t)=>Object.assign(this,{resolve:e,reject:t}))}};var _e="vovas",I="sunoTools",De=new Promise((n,e)=>{let t=indexedDB.open(_e,1);t.onupgradeneeded=()=>t.result.createObjectStore(I),t.onsuccess=()=>n(t.result),t.onerror=()=>e(t.error)});async function W(n){return(await De).transaction(I,n)}function ce(n){return new Promise((e,t)=>{n.oncomplete=()=>e(),n.onerror=()=>t(n.error)})}async function Pe(n){return(await W(n)).objectStore(I)}var B=class{constructor(e,t){this.key=e;this.init=t}async load(){let e=(await Pe("readonly")).get(this.key);return new Promise((t,o)=>{e.onsuccess=()=>t(e.result??this.init),e.onerror=()=>o(e.error)})}async save(e){let t=await W("readwrite");return t.objectStore(I).put(e,this.key),ce(t)}async clear(){let e=await W("readwrite");return e.objectStore(I).delete(this.key),ce(e)}};function v(n){return le(n)?new S(n):new V(n)}var $=class{constructor(e){this._value=e}watchers=[];activeWatchers=new WeakSet;get(){return N?.(this),this._value}_set(e){let{_value:t}=this;if(e!==this._value){this._value=e;try{for(let o of this.watchers){if(this.activeWatchers.has(o)){console.warn("smork: watcher is already active \u2014 perhaps a circular dependency \u2014 exiting watch to prevent infinite loop");return}this.activeWatchers.add(o),o(e,t)}}finally{this.activeWatchers=new WeakSet}}}runAndWatch(e){e(this._value,this._value),this.watch(e)}watchImmediate=this.runAndWatch;watch(e){this.watchers.push(e)}onChange=this.watch;unwatch(e){this.watchers=this.watchers.filter(t=>t!==e)}get value(){return this.get()}map(e){return new S(()=>e(this.get()))}},V=class extends ${set=super._set;set value(e){this.set(e)}get value(){return this.get()}},N,S=class extends ${constructor(t){var e=(...et)=>(super(...et),this.getter=t,this);if(N)throw new Error("smork: currentComputedPreHandler is already set (this should never happen)");try{N=o=>{o.watch(()=>this.refresh())},e(t())}finally{N=void 0}}refresh(){this._set(this.getter())}};function de(n){return new S(n)}function Re(n){return de(()=>!n.value)}var Be=["html","head","style","script","body","div","h3","p","a","img","audio","input","label","button"],{html:ze,head:Ye,style:pe,script:Qe,body:Xe,div:u,h3:ue,p:fe,a:he,img:me,audio:ye,input:ge,label:Ne,button:q}=$e(Be);function $e(n){return n.reduce((e,t)=>Object.assign(e,{[t]:Ue(t)}),{})}function Ue(n){function e(o,r){let[i,s]=Array.isArray(o)?[void 0,o]:[o,r];return t(i,s)}function t(o,r){let i=document.createElement(n);if(o){let s=function(c){Object.assign(i,c),c.class&&(i.className=c.class),i instanceof HTMLLabelElement&&c.for&&(i.htmlFor=c.for),Object.entries(c.style??{}).forEach(([d,w])=>{i.style[d]=w})};typeof o=="function"?de(o).runAndWatch(s):s(o)}return r&&r.forEach(s=>{typeof s=="string"?i.appendChild(document.createTextNode(s)):i.appendChild(s)}),i}return e}function U(n,e){return ge(()=>({...e,type:"checkbox",checked:n.value,onchange:()=>{n.set(!n.value)}}))}function Te(n,e){return ge(()=>({...e,type:"text",value:n.value,onkeyup:({key:t})=>{t==="Enter"&&n.set(n.value)}}))}function j(n,e){e.id||=ae("smork-input-");let t=[Ne({for:e.id},[n]),e];return e.type==="checkbox"&&t.reverse(),t}async function we(n,e,t){let o=n.document.createElement("script");return o.type="text/javascript",o.src=t,n.document.head.appendChild(o),new Promise(r=>{o.onload=()=>{r(n[e])}})}function M(n){return n.value?{}:{display:"none"}}function xe(n){return M(Re(n))}var ke=`
.colony { 
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.colony button {
  background-color: #444;
  color: #eee
}

.colony #sidebar {
  position: fixed;
  padding: 10px;
  top: 0;
  left: 0;
  bottom: 0;
  width: 200px;
  background-color: #333;
  color: #eee;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.colony .f-row {
  display: flex;
  flex-direction: row;
}

.colony .f-col {
  display: flex;
  flex-direction: column;
}

.colony .smol {
  font-size: 0.8em;
  color: #aaa;
}

.colony .relative {
  position: relative;
}

.colony .absolute {
  position: absolute;
}

.colony .topleft {
  top: 0;
  left: 0;
}

.colony .p-1 {
  padding: 1rem;
};

.colony .p-2 {
  padding: 2rem;
}

.colony .w-100 {
  width: 100%;
}

.colony .h-100 {
  height: 100%;
}

.colony .j-between {
  justify-content: space-between;
}

.colony .settings > div {
  margin-top: 5px;
}
`;async function Ce(n,{in3D:e=!1,win:t=window}){let o=v(!1),r,i=v(!0),s=v(!1),c=v(!0),d=v(""),w,C,x,_,b,k,ve=await we(t,"ForceGraph",`https://unpkg.com/${e?"3d-":""}force-graph`);t.document.head.appendChild(pe([ke]));let Y=u(()=>({class:"colony",style:{position:"fixed",top:"0px",left:"0px",zIndex:"100"}}),[u(()=>({style:{display:"flex",flexDirection:"column",height:"100%",width:"100%",backgroundColor:"#000",...xe(o)}}),[r=u(),u({id:"sidebar"},[u({class:"settings f-col"},[q({style:{marginBottom:"5px"},onclick:()=>o.set(!0)},["Close Colony"]),ue(["Settings"]),u(j("Attract based on time",U(i))),u(()=>({style:M(i)}),j("Show time-based links",U(s))),u(j("Attract to root clip",U(c))),u([Te(d,{placeholder:"Filter by name, style or ID"}),fe({class:"smol"},["Enter to apply. (Filter will include both matching nodes and any nodes belonging to the same root clip.)"])])]),w=u({class:"w-100",style:{display:"none"}},[u({class:"relative"},[C=he({target:"_blank"},[x=me({style:"opacity: 0.5",class:"w-100"})]),u({class:"absolute topleft",style:"width: 190px; padding: 5px;"},[_=u(),b=u({class:"smol"})])]),k=ye({controls:!0,class:"w-100"})])])]),q(()=>({style:{position:"fixed",top:"0px",left:"0px",padding:"5px",zIndex:"100",...M(o)},onclick:()=>o.set(!1)}),["Reopen Colony"])]);document.body.appendChild(Y);let g=new ve(r).graphData(n).backgroundColor("#001").linkAutoColorBy("kind").nodeAutoColorBy("rootId").linkLabel("kind").linkVisibility(Q).linkDirectionalParticles(1).nodeLabel(({id:a,name:f,tags:m,image_url:p})=>`
      <div class="relative" style="width: 200px;">
        <img src="${p}" style="opacity: 0.5; width: 200px">
        <div class="absolute topleft" style="width: 190px; padding: 5px;">
          <div>${f||"[Untitled]"}</div>
          <div class="smol">${m||"(no style)"}</div>
        </div>
      </div>
      <div class="smol">
        Click to play, right-click to open in Suno
      </div>
    `).onNodeClick(({id:a,name:f,tags:m,image_url:p,audio_url:h})=>{w.style.display="block",C.href=`https://suno.com/song/${a}`,x.src=p,_.innerText=f||"[Untitled]",b.innerText=m||"(no style)",k.src=h,k.play()}).onNodeRightClick(({id:a})=>{window.open(`https://suno.com/song/${a}`)});e?g.linkOpacity(a=>a.isMain?1:.2):g.linkLineDash(a=>a.isMain?null:[1,2]);let L=g.graphData();function Q(a){return!{descendant:!0,next:!s.value}[a.kind]}function X(a,f){let{nodes:m,links:p}=g.graphData();if(f?p.push(...L.links.filter(h=>h.kind===a)):p=p.filter(h=>h.kind!==a),a==="next"&&(p=p.filter(h=>h.kind!=="next"),f)){E(m);for(let h=1;h<m.length;h++){let l=m[h-1],y=m[h];p.push({source:l.id,target:y.id,kind:"next",color:"#006",isMain:!1})}}g.graphData({nodes:m,links:p})}i.watchImmediate(a=>X("next",a)),c.watchImmediate(a=>X("descendant",a)),s.watchImmediate(()=>{g.linkVisibility(Q)});function D(a){return typeof a=="string"?a:a.id}function F(a,f){return D(a)===D(f)}function A(a){return f=>F(a,f)}d.watchImmediate(a=>{a=a.toLowerCase();let f=a?L.nodes.filter(l=>`${l.id} ${l.name} ${l.tags} ${l.created_at}`.toLowerCase().includes(a)):L.nodes,m=g.graphData(),p=[...f.map(l=>m.nodes.find(A(l))??l),...a?L.nodes.filter(l=>f.some(y=>y.rootId===l.rootId&&y.id!==l.id)):[]].map(l=>m.nodes.find(y=>y.id===l.id)??l),h=L.links.filter(l=>p.some(A(l.source))&&p.some(A(l.target))).map(({source:l,target:y,...Le})=>({source:D(l),target:D(y),...Le})).map(l=>m.links.find(y=>F(l.source,y.source)&&F(l.target,y.target))??l);g.graphData({nodes:p,links:h}),a?g.nodeVal(l=>f.some(y=>y.id===l.id)?3:l.val):g.nodeVal("val")}),setTimeout(()=>{i.set(!1),c.set(!1)},2e3);return Y}function be(n,e){return Object.keys(e).reduce((t,o)=>t.replace(`___${o}___`,e[o]),n)}var je=["next","descendant"];var J={rawClips:K(),lastProcessedPage:-1,allPagesProcessed:!1,links:K(),allLinksBuilt:!1},O=class{constructor(e=J){this.state=e;this.loadState()}reset(){this.state=J,console.log("Colony reset. Run build() to start building it again.")}storage=new B("colony",J);stateLoaded=new R;async loadState(e=!1){if(e){let t=await ie();if(!t){console.log("No file selected, aborting.");return}this.state=JSON.parse(t)}else this.state=await this.storage.load();this.stateLoaded.resolve()}async saveState(e=!1){if(e){let t=JSON.stringify(this.state),o=new Blob([t],{type:"application/json"}),r=URL.createObjectURL(o),i=document.createElement("a");i.href=r,i.download="suno_colony.json",i.click(),URL.revokeObjectURL(r)}else await this.storage.save(this.state)}async build(){try{this.state.allPagesProcessed||await this.fetchClips(),this.state.allLinksBuilt||await this.buildLinks()}finally{await this.saveState()}}async fetchClips(){for(console.log("Fetching liked clips...");;){await H(1e3);let{data:{clips:e}}=await G().root.apiClient.GET("/api/feed/v2",{params:{query:{is_liked:!0,page:this.state.lastProcessedPage+1}}});if(!e.length){this.state.allPagesProcessed=!0;break}this.state.rawClips.push(...e),this.state.lastProcessedPage++,console.log(`Processed page ${this.state.lastProcessedPage}; total clips: ${this.state.rawClips.length}`)}}rawClipsById={};async loadClip(e){await H(1e3);console.log(`Clip ${e} not found in cache, loading...`);let t=await G().root.clips.loadClipById(e)??Oe(e);return this.state.rawClips.push(t),t}getClipByIdSync(e){return this.rawClipsById[e]??=this.state.rawClips.find(t=>Me(e)?t.audio_url.includes(e):t.id===e)}async getClipById(e){return e.startsWith("m_")&&(e=e.slice(2)),this.getClipByIdSync(e)??await this.loadClip(e)}async buildLinks(){console.log("Building links...");for(let e=0;e<this.state.rawClips.length;e++){let t=this.state.rawClips[e];e%100===0&&console.log(`Processed ${e} clips out of ${this.state.rawClips.length}`);let{metadata:o}=t,[r,i]="history"in o?te(o.history[0],s=>typeof s=="string"?[s,"extend"]:s.infill?[s.id,"inpaint"]:[s.id,"extend"]):"concat_history"in o?[o.concat_history[1].id,"apply"]:"cover_clip_id"in o?[o.cover_clip_id,"cover"]:"upsample_clip_id"in o?[o.upsample_clip_id,"remaster"]:"type"in o&&o.type==="edit_crop"?await se(t,this.state.rawClips).then(s=>s?[s,"crop"]:[void 0,void 0]):[void 0,void 0];r&&this.state.links.push([(await this.getClipById(r)).id,t.id,i])}this.state.allLinksBuilt=!0,console.log(`Built ${this.state.links.length} links.`),console.log("Colony built. Run `await vovas.colony.render()` to view it!")}_linkedClips;get linkedClips(){return this._linkedClips??=this.getLinkedClips()}getLinkedClips(){let e=this.state.links.reduce((o,[r,i,s])=>{let c=P(o,{id:r})??T(`Could not find parent for link ${r} -> ${i}.`),d=P(o,{id:i})??T(`Could not find child for link ${r} -> ${i}.`);if(d.parent)throw new Error(`Child ${i} already has a parent: ${d.parent.clip.id}`);return d.parent={kind:s,clip:c},(c.children??=[]).push({kind:s,clip:d}),o},ne(this.state.rawClips));for(let o of e.filter(({parent:r})=>!r))t(o,o);return e;function t(o,r){Object.assign(o,{root:r});for(let{clip:i}of o.children??[])t(i,r)}}_rootClips;get rootClips(){return this._rootClips??=this.getRootClips()}getRootClips(){let e=this.linkedClips.filter(({parent:t})=>!t);return E(e)}get sortedClips(){let e=[],{rootClips:t}=this;for(let r of t)o(r);return e.reverse();function o(r){e.push(r);let{children:i}=r;if(i)for(let{clip:s}of E(i,({clip:c})=>c.created_at))o(s)}}get syntheticLinks(){let e=[],{rootClips:t}=this,o=t[0];for(let r of this.linkedClips.filter(({children:i})=>i?.length))e.push([(r.root??T(`Clip ${r.id} has no root.`)).id,r.id,"descendant"]);return e}getTotalDescendants(e){let t=P(this.linkedClips,{id:e})??T(`Clip ${e} not found.`);return t.totalDescendants??=1+(t.children?.reduce((o,{clip:{id:r}})=>o+this.getTotalDescendants(r),0)??0)}get graphData(){let e=this.sortedClips.map(({id:r,title:i,metadata:{tags:s},created_at:c,children:d,audio_url:w,image_url:C,root:x})=>({id:r,name:i||s||c||r,created_at:c,audio_url:w,image_url:C,tags:s,rootId:x?.id,val:r===x?.id&&d?.length?2:d?.length?1:.5})),t=([r,i,s])=>({source:r,target:i,kind:s,color:s==="next"?"#006":void 0,isMain:!je.includes(s)&&this.getTotalDescendants(i)>1});return{nodes:e,links:[...this.syntheticLinks,...this.state.links].map(t)}}getHtml(e){let t=e?.toLowerCase()==="3d";return console.log("Rendering your colony, give it a few seconds..."),be(window.templates.colony,{data:JSON.stringify(this.graphData),use3DGraph:String(t),GraphRenderer:t?"ForceGraph3D":"ForceGraph",graph_url_slug:t?"3d-force-graph":"force-graph"})}renderedElement=void 0;async render(...[e]){console.log("Rendering your colony, give it a few seconds..."),this.renderedElement=await Ce(this.graphData,{in3D:e?.toLowerCase()==="3d"})}clear(){this.renderedElement?.remove()}renderToFile(...e){let t=this.getHtml(...e),o=new Blob([t],{type:"text/html"}),r=URL.createObjectURL(o),i=document.createElement("a");i.href=r,i.download="suno_colony.html",i.click(),URL.revokeObjectURL(r)}},z=new O;z.stateLoaded.promise.then(()=>{console.log("Welcome to Vova\u2019s Suno Colony! This is a nifty tool to visualize your liked clips and the relationships between them, such as extensions, inpaints, covers, etc., in a graph format. It takes a bit of time and hacks to build, but hopefully it\u2019ll be worth it!");let{state:{allPagesProcessed:n,allLinksBuilt:e}}=z;console.log(!n||!e?"Run `await vovas.colony.build()` to start or continue building your colony!":"Your colony is built, run `await vovas.colony.render()` to view it!")});function Me(n){return n.match(/_\d+$/)}function Oe(n){return console.warn(`Clip ${n} not found, creating a missing clip.`),{isMissing:!0,id:n,title:"*Clip not found*",created_at:null,audio_url:`https://cdn1.suno.ai/${n}.mp3`,image_url:"",metadata:{duration:0,tags:""}}}oe(window,{vovas:{Colony:O,colony:z}});})();
