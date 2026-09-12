/* ===== 基础 ===== */
const $=(s,r)=>(r||document).querySelector(s),$$=(s,r)=>[...(r||document).querySelectorAll(s)];
const num=v=>{const n=parseFloat(v);return isFinite(n)?n:0};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=p=>(p||'x')+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const TODAY=()=>iso(new Date());
const addDays=(s,n)=>{const d=new Date(s+'T00:00:00');d.setDate(d.getDate()+n);return iso(d)};
const pISO=s=>{const a=s.split('-').map(Number);return new Date(a[0],a[1]-1,a[2])};
const WD='日一二三四五六';
const LS={g(k,d){try{const v=JSON.parse(localStorage.getItem('diet::'+k));return v==null?d:v}catch(e){return d}},s(k,v){try{localStorage.setItem('diet::'+k,JSON.stringify(v))}catch(e){}}};

const DEF=[
  {n:'米饭(熟)',k:116,p:2.6,c:25.9,f:0.3},
  {n:'鸡胸肉',k:133,p:24.6,c:1,f:3},
  {n:'鸡蛋',k:144,p:13.3,c:2.8,f:8.8,un:'个',ug:50},
  {n:'全麦面包',k:265,p:9,c:49,f:3.2,un:'片',ug:35}
];
const DB={foods:LS.g('foods',null),logs:LS.g('logs',[]),cost:LS.g('cost',[]),weights:LS.g('weights',[]),target:LS.g('target',null),profile:LS.g('profile',null)};
if(!Array.isArray(DB.foods)||!DB.foods.length){DB.foods=DEF.map(f=>Object.assign({id:uid('f'),fav:false},f));LS.s('foods',DB.foods)}
if(!DB.target)DB.target={kcal:1400,protein:105,carb:175,fat:31};
if(!DB.profile)DB.profile={height:160,age:25,sex:'f',act:8,minutes:0};

/* ===== 通用 UI ===== */
function toast(m,ms,undo){
  ms=ms||1600;
  const e=document.createElement('div');
  e.innerHTML='<span class="tk"><svg viewBox="0 0 24 24"><path d="M5 12.5 10 17.5 19 7.5"/></svg></span><span>'+esc(m)+'</span>'
    +(undo?'<button id="t_un" style="margin-left:2px;padding:3px 11px;border-radius:12px;background:rgba(255,255,255,.18);color:#fff;font-size:13px;font-weight:600">撤销</button>':'');
  e.style.cssText='position:fixed;left:50%;bottom:100px;transform:translateX(-50%);z-index:2000;display:flex;align-items:center;gap:9px;background:rgba(48,50,94,.92);color:#fff;font-size:14px;padding:10px 18px 10px 12px;border-radius:22px;max-width:80%;pointer-events:'+(undo?'auto':'none')+';animation:riseIn .28s cubic-bezier(.22,1,.36,1)';
  document.body.appendChild(e);
  if(undo){const b=e.querySelector('#t_un');if(b)b.onclick=()=>{undo();e.remove()}}
  setTimeout(()=>{e.style.transition='opacity .25s';e.style.opacity='0'},ms-250);
  setTimeout(()=>e.remove(),ms);
}
function delUndo(key,renderFn){
  const bak=JSON.stringify(DB[key]);
  return ()=>{DB[key]=JSON.parse(bak);LS.s(key,DB[key]);renderFn()};
}
function sheet(html){const m=document.createElement('div');m.className='mask';m.innerHTML='<div class="sheet">'+html+'</div>';document.body.appendChild(m);const close=()=>m.remove();m.onclick=e=>{if(e.target===m)close()};$$('[data-close]',m).forEach(b=>b.onclick=close);return{el:m,close,q:s=>m.querySelector(s),qa:s=>$$(s,m)}}
function dlg(html){const m=document.createElement('div');m.className='mask center';m.innerHTML='<div class="dlg">'+html+'</div>';document.body.appendChild(m);const close=()=>m.remove();m.onclick=e=>{if(e.target===m)close()};$$('[data-close]',m).forEach(b=>b.onclick=close);return{el:m,close,q:s=>m.querySelector(s)}}
function swipe(el){let x0=0,y0=0,dx=0,op=false,lk=null;el.addEventListener('touchstart',e=>{if(window.__row&&window.__row!==el)window.__row.style.transform='';x0=e.touches[0].clientX;y0=e.touches[0].clientY;dx=0;lk=null;el.style.transition='none'},{passive:true});el.addEventListener('touchmove',e=>{const mx=e.touches[0].clientX-x0,my=e.touches[0].clientY-y0;if(lk===null)lk=Math.abs(mx)>Math.abs(my)+3?'x':'y';if(lk!=='x')return;dx=Math.max(-96,Math.min(0,op?mx-80:mx));el.style.transform='translateX('+dx+'px)'},{passive:true});el.addEventListener('touchend',()=>{el.style.transition='';op=dx<-40;el.style.transform=op?'translateX(-80px)':'';window.__row=op?el:(window.__row===el?null:window.__row)})}
function go(pg){$$('.page').forEach(p=>p.classList.toggle('on',p.id==='pg-'+pg));$$('.tab').forEach(b=>b.classList.toggle('on',b.dataset.pg===pg));({meal:renderMeal,food:renderFood,cost:renderCost,weight:renderWeight,set:renderSet}[pg]||function(){})();scrollTo(0,0)}
$$('.tab').forEach(b=>b.onclick=()=>go(b.dataset.pg));

