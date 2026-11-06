(()=>{'use strict';
const KEY='animeTrendMediaComparisons.v1';
const modes=['enhance','cinema','manga','glow'];
const labels={enhance:'Amélioration',cinema:'Cinéma',manga:'Manga',glow:'Lumière'};
const grid=()=>document.getElementById('mediaGrid');
const cards=()=>grid()?Array.from(grid().children).filter(x=>x.classList.contains('card')):[];
const ids=()=>cards().map(c=>{const b=c.querySelector('[data-retouch]');return b?b.dataset.retouch:null}).filter(Boolean);
const cardFor=id=>cards().find(c=>Array.from(c.querySelectorAll('[data-retouch]')).some(b=>b.dataset.retouch===id));
const read=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch(_){return[]}};
const write=x=>{try{localStorage.setItem(KEY,JSON.stringify(x));return true}catch(_){return false}};
function applyComparisons(){
 const list=read();
 list.forEach(pair=>{
  const target=cardFor(pair.variant),source=cardFor(pair.source);
  if(!target||target.querySelector('[data-before-after]'))return;
  const before=source&&source.querySelector('img'),after=target.querySelector('img');
  if(!before||!after)return;
  const box=document.createElement('details');box.dataset.beforeAfter='1';box.style.cssText='margin-top:9px;padding:8px;border:1px solid var(--border,#ddd);border-radius:9px';
  const summary=document.createElement('summary');summary.textContent='Comparer avant / après · '+(labels[pair.mode]||'Variante');
  const row=document.createElement('div');row.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px';
  [[before.src,'Avant'],[after.src,'Après']].forEach(([src,txt])=>{const cell=document.createElement('div'),im=document.createElement('img'),cap=document.createElement('small');im.src=src;im.alt=txt;im.style.cssText='width:100%;height:105px;object-fit:cover;border-radius:6px';cap.textContent=txt;cell.append(im,cap);row.append(cell)});
  box.append(summary,row);target.append(box);
 });
}
let observer;
function watch(){if(!grid()||observer)return;observer=new MutationObserver(()=>applyComparisons());observer.observe(grid(),{childList:true,subtree:true});applyComparisons()}
function waitForNewCard(oldIds,timeout=12000){return new Promise(resolve=>{
 const started=Date.now();
 const timer=setInterval(()=>{const current=ids(),fresh=current.find(id=>!oldIds.has(id));if(fresh){clearInterval(timer);resolve(fresh)}else if(Date.now()-started>timeout){clearInterval(timer);resolve(null)}},180);
})}
async function runBatch(){
 const button=document.getElementById('batchMediaRetouch');
 if(!button||button.dataset.running==='1')return;
 const candidates=cards().filter(c=>{
  const b=c.querySelector('[data-retouch]');if(!b)return false;
  const text=(c.innerText||'').toLowerCase();
  return !text.includes('variante créée localement')&&!text.includes('effet cinéma')&&!text.includes('effet lumineux')&&!text.includes('effet manga')&&!text.includes('amélioration');
 }).map(c=>c.querySelector('[data-retouch]').dataset.retouch).filter((id,i,a)=>a.indexOf(id)===i).slice(-10);
 if(!candidates.length){alert('Aucune image originale disponible. Importez d’abord des images dans la Médiathèque.');return}
 if(cards().length+ candidates.length*modes.length>300){alert('La médiathèque risque de dépasser sa limite de 300 visuels. Supprimez ou exportez des images avant de lancer le lot.');return}
 if(!confirm('Créer jusqu’à 4 variantes pour '+candidates.length+' image(s) ? Les originaux seront conservés. Cette opération peut prendre plusieurs minutes et dépend du stockage disponible.'))return;
 button.dataset.running='1';button.disabled=true;const oldLabel=button.textContent;button.textContent='Retouches en cours…';
 let made=0,failed=0;const pairs=read();
 try{
  for(const sourceId of candidates){
   for(const mode of modes){
    const before=new Set(ids());const sourceButton=cards().flatMap(c=>Array.from(c.querySelectorAll('[data-retouch]'))).find(b=>b.dataset.retouch===sourceId&&b.dataset.mode===mode);
    if(!sourceButton){failed++;continue}
    sourceButton.click();
    const variantId=await waitForNewCard(before);
    if(!variantId){failed++;continue}
    pairs.push({source:sourceId,variant:variantId,mode});made++;
    if(!write(pairs)){failed++;showIssueSafe('Comparaisons non mémorisées : stockage local presque plein.');}
    applyComparisons();
   }
  }
 }finally{
  button.disabled=false;button.dataset.running='';button.textContent=oldLabel;
  alert('Traitement terminé. Variantes créées : '+made+'. Actions non confirmées : '+failed+'. Les originaux restent conservés. Vérifiez la galerie avant/après.');
 }
}
function showIssueSafe(msg){const b=document.getElementById('issueBanner');if(b){const t=document.getElementById('issueText');if(t)t.textContent=msg}else alert(msg)}
function init(){const b=document.getElementById('batchMediaRetouch');if(!b||b.dataset.batchBound)return;b.dataset.batchBound='1';b.addEventListener('click',runBatch);watch()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
const retry=setInterval(()=>{if(document.getElementById('batchMediaRetouch')){init();clearInterval(retry)}},250);
setTimeout(()=>clearInterval(retry),10000);
})();