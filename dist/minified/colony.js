(()=>{function se(n,e){return n.find(Lt(e))}function Lt(n){return function(e){return Object.entries(n).every(([t,i])=>e[t]===i)}}var St=0;function Ae(n=""){return`${n}${++St}`}function Fe(n,e){return Object.fromEntries(Object.entries(n).map(([t,i])=>[t,e(i,t)]))}function Le(n,e){return Fe(n,e)}function He(n,e){return Object.fromEntries(Object.entries(n).map(([t,i])=>[e(t,i),i]))}function Se(n){return typeof n=="function"}function De(){return[]}function Ve(n,e){return e(n)}function ze(n){return JSON.parse(JSON.stringify(n))}function qe(n,e){Object.assign(n,e)}var We=0;function Ie(n){let e=Math.max(0,n-(Date.now()-We));return new Promise(t=>{setTimeout(()=>{We=Date.now(),t()},e)})}function O(n){throw new Error(n)}async function Je(){let n=document.createElement("input");return n.type="file",n.click(),new Promise(e=>{n.onchange=()=>{let t=n.files?.[0];if(!t)return e(void 0);let i=new FileReader;i.onload=()=>{e(i.result),n.remove()},i.readAsText(t)}})}function Ge(n){return n?new Date(n).getTime():0}function J(n,e=t=>t.created_at){return n.sort((t,i)=>Ge(e(t))-Ge(e(i)))}function Ye(n,e){return He(n,t=>e[t]??t)}async function Xe(n,e){for(let t of e.slice(e.findIndex(i=>i.id===n.id)+1))if(t!==n&&t.metadata.tags===n.metadata.tags&&await Dt(t.image_url,n.image_url))return console.warn(`Found potential base clip for cropped clip ${n.id}: ${t.id} (this is not guaranteed to be correct)`),t.id;console.warn(`Could not find a base clip for cropped clip ${n.id}, the clip will be mistakenly marked as a root clip.`)}async function Qe(n){let t=await(await fetch(n)).blob();return new Promise((i,r)=>{let s=new Image;s.onload=()=>{URL.revokeObjectURL(s.src),i(s)},s.onerror=r,s.src=URL.createObjectURL(t)})}async function Dt(n,e){let t=await Qe(n),i=await Qe(e),r=document.createElement("canvas");r.width=t.width,r.height=t.height;let s=r.getContext("2d")??O("Canvas 2D context not supported");s.drawImage(t,0,0);let c=s.getImageData(0,0,t.width,t.height);s.drawImage(i,0,0);let y=s.getImageData(0,0,i.width,i.height),g=c.data,D=y.data,L=g.length,S=0;for(let P=0;P<L;P+=4)for(let B=0;B<3;B++)S+=Math.abs(g[P+B]-D[P+B]);let j=S/(L/4);return r.remove(),j<32;}function _e(){return window.suno??O("`suno` object not found in `window`. Have you followed the setup instructions?")}var ae=class{resolve;reject;promise;constructor(){this.promise=new Promise((e,t)=>Object.assign(this,{resolve:e,reject:t}))}};var It="vovas",Y="sunoTools",_t=new Promise((n,e)=>{let t=indexedDB.open(It,1);t.onupgradeneeded=()=>t.result.createObjectStore(Y),t.onsuccess=()=>n(t.result),t.onerror=()=>e(t.error)});async function Ke(n){return(await _t).transaction(Y,n)}function Ze(n){return new Promise((e,t)=>{n.oncomplete=()=>e(),n.onerror=()=>t(n.error)})}async function Kt(n){return(await Ke(n)).objectStore(Y)}var le=class{constructor(e,t){this.key=e;this.init=t}async load(){let e=(await Kt("readonly")).get(this.key);return new Promise((t,i)=>{e.onsuccess=()=>t(e.result??this.init),e.onerror=()=>i(e.error)})}async save(e){let t=await Ke("readwrite");return t.objectStore(Y).put(e,this.key),Ze(t)}async clear(){let e=await Ke("readwrite");return e.objectStore(Y).delete(this.key),Ze(e)}};var de=class extends Error{constructor(e){super(`smork: ${e}`)}};function H(n,e){return Se(n)?et(n,e):new Q(n)}var pe=class{constructor(e){this._value=e}watchers=new Set;activeWatchers=new WeakSet;get(){return ce?.(this),this._value}_set(e){let{_value:t}=this;if(e!==this._value){this._value=e;try{for(let i of this.watchers){if(this.activeWatchers.has(i)){console.warn("smork: watcher is already active \u2014 perhaps a circular dependency \u2014 exiting watch to prevent infinite loop");return}this.activeWatchers.add(i),i(e,t)}}finally{this.activeWatchers=new WeakSet}}}runAndWatch(e){e(this._value,this._value),this.watch(e)}watchImmediate=this.runAndWatch;watch(e){this.watchers.add(e)}onChange=this.watch;unwatch(e){this.watchers.delete(e)}get value(){return this.get()}map(e){return new X(()=>e(this.value))}compute=this.map;merge(e){return e?et(()=>({...this.value,...Mt(e)})):this}},Q=class extends pe{set(e){this._set(e)}set value(e){this.set(e)}get value(){return this.get()}bridge(e,t){return new ue(()=>e(this.value),i=>this.set(t(i)))}};var ce,X=class extends Q{constructor(t){super(void 0);this.getter=t;this.track()}dependencies=new Set;track=()=>{if(ce)throw new de("Tried to compute a ref while another one is already being computed \u2014 did you nest a computed ref in another ref's getter function?");this.dependencies.forEach(t=>t.unwatch(this.track)),this.dependencies=new Set;try{ce=t=>{t.watch(this.track),this.dependencies.add(t)},this._set(this.getter())}finally{ce=void 0}}},ue=class extends Q{constructor(t,i,r=!1){let s=new X(t);super(s.value);this.setter=i;this.allowMismatch=r;s.watch(c=>this._set(c))}set(t){if(this.setter(t),!this.allowMismatch&&this.value!==t)throw new de("Setter did not update the value. If you want to allow this, set the allowMismatch property to true.")}};function et(n,e){return e?new ue(n,e):new X(n)}function tt(n){return(e,t,i)=>n instanceof pe?e(n):Se(n)?t(n):i(n)}function Mt(n){return tt(n)(e=>e.value,e=>e(),e=>e)}function nt(n,e){tt(n)(t=>t.watchImmediate(e),t=>H(t).watchImmediate(e),e)}var Pt=["html","head","style","script","body","div","h3","p","a","img","audio","input","label","button"],Nt=$t(Pt),{html:cn,head:dn,style:ot,script:pn,body:un,div:E,h3:it,p:rt,a:st,img:at,audio:lt,input:fn,label:Ut,button:fe}=Nt;function $t(n){return n.reduce((e,t)=>Object.assign(e,{[t]:ct(t)}),{})}function ct(n){function e(i,r,s){let[c,y,g]=Array.isArray(i)?[void 0,void 0,i]:Array.isArray(r)?[i,void 0,r]:[i,r,s];return t(c,y,g)}return e;function t(i,r,s){let c=document.createElement(n);return r&&Object.assign(c,r),i&&Le(Ye(i,{class:"className",for:"htmlFor"}),(y,g)=>{nt(y,D=>{g!=="style"?c[g]=D:Le(D,(L,S)=>c.style[S]=L)})}),s&&s.forEach(y=>{typeof y=="string"?c.appendChild(document.createTextNode(y)):c.appendChild(y)}),c}}var he=pt("input","checked",{type:"checkbox"},n=>({onchange:()=>n.set(!n.value)})),dt=pt("input","value",{type:"text"},n=>({onkeyup:({key:e,target:t})=>{e==="Enter"&&t instanceof HTMLInputElement&&n.set(t.value)}}));function pt(n,e,t,i){return(r,s)=>ct(n)({...t,...s,[e]:r},i(r))}function me(n,e){e.id||=Ae("smork-input-");let t=[Ut({for:e.id},[n]),e];return e.type==="checkbox"&&t.reverse(),t}async function ut(n,e,t){let i=n.document.createElement("script");return i.type="text/javascript",i.src=t,n.document.head.appendChild(i),new Promise(r=>{i.onload=()=>{r(n[e])}})}var ft=`
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
`;async function Me(n,{in3D:e=!1}){let t=H(!1),i,r=H(!0),s=H(!1),c=H(!0),y=H(""),g,D,L,S,j,P,B=await ut(window,"ForceGraph",`https://unpkg.com/${e?"3d-":""}force-graph`);window.document.head.appendChild(ot([ft]));let W=E({class:"colony",style:{position:"fixed",top:"0px",left:"0px",zIndex:"100"}},[E({style:t.map(d=>({flexDirection:"column",height:"100vh",width:"100vh",backgroundColor:"#000",display:d?"none":"flex"}))},[i=E(),E({id:"sidebar"},[E({class:"settings f-col"},[fe({style:{marginBottom:"5px"}},{onclick:()=>t.set(!0)},["Close Colony"]),it(["Settings"]),E(me("Attract based on time",he(r))),E({style:r.map(d=>({display:d?"block":"none"}))},me("Show time-based links",he(s))),E(me("Attract to root clip",he(c))),E([dt(y,{placeholder:"Filter by name, style or ID"}),rt({class:"smol"},["Enter to apply. (Filter will include both matching nodes and any nodes belonging to the same root clip.)"])]),fe({},{onclick:Te},["Redraw"])]),g=E({class:"w-100",style:{display:"none"}},[E({class:"relative"},[D=st({target:"_blank"},[L=at({style:"opacity: 0.5",class:"w-100"})]),E({class:"absolute topleft",style:"width: 190px; padding: 5px;"},[S=E(),j=E({class:"smol"})])]),P=lt({controls:!0,class:"w-100"})])])]),fe({style:t.map(d=>({position:"fixed",top:"0px",left:"0px",padding:"5px",zIndex:"100",display:d?"block":"none"}))},{onclick:()=>t.set(!1)},["Reopen Colony"])]);document.body.appendChild(W);let K=Z();function Z(){let d=new B(i).graphData(n).backgroundColor("#001").linkAutoColorBy("kind").nodeAutoColorBy("rootId").linkLabel("kind").linkVisibility(ee).linkDirectionalParticles(1).nodeLabel(({id:T,name:m,tags:k,image_url:x})=>`
        <div class="relative" style="width: 200px;">
          <img src="${x}" style="opacity: 0.5; width: 200px">
          <div class="absolute topleft" style="width: 190px; padding: 5px;">
            <div>${m||"[Untitled]"}</div>
            <div class="smol">${k||"(no style)"}</div>
          </div>
        </div>
        <div class="smol">
          Click to play, right-click to open in Suno
        </div>
      `).onNodeClick(({id:T,name:m,tags:k,image_url:x,audio_url:u})=>{g.style.display="block",D.href=`https://suno.com/song/${T}`,L.src=x,S.innerText=m||"[Untitled]",j.innerText=k||"(no style)",P.src=u,P.play()}).onNodeRightClick(({id:T})=>{window.open(`https://suno.com/song/${T}`)});return e?d.linkOpacity(T=>T.isMain?1:.2):d.linkLineDash(T=>T.isMain?null:[1,2]),d}async function Te(){new FinalizationRegistry(()=>console.log("Previous graph destroyed, container removed from memory")).register(K,""),K._destructor(),W.remove(),await Me(n,{in3D:e})}let A=K.graphData();function ee(d){return!{descendant:!0,next:!s.value}[d.kind]}function te(d,T){let{nodes:m,links:k}=K.graphData();if(T?k.push(...A.links.filter(x=>x.kind===d)):k=k.filter(x=>x.kind!==d),d==="next"&&(k=k.filter(x=>x.kind!=="next"),T)){J(m);for(let x=1;x<m.length;x++){let u=m[x-1],C=m[x];k.push({source:u.id,target:C.id,kind:"next",color:"#006",isMain:!1})}}K.graphData({nodes:m,links:k})}r.watchImmediate(d=>te("next",d)),c.watchImmediate(d=>te("descendant",d)),s.watchImmediate(()=>{K.linkVisibility(ee)});function G(d){return typeof d=="string"?d:d.id}function ne(d,T){return G(d)===G(T)}function V(d){return T=>ne(d,T)}y.watchImmediate(d=>{d=d?.toLowerCase();let T=d?A.nodes.filter(u=>`${u.id} ${u.name} ${u.tags} ${u.created_at}`.toLowerCase().includes(d)):A.nodes,m=K.graphData(),k=[...T.map(u=>m.nodes.find(V(u))??u),...d?A.nodes.filter(u=>T.some(C=>C.rootId===u.rootId&&C.id!==u.id)):[]].map(u=>m.nodes.find(C=>C.id===u.id)??u),x=A.links.filter(u=>k.some(V(u.source))&&k.some(V(u.target))).map(({source:u,target:C,...we})=>({source:G(u),target:G(C),...we})).map(u=>m.links.find(C=>ne(u.source,C.source)&&ne(u.target,C.target))??u);K.graphData({nodes:k,links:x}),d?K.nodeVal(u=>T.some(C=>C.id===u.id)?3:u.val):K.nodeVal("val")}),setTimeout(()=>{r.set(!1),c.set(!1)},2e3);return W}var ht=()=>(()=>{var n=0;function e(o=""){return`${o}${++n}`}function t(o,a){return Object.fromEntries(Object.entries(o).map(([l,f])=>[l,a(f,l)]))}function i(o,a){return t(o,a)}function r(o,a){return Object.fromEntries(Object.entries(o).map(([l,f])=>[a(l,f),f]))}function s(o){return typeof o=="function"}var c=class extends Error{constructor(o){super(`smork: ${o}`)}};function y(o,a){return s(o)?P(o,a):new D(o)}var g=class{constructor(o){this._value=o}watchers=new Set;activeWatchers=new WeakSet;get(){return L?.(this),this._value}_set(o){let{_value:a}=this;if(o!==this._value){this._value=o;try{for(let l of this.watchers){if(this.activeWatchers.has(l)){console.warn("smork: watcher is already active \u2014 perhaps a circular dependency \u2014 exiting watch to prevent infinite loop");return}this.activeWatchers.add(l),l(o,a)}}finally{this.activeWatchers=new WeakSet}}}runAndWatch(o){o(this._value,this._value),this.watch(o)}watchImmediate=this.runAndWatch;watch(o){this.watchers.add(o)}onChange=this.watch;unwatch(o){this.watchers.delete(o)}get value(){return this.get()}map(o){return new S(()=>o(this.value))}compute=this.map;merge(o){return o?P(()=>({...this.value,...W(o)})):this}},D=class extends g{set(o){this._set(o)}set value(o){this.set(o)}get value(){return this.get()}bridge(o,a){return new j(()=>o(this.value),l=>this.set(a(l)))}},L,S=class extends D{constructor(o){super(void 0),this.getter=o,this.track()}dependencies=new Set;track=()=>{if(L)throw new c("Tried to compute a ref while another one is already being computed \u2014 did you nest a computed ref in another ref's getter function?");this.dependencies.forEach(o=>o.unwatch(this.track)),this.dependencies=new Set;try{L=o=>{o.watch(this.track),this.dependencies.add(o)},this._set(this.getter())}finally{L=void 0}}},j=class extends D{constructor(o,a,l=!1){let f=new S(o);super(f.value),this.setter=a,this.allowMismatch=l,f.watch(v=>this._set(v))}set(o){if(this.setter(o),!this.allowMismatch&&this.value!==o)throw new c("Setter did not update the value. If you want to allow this, set the allowMismatch property to true.")}};function P(o,a){return a?new j(o,a):new S(o)}function B(o){return(a,l,f)=>o instanceof g?a(o):s(o)?l(o):f(o)}function W(o){return B(o)(a=>a.value,a=>a(),a=>a)}function K(o,a){B(o)(l=>l.watchImmediate(a),l=>y(l).watchImmediate(a),a)}function Z(o){return o?new Date(o).getTime():0}function Te(o,a=l=>l.created_at){return o.sort((l,f)=>Z(a(l))-Z(a(f)))}function A(o,a){return r(o,l=>a[l]??l)}var ee=["html","head","style","script","body","div","h3","p","a","img","audio","input","label","button"],te=gt(ee),{html:G,head:ne,style:V,script:d,body:T,div:m,h3:k,p:x,a:u,img:C,audio:we,input:At,label:yt,button:xe}=te;function gt(o){return o.reduce((a,l)=>Object.assign(a,{[l]:Ne(l)}),{})}function Ne(o){function a(f,v,N){let[M,U,F]=Array.isArray(f)?[void 0,void 0,f]:Array.isArray(v)?[f,void 0,v]:[f,v,N];return l(M,U,F)}return a;function l(f,v,N){let M=document.createElement(o);return v&&Object.assign(M,v),f&&i(A(f,{class:"className",for:"htmlFor"}),(U,F)=>{K(U,z=>{F!=="style"?M[F]=z:i(z,(oe,ie)=>M.style[ie]=oe)})}),N&&N.forEach(U=>{typeof U=="string"?M.appendChild(document.createTextNode(U)):M.appendChild(U)}),M}}var ve=Ue("input","checked",{type:"checkbox"},o=>({onchange:()=>o.set(!o.value)})),Tt=Ue("input","value",{type:"text"},o=>({onkeyup:({key:a,target:l})=>{a==="Enter"&&l instanceof HTMLInputElement&&o.set(l.value)}}));function Ue(o,a,l,f){return(v,N)=>Ne(o)({...l,...N,[a]:v},f(v))}function ke(o,a){a.id||=e("smork-input-");let l=[yt({for:a.id},[o]),a];return a.type==="checkbox"&&l.reverse(),l}async function wt(o,a,l){let f=o.document.createElement("script");return f.type="text/javascript",f.src=l,o.document.head.appendChild(f),new Promise(v=>{f.onload=()=>{v(o[a])}})}var xt=`
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
`;async function $e(o,{in3D:a=!1}){let l=y(!1),f,v=y(!0),N=y(!1),M=y(!0),U=y(""),F,z,oe,ie,Be,be,bt=await wt(window,"ForceGraph",`https://unpkg.com/${a?"3d-":""}force-graph`);window.document.head.appendChild(V([xt]));let Ce=m({class:"colony",style:{position:"fixed",top:"0px",left:"0px",zIndex:"100"}},[m({style:l.map(p=>({flexDirection:"column",height:"100vh",width:"100vh",backgroundColor:"#000",display:p?"none":"flex"}))},[f=m(),m({id:"sidebar"},[m({class:"settings f-col"},[xe({style:{marginBottom:"5px"}},{onclick:()=>l.set(!0)},["Close Colony"]),k(["Settings"]),m(ke("Attract based on time",ve(v))),m({style:v.map(p=>({display:p?"block":"none"}))},ke("Show time-based links",ve(N))),m(ke("Attract to root clip",ve(M))),m([Tt(U,{placeholder:"Filter by name, style or ID"}),x({class:"smol"},["Enter to apply. (Filter will include both matching nodes and any nodes belonging to the same root clip.)"])]),xe({},{onclick:Rt},["Redraw"])]),F=m({class:"w-100",style:{display:"none"}},[m({class:"relative"},[z=u({target:"_blank"},[oe=C({style:"opacity: 0.5",class:"w-100"})]),m({class:"absolute topleft",style:"width: 190px; padding: 5px;"},[ie=m(),Be=m({class:"smol"})])]),be=we({controls:!0,class:"w-100"})])])]),xe({style:l.map(p=>({position:"fixed",top:"0px",left:"0px",padding:"5px",zIndex:"100",display:p?"block":"none"}))},{onclick:()=>l.set(!1)},["Reopen Colony"])]);document.body.appendChild(Ce);let $=Ct();function Ct(){let p=new bt(f).graphData(o).backgroundColor("#001").linkAutoColorBy("kind").nodeAutoColorBy("rootId").linkLabel("kind").linkVisibility(Oe).linkDirectionalParticles(1).nodeLabel(({id:w,name:I,tags:R,image_url:b})=>`
        <div class="relative" style="width: 200px;">
          <img src="${b}" style="opacity: 0.5; width: 200px">
          <div class="absolute topleft" style="width: 190px; padding: 5px;">
            <div>${I||"[Untitled]"}</div>
            <div class="smol">${R||"(no style)"}</div>
          </div>
        </div>
        <div class="smol">
          Click to play, right-click to open in Suno
        </div>
      `).onNodeClick(({id:w,name:I,tags:R,image_url:b,audio_url:h})=>{F.style.display="block",z.href=`https://suno.com/song/${w}`,oe.src=b,ie.innerText=I||"[Untitled]",Be.innerText=R||"(no style)",be.src=h,be.play()}).onNodeRightClick(({id:w})=>{window.open(`https://suno.com/song/${w}`)});return a?p.linkOpacity(w=>w.isMain?1:.2):p.linkLineDash(w=>w.isMain?null:[1,2]),p}async function Rt(){new FinalizationRegistry(()=>console.log("Previous graph destroyed, container removed from memory")).register($,""),$._destructor(),Ce.remove(),await $e(o,{in3D:a})}let q=$.graphData();function Oe(p){return!{descendant:!0,next:!N.value}[p.kind]}function je(p,w){let{nodes:I,links:R}=$.graphData();if(w?R.push(...q.links.filter(b=>b.kind===p)):R=R.filter(b=>b.kind!==p),p==="next"&&(R=R.filter(b=>b.kind!=="next"),w)){Te(I);for(let b=1;b<I.length;b++){let h=I[b-1],_=I[b];R.push({source:h.id,target:_.id,kind:"next",color:"#006",isMain:!1})}}$.graphData({nodes:I,links:R})}v.watchImmediate(p=>je("next",p)),M.watchImmediate(p=>je("descendant",p)),N.watchImmediate(()=>{$.linkVisibility(Oe)});function re(p){return typeof p=="string"?p:p.id}function Re(p,w){return re(p)===re(w)}function Ee(p){return w=>Re(p,w)}return U.watchImmediate(p=>{p=p?.toLowerCase();let w=p?q.nodes.filter(h=>`${h.id} ${h.name} ${h.tags} ${h.created_at}`.toLowerCase().includes(p)):q.nodes,I=$.graphData(),R=[...w.map(h=>I.nodes.find(Ee(h))??h),...p?q.nodes.filter(h=>w.some(_=>_.rootId===h.rootId&&_.id!==h.id)):[]].map(h=>I.nodes.find(_=>_.id===h.id)??h),b=q.links.filter(h=>R.some(Ee(h.source))&&R.some(Ee(h.target))).map(({source:h,target:_,...Et})=>({source:re(h),target:re(_),...Et})).map(h=>I.links.find(_=>Re(h.source,_.source)&&Re(h.target,_.target))??h);$.graphData({nodes:R,links:b}),p?$.nodeVal(h=>w.some(_=>_.id===h.id)?3:h.val):$.nodeVal("val")}),setTimeout(()=>{v.set(!1),M.set(!1)},2e3),Ce}var{graphData:vt,in3D:kt}=window.colonyData;$e(vt,{in3D:kt})})();var Bt=["next","descendant"];var Pe={rawClips:De(),lastProcessedPage:-1,allPagesProcessed:!1,links:De(),allLinksBuilt:!1},ge=class{constructor(e=Pe){this.state=e;this.loadState()}reset(){this.state=Pe,console.log("Colony reset. Run build() to start building it again.")}storage=new le("colony",Pe);stateLoaded=new ae;async loadState(e=!1){if(e){let t=await Je();if(!t){console.log("No file selected, aborting.");return}this.state=JSON.parse(t)}else this.state=await this.storage.load();this.stateLoaded.resolve()}async saveState(e=!1){if(e){let t=JSON.stringify(this.state),i=new Blob([t],{type:"application/json"}),r=URL.createObjectURL(i),s=document.createElement("a");s.href=r,s.download="suno_colony.json",s.click(),URL.revokeObjectURL(r)}else await this.storage.save(this.state)}async build(){try{this.state.allPagesProcessed||await this.fetchClips(),this.state.allLinksBuilt||await this.buildLinks()}finally{await this.saveState()}}async fetchClips(){for(console.log("Fetching liked clips...");;){await Ie(1e3);let{data:{clips:e}}=await _e().root.apiClient.GET("/api/feed/v2",{params:{query:{is_liked:!0,page:this.state.lastProcessedPage+1}}});if(!e.length){this.state.allPagesProcessed=!0;break}this.state.rawClips.push(...e),this.state.lastProcessedPage++,console.log(`Processed page ${this.state.lastProcessedPage}; total clips: ${this.state.rawClips.length}`)}}rawClipsById={};async loadClip(e){await Ie(1e3);console.log(`Clip ${e} not found in cache, loading...`);let t=await _e().root.clips.loadClipById(e)??jt(e);return this.state.rawClips.push(t),t}getClipByIdSync(e){return this.rawClipsById[e]??=this.state.rawClips.find(t=>Ot(e)?t.audio_url.includes(e):t.id===e)}async getClipById(e){return e.startsWith("m_")&&(e=e.slice(2)),this.getClipByIdSync(e)??await this.loadClip(e)}async buildLinks(){console.log("Building links...");for(let e=0;e<this.state.rawClips.length;e++){let t=this.state.rawClips[e];e%100===0&&console.log(`Processed ${e} clips out of ${this.state.rawClips.length}`);let{metadata:i}=t,[r,s]="history"in i?Ve(i.history[0],c=>typeof c=="string"?[c,"extend"]:c.infill?[c.id,"inpaint"]:[c.id,"extend"]):"concat_history"in i?[i.concat_history[1].id,"apply"]:"cover_clip_id"in i?[i.cover_clip_id,"cover"]:"upsample_clip_id"in i?[i.upsample_clip_id,"remaster"]:"type"in i&&i.type==="edit_crop"?await Xe(t,this.state.rawClips).then(c=>c?[c,"crop"]:[void 0,void 0]):[void 0,void 0];r&&this.state.links.push([(await this.getClipById(r)).id,t.id,s])}this.state.allLinksBuilt=!0,console.log(`Built ${this.state.links.length} links.`),console.log("Colony built. Run `await vovas.colony.render()` to view it!")}_linkedClips;get linkedClips(){return this._linkedClips??=this.getLinkedClips()}getLinkedClips(){let e=this.state.links.reduce((i,[r,s,c])=>{let y=se(i,{id:r})??O(`Could not find parent for link ${r} -> ${s}.`),g=se(i,{id:s})??O(`Could not find child for link ${r} -> ${s}.`);if(g.parent)throw new Error(`Child ${s} already has a parent: ${g.parent.clip.id}`);return g.parent={kind:c,clip:y},(y.children??=[]).push({kind:c,clip:g}),i},ze(this.state.rawClips));for(let i of e.filter(({parent:r})=>!r))t(i,i);return e;function t(i,r){Object.assign(i,{root:r});for(let{clip:s}of i.children??[])t(s,r)}}_rootClips;get rootClips(){return this._rootClips??=this.getRootClips()}getRootClips(){let e=this.linkedClips.filter(({parent:t})=>!t);return J(e)}get sortedClips(){let e=[],{rootClips:t}=this;for(let r of t)i(r);return e.reverse();function i(r){e.push(r);let{children:s}=r;if(s)for(let{clip:c}of J(s,({clip:y})=>y.created_at))i(c)}}get syntheticLinks(){let e=[],{rootClips:t}=this,i=t[0];for(let r of this.linkedClips.filter(({children:s})=>s?.length))e.push([(r.root??O(`Clip ${r.id} has no root.`)).id,r.id,"descendant"]);return e}getTotalDescendants(e){let t=se(this.linkedClips,{id:e})??O(`Clip ${e} not found.`);return t.totalDescendants??=1+(t.children?.reduce((i,{clip:{id:r}})=>i+this.getTotalDescendants(r),0)??0)}get graphData(){let e=this.sortedClips.map(({id:r,title:s,metadata:{tags:c},created_at:y,children:g,audio_url:D,image_url:L,root:S})=>({id:r,name:s||c||y||r,created_at:y,audio_url:D,image_url:L,tags:c,rootId:S?.id,val:r===S?.id&&g?.length?2:g?.length?1:.5})),t=([r,s,c])=>({source:r,target:s,kind:c,color:c==="next"?"#006":void 0,isMain:!Bt.includes(c)&&this.getTotalDescendants(s)>1});return{nodes:e,links:[...this.syntheticLinks,...this.state.links].map(t)}}getHtml(e){return console.log("Rendering your colony, give it a few seconds..."),`<script>window.colonyData=${JSON.stringify({graphData:this.graphData,in3D:mt(e)})}<\/script><script>(${ht.toString()})()<\/script>`}renderedElement=void 0;async render(...[e]){console.log("Rendering your colony, give it a few seconds..."),this.renderedElement=await Me(this.graphData,{in3D:mt(e)})}clear(){this.renderedElement?.remove()}renderToFile(...e){let t=this.getHtml(...e),i=new Blob([t],{type:"text/html"}),r=URL.createObjectURL(i),s=document.createElement("a");s.href=r,s.download="suno_colony.html",s.click(),URL.revokeObjectURL(r)}},ye=new ge;ye.stateLoaded.promise.then(()=>{console.log("Welcome to Vova\u2019s Suno Colony! This is a nifty tool to visualize your liked clips and the relationships between them, such as extensions, inpaints, covers, etc., in a graph format. It takes a bit of time and hacks to build, but hopefully it\u2019ll be worth it!");let{state:{allPagesProcessed:n,allLinksBuilt:e}}=ye;if(!n||!e)console.log("Run `await vovas.colony.build()` to start or continue building your colony!");else return console.log("Your colony is built, rendering!"),ye.render()});function mt(n){return n?.toLowerCase()==="3d"}function Ot(n){return n.match(/_\d+$/)}function jt(n){return console.warn(`Clip ${n} not found, creating a missing clip.`),{isMissing:!0,id:n,title:"*Clip not found*",created_at:null,audio_url:`https://cdn1.suno.ai/${n}.mp3`,image_url:"",metadata:{duration:0,tags:""}}}qe(window,{vovas:{Colony:ge,colony:ye}});})();