/* ===== 动效 ===== */
let __prevK=0;
function animateBig(){
  const el=$('#mealApp .big');if(!el||!el.firstChild)return;
  const node=el.firstChild,to=parseFloat(node.nodeValue);if(!isFinite(to))return;
  const from=__prevK;__prevK=to;if(Math.abs(to-from)<1)return;
  const t0=performance.now(),dur=550;
  (function step(now){
    const p=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-p,3);
    node.nodeValue=String(Math.round(from+(to-from)*e));
    if(p<1)requestAnimationFrame(step);else node.nodeValue=String(Math.round(to));
  })(t0);
}
function stagger(){$$('.list .swipe,.item,.sum>div').forEach((el,i)=>{el.style.animationDelay=Math.min(i*30,280)+'ms'})}

/* ===== 今日饮食 ===== */
let mDate=TODAY();
const of=d=>DB.logs.filter(l=>l.date===d);
function tot(d){const t={k:0,p:0,c:0,f:0};of(d).forEach(l=>{const r=num(l.gram)/100;t.k+=num(l.k)*r;t.p+=num(l.p)*r;t.c+=num(l.c)*r;t.f+=num(l.f)*r});return t}
function macCell(n,v,g,c){const p=g>0?Math.min(100,v/g*100):0;return '<div><div class="t">'+n+'</div><div class="v">'+v.toFixed(1)+'<em> / '+g+'g</em></div><div class="bar s"><i style="width:'+p+'%;background:'+c+'"></i></div></div>'}
function renderMeal(){
  const b=$('#mealApp');if(!b)return;if(window.__row){window.__row.style.transform='';window.__row=null}
  const t=DB.target,tt=tot(mDate),L=of(mDate),d=pISO(mDate),isT=mDate===TODAY();
  const pc=(a,c)=>c>0?Math.min(100,a/c*100):0;
  b.innerHTML='<div class="dbar"><button id="pv">‹</button><div class="d">'+(d.getMonth()+1)+'月'+d.getDate()+'日 周'+WD[d.getDay()]+'<small>'+(isT?'今天':'补录中')+'</small><input type="date" id="dp" value="'+mDate+'" max="'+TODAY()+'"></div><button id="nx"'+(isT?' disabled':'')+'>›</button></div>'
  +'<div class="card"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div class="big">'+tt.k.toFixed(0)+'<span class="goal"> / '+t.kcal+' kcal</span></div><button id="etgt" style="color:var(--blue);font-size:12.5px;padding:6px 0 6px 10px">改目标</button></div>'
  +'<div class="bar" style="margin-top:12px"><i style="width:'+pc(tt.k,t.kcal)+'%;background:'+(tt.k>t.kcal?'var(--red)':'var(--blue)')+'"></i></div>'
  +'<div class="mac">'+macCell('蛋白',tt.p,t.protein,'var(--blue)')+macCell('碳水',tt.c,t.carb,'var(--green)')+macCell('脂肪',tt.f,t.fat,'var(--orange)')+'</div>'
  +'<div class="sub" style="margin-top:16px;padding-top:12px;border-top:1px solid var(--sep)">还差 <b>'+Math.max(0,t.kcal-tt.k).toFixed(0)+'</b> kcal · 蛋白 <b>'+Math.max(0,t.protein-tt.p).toFixed(0)+'</b> g · 碳水 <b>'+Math.max(0,t.carb-tt.c).toFixed(0)+'</b> g · 脂肪 <b>'+Math.max(0,t.fat-tt.f).toFixed(0)+'</b> g</div></div>'
  +'<div class="sec">'+(isT?'今天':'这天')+'吃了 '+L.length+' 条</div><div class="list">'
  +(L.length?L.map(l=>{const r=num(l.gram)/100;return '<div class="swipe"><div class="db" data-del="'+l.id+'">删除</div><div class="srow" data-r="'+l.id+'"><div class="l"><div class="n">'+esc(l.name)+'</div><div class="s">'+num(l.gram)+'g · 蛋白 '+(num(l.p)*r).toFixed(1)+' · 碳水 '+(num(l.c)*r).toFixed(1)+' · 脂肪 '+(num(l.f)*r).toFixed(1)+'</div></div><div class="r"><div class="k">'+(num(l.k)*r).toFixed(0)+'</div><div class="g">kcal</div></div></div></div>'}).join(''):'<div class="empty">还没有记录<br>点下面「＋ 记一笔」</div>')
  +'</div><div class="addbtn" id="madd">＋ 记一笔</div>';
  $('#pv').onclick=()=>{mDate=addDays(mDate,-1);renderMeal()};
  const nx=$('#nx');if(nx)nx.onclick=()=>{const n=addDays(mDate,1);if(n<=TODAY()){mDate=n;renderMeal()}};
  $('#dp').onchange=e=>{if(e.target.value&&e.target.value<=TODAY()){mDate=e.target.value;renderMeal()}};
  $('#madd').onclick=()=>mealEditor(null);$('#etgt').onclick=tgtEditor;
  $$('[data-del]',b).forEach(e=>e.onclick=()=>{
    const undo=delUndo('logs',renderMeal);
    DB.logs=DB.logs.filter(x=>x.id!==e.dataset.del);LS.s('logs',DB.logs);renderMeal();
    toast('已删除',2200,undo);
  });
  $$('.srow',b).forEach(e=>{swipe(e);e.onclick=()=>{if(!window.__row)mealEditor(e.dataset.r)}});
  stagger();animateBig();
}
function mealEditor(id){
  const ed=id?DB.logs.find(x=>x.id===id):null,d=ed||{name:'',gram:'',k:'',p:'',c:'',f:''};
  const ch=DB.foods.slice().sort((a,b)=>(b.fav?1:0)-(a.fav?1:0)).slice(0,12);
  const s=sheet('<div class="sh"><button data-close>取消</button><span class="t">'+(ed?'编辑记录':'记一笔')+'</span><span class="s" id="ok">保存</span></div><div class="sb">'
  +(ch.length?'<div class="f"><label>食物库（点一下自动填）</label><div class="chips">'+ch.map(f=>'<div class="chip" data-f="'+f.id+'">'+esc(f.n)+'</div>').join('')+'</div></div>':'')
  +'<div class="f"><label>吃了什么</label><input id="a_name" placeholder="名称" value="'+esc(d.name)+'"></div>'
  +'<div class="f"><label>克数</label><input id="a_gram" type="number" inputmode="decimal" placeholder="150" value="'+esc(d.gram)+'"></div>'
  +'<div id="a_units" class="chips" style="margin:-6px 0 14px"></div>'
  +'<div class="sec" style="margin:16px 4px 10px">每 100g 营养</div>'
  +'<div class="row"><div class="f"><label>热量 kcal</label><input id="a_k" type="number" inputmode="decimal" value="'+esc(d.k)+'"></div><div class="f"><label>蛋白 g</label><input id="a_p" type="number" inputmode="decimal" value="'+esc(d.p)+'"></div></div>'
  +'<div class="row"><div class="f"><label>碳水 g</label><input id="a_c" type="number" inputmode="decimal" value="'+esc(d.c)+'"></div><div class="f"><label>脂肪 g</label><input id="a_f" type="number" inputmode="decimal" value="'+esc(d.f)+'"></div></div>'
  +(ed?'<div class="danger" id="del">删除这条记录</div>':'<div class="chips" style="margin-top:2px"><div class="chip on" id="keep">✓ 存进食物库</div></div>')+'</div>');
  let keep=true,pid=null;
  const kp=$('#keep',s.el);if(kp)kp.onclick=()=>{keep=!keep;kp.classList.toggle('on',keep)};
  const ub=$('#a_units',s.el);
  function units(f){
    if(!f||!num(f.ug)){ub.innerHTML='';return}
    let h='';[1,2,3,4,5].forEach(n=>{if(n===1)h+='<div class="chip" data-u="'+n+'">1 '+esc(f.un||'份')+'（'+num(f.ug)+'g）</div>';else h+='<div class="chip" data-u="'+n+'">'+n+' '+esc(f.un||'份')+'</div>'});
    ub.innerHTML=h;
    $$('.chip[data-u]',ub).forEach(c=>c.onclick=()=>{
      s.q('#a_gram').value=num(f.ug)*num(c.dataset.u);
      $$('.chip[data-u]',ub).forEach(x=>x.classList.remove('on'));c.classList.add('on');
    });
  }
  s.qa('.chip[data-f]').forEach(c=>c.onclick=()=>{
    s.qa('.chip[data-f]').forEach(x=>x.classList.remove('on'));c.classList.add('on');
    const f=DB.foods.find(x=>x.id===c.dataset.f);if(!f)return;pid=f.id;
    s.q('#a_name').value=f.n;s.q('#a_k').value=num(f.k);s.q('#a_p').value=num(f.p);s.q('#a_c').value=num(f.c);s.q('#a_f').value=num(f.f);
    if(!s.q('#a_gram').value)s.q('#a_gram').value=num(f.ug)||100;
    units(f);
  });
  if(ed){const f=DB.foods.find(x=>x.n===d.name);if(f)units(f)}
  $('#ok',s.el).onclick=()=>{
    const name=s.q('#a_name').value.trim()||'未命名',gram=num(s.q('#a_gram').value);
    if(gram<=0){s.q('#a_gram').focus();toast('填一下克数');return}
    const o={id:ed?ed.id:uid('m'),date:ed?ed.date:mDate,name:name,gram:gram,k:num(s.q('#a_k').value),p:num(s.q('#a_p').value),c:num(s.q('#a_c').value),f:num(s.q('#a_f').value)};
    if(ed)DB.logs[DB.logs.findIndex(x=>x.id===ed.id)]=o;else DB.logs.push(o);
    if(!ed&&keep&&!pid){const ex=DB.foods.find(x=>x.n===name);if(ex){ex.k=o.k;ex.p=o.p;ex.c=o.c;ex.f=o.f}else DB.foods.push({id:uid('f'),n:name,k:o.k,p:o.p,c:o.c,f:o.f,fav:false})}
    LS.s('logs',DB.logs);LS.s('foods',DB.foods);s.close();renderMeal();toast(ed?'已保存':'已记下');
  };
  const dl=$('#del',s.el);
  if(dl)dl.onclick=()=>{
    const undo=delUndo('logs',renderMeal);
    DB.logs=DB.logs.filter(x=>x.id!==ed.id);LS.s('logs',DB.logs);s.close();renderMeal();
    toast('已删除',2200,undo);
  };
}
function tgtEditor(){
  const t=DB.target;
  const s=dlg('<h3>每日目标</h3><div class="f"><label>热量 kcal</label><input id="t_k" type="number" inputmode="decimal" value="'+t.kcal+'"></div>'
  +'<div class="row"><div class="f"><label>蛋白 g</label><input id="t_p" type="number" inputmode="decimal" value="'+t.protein+'"></div><div class="f"><label>碳水 g</label><input id="t_c" type="number" inputmode="decimal" value="'+t.carb+'"></div></div>'
  +'<div class="f"><label>脂肪 g</label><input id="t_f" type="number" inputmode="decimal" value="'+t.fat+'"></div>'
  +'<div class="dbtns"><button data-close>取消</button><button class="p" id="ok">保存</button></div>');
  $('#ok',s.el).onclick=()=>{DB.target={kcal:num(s.q('#t_k').value)||1400,protein:num(s.q('#t_p').value)||105,carb:num(s.q('#t_c').value)||175,fat:num(s.q('#t_f').value)||31};LS.s('target',DB.target);s.close();renderMeal();toast('目标已更新')};
}

