window.templates = {"colony":"<head>\n  <style>\n    body { \n      margin: 0;\n      font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif;\n    }\n\n    #sidebar {\n      position: fixed;\n      padding: 10px;\n      top: 0;\n      left: 0;\n      bottom: 0;\n      width: 200px;\n      background-color: #333;\n      color: #eee;\n      display: flex;\n      flex-direction: column;\n      justify-content: space-between;\n    }\n\n    .f-row {\n      display: flex;\n      flex-direction: row;\n    }\n\n    .f-col {\n      display: flex;\n      flex-direction: column;\n    }\n\n    .smol {\n      font-size: 0.8em;\n      color: #aaa;\n    }\n\n    .relative {\n      position: relative;\n    }\n\n    .absolute {\n      position: absolute;\n    }\n\n    .topleft {\n      top: 0;\n      left: 0;\n    }\n\n    .p-1 {\n      padding: 1rem;\n    };\n\n    .p-2 {\n      padding: 2rem;\n    }\n\n    .w-100 {\n      width: 100%;\n    }\n    \n    .h-100 {\n      height: 100%;\n    }\n\n    .j-between {\n      justify-content: space-between;\n    }\n\n    .settings > div {\n      margin-top: 5px;\n    }\n\n  </style>\n  <script src=\"https://unpkg.com/___graph_url_slug___\"></script>\n</head>\n\n<body>\n  <div id=\"graph\">\n  </div>\n  <div id=\"sidebar\">\n    <div class=\"settings f-col\">\n      <h3>Settings</h3>\n      <!-- Use next links -->\n      <div>\n        <input type=\"checkbox\" id=\"useNextLinks\" data-type=\"linkToggle\" data-kind=\"next\" checked>\n        <label for=\"useNextLinks\">Attract based on time</label>\n      </div>\n      <!-- Show next links -->\n      <div id=\"showNextLinksContainer\">\n        <input type=\"checkbox\" id=\"showNextLinks\" data-type=\"linkToggle\" data-kind=\"descendant\">\n        <label for=\"showNextLinks\">Show time-based links</label>\n      </div>\n      <!-- Use descendant links -->\n      <div>\n        <input type=\"checkbox\" id=\"useDescendantLinks\" data-type=\"linkToggle\" data-kind=\"descendant\" checked>\n        <label for=\"useDescendantLinks\">Attract to root clip</label>\n      </div>\n      <!-- Filter -->\n      <div>\n        <input type=\"text\" id=\"filter\" placeholder=\"Filter by name, style or ID\">\n        <p class=\"smol\">\n          Enter to apply. (Filter will include both matching nodes and any nodes belonging to the same root clip.)\n        </p>\n      </div>\n    </div>\n    <div id=\"audioContainer\" class=\"w-100\" style=\"display: none;\">\n      <div class=\"relative\">\n        <a id=\"audioLink\" target=\"_blank\">\n          <img id=\"audioImage\" style=\"opacity: 0.5\" class=\"w-100\">\n        </a>\n        <div class=\"absolute topleft\" style=\"width: 190px; padding: 5px;\">\n          <div id=\"audioName\"></div>\n          <div class=\"smol\" id=\"audioTags\"></div>\n        </div>\n      </div>\n      <audio controls id=\"audio\" class=\"w-100\"></audio>\n    </div>\n  </div>    \n  <div id=\"data\" style=\"display: none;\">\n    ___data___\n  </div>\n  <script>\n\n    const use3DGraph = ___use3DGraph___;\n    const data = JSON.parse(document.getElementById('data').innerText);\n    let graph = renderGraph(data);\n    Object.assign(window, { data, graph });\n\n    function visibilityChecker(link) {\n      return !{\n        descendant: true,\n        next: !document.getElementById('showNextLinks').checked\n      }[link.kind];\n    };\n\n    function renderGraph(data) {\n      const graph = new ___GraphRenderer___()\n        (document.getElementById('graph'))\n        .graphData(data)\n        .backgroundColor('#001')\n        .linkAutoColorBy('kind')\n        .nodeAutoColorBy('rootId')\n        .linkLabel('kind')\n        .linkVisibility(visibilityChecker)\n        .linkDirectionalParticles(1)\n        .nodeLabel(({ id, name, tags, image_url }) => `\n          <div class=\"relative\" style=\"width: 200px;\">\n            <img src=\"${image_url}\" style=\"opacity: 0.5; width: 200px\">\n            <div class=\"absolute topleft\" style=\"width: 190px; padding: 5px;\">\n              <div>${name || '[Untitled]'}</div>\n              <div class=\"smol\">${tags || '(no style)'}</div>\n            </div>\n          </div>\n          <div class=\"smol\">\n            Click to play, right-click to open in Suno\n          </div>\n        `)\n        .onNodeClick(({ id, name, tags, image_url, audio_url }) => {\n          document.getElementById('audioContainer').style.display = 'block';\n          document.getElementById('audioLink').href = `https://suno.com/song/${id}`;\n          document.getElementById('audioImage').src = image_url;\n          document.getElementById('audioName').innerText = name || '[Untitled]';\n          document.getElementById('audioTags').innerText = tags || '(no style)';\n          const audio = document.getElementById('audio');\n          audio.src = audio_url;\n          audio.play();\n        })\n        .onNodeRightClick(({ id }) => {\n          window.open(`https://suno.com/song/${id}`);\n        });\n      if ( use3DGraph ) {\n        graph.linkOpacity(l => l.isMain ? 1 : 0.2)\n      } else {\n        graph.linkLineDash(l => l.isMain ? undefined : [1, 2])\n      }\n      return graph;\n    };\n\n    document.querySelectorAll('[data-type=\"linkToggle\"]').forEach(checkbox => {\n      checkbox.addEventListener('change', () => {\n        const kind = checkbox.getAttribute('data-kind');\n        applyLinkFilter(checkbox);\n        if ( kind === 'next' ) {\n          document.getElementById('showNextLinksContainer').style.display = useLinks ? 'block' : 'none';\n        };\n      });\n    });\n\n    function applyLinkFilter(checkbox) {\n      const kind = checkbox.getAttribute('data-kind');\n      const useLinks = checkbox.checked;\n      let { nodes, links } = graph.graphData();\n      if ( !useLinks ) {\n        links = links.filter(l => l.kind !== kind);\n      } else {\n        links.push(...data.links.filter(l => l.kind === kind));\n      }\n      graph.graphData({ nodes, links });\n    };\n\n    document.getElementById('showNextLinks').addEventListener('change', () => {\n      graph.linkVisibility(visibilityChecker);\n    });\n    \n    // Filter (on Enter key)\n    document.getElementById('filter').addEventListener('keyup', e => {\n      if (e.keyCode === 13) {\n        const filter = e.target.value.toLowerCase();\n        const matchingNodes = filter \n          ? data.nodes.filter(node => `${node.id} ${node.name} ${node.tags} ${node.created_at}`.toLowerCase().includes(filter))\n          : data.nodes;\n        // const sameRootNodes = data.nodes.filter(node => matchingNodes.some(n => n.id !== node.id && n.rootId === node.rootId));\n        // const relevantNodes = [...matchingNodes, ...sameRootNodes];\n        const existing = graph.graphData();\n        const nodes = [\n          ...matchingNodes.map(node => existing.nodes.find(n => n.id === node.id) ?? node),\n          ...filter \n            ? data.nodes.filter(node => matchingNodes.some(n => n.rootId === node.rootId && n.id !== node.id))\n            : []\n        ].map(node => existing.nodes.find(n => n.id === node.id) ?? node);\n        const links = data.links\n          .filter(link => nodes.some(n => n.id === link.source.id) && nodes.some(n => n.id === link.target.id))\n          .map(({ source: { id: source }, target: { id: target }, ...rest }) => ({ source, target, ...rest }))\n          .map(link => existing.links.find(l => l.source.id === link.source.id && l.target.id === link.target.id) ?? link);\n        graph.graphData({ nodes, links });\n        if ( filter )\n          graph.nodeVal(node => matchingNodes.some(n => n.id === node.id) ? 3 : node.val);\n        else\n          graph.nodeVal('val');\n        document.querySelectorAll('[data-type=\"linkToggle\"]').forEach(applyLinkFilter);\n      };\n    });\n\n  </script>\n</body>"};
(()=>{function J(){return[]}function re(t,e){return e(t)}function se(t){return JSON.parse(JSON.stringify(t))}function ae(t,e){Object.assign(t,e)}var oe=0;function Y(t){let e=Math.max(0,t-(Date.now()-oe));return new Promise(n=>{setTimeout(()=>{oe=Date.now(),n()},e)})}function T(t){throw new Error(t)}async function le(){let t=document.createElement("input");return t.type="file",t.click(),new Promise(e=>{t.onchange=()=>{let n=t.files?.[0];if(!n)return e(void 0);let o=new FileReader;o.onload=()=>{e(o.result),t.remove()},o.readAsText(n)}})}function ie(t){return t?new Date(t).getTime():0}function E(t,e=n=>n.created_at){return t.sort((n,o)=>ie(e(n))-ie(e(o)))}async function de(t,e){for(let n of e.slice(e.findIndex(o=>o.id===t.id)+1))if(n!==t&&n.metadata.tags===t.metadata.tags&&await Ne(n.image_url,t.image_url))return console.warn(`Found potential base clip for cropped clip ${t.id}: ${n.id} (this is not guaranteed to be correct)`),n.id;console.warn(`Could not find a base clip for cropped clip ${t.id}, the clip will be mistakenly marked as a root clip.`)}async function ce(t){let n=await(await fetch(t)).blob();return new Promise((o,i)=>{let r=new Image;r.onload=()=>{URL.revokeObjectURL(r.src),o(r)},r.onerror=i,r.src=URL.createObjectURL(n)})}async function Ne(t,e){let n=await ce(t),o=await ce(e),i=document.createElement("canvas");i.width=n.width,i.height=n.height;let r=i.getContext("2d")??T("Canvas 2D context not supported");r.drawImage(n,0,0);let s=r.getImageData(0,0,n.width,n.height);r.drawImage(o,0,0);let c=r.getImageData(0,0,o.width,o.height),u=s.data,w=c.data,v=u.length,x=0;for(let b=0;b<v;b+=4)for(let C=0;C<3;C++)x+=Math.abs(u[b+C]-w[b+C]);let I=x/(v/4);return i.remove(),I<32;}function N(t,e){return t.find(Ue(e))}function Ue(t){return function(e){return Object.entries(t).every(([n,o])=>e[n]===o)}}var Me=0;function pe(t=""){return`${t}${++Me}`}function U(t){return typeof t=="function"}function Q(){return window.suno??T("`suno` object not found in `window`. Have you followed the setup instructions?")}var M=class{resolve;reject;promise;constructor(){this.promise=new Promise((e,n)=>Object.assign(this,{resolve:e,reject:n}))}};var $e="vovas",P="sunoTools",Be=new Promise((t,e)=>{let n=indexedDB.open($e,1);n.onupgradeneeded=()=>n.result.createObjectStore(P),n.onsuccess=()=>t(n.result),n.onerror=()=>e(n.error)});async function X(t){return(await Be).transaction(P,t)}function ue(t){return new Promise((e,n)=>{t.oncomplete=()=>e(),t.onerror=()=>n(t.error)})}async function je(t){return(await X(t)).objectStore(P)}var $=class{constructor(e,n){this.key=e;this.init=n}async load(){let e=(await je("readonly")).get(this.key);return new Promise((n,o)=>{e.onsuccess=()=>n(e.result??this.init),e.onerror=()=>o(e.error)})}async save(e){let n=await X("readwrite");return n.objectStore(P).put(e,this.key),ue(n)}async clear(){let e=await X("readwrite");return e.objectStore(P).delete(this.key),ue(e)}};function k(t,e){return U(t)?e?new O(t,e):new R(t):new S(t)}var L=class{constructor(e){this._value=e}watchers=new Set;activeWatchers=new WeakSet;get(){return B?.(this),this._value}_set(e){let{_value:n}=this;if(e!==this._value){this._value=e;try{for(let o of this.watchers){if(this.activeWatchers.has(o)){console.warn("smork: watcher is already active \u2014 perhaps a circular dependency \u2014 exiting watch to prevent infinite loop");return}this.activeWatchers.add(o),o(e,n)}}finally{this.activeWatchers=new WeakSet}}}runAndWatch(e){e(this._value,this._value),this.watch(e)}watchImmediate=this.runAndWatch;watch(e){this.watchers.add(e)}onChange=this.watch;unwatch(e){this.watchers.delete(e)}get value(){return this.get()}map(e){return new R(()=>e(this.value))}compute=this.map;merge(e){return e?fe(()=>({...this.value,...Oe(e)})):this}},S=class extends L{set(e){this._set(e)}set value(e){this.set(e)}get value(){return this.get()}bridge(e,n){return new O(()=>e(this.value),o=>this.set(n(o)))}};var B,j=class extends Error{constructor(e){super(`smork: ${e}`)}},R=class extends S{constructor(e){if(B)throw new j("currentComputedPreHandler is already set (this should never happen)");try{B=n=>{n.watch(()=>this._set(e()))},super(e())}finally{B=void 0}}};function fe(t){return new R(t)}var O=class extends S{constructor(n,o){let i=new R(n);super(i.value);this.setter=o;i.watch(r=>this._set(r))}set(n){if(this.setter(n),this.value!==n)throw new j("bridge value did not change to the one being set")}};function he(t){return U(t)||t instanceof L}function me(t){return(e,n,o)=>t instanceof L?e(t):U(t)?n(t):o(t)}function Oe(t){return me(t)(e=>e.value,e=>e(),e=>e)}function ye(t){return me(t)(e=>e,e=>fe(e),e=>new L(e))}var Ke=["html","head","style","script","body","div","h3","p","a","img","audio","input","label","button"],{html:dt,head:pt,style:ge,script:ut,body:ft,div:h,h3:Te,p:we,a:xe,img:be,audio:ke,input:ve,label:Fe,button:K}=He(Ke);function He(t){return t.reduce((e,n)=>Object.assign(e,{[n]:Ae(n)}),{})}function Ae(t){function e(o,i){let[r,s]=Array.isArray(o)?[void 0,o]:[o,i];return n(r,s)}function n(o,i){let r=document.createElement(t);if(o){let s=function(c){Object.assign(r,c),c.class&&(r.className=c.class),r instanceof HTMLLabelElement&&c.for&&(r.htmlFor=c.for),Object.entries(c.style??{}).forEach(([u,w])=>{r.style[u]=w})};he(o)?ye(o).runAndWatch(s):s(o)}return i&&i.forEach(s=>{typeof s=="string"?r.appendChild(document.createTextNode(s)):r.appendChild(s)}),r}return e}var F=Le(ve,"checked",t=>({type:"checkbox",onchange:()=>{t.set(!t.value)}})),Ce=Le(ve,"value",t=>({type:"text",onkeyup:({key:e,target:n})=>{e==="Enter"&&n instanceof HTMLInputElement&&t.set(n.value)}}));function Le(t,e,n){return(o,i)=>{let r=k(()=>({...n(o),[e]:o.value}));return t(i?r.merge(i):r)}}function H(t,e){e.id||=pe("smork-input-");let n=[Fe({for:e.id},[t]),e];return e.type==="checkbox"&&n.reverse(),n}async function Re(t,e,n){let o=t.document.createElement("script");return o.type="text/javascript",o.src=n,t.document.head.appendChild(o),new Promise(i=>{o.onload=()=>{i(t[e])}})}function A(t){return t?{}:{display:"none"}}function _e(t){return A(!t)}var Ee=`
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
`;async function Z(t,{in3D:e=!1}){let n=k(!1),o,i=k(!0),r=k(!1),s=k(!0),c=k(""),u,w,v,x,I,b,C=await Re(window,"ForceGraph",`https://unpkg.com/${e?"3d-":""}force-graph`);window.document.head.appendChild(ge([Ee]));let V=h(()=>({class:"colony",style:{position:"fixed",top:"0px",left:"0px",zIndex:"100"}}),[h(()=>({style:{display:"flex",flexDirection:"column",height:"100vh",width:"100vh",backgroundColor:"#000",..._e(n.value)}}),[o=h(),h({id:"sidebar"},[h({class:"settings f-col"},[K({style:{marginBottom:"5px"},onclick:()=>n.set(!0)},["Close Colony"]),Te(["Settings"]),h(H("Attract based on time",F(i))),h(()=>({style:A(i.value)}),H("Show time-based links",F(r))),h(H("Attract to root clip",F(s))),h([Ce(c,{placeholder:"Filter by name, style or ID"}),we({class:"smol"},["Enter to apply. (Filter will include both matching nodes and any nodes belonging to the same root clip.)"])]),K({onclick:Ie},["Redraw"])]),u=h({class:"w-100",style:{display:"none"}},[h({class:"relative"},[w=xe({target:"_blank"},[v=be({style:"opacity: 0.5",class:"w-100"})]),h({class:"absolute topleft",style:"width: 190px; padding: 5px;"},[x=h(),I=h({class:"smol"})])]),b=ke({controls:!0,class:"w-100"})])])]),K(()=>({style:{position:"fixed",top:"0px",left:"0px",padding:"5px",zIndex:"100",...A(n.value)},onclick:()=>n.set(!1)}),["Reopen Colony"])]);document.body.appendChild(V);let g=Se();function Se(){let l=new C(o).graphData(t).backgroundColor("#001").linkAutoColorBy("kind").nodeAutoColorBy("rootId").linkLabel("kind").linkVisibility(te).linkDirectionalParticles(1).nodeLabel(({id:d,name:m,tags:f,image_url:p})=>`
        <div class="relative" style="width: 200px;">
          <img src="${p}" style="opacity: 0.5; width: 200px">
          <div class="absolute topleft" style="width: 190px; padding: 5px;">
            <div>${m||"[Untitled]"}</div>
            <div class="smol">${f||"(no style)"}</div>
          </div>
        </div>
        <div class="smol">
          Click to play, right-click to open in Suno
        </div>
      `).onNodeClick(({id:d,name:m,tags:f,image_url:p,audio_url:a})=>{u.style.display="block",w.href=`https://suno.com/song/${d}`,v.src=p,x.innerText=m||"[Untitled]",I.innerText=f||"(no style)",b.src=a,b.play()}).onNodeRightClick(({id:d})=>{window.open(`https://suno.com/song/${d}`)});return e?l.linkOpacity(d=>d.isMain?1:.2):l.linkLineDash(d=>d.isMain?null:[1,2]),l}async function Ie(){new FinalizationRegistry(()=>console.log("Previous graph destroyed, container removed from memory")).register(g,""),g._destructor(),V.remove(),await Z(t,{in3D:e})}let _=g.graphData();function te(l){return!{descendant:!0,next:!r.value}[l.kind]}function ne(l,d){let{nodes:m,links:f}=g.graphData();if(d?f.push(..._.links.filter(p=>p.kind===l)):f=f.filter(p=>p.kind!==l),l==="next"&&(f=f.filter(p=>p.kind!=="next"),d)){E(m);for(let p=1;p<m.length;p++){let a=m[p-1],y=m[p];f.push({source:a.id,target:y.id,kind:"next",color:"#006",isMain:!1})}}g.graphData({nodes:m,links:f})}i.watchImmediate(l=>ne("next",l)),s.watchImmediate(l=>ne("descendant",l)),r.watchImmediate(()=>{g.linkVisibility(te)});function D(l){return typeof l=="string"?l:l.id}function q(l,d){return D(l)===D(d)}function z(l){return d=>q(l,d)}c.watchImmediate(l=>{l=l?.toLowerCase();let d=l?_.nodes.filter(a=>`${a.id} ${a.name} ${a.tags} ${a.created_at}`.toLowerCase().includes(l)):_.nodes,m=g.graphData(),f=[...d.map(a=>m.nodes.find(z(a))??a),...l?_.nodes.filter(a=>d.some(y=>y.rootId===a.rootId&&y.id!==a.id)):[]].map(a=>m.nodes.find(y=>y.id===a.id)??a),p=_.links.filter(a=>f.some(z(a.source))&&f.some(z(a.target))).map(({source:a,target:y,...De})=>({source:D(a),target:D(y),...De})).map(a=>m.links.find(y=>q(a.source,y.source)&&q(a.target,y.target))??a);g.graphData({nodes:f,links:p}),l?g.nodeVal(a=>d.some(y=>y.id===a.id)?3:a.val):g.nodeVal("val")}),setTimeout(()=>{i.set(!1),s.set(!1)},2e3);return V}function Pe(t,e){return Object.keys(e).reduce((n,o)=>n.replace(`___${o}___`,e[o]),t)}var Ge=["next","descendant"];var ee={rawClips:J(),lastProcessedPage:-1,allPagesProcessed:!1,links:J(),allLinksBuilt:!1},W=class{constructor(e=ee){this.state=e;this.loadState()}reset(){this.state=ee,console.log("Colony reset. Run build() to start building it again.")}storage=new $("colony",ee);stateLoaded=new M;async loadState(e=!1){if(e){let n=await le();if(!n){console.log("No file selected, aborting.");return}this.state=JSON.parse(n)}else this.state=await this.storage.load();this.stateLoaded.resolve()}async saveState(e=!1){if(e){let n=JSON.stringify(this.state),o=new Blob([n],{type:"application/json"}),i=URL.createObjectURL(o),r=document.createElement("a");r.href=i,r.download="suno_colony.json",r.click(),URL.revokeObjectURL(i)}else await this.storage.save(this.state)}async build(){try{this.state.allPagesProcessed||await this.fetchClips(),this.state.allLinksBuilt||await this.buildLinks()}finally{await this.saveState()}}async fetchClips(){for(console.log("Fetching liked clips...");;){await Y(1e3);let{data:{clips:e}}=await Q().root.apiClient.GET("/api/feed/v2",{params:{query:{is_liked:!0,page:this.state.lastProcessedPage+1}}});if(!e.length){this.state.allPagesProcessed=!0;break}this.state.rawClips.push(...e),this.state.lastProcessedPage++,console.log(`Processed page ${this.state.lastProcessedPage}; total clips: ${this.state.rawClips.length}`)}}rawClipsById={};async loadClip(e){await Y(1e3);console.log(`Clip ${e} not found in cache, loading...`);let n=await Q().root.clips.loadClipById(e)??Ve(e);return this.state.rawClips.push(n),n}getClipByIdSync(e){return this.rawClipsById[e]??=this.state.rawClips.find(n=>We(e)?n.audio_url.includes(e):n.id===e)}async getClipById(e){return e.startsWith("m_")&&(e=e.slice(2)),this.getClipByIdSync(e)??await this.loadClip(e)}async buildLinks(){console.log("Building links...");for(let e=0;e<this.state.rawClips.length;e++){let n=this.state.rawClips[e];e%100===0&&console.log(`Processed ${e} clips out of ${this.state.rawClips.length}`);let{metadata:o}=n,[i,r]="history"in o?re(o.history[0],s=>typeof s=="string"?[s,"extend"]:s.infill?[s.id,"inpaint"]:[s.id,"extend"]):"concat_history"in o?[o.concat_history[1].id,"apply"]:"cover_clip_id"in o?[o.cover_clip_id,"cover"]:"upsample_clip_id"in o?[o.upsample_clip_id,"remaster"]:"type"in o&&o.type==="edit_crop"?await de(n,this.state.rawClips).then(s=>s?[s,"crop"]:[void 0,void 0]):[void 0,void 0];i&&this.state.links.push([(await this.getClipById(i)).id,n.id,r])}this.state.allLinksBuilt=!0,console.log(`Built ${this.state.links.length} links.`),console.log("Colony built. Run `await vovas.colony.render()` to view it!")}_linkedClips;get linkedClips(){return this._linkedClips??=this.getLinkedClips()}getLinkedClips(){let e=this.state.links.reduce((o,[i,r,s])=>{let c=N(o,{id:i})??T(`Could not find parent for link ${i} -> ${r}.`),u=N(o,{id:r})??T(`Could not find child for link ${i} -> ${r}.`);if(u.parent)throw new Error(`Child ${r} already has a parent: ${u.parent.clip.id}`);return u.parent={kind:s,clip:c},(c.children??=[]).push({kind:s,clip:u}),o},se(this.state.rawClips));for(let o of e.filter(({parent:i})=>!i))n(o,o);return e;function n(o,i){Object.assign(o,{root:i});for(let{clip:r}of o.children??[])n(r,i)}}_rootClips;get rootClips(){return this._rootClips??=this.getRootClips()}getRootClips(){let e=this.linkedClips.filter(({parent:n})=>!n);return E(e)}get sortedClips(){let e=[],{rootClips:n}=this;for(let i of n)o(i);return e.reverse();function o(i){e.push(i);let{children:r}=i;if(r)for(let{clip:s}of E(r,({clip:c})=>c.created_at))o(s)}}get syntheticLinks(){let e=[],{rootClips:n}=this,o=n[0];for(let i of this.linkedClips.filter(({children:r})=>r?.length))e.push([(i.root??T(`Clip ${i.id} has no root.`)).id,i.id,"descendant"]);return e}getTotalDescendants(e){let n=N(this.linkedClips,{id:e})??T(`Clip ${e} not found.`);return n.totalDescendants??=1+(n.children?.reduce((o,{clip:{id:i}})=>o+this.getTotalDescendants(i),0)??0)}get graphData(){let e=this.sortedClips.map(({id:i,title:r,metadata:{tags:s},created_at:c,children:u,audio_url:w,image_url:v,root:x})=>({id:i,name:r||s||c||i,created_at:c,audio_url:w,image_url:v,tags:s,rootId:x?.id,val:i===x?.id&&u?.length?2:u?.length?1:.5})),n=([i,r,s])=>({source:i,target:r,kind:s,color:s==="next"?"#006":void 0,isMain:!Ge.includes(s)&&this.getTotalDescendants(r)>1});return{nodes:e,links:[...this.syntheticLinks,...this.state.links].map(n)}}getHtml(e){let n=e?.toLowerCase()==="3d";return console.log("Rendering your colony, give it a few seconds..."),Pe(window.templates.colony,{data:JSON.stringify(this.graphData),use3DGraph:String(n),GraphRenderer:n?"ForceGraph3D":"ForceGraph",graph_url_slug:n?"3d-force-graph":"force-graph"})}renderedElement=void 0;async render(...[e]){console.log("Rendering your colony, give it a few seconds..."),this.renderedElement=await Z(this.graphData,{in3D:e?.toLowerCase()==="3d"})}clear(){this.renderedElement?.remove()}renderToFile(...e){let n=this.getHtml(...e),o=new Blob([n],{type:"text/html"}),i=URL.createObjectURL(o),r=document.createElement("a");r.href=i,r.download="suno_colony.html",r.click(),URL.revokeObjectURL(i)}},G=new W;G.stateLoaded.promise.then(()=>{console.log("Welcome to Vova\u2019s Suno Colony! This is a nifty tool to visualize your liked clips and the relationships between them, such as extensions, inpaints, covers, etc., in a graph format. It takes a bit of time and hacks to build, but hopefully it\u2019ll be worth it!");let{state:{allPagesProcessed:t,allLinksBuilt:e}}=G;if(!t||!e)console.log("Run `await vovas.colony.build()` to start or continue building your colony!");else return console.log("Your colony is built, rendering!"),G.render()});function We(t){return t.match(/_\d+$/)}function Ve(t){return console.warn(`Clip ${t} not found, creating a missing clip.`),{isMissing:!0,id:t,title:"*Clip not found*",created_at:null,audio_url:`https://cdn1.suno.ai/${t}.mp3`,image_url:"",metadata:{duration:0,tags:""}}}ae(window,{vovas:{Colony:W,colony:G}});})();
