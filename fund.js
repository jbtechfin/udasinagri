/* Udasinagri fundamentals tabs – dependency-free SVG charts */
(function(){
const LOCAL=['localhost','127.0.0.1'].includes(location.hostname);
const BASES=LOCAL?['/static/data/']:['https://raw.githubusercontent.com/jbtechfin/udasinagri/fund/data/','data/'];
const $=id=>document.getElementById(id);
const COL=['#f5b942','#19c37d','#6cb6ff','#ff4d5e','#c792ea','#4dd0e1','#ff9e64','#a3be8c','#e5c07b','#d4739a','#9aa5b1'];
const fmt=(v,d=0)=>v==null||isNaN(v)?'–':Number(v).toLocaleString('en-IN',{minimumFractionDigits:d,maximumFractionDigits:d});
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const TABS=[['prices','Prices','ભાવ'],['stocks','Stocks','સ્ટોક'],['area','Area','વાવેતર'],['prod','Production','ઉત્પાદન'],['curve','Futures curve','વાયદા કર્વ']];
let S=Object.assign({tab:'prices',c:'soybean',src:'psd',cty:'__top',cmp:'',y0:'',y1:'',u:'',m:'',root:'ZS',nc:'8',d0:'',d1:''},parseHash());
let IDX=null,CACHE={},CURVE=null;
function parseHash(){const o={};location.hash.slice(1).split('&').forEach(p=>{const [k,v]=p.split('=');if(k)o[k]=decodeURIComponent(v||'')});return o}
function setHash(){history.replaceState(null,'','#'+Object.entries(S).filter(([k,v])=>v!=='').map(([k,v])=>k+'='+encodeURIComponent(v)).join('&'))}
async function jget(u){let last;for(const b of BASES){try{const r=await fetch(b+u+'?t='+Math.floor(Date.now()/300000));if(r.ok)return await r.json();last=u+' '+r.status}catch(e){last=e.message}}throw new Error('data unavailable ('+last+')')}
async function comm(k){if(!CACHE[k])CACHE[k]=await jget('c_'+k+'.json');return CACHE[k]}

function drawTabs(){$('tabs').innerHTML=TABS.map(([k,e,g])=>`<button data-t="${k}" class="${S.tab===k?'on':''}">${e}<small>${g}</small></button>`).join('');
 $('tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{S.tab=b.dataset.t;if(S.tab==='stocks'&&S.m==='')S.m='e';S.u='';S.m=S.tab==='stocks'?'e':S.tab==='prod'?'p':'';setHash();show()})}
function show(){drawTabs();const p=S.tab==='prices';$('pricesTab').style.display=p?'':'none';document.querySelector('footer').style.display=p?'':'none';$('fund').style.display=p?'none':'block';if(!p)render().catch(e=>{$('view').innerHTML='<div class="nodata">Could not load data: '+esc(e.message)+'</div>'})}

/* ---------- unit helpers ---------- */
function convToMT(unit){ // factor raw -> 1000 MT
 if(!unit)return 1;if(/bales/i.test(unit))return .217724;if(/60 ?KG/i.test(unit))return .06;if(/1000 MT/i.test(unit))return 1;if(unit==='t')return .001;if(unit==='ha')return .001;return 1}
const MASS={'k':['1000 MT',1],'m':['million MT',.001],'n':['native (as published)',null]};
const AREA={'k':['1000 ha',1],'m':['million ha',.001],'a':['1000 acres',2.47105]};
const YLD={'t':['t/ha',1],'k':['kg/ha',1000],'q':['quintal/ha',10]};
function optsFor(){if(S.tab==='area')return AREA;if(S.tab==='prod'&&S.m==='y')return YLD;if(S.tab==='stocks'&&S.m==='s')return {'%':['% of use',1]};return MASS}
function pickUnit(o){return o[S.u]?S.u:Object.keys(o)[0]}

/* ---------- series ---------- */
function rawSeries(obj,src,attr,cty){ // returns {years,vals,unit,note}
 const d=obj[src];if(!d)return null;const U=d.units||{};const f=convToMT(U[attr]);
 let vals;
 if(cty==='__sum'){
  if(src==='fao'&&d.countries['World'])vals=(d.countries['World'][attr]||[]).map(v=>v);
  else{vals=d.years.map((y,i)=>{let s=0,n=0;for(const c in d.countries){if(c==='World')continue;const a=d.countries[c][attr];if(a&&a[i]!=null){s+=a[i];n++}}return n?s:null})}
 }else{const c=d.countries[cty];if(!c||!c[attr])return null;vals=c[attr].slice()}
 return {years:d.years,vals,f,unitRaw:U[attr]||''};
}
function metricSeries(obj,src,cty,m){ // m: e,s(stu),a,p,y  -> base units (1000MT / 1000ha / ratio)
 if(m==='y'){const p=rawSeries(obj,src,'p',cty),a=rawSeries(obj,src,'a',cty);if(!p||!a)return null;
  return {years:p.years,vals:p.vals.map((v,i)=>v!=null&&a.vals[i]?v*p.f/(a.vals[i]*a.f):null),base:'y'}}  // 1000MT/1000ha = t/ha
 if(m==='s'){const e=rawSeries(obj,src,'e',cty),u=rawSeries(obj,src,'u',cty);if(!e||!u)return null;
  return {years:e.years,vals:e.vals.map((v,i)=>v!=null&&u.vals[i]?100*v*e.f/(u.vals[i]*u.f):null),base:'s'}}
 const r=rawSeries(obj,src,m,cty);if(!r)return null;return {years:r.years,vals:r.vals.map(v=>v==null?null:v*r.f),raw:r,base:m}}
function scaleVals(ms,key,opts){const o=opts[key];if(o[1]==null)return ms.raw?ms.raw.vals:ms.vals; if(ms.base==='a'&&ms.raw)return ms.vals.map(v=>v==null?null:v*o[1]);return ms.vals.map(v=>v==null?null:v*o[1])}
function unitLabel(ms,key,opts){const o=opts[key];if(o[1]==null)return 'native: '+(ms.raw?ms.raw.unitRaw.replace(/[()]/g,''):'')+(ms.raw&&ms.raw.unitRaw==='t'?'':'');return o[0]}
const yl=(src,y)=>src==='psd'?y+'/'+String(y+1).slice(2):String(y);

/* ---------- charts ---------- */
function nice(max){if(max<=0)return 1;const e=Math.pow(10,Math.floor(Math.log10(max))),f=max/e;return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*e}
function lineChart(series,labels,unit,opt={}){
 const W=640,Hh=300,L=58,R=12,T=14,B=30;let mx=0,mn=Infinity;series.forEach(s=>s.vals.forEach(v=>{if(v!=null){mx=Math.max(mx,v);mn=Math.min(mn,v)}}));
 if(!isFinite(mn))return '<div class="nodata">No data in this range</div>';
 let lo=opt.zero===false?mn-(mx-mn)*.1:0;if(opt.zero===false&&lo<0&&mn>=0)lo=0;let hi=opt.zero===false?mx+(mx-mn)*.1:nice(mx*1.05);if(hi===lo)hi=lo+1;
 const n=labels.length,x=i=>L+(n<2?(W-L-R)/2:i*(W-L-R)/(n-1)),y=v=>T+(Hh-T-B)*(1-(v-lo)/(hi-lo));
 let g='';for(let k=0;k<=4;k++){const v=lo+(hi-lo)*k/4;g+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="#1f2a36"/><text x="${L-5}" y="${y(v)+3}" text-anchor="end">${fmt(v,Math.abs(hi)<10?2:Math.abs(hi)<100?1:0)}</text>`}
 const step=Math.ceil(n/8);labels.forEach((l,i)=>{if(i%step===0||i===n-1)g+=`<text x="${x(i)}" y="${Hh-10}" text-anchor="middle">${l}</text>`});
 series.forEach((s,k)=>{let d='',pen=false,dots='';s.vals.forEach((v,i)=>{if(v==null){pen=false;return}d+=(pen?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1);pen=true;if(n<=40)dots+=`<circle cx="${x(i)}" cy="${y(v)}" r="2.6" fill="${COL[k%COL.length]}"><title>${esc(s.name)} ${labels[i]}: ${fmt(v,2)} ${esc(unit)}</title></circle>`});
  g+=`<path d="${d}" fill="none" stroke="${COL[k%COL.length]}" stroke-width="2"/>${dots}`});
 return `<svg class="ch" viewBox="0 0 ${W} ${Hh}">${g}<text x="${L}" y="9">${esc(unit)}</text></svg><div class="leg">${series.map((s,k)=>`<span><i style="background:${COL[k%COL.length]}"></i>${esc(s.name)}</span>`).join('')}</div>`}
function barChart(items,unit,dec){
 if(!items.length)return '<div class="nodata">No data for this selection</div>';const W=640,rh=26,L=130,R=60,H=items.length*rh+22;const mx=Math.max(...items.map(i=>i.v));
 let g='';items.forEach((it,i)=>{const w=mx>0?(W-L-R)*it.v/mx:0,yy=10+i*rh;g+=`<text x="${L-6}" y="${yy+14}" text-anchor="end">${esc(it.name.length>20?it.name.slice(0,19)+'…':it.name)}</text><rect x="${L}" y="${yy+3}" width="${Math.max(w,1)}" height="${rh-8}" fill="${COL[i%COL.length]}" rx="2"><title>${esc(it.name)}: ${fmt(it.v,dec)} ${esc(unit)}</title></rect><text x="${L+w+4}" y="${yy+14}">${fmt(it.v,dec)}</text>`});
 return `<svg class="ch" viewBox="0 0 ${W} ${H}">${g}</svg><div class="leg">${esc(unit)}</div>`}
function table(head,rows){return `<div class="tw"><table><tr>${head.map((h,i)=>`<th class="${i?'':'l'}">${esc(h)}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map((c,i)=>`<td class="${i?'':'l'}">${c}</td>`).join('')}</tr>`).join('')}</table></div>`}

/* ---------- params ---------- */
const sel=(id,lab,opts,val)=>`<label>${lab}<select id="${id}">${opts.map(([v,t,dis])=>`<option value="${esc(v)}" ${String(v)===String(val)?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;
function bind(){document.querySelectorAll('#params select,#params input').forEach(e=>e.onchange=()=>{const k=e.dataset.k||e.id;S[k]=e.value;if(k==='c'||k==='src'){S.cty='__top';S.cmp=''}setHash();render().catch(er=>$('view').innerHTML='<div class="nodata">'+esc(er.message)+'</div>')});document.querySelectorAll('#params [id]').forEach(e=>e.dataset.k=e.id.replace(/^p_/,''))}
function head(sub,src){return `<div class="vint">${sub}</div>`}

async function render(){
 if(!IDX)IDX=await jget('index.json');
 if(S.tab==='curve')return renderCurve();
 const all=IDX.commodities,nas=IDX.na;
 const copts=[...all.map(c=>[c.key,c.en+' · '+c.gu]),...nas.map(c=>[c.key,'⚠ '+c.en+' · '+c.gu+' (no free data)'])];
 const isNA=nas.find(n=>n.key===S.c);
 if(isNA){$('params').innerHTML=sel('p_c','Commodity',copts,S.c);bind();
  $('view').innerHTML=`<div class="nodata"><b>${esc(isNA.en)} · ${esc(isNA.gu)} — not available</b><br><br>${esc(isNA.reason)}<br><br>We show "not available" rather than estimate values.</div>`;return}
 const ci=all.find(c=>c.key===S.c)||all[0];S.c=ci.key;const obj=await comm(S.c);
 const metric=S.tab==='stocks'?(S.m==='s'?'s':'e'):S.tab==='area'?'a':(S.m==='y'?'y':'p');
 // sources available for metric
 const needsPSD=(metric==='e'||metric==='s');const avail=[];
 if(obj.psd)avail.push(['psd','USDA PSD (marketing year, monthly)']);
 if(obj.fao&&!needsPSD)avail.push(['fao','FAOSTAT (calendar year, annual)']);
 if(!avail.length||(needsPSD&&!obj.psd)){
  $('params').innerHTML=sel('p_c','Commodity',copts,S.c);bind();
  $('view').innerHTML=`<div class="nodata"><b>${esc(ci.en)} · ${esc(ci.gu)} — ${S.tab==='stocks'?'stocks':'data'} not available</b><br><br>${S.tab==='stocks'?'No free machine-readable world stocks series exists for this commodity (USDA PSD does not cover it).':'No free series loaded.'}${ci.note?'<br>'+esc(ci.note):''}</div>`;return}
 if(!avail.find(a=>a[0]===S.src))S.src=avail[0][0];
 const d0_=obj[S.src];const attrK=metric==='e'||metric==='s'?'e':metric==='y'?'p':metric;const okIdx=d0_.years.map((y,i)=>Object.values(d0_.countries).filter(c=>c[attrK]&&c[attrK][i]).length>=(S.src==='psd'?8:20));const d=Object.assign({},d0_);const years=d0_.years.filter((y,i)=>okIdx[i]);if(S.y1===''||+S.y1>years[years.length-1]||+S.y1<years[0])S.y1=String(years[years.length-1]);if(S.y0===''||+S.y0<years[0]||+S.y0>+S.y1)S.y0=String(Math.max(years[0],+S.y1-(S.src==='psd'?10:20)));
 const cl=Object.keys(d.countries).filter(c=>c!=='World').sort();
 const mopts=S.tab==='stocks'?[['e','Ending stocks'],['s','Stocks-to-use %']]:S.tab==='prod'?[['p','Production'],['y','Yield (prod ÷ area)']]:null;
 const uo=optsFor();S.u=pickUnit(uo);
 const yopts=years.map(y=>[y,yl(S.src,y)]);
 $('params').innerHTML=sel('p_c','Commodity · જણસ',copts,S.c)+sel('p_src','Data source',avail,S.src)+
  sel('p_cty','Country · દેશ',[['__top','World top 10'],['__sum',S.src==='fao'?'World total (FAO)':'World total (sum of countries)'],...cl.map(c=>[c,c])],S.cty)+
  (S.cty!=='__top'?sel('p_cmp','Compare with',[['','—'],...cl.filter(c=>c!==S.cty).map(c=>[c,c])],S.cmp):'')+
  (mopts?sel('p_m','Metric',mopts,S.m||mopts[0][0]):'')+
  sel('p_y0','From year',yopts,S.y0)+sel('p_y1','To year',yopts,S.y1)+
  sel('p_u','Unit',Object.entries(uo).map(([k,v])=>[k,v[0]]),S.u);
 bind();
 const y0=+S.y0,y1=+S.y1,i0=d0_.years.indexOf(y0),i1=d0_.years.indexOf(y1);const labels=d0_.years.slice(i0,i1+1).map(y=>yl(S.src,y));
 const title={e:'Ending stocks',s:'Stocks-to-use ratio',a:'Area harvested (વાવેતર)',p:'Production',y:'Yield'}[metric];
 const vint=`Source: <b>${esc(d.source)}</b> · ${S.src==='psd'?`USDA release <b>${esc(d.asof)}</b> (WASDE month); data built ${esc((IDX.meta.psd_built||'').replace('T',' '))} IST. Latest year(s) are USDA estimates/projections, not final.`:`latest year <b>${esc(d.asof)}</b>, annual (FAOSTAT is released once a year with ~1 yr lag). Production in tonnes, area harvested in ha.`}${S.src==='psd'&&metric!=='a'&&metric!=='y'&&/bales|bags/i.test(Object.values(d.units).join(' '))&&S.u!=='n'?' Converted to metric tonnes: 1 bale (480 lb)=217.72 kg; 1 bag=60 kg.':''}${metric==='s'?' Stocks-to-use = ending stocks ÷ domestic consumption ×100, computed here from PSD.':''}${S.cty==='__sum'&&S.src==='psd'?' World total = sum of reported countries.':''}`;
 const v=[];
 if(S.cty==='__top'){
  const rankM=metric==='s'?'e':metric==='y'?'p':metric;
  let rows=[];for(const c of cl){const s=metricSeries(obj,S.src,c,rankM);if(!s)continue;const val=s.vals[i1];if(val!=null&&val>0)rows.push({c,r:val})}
  rows.sort((a,b)=>b.r-a.r);const top=rows.slice(0,10);
  const item=top.map(t=>{const ms=metricSeries(obj,S.src,t.c,metric);return {name:t.c,v:scaleVals(ms,S.u,uo)[i1],ms}}).filter(x=>x.v!=null);
  if(!item.length){$('view').innerHTML='<div class="nodata">Not available for this selection.</div>';return}
  const ul=unitLabel(item[0].ms,S.u,uo);
  const ser=item.map(it=>({name:it.name,vals:scaleVals(it.ms,S.u,uo).slice(i0,i1+1)}));
  $('view').innerHTML=`<div class="two"><div class="card"><h3>${title} — top 10, ${yl(S.src,y1)}</h3>${barChart(item,ul,metric==='y'||metric==='s'?2:0)}</div>
  <div class="card"><h3>${title} — top 10 over time</h3>${lineChart(ser,labels,ul)}</div></div>
  <div class="card"><h3>Table</h3>${table(['Country',...labels.slice().reverse().slice(0,8)],item.map(it=>{const a=scaleVals(it.ms,S.u,uo).slice(i0,i1+1).reverse().slice(0,8);return [esc(it.name),...a.map(x=>fmt(x,metric==='y'||metric==='s'?2:0))]}))}<div class="vint">${vint}</div></div>`;
 }else{
  const sers=[];const mk=c=>{const ms=metricSeries(obj,S.src,c,metric);if(!ms)return null;return {name:c==='__sum'?'World':c,ms,vals:scaleVals(ms,S.u,uo).slice(i0,i1+1)}};
  const a=mk(S.cty);if(a)sers.push(a);if(S.cmp){const b=mk(S.cmp);if(b)sers.push(b)}
  if(!sers.length||sers.every(s=>s.vals.every(x=>x==null))){$('view').innerHTML=`<div class="nodata"><b>Not available</b><br>${esc(ci.en)}: ${title.toLowerCase()} has no data for ${esc(S.cty==='__sum'?'World':S.cty)} in ${esc(d.source)}.<div class="vint">${vint}</div></div>`;return}
  const ul=unitLabel(sers[0].ms,S.u,uo);
  $('view').innerHTML=`<div class="card"><h3>${esc(ci.en)} · ${title} — ${esc(sers.map(s=>s.name).join(' vs '))}</h3>${lineChart(sers,labels,ul,{zero:true})}<div class="vint">${vint}</div></div>
  <div class="card"><h3>Table</h3>${table(['Year',...sers.map(s=>s.name)],labels.map((l,i)=>[l,...sers.map(s=>fmt(s.vals[i],metric==='y'||metric==='s'?2:0))]).reverse())}</div>`;
 }
}

/* ---------- futures curve ---------- */
async function renderCurve(){
 if(!CURVE)CURVE=await jget('curve.json');const roots=CURVE.roots;if(!roots[S.root])S.root=Object.keys(roots)[0];const R=roots[S.root];
 const nc=Math.min(+S.nc||8,R.contracts.length);const cons=R.contracts.slice(0,nc);
 const today=new Date(CURVE.generated);const d1=S.d1||CURVE.generated.slice(0,10);const d0=S.d0||new Date(today.getTime()-90*864e5).toISOString().slice(0,10);
 $('params').innerHTML=sel('p_root','Commodity',Object.entries(roots).map(([k,v])=>[k,v.label]),S.root)+
  sel('p_nc','Contract months shown',[3,4,5,6,7,8].filter(n=>n<=R.contracts.length||n===3).map(n=>[n,'next '+n]),String(nc))+
  `<label>History from<input type="date" id="p_d0" value="${d0}"></label><label>History to<input type="date" id="p_d1" value="${d1}"></label>`;bind();
 const gen=new Date(CURVE.generated).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:false});
 const front=cons[0].price;
 const ser=[{name:S.root+' forward curve',vals:cons.map(c=>c.price)}];
 const hs=cons.map(c=>({name:c.name,h:Object.fromEntries(c.hist)}));const dates=[...new Set(cons.flatMap(c=>c.hist.map(h=>h[0])))].sort().filter(x=>x>=d0&&x<=d1);
 const hser=hs.map(h=>({name:h.name,vals:dates.map(d=>h.h[d]??null)}));
 $('view').innerHTML=`<div class="warn"><b>INDICATIVE</b> – delayed (~10–15 min) Yahoo Finance quotes per contract; not an official exchange feed, not for trading. Prices in exchange units (${esc(R.unit)}). Palm oil (Bursa) and NCDEX contracts are shown on the Prices tab only; no free per-contract history for them.</div>
 <div class="two"><div class="card"><h3>${esc(R.label)} — forward curve</h3>${lineChart(ser,cons.map(c=>c.name),R.unit,{zero:false})}
 <div class="vint">Source: ${esc(CURVE.source)} · snapshot <b>${gen} IST</b></div></div>
 <div class="card"><h3>Contract price history</h3>${lineChart(hser,dates.map(d=>d.slice(5)),R.unit,{zero:false})}<div class="vint">Daily closes, ${d0} → ${d1} (history available for the last 6 months). Gaps = no data for that contract.</div></div></div>
 <div class="card"><h3>Contracts</h3>${table(['Contract','Symbol','Price','Prev close','Chg %','vs front','Last quote (IST)'],cons.map(c=>[c.name,c.sym,fmt(c.price,2),fmt(c.prev,2),c.prev?`<span class="${c.price>=c.prev?'up':'dn'}">${(c.price>=c.prev?'+':'')+fmt((c.price/c.prev-1)*100,2)}%</span>`:'–',(c.price>=front?'+':'')+fmt(c.price-front,2),c.time?new Date(c.time).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}):'–']))}
 <div class="vint">Curve shape: ${cons.length>1?(cons[cons.length-1].price>front?'contango (later months higher)':'backwardation (later months lower)'):''} — computed from the quotes above.</div></div>`;
}
drawTabs();show();window.addEventListener('hashchange',()=>{Object.assign(S,parseHash());show()});
})();