/* ===== 食物库 ===== */
let fq='';
function renderFood(){
  const b=$('#foodApp');if(!b)return;if(window.__row){window.__row.style.transform='';window.__row=null}
  b.innerHTML='<div style="margin-bottom:14px"><input id="fq" placeholder="搜索食物" value="'+esc(fq)+'" style="width:100%;background:var(--card);border-radius:14px;padding:13px 16px;font-size:16px"></div><div class="sec" id="fc"></div><div class="list" id="fl"></div><div class="addbtn" id="fadd">＋ 添加食物</div>';
  $('#fq',b).oninput=e=>{fq=e.target.value;paintFood()};
  $('#fadd',b).onclick=()=>foodEditor(null);
  paintFood();
}
function paintFood(){
  const q=fq.trim().toLowerCase();let L=DB.foods.slice();
  if(q)L=L.filter(f=>String(f.n||'').toLowerCase().indexOf(q)>=0);
  L.sort((a,b)=>(b.fav?1:0)-(a.fav?1:0)||String(a.n).localeCompare(String(b.n),'zh'));
  $('#fc').textContent=q?'找到 '+L.length+' 种':'共 '+DB.foods.length+' 种 ｜ 收藏 '+DB.foods.filter(f=>f.fav).length;
  const w=$('#fl');
  if(!L.length){w.innerHTML='<div class="empty">没找到<br>换个词，或点下面添加</div>';return}
  w.innerHTML=L.map(f=>'<div class="swipe"><div class="db" data-del="'+f.id+'">删除</div><div class="srow" data-r="'+f.id+'"><div class="l"><div class="n">'+(f.fav?'★ ':'')+esc(f.n)+'</div><div class="s">蛋白 '+num(f.p)+' · 碳水 '+num(f.c)+' · 脂肪 '+num(f.f)+(num(f.ug)?' ｜ 1'+esc(f.un||'份')+'='+num(f.ug)+'g':'')+'</div></div><div class="r"><div class="k">'+num(f.k)+'</div><div class="g">kcal/100g</div></div></div></div>').join('');
  $$('[data-del]',w).forEach(e=>e.onclick=()=>{
    const undo=delUndo('foods',renderFood);
    DB.foods=DB.foods.filter(x=>x.id!==e.dataset.del);LS.s('foods',DB.foods);renderFood();
    toast('已删除',2200,undo);
  });
  $$('.srow',w).forEach(e=>{swipe(e);e.onclick=()=>{if(!window.__row)foodEditor(e.dataset.r)}});
  stagger();
}
function foodEditor(id){
  const ed=id?DB.foods.find(f=>f.id===id):null,d=ed||{n:'',k:'',p:'',c:'',f:'',fav:false,un:'',ug:''},fv=v=>(v==null||v==='')?'':v;
  const s=sheet('<div class="sh"><button data-close>取消</button><span class="t">'+(ed?'编辑食物':'添加食物')+'</span><span class="s" id="ok">保存</span></div><div class="sb">'
  +'<div class="f"><label>名称</label><input id="e_n" placeholder="燕麦片" value="'+esc(d.n)+'"></div>'
  +'<div class="sec" style="margin:16px 4px 10px">每 100g 营养</div>'
  +'<div class="row"><div class="f"><label>热量 kcal</label><input id="e_k" type="number" inputmode="decimal" value="'+fv(d.k)+'"></div><div class="f"><label>蛋白 g</label><input id="e_p" type="number" inputmode="decimal" value="'+fv(d.p)+'"></div></div>'
  +'<div class="row"><div class="f"><label>碳水 g</label><input id="e_c" type="number" inputmode="decimal" value="'+fv(d.c)+'"></div><div class="f"><label>脂肪 g</label><input id="e_f" type="number" inputmode="decimal" value="'+fv(d.f)+'"></div></div>'
  +'<div class="sec" style="margin:16px 4px 10px">常见份量（可留空）</div>'
  +'<div class="row"><div class="f"><label>一份叫什么</label><input id="e_un" placeholder="个 / 片 / 杯" value="'+esc(d.un||'')+'"></div><div class="f"><label>一份多少克</label><input id="e_ug" type="number" inputmode="decimal" placeholder="50" value="'+fv(d.ug)+'"></div></div>'
  +'<div class="chips" style="margin-top:2px"><div class="chip'+(d.fav?' on':'')+'" id="fav">★ 收藏</div></div>'
  +(ed?'<div class="danger" id="del">删除食物</div>':'')+'</div>');
  let fav=!!d.fav;$('#fav',s.el).onclick=()=>{fav=!fav;$('#fav',s.el).classList.toggle('on',fav)};
  $('#ok',s.el).onclick=()=>{
    const name=s.q('#e_n').value.trim();if(!name){s.q('#e_n').focus();toast('填个名称');return}
    const o={id:ed?ed.id:uid('f'),n:name,k:num(s.q('#e_k').value),p:num(s.q('#e_p').value),c:num(s.q('#e_c').value),f:num(s.q('#e_f').value),fav:fav,un:s.q('#e_un').value.trim(),ug:num(s.q('#e_ug').value)||''};
    if(ed)DB.foods[DB.foods.findIndex(x=>x.id===ed.id)]=o;else DB.foods.push(o);
    LS.s('foods',DB.foods);s.close();renderFood();toast(ed?'已保存':'已添加');
  };
  const dl=$('#del',s.el);
  if(dl)dl.onclick=()=>{
    const undo=delUndo('foods',renderFood);
    DB.foods=DB.foods.filter(x=>x.id!==ed.id);LS.s('foods',DB.foods);s.close();renderFood();
    toast('已删除',2200,undo);
  };
}
