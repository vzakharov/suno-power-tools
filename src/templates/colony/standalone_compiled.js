export const render_compiled = () => 
(()=>{var Te=0;function $(t=""){return`${t}${++Te}`}function G(t,e){return Object.fromEntries(Object.entries(t).map(([n,r])=>[n,e(r,n)]))}function O(t,e){return G(t,e)}function V(t,e){return Object.fromEntries(Object.entries(t).map(([n,r])=>[e(n,r),r]))}function A(t){return typeof t=="function"}var M=class extends Error{constructor(e){super(`smork: ${e}`)}};function x(t,e){return A(t)?B(t,e):new b(t)}var S=class{constructor(e){this._value=e}watchers=new Set;activeWatchers=new WeakSet;get(){return K?.(this),this._value}_set(e){let{_value:n}=this;if(e!==this._value){this._value=e;try{for(let r of this.watchers){if(this.activeWatchers.has(r)){console.warn("smork: watcher is already active \u2014 perhaps a circular dependency \u2014 exiting watch to prevent infinite loop");return}this.activeWatchers.add(r),r(e,n)}}finally{this.activeWatchers=new WeakSet}}}runAndWatch(e){e(this._value,this._value),this.watch(e)}watchImmediate=this.runAndWatch;watch(e){this.watchers.add(e)}onChange=this.watch;unwatch(e){this.watchers.delete(e)}get value(){return this.get()}map(e){return new w(()=>e(this.value))}compute=this.map;merge(e){return e?B(()=>({...this.value,...fe(e)})):this}},b=class extends S{set(e){this._set(e)}set value(e){this.set(e)}get value(){return this.get()}bridge(e,n){return new P(()=>e(this.value),r=>this.set(n(r)))}};var K,w=class extends b{constructor(n){super(void 0);this.getter=n;this.track()}dependencies=new Set;track=()=>{if(K)throw new M("Tried to compute a ref while another one is already being computed \u2014 did you nest a computed ref in another ref's getter function?");this.dependencies.forEach(n=>n.unwatch(this.track)),this.dependencies=new Set;try{K=n=>{n.watch(this.track),this.dependencies.add(n)},this._set(this.getter())}finally{K=void 0}}},P=class extends b{constructor(n,r,s=!1){let u=new w(n);super(u.value);this.setter=r;this.allowMismatch=s;u.watch(p=>this._set(p))}set(n){if(this.setter(n),!this.allowMismatch&&this.value!==n)throw new M("Setter did not update the value. If you want to allow this, set the allowMismatch property to true.")}};function B(t,e){return e?new P(t,e):new w(t)}function z(t){return(e,n,r)=>t instanceof S?e(t):A(t)?n(t):r(t)}function fe(t){return z(t)(e=>e.value,e=>e(),e=>e)}function q(t,e){z(t)(n=>n.watchImmediate(e),n=>x(n).watchImmediate(e),e)}function J(t){return t?new Date(t).getTime():0}function Q(t,e=n=>n.created_at){return t.sort((n,r)=>J(e(n))-J(e(r)))}function X(t,e){return V(t,n=>e[n]??n)}var ye=["html","head","style","script","body","div","h3","p","a","img","audio","input","label","button"],me=xe(ye),{html:De,head:Fe,style:Y,script:Oe,body:Ae,div:c,h3:Z,p:ee,a:te,img:ne,audio:oe,input:He,label:he,button:C}=me;function xe(t){return t.reduce((e,n)=>Object.assign(e,{[n]:re(n)}),{})}function re(t){function e(r,s,u){let[p,y,h]=Array.isArray(r)?[void 0,void 0,r]:Array.isArray(s)?[r,void 0,s]:[r,s,u];return n(p,y,h)}return e;function n(r,s,u){let p=document.createElement(t);return s&&Object.assign(p,s),r&&O(X(r,{class:"className",for:"htmlFor"}),(y,h)=>{q(y,g=>{h!=="style"?p[h]=g:O(g,(E,R)=>p.style[R]=E)})}),u&&u.forEach(y=>{typeof y=="string"?p.appendChild(document.createTextNode(y)):p.appendChild(y)}),p}}var L=ie("input","checked",{type:"checkbox"},t=>({onchange:()=>t.set(!t.value)})),ae=ie("input","value",{type:"text"},t=>({onkeyup:({key:e,target:n})=>{e==="Enter"&&n instanceof HTMLInputElement&&t.set(n.value)}}));function ie(t,e,n,r){return(s,u)=>re(t)({...n,...u,[e]:s},r(s))}function U(t,e){e.id||=$("smork-input-");let n=[he({for:e.id},[t]),e];return e.type==="checkbox"&&n.reverse(),n}async function se(t,e,n){let r=t.document.createElement("script");return r.type="text/javascript",r.src=n,t.document.head.appendChild(r),new Promise(s=>{r.onload=()=>{s(t[e])}})}var le=`
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
`;async function H(t,{in3D:e=!1}){let n=x(!1),r,s=x(!0),u=x(!1),p=x(!0),y=x(""),h,g,E,R,W,N,de=await se(window,"ForceGraph",`https://unpkg.com/${e?"3d-":""}force-graph`);window.document.head.appendChild(Y([le]));let I=c({class:"colony",style:{position:"fixed",top:"0px",left:"0px",zIndex:"100"}},[c({style:n.map(o=>({flexDirection:"column",height:"100vh",width:"100vh",backgroundColor:"#000",display:o?"none":"flex"}))},[r=c(),c({id:"sidebar"},[c({class:"settings f-col"},[C({style:{marginBottom:"5px"}},{onclick:()=>n.set(!0)},["Close Colony"]),Z(["Settings"]),c(U("Attract based on time",L(s))),c({style:s.map(o=>({display:o?"block":"none"}))},U("Show time-based links",L(u))),c(U("Attract to root clip",L(p))),c([ae(y,{placeholder:"Filter by name, style or ID"}),ee({class:"smol"},["Enter to apply. (Filter will include both matching nodes and any nodes belonging to the same root clip.)"])]),C({},{onclick:pe},["Redraw"])]),h=c({class:"w-100",style:{display:"none"}},[c({class:"relative"},[g=te({target:"_blank"},[E=ne({style:"opacity: 0.5",class:"w-100"})]),c({class:"absolute topleft",style:"width: 190px; padding: 5px;"},[R=c(),W=c({class:"smol"})])]),N=oe({controls:!0,class:"w-100"})])])]),C({style:n.map(o=>({position:"fixed",top:"0px",left:"0px",padding:"5px",zIndex:"100",display:o?"block":"none"}))},{onclick:()=>n.set(!1)},["Reopen Colony"])]);document.body.appendChild(I);let m=ce();function ce(){let o=new de(r).graphData(t).backgroundColor("#001").linkAutoColorBy("kind").nodeAutoColorBy("rootId").linkLabel("kind").linkVisibility(_).linkDirectionalParticles(1).nodeLabel(({id:i,name:T,tags:d,image_url:l})=>`
        <div class="relative" style="width: 200px;">
          <img src="${l}" style="opacity: 0.5; width: 200px">
          <div class="absolute topleft" style="width: 190px; padding: 5px;">
            <div>${T||"[Untitled]"}</div>
            <div class="smol">${d||"(no style)"}</div>
          </div>
        </div>
        <div class="smol">
          Click to play, right-click to open in Suno
        </div>
      `).onNodeClick(({id:i,name:T,tags:d,image_url:l,audio_url:a})=>{h.style.display="block",g.href=`https://suno.com/song/${i}`,E.src=l,R.innerText=T||"[Untitled]",W.innerText=d||"(no style)",N.src=a,N.play()}).onNodeRightClick(({id:i})=>{window.open(`https://suno.com/song/${i}`)});return e?o.linkOpacity(i=>i.isMain?1:.2):o.linkLineDash(i=>i.isMain?null:[1,2]),o}async function pe(){new FinalizationRegistry(()=>console.log("Previous graph destroyed, container removed from memory")).register(m,""),m._destructor(),I.remove(),await H(t,{in3D:e})}let v=m.graphData();function _(o){return!{descendant:!0,next:!u.value}[o.kind]}function j(o,i){let{nodes:T,links:d}=m.graphData();if(i?d.push(...v.links.filter(l=>l.kind===o)):d=d.filter(l=>l.kind!==o),o==="next"&&(d=d.filter(l=>l.kind!=="next"),i)){Q(T);for(let l=1;l<T.length;l++){let a=T[l-1],f=T[l];d.push({source:a.id,target:f.id,kind:"next",color:"#006",isMain:!1})}}m.graphData({nodes:T,links:d})}s.watchImmediate(o=>j("next",o)),p.watchImmediate(o=>j("descendant",o)),u.watchImmediate(()=>{m.linkVisibility(_)});function k(o){return typeof o=="string"?o:o.id}function D(o,i){return k(o)===k(i)}function F(o){return i=>D(o,i)}y.watchImmediate(o=>{o=o?.toLowerCase();let i=o?v.nodes.filter(a=>`${a.id} ${a.name} ${a.tags} ${a.created_at}`.toLowerCase().includes(o)):v.nodes,T=m.graphData(),d=[...i.map(a=>T.nodes.find(F(a))??a),...o?v.nodes.filter(a=>i.some(f=>f.rootId===a.rootId&&f.id!==a.id)):[]].map(a=>T.nodes.find(f=>f.id===a.id)??a),l=v.links.filter(a=>d.some(F(a.source))&&d.some(F(a.target))).map(({source:a,target:f,...ue})=>({source:k(a),target:k(f),...ue})).map(a=>T.links.find(f=>D(a.source,f.source)&&D(a.target,f.target))??a);m.graphData({nodes:d,links:l}),o?m.nodeVal(a=>i.some(f=>f.id===a.id)?3:a.val):m.nodeVal("val")}),setTimeout(()=>{s.set(!1),p.set(!1)},2e3);return I}var{graphData:ge,in3D:ve}=window.colonyData;H(ge,{in3D:ve});})();
