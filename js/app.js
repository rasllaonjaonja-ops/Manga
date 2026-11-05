const STORE='animeTrendStudio.v2'; // conserve les données V2
const blank={posts:[],calendar:[],media:[],news:[],settings:{pageName:'Manga, Animé et Actualités',fontSize:14,density:'comfortable'}};
let db=readStore(),newsItems=[];
let lastPersisted='';
function statuses(){return['Brouillon','À vérifier','Prêt','Publié manuellement','Archivé'];}
function calendarStatuses(){return['Brouillon','À vérifier','Prêt','Programmé','Publié manuellement','Archivé'];}
function uid(){try{if(window.crypto&&crypto.randomUUID)return crypto.randomUUID();}catch(e){}return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);}
function isObj(x){return!!x&&typeof x==='object'&&!Array.isArray(x);}
function cut(s,n){s=String(s??'');return s.length>n?s.slice(0,n):s;}
function clip(s,n){s=String(s??'');return s.length>n?s.slice(0,n-1).trimEnd()+'…':s;}
function validDay(s){return/^\d{4}-\d{2}-\d{2}$/.test(String(s||''))&&!Number.isNaN(Date.parse(s+'T12:00:00'));}
function validIso(s){return typeof s==='string'&&s!==''&&!Number.isNaN(Date.parse(s));}
function isSafeImage(d){return typeof d==='string'&&/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(d);}
function normalizeDb(x){
 const src=isObj(x)?x:{};
const out={posts:[],calendar:[],media:[],news:[],settings:{pageName:blank.settings.pageName,fontSize:14,density:'comfortable',workerUrl:'https://wild-field-da5f.rasllaonjaonja.workers.dev'}};
 if(Array.isArray(src.posts))out.posts=src.posts.filter(isObj).slice(0,2000).map(p=>({id:p.id!=null&&String(p.id)!==''?String(p.id):uid(),title:cut(p.title,200),type:cut(p.type||'Publication',80),text:cut(p.text,20000),status:statuses().includes(p.status)?p.status:'Brouillon',created:validIso(p.created)?p.created:new Date().toISOString()}));
if(Array.isArray(src.calendar))out.calendar=src.calendar.filter(c=>isObj(c)&&validDay(c.date)).slice(0,2000).map(c=>({id:c.id!=null&&String(c.id)!==''?String(c.id):uid(),title:cut(c.title,200),date:c.date,time:/^([01]\d|2[0-3]):[0-5]\d$/.test(String(c.time||''))?c.time:'',type:cut(c.type||'Publication',40),status:calendarStatuses().includes(c.status)?c.status:'Brouillon'}));
 if(Array.isArray(src.news))out.news=src.news.filter(n=>isObj(n)&&typeof n.title==='string'&&/^https?:\/\//i.test(String(n.url||''))).slice(0,500).map(n=>({id:n.id!=null&&String(n.id)!==''?String(n.id):uid(),title:cut(n.title,300),source:cut(n.source||'Source',80),url:String(n.url),publishedAt:validIso(n.publishedAt)?n.publishedAt:null,summary:cut(n.summary,400),savedAt:validIso(n.savedAt)?n.savedAt:new Date().toISOString(),verified:n.verified===true}));
 if(Array.isArray(src.media))out.media=src.media.filter(m=>isObj(m)&&isSafeImage(m.data)).slice(0,300).map(m=>({id:m.id!=null&&String(m.id)!==''?String(m.id):uid(),name:cut(m.name||'visuel',120),data:m.data}));
 const st=isObj(src.settings)?src.settings:{};
 out.settings.pageName=cut(st.pageName||blank.settings.pageName,80);
 const fs=+st.fontSize;out.settings.fontSize=[13,14,15,16].includes(fs)?fs:14;
 out.settings.density=['comfortable','compact'].includes(st.density)?st.density:'comfortable';
 const workerUrl=typeof st.workerUrl==='string'?st.workerUrl.trim():'';
 out.settings.workerUrl=/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(workerUrl)?workerUrl:'https://wild-field-da5f.rasllaonjaonja.workers.dev';
 return out;
}
function readStore(){
 let raw=null;
 try{raw=localStorage.getItem(STORE);return normalizeDb(raw?JSON.parse(raw):null)}
 catch(e){try{if(raw)localStorage.setItem(STORE+'.corrupt',raw)}catch(_){}return normalizeDb(null)}
}
/* Sauvegarde transactionnelle : si l'écriture échoue, l'état affiché revient à l'état réellement enregistré. */
function save(){
 const payload=JSON.stringify(db);
 try{localStorage.setItem(STORE,payload);lastPersisted=payload}
 catch(e){
  console.error(e);
  db=normalizeDb(JSON.parse(lastPersisted||'null'));
  showIssue('Enregistrement impossible : le stockage du navigateur est plein. Vos dernières modifications ont été annulées. Exportez une sauvegarde puis supprimez des visuels.');
  return false;
 }
 try{renderAll()}catch(e){console.error(e);showIssue('Affichage partiel : '+e.message)}
 return true;
}
function showIssue(msg){
 let b=document.getElementById('issueBanner');
 if(!b){
  b=document.createElement('div');b.id='issueBanner';b.setAttribute('role','alert');
  b.style.cssText='position:fixed;left:12px;right:12px;bottom:12px;z-index:999;display:flex;gap:10px;align-items:center;justify-content:space-between;background:#fff;color:#7a1020;border:1px solid #f1b5bd;border-radius:12px;padding:12px 14px;box-shadow:0 10px 30px #17264d33;font-size:13px;max-width:720px;margin:auto';
  const t=document.createElement('span');t.id='issueText';
  const x=document.createElement('button');x.className='btn sm';x.textContent='Fermer';x.onclick=()=>b.remove();
  b.append(t,x);document.body.appendChild(b);
 }
 document.getElementById('issueText').textContent=msg;
}
window.addEventListener('error',e=>{console.error(e.error||e.message);showIssue('Une action a échoué. Vérifiez vos données dans Réglages → Vérifier l’application. Détail : '+(e.message||'erreur inconnue'))});
window.addEventListener('unhandledrejection',e=>{console.error(e.reason);showIssue('Une opération a échoué. Détail : '+((e.reason&&e.reason.message)||'erreur inconnue'))});
function runSelfTest(){
 const rows=[];const ok=m=>rows.push('✅ '+m),ko=m=>rows.push('❌ '+m),warn=m=>rows.push('⚠️ '+m);
 try{localStorage.setItem('__at_selftest','1');const v=localStorage.getItem('__at_selftest');localStorage.removeItem('__at_selftest');v==='1'?ok('Stockage local lisible et inscriptible'):ko('Stockage local incohérent')}catch(e){ko('Stockage local indisponible : '+e.message)}
 const size=JSON.stringify(db).length;
 size>4000000?warn(`Données volumineuses (${Math.round(size/1024)} Ko) : exportez une sauvegarde.`):ok(`Taille des données : ${Math.round(size/1024)} Ko`);
 const cv=document.createElement('canvas');(cv.getContext&&cv.getContext('2d'))?ok('Canevas 2D disponible (PNG)'):ko('Canevas 2D indisponible : exports PNG impossibles');
 ((navigator.clipboard&&window.isSecureContext)||(document.queryCommandSupported&&document.queryCommandSupported('copy')))?ok('Copie dans le presse-papiers disponible'):warn('Copie automatique limitée : sélectionnez le texte manuellement');
 const required=['postTopic','postType','postTone','postLength','postQuestion','buildPost','postResult','savePost','postPreview','reelTopic','buildReel','artCanvas','artFormat','renderArt','downloadArt','campTopic','buildCampaign','newsList','queueList','calList','mediaGrid','qualityText','runQuality','qualityResult','pageName','saveSettings','exportBackup','importBackup','sPosts','sDrafts','sNews','sMedia','homeRecent','homeNews','homeActivity','homePreview','homeTrends'];
 const missing=required.filter(id=>!document.getElementById(id));
 missing.length?ko('Éléments manquants : '+missing.join(', ')):ok(`Interface : ${required.length} éléments requis présents`);
 const round=normalizeDb(JSON.parse(JSON.stringify(db)));
 JSON.stringify(round)===JSON.stringify(db)?ok('Sauvegarde et restauration cohérentes'):warn('Certaines données seraient corrigées à la restauration');
 safe('<b>x</b>').includes('<b>')?ko('Échappement HTML défaillant'):ok('Échappement HTML vérifié');
 ok(`Contenus : ${db.posts.length} · Échéances : ${db.calendar.length} · Visuels : ${db.media.length} · Actualités enregistrées : ${db.news.length}`);
 return rows;
}
document.getElementById('runSelfTest').onclick=()=>{document.getElementById('selfTestResult').textContent=runSelfTest().join('\n')};
document.getElementById('newsList').addEventListener('click',e=>{const s=e.target.closest('[data-news-save]');if(s){saveNewsItem(newsItems[+s.dataset.newsSave]);return}const b=e.target.closest('[data-news]');if(b)useNewsByIndex(+b.dataset.news)});
function saveNewsItem(n){
 if(!n||!/^https?:\/\//i.test(String(n.url||'')))return alert('Actualité invalide : lien manquant.');
 if(db.news.some(x=>x.url===n.url))return alert('Cette actualité est déjà enregistrée.');
 db.news.unshift({id:uid(),title:cut(n.title,300),source:cut(n.source||'Source',80),url:String(n.url),publishedAt:validIso(n.publishedAt)?n.publishedAt:null,summary:cut(n.summary,400),savedAt:new Date().toISOString(),verified:false});
 if(save())alert('Actualité enregistrée. Vérifiez-la dans la source originale avant de publier.');
}
function renderSavedNews(){
 const el=document.getElementById('savedNewsList');if(!el)return;
 el.innerHTML=db.news.length?db.news.map(n=>`<div class="item"><div style="min-width:0"><strong>${safe(n.title)}</strong><small>${safe(n.source)} · ${validIso(n.publishedAt)?new Date(n.publishedAt).toLocaleDateString('fr-FR'):'date inconnue'} · <span class="badge ${n.verified?'green':'orange'}">${n.verified?'Vérifiée':'À vérifier'}</span></small><small><a href="${safe(n.url)}" target="_blank" rel="noopener noreferrer">Source originale ↗</a></small></div><div class="actions"><button class="btn sm" data-saved="verify" data-id="${safe(n.id)}">${n.verified?'Marquer à revérifier':'Marquer vérifiée'}</button><button class="btn sm" data-saved="draft" data-id="${safe(n.id)}" ${n.verified?'':'disabled title="Vérifiez d’abord l’actualité"'}>Créer un brouillon</button><button class="btn sm" data-saved="remove" data-id="${safe(n.id)}">×</button></div></div>`).join(''):'<div class="empty">Aucune actualité enregistrée.</div>';
}
document.getElementById('savedNewsList').addEventListener('click',e=>{
 const b=e.target.closest('[data-saved]');if(!b)return;const n=db.news.find(x=>x.id===b.dataset.id);if(!n)return;
 if(b.dataset.saved==='verify'){
  if(!n.verified&&!confirm('Confirmez-vous avoir consulté la source originale et vérifié cette information ?'))return;
  n.verified=!n.verified;save();
 }else if(b.dataset.saved==='draft'){
  if(!n.verified)return alert('Vérifiez d’abord l’actualité.');
  const text=`${n.title}\n\nSource : ${n.source}\nLien : ${n.url}\n\nÀ compléter : votre commentaire original, avec attribution de la source.`;
  if(addPost(n.title,'Actualité vérifiée',text))alert('Brouillon créé dans la file éditoriale.');
 }else if(b.dataset.saved==='remove'){
  if(confirm('Retirer cette actualité de la liste enregistrée ?')){db.news=db.news.filter(x=>x!==n);save()}
 }
});
document.getElementById('queueList').addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const id=b.dataset.id;if(b.dataset.act==='copy')copyPostId(id);else if(b.dataset.act==='status')cyclePost(id);else if(b.dataset.act==='remove')removePost(id)});

document.getElementById('mediaGrid').addEventListener('click',e=>{const b=e.target.closest('[data-media]');if(b&&confirm('Supprimer ce visuel ?')){db.media=db.media.filter(x=>x.id!==b.dataset.media);save()}});

function safe(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function navigate(id){document.body.classList.toggle('home-mode',id==='home');document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id==='p-'+id));document.querySelectorAll('[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page===id));let b=document.querySelector('[data-page="'+id+'"]');document.getElementById('title').textContent=b?b.lastChild.textContent.trim():id;document.getElementById('side').classList.remove('open');if(id==='radar')loadNews()}
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>navigate(b.dataset.page));document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>navigate(b.dataset.go));document.querySelectorAll('.hamb').forEach(b=>b.onclick=()=>document.getElementById('side').classList.toggle('open'));
function copyText(t){if(!t)return;const done=()=>alert('Texte copié.');if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(t).then(done).catch(()=>fallback(t));else fallback(t)}
function fallback(t){let a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove();alert('Texte copié.')}
function addPost(title,type,text){db.posts.unshift({id:uid(),title:cut(title,200),type:cut(type,80),text:cut(text,20000),status:'Brouillon',created:new Date().toISOString()});return save()}
function composePost(){
 const topic=document.getElementById('postTopic').value.trim();
 if(!topic){alert('Ajoutez un sujet avant de composer.');document.getElementById('postTopic').focus();return;}
 const type=document.getElementById('postType').value;
 const tone=document.getElementById('postTone').value;
 const len=document.getElementById('postLength').value;
 const customQ=document.getElementById('postQuestion').value.trim();

 const pick=a=>a[Math.floor(Math.random()*a.length)];
 const hooks={
  'Naturel et humain':[
   `Il y a des personnages et des histoires auxquels on repense longtemps après le dernier épisode.`,
   `Parlons d’un sujet qui fait souvent réagir les fans : ${topic}.`,
   `Dans l’univers manga et anime, certains détails méritent qu’on prenne le temps d’en discuter.`
  ],
  'Émotionnel':[
   `Certaines histoires touchent juste parce qu’elles parlent de courage, de choix et de persévérance.`,
   `Derrière chaque grand moment, il y a parfois une émotion que l’on n’oublie pas.`,
   `Ce qui nous marque dans un anime n’est pas toujours la puissance : c’est parfois le chemin parcouru.`
  ],
  'Énergique':[
   `La communauté anime, on lance le débat ! Aujourd’hui, place à : ${topic}.`,
   `Fans de manga et d’anime, sortez vos arguments : ce sujet mérite une vraie discussion !`,
   `Un nouveau sujet à débattre entre passionnés : ${topic} !`
  ],
  'Analytique':[
   `Pour comprendre ${topic}, il faut regarder au-delà de la première impression.`,
   `Une analyse intéressante commence par les faits, le contexte et les choix des personnages.`,
   `Plutôt que de conclure trop vite, examinons les différents éléments de ${topic}.`
  ],
  'Mystérieux':[
   `Et si un détail de ${topic} avait plus d’importance qu’il n’y paraît ?`,
   `Parfois, les indices les plus intéressants sont ceux que l’on remarque au deuxième regard.`,
   `Une question reste ouverte autour de ${topic}…`
  ]
 };
 let body=`${pick(hooks[tone]||hooks['Naturel et humain'])}\n\n`;
 const blocks={
  'Débat communautaire':[
   `Ce sujet peut être abordé de plusieurs façons. Certains privilégient les actes, d’autres les motivations ou les conséquences. Le plus intéressant est de confronter les arguments sans dévaloriser les avis différents.`,
   `Il n’existe pas forcément une seule réponse. Le contexte, les expériences et les valeurs de chacun peuvent changer notre interprétation.`
  ],
  'Présentation de personnage':[
   `Pour présenter ce personnage, observons son parcours, ses motivations, ses qualités et ses contradictions. Ce sont souvent ses décisions et son évolution qui le rendent mémorable, bien au-delà de sa seule force.`,
   `Un personnage intéressant se construit aussi par ses relations, ses erreurs et les conséquences de ses choix. C’est cet ensemble qui donne de la profondeur à son histoire.`
  ],
  'Citation / réflexion':[
   `« La vraie force ne consiste pas à ne jamais tomber, mais à trouver le courage de se relever. »\n\nUne réflexion simple, mais qui rappelle pourquoi les histoires peuvent nous inspirer dans la vie quotidienne.`,
   `Une histoire peut nous rappeler qu’avancer ne signifie pas tout réussir du premier coup. La détermination se construit aussi dans les moments difficiles.`
  ],
  'Comparaison':[
   `Pour comparer sérieusement, fixons quelques critères : personnalité, évolution, stratégie, influence sur l’histoire et décisions importantes. Chaque critère peut conduire à une conclusion différente.`,
   `Une comparaison équilibrée ne repose pas uniquement sur la puissance. Le contexte, les objectifs et les limites de chacun comptent également.`
  ],
  'Classement':[
   `Un classement reste subjectif. Pour le construire, on peut considérer l’écriture, l’évolution, le charisme, l’impact sur l’histoire et les moments marquants. Expliquez vos critères : ils comptent autant que votre classement.`,
   `Il n’y a pas de classement universel. L’important est d’annoncer les critères utilisés et de reconnaître que d’autres choix peuvent être tout aussi défendables.`
  ],
  'Théorie de fan':[
   `Voici une piste de réflexion, et non une information confirmée : quels indices pourraient soutenir cette interprétation ? Il faut aussi envisager d’autres explications et distinguer les faits de la spéculation.`,
   `Cette théorie peut ouvrir une discussion, mais elle doit rester présentée comme une hypothèse. Les indices, le contexte et les éléments qui la contredisent méritent tous d’être examinés.`
  ],
  'Actualité vérifiée':[
   `Pour traiter cette actualité, indiquez ici les faits confirmés, la date de l’annonce et le lien vers la source primaire. Ne publiez pas une rumeur comme une information officielle et vérifiez si une mise à jour est parue.`,
   `Avant publication, confirmez l’information auprès de la source officielle. Ajoutez la date, le contexte et le lien d’origine ; si un élément reste incertain, signalez-le clairement.`
  ],
  'Découverte manga / anime':[
   `Pour faire découvrir cette œuvre, présentez son genre, son univers et son ambiance, puis expliquez à quel public elle pourrait plaire. Gardez la surprise en évitant les révélations importantes de l’intrigue.`,
   `Une bonne découverte donne envie d’explorer sans tout dévoiler : parlez du ton, des thèmes et de ce qui distingue l’œuvre, sans raconter ses moments décisifs.`
  ],
  'Sondage':[
   `Petit sondage entre passionnés : quelle option correspond le mieux à votre avis ?\n\nA — Le parcours et l’évolution\nB — La personnalité\nC — Les capacités et la stratégie\nD — L’impact sur l’histoire`,
   `À vous de voter ! Quel aspect compte le plus dans votre appréciation ?\n\nA — L’émotion\nB — L’action\nC — L’écriture\nD — L’univers`
  ]
 };
 body+=`${pick(blocks[type]||blocks['Débat communautaire'])}\n\n`;
 if(len==='medium'||len==='long'){
  body+=`Ce qui rend la discussion intéressante, c’est la possibilité de confronter plusieurs lectures du même sujet. Appuyez votre avis sur des exemples précis de l’œuvre et gardons un échange respectueux.\n\n`;
 }
 if(len==='long'){
  body+=`Pour aller plus loin, prenez en compte le contexte, les motivations, les conséquences et les limites de chaque interprétation. Une analyse nuancée est souvent plus utile qu’une réponse présentée comme définitive.\n\n`;
 }
 body+=`${customQ|| (type==='Sondage'?'Votez en commentaire et expliquez votre choix !':'Et vous, qu’en pensez-vous ? Partagez votre point de vue en commentaire.')}`;
 const tags='#Manga #Anime #MangaAnime #CommunautéAnime';
 body+=`\n\n${tags}`;
 document.getElementById('postResult').value=body;
 document.getElementById('postPreview').textContent=body;
 const tab=document.querySelector('[data-tab="postText"]');
 if(tab)tab.click();
}
document.getElementById('buildPost').onclick=composePost;

function getWorkerBase(){
 const raw=(document.getElementById('workerUrl')?.value||db.settings.workerUrl||'').trim().replace(/\/+$/,'');
 if(!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(raw))throw new Error('Adresse Worker invalide. Utilisez une adresse HTTPS sans chemin.');
 return raw;
}
function setWorkerStatus(message,kind){
 const el=document.getElementById('workerStatus');
 if(el){el.textContent=message;el.className='small '+(kind==='ok'?'ok':kind==='error'?'error':'muted')}
 const ai=document.getElementById('aiStatus');
 if(ai)ai.textContent=message;
}
async function testCloudflareWorker(){
 const button=document.getElementById('testWorker');
 if(button){button.disabled=true;button.textContent='Test en cours…'}
 setWorkerStatus('Connexion au Worker en cours…');
 try{
  const response=await fetch(getWorkerBase()+'/health',{method:'GET',headers:{'Accept':'application/json'}});
  const raw=await response.text();
  let data={};try{data=raw?JSON.parse(raw):{}}catch(_){}
  if(!response.ok)throw new Error('Le Worker répond avec HTTP '+response.status+'.');
  if(data&&data.success===false)throw new Error(data.error||'Le Worker signale un échec.');
  setWorkerStatus('✅ Worker accessible (HTTP '+response.status+'). Vous pouvez générer un contenu.', 'ok');
  return true;
 }catch(error){
  const msg=(error&&error.message)||'Erreur inconnue';
  const cors=/Failed to fetch|NetworkError|Load failed/i.test(msg)?' Vérifiez aussi les règles CORS du Worker.':'';
  setWorkerStatus('❌ Connexion impossible : '+msg+'.'+cors,'error');
  return false;
 }finally{if(button){button.disabled=false;button.textContent='Tester la connexion IA'}}
}
document.getElementById('testWorker').onclick=testCloudflareWorker;
async function generateWithCloudflare(){
 const topic=document.getElementById('postTopic').value.trim();
 if(!topic){alert('Ajoutez d’abord un sujet principal.');document.getElementById('postTopic').focus();return}
 const button=document.getElementById('generateWithAI');
 const type=document.getElementById('postType').value;
 const tone=document.getElementById('postTone').value;
 const length=document.getElementById('postLength').value;
 const lengthLabel=length==='short'?'courte':length==='long'?'détaillée':'moyenne';
 const question=document.getElementById('postQuestion').value.trim();
 const sources=document.getElementById('aiSources').value.trim()||'Aucune source officielle fournie. Ne pas inventer de faits, de dates, de citations ni d’annonces.';
 const enrichedTopic=topic+'\nFormat demandé : '+type+'. Ton : '+tone+'. Longueur : '+lengthLabel+'. Langue : français naturel, adapté à Facebook. Termine par '+(question?'cette question : '+question:'une question engageante pour la communauté')+'. Distingue clairement les faits des hypothèses et n’invente aucune information.';
 if(button){button.disabled=true;button.textContent='Génération en cours…'}
 setWorkerStatus('⏳ L’IA prépare votre publication…');
 try{
  const response=await fetch(getWorkerBase()+'/generate',{
   method:'POST',
   headers:{'Content-Type':'application/json','Accept':'application/json'},
   body:JSON.stringify({topic:enrichedTopic,sources})
  });
  const raw=await response.text();
  let data;try{data=raw?JSON.parse(raw):{}}catch(_){data={text:raw}}
  if(!response.ok)throw new Error((data&&data.error)||('Erreur HTTP '+response.status));
  if(data&&data.success===false)throw new Error(data.error||'Le Worker n’a pas pu générer le texte.');
  const generated=(data.article||data.content||data.text||data.output||data.result||data.response||(data.data&&(data.data.article||data.data.content||data.data.text))||'').toString().trim();
  if(!generated)throw new Error('Réponse reçue, mais aucun texte exploitable trouvé. Vérifiez le format de réponse du Worker.');
  document.getElementById('postResult').value=generated;
  document.getElementById('postPreview').textContent=generated;
  const tab=document.querySelector('[data-tab="postText"]');if(tab)tab.click();
  setWorkerStatus('✅ Publication générée. Relisez les faits et modifiez le texte avant de l’enregistrer.','ok');
 }catch(error){
  const msg=(error&&error.message)||'Erreur inconnue';
  const cors=/Failed to fetch|NetworkError|Load failed/i.test(msg)?' Vérifiez les en-têtes CORS du Worker (OPTIONS, POST et Content-Type).':'';
  setWorkerStatus('❌ Génération impossible : '+msg+'.'+cors,'error');
 }finally{if(button){button.disabled=false;button.textContent='✦ Générer avec l’IA Cloudflare'}}
}
document.getElementById('generateWithAI').onclick=generateWithCloudflare;

document.getElementById('copyPost').onclick=()=>copyText(document.getElementById('postResult').value);
document.getElementById('postResult').addEventListener('input',e=>document.getElementById('postPreview').textContent=e.target.value||'Aperçu de la publication.');

/* Capture PNG automatique au clic sur « Enregistrer la publication ».
   Le fichier est téléchargé par le navigateur dans Téléchargements sur Android. */
function downloadPostCapture(title,type,text){
 return new Promise((resolve,reject)=>{
  try{
   const W=1080,pad=82,inner=W-pad*2,MAX_H=6000;
   const c=document.createElement('canvas'),x=c.getContext('2d');
   const wrapWords=(str,font,maxW)=>{x.font=font;const out=[];let cur='';String(str).split(/\s+/).filter(Boolean).forEach(w=>{const test=cur?cur+' '+w:w;if(x.measureText(test).width>maxW&&cur){out.push(cur);cur=w}else cur=test});if(cur)out.push(cur);return out};
   const titleText=String(title||'Publication');
   let titleSize=54,titleLines=wrapWords(titleText,`bold ${titleSize}px Arial`,inner);
   while(titleLines.length>2&&titleSize>30){titleSize-=4;titleLines=wrapWords(titleText,`bold ${titleSize}px Arial`,inner)}
   const paragraphs=String(text||'').replace(/\r/g,'').split('\n');
   const wrapBody=size=>{const out=[];paragraphs.forEach(par=>{if(!par.trim()){out.push('');return}out.push(...wrapWords(par,`${size}px Arial`,inner))});return out};
   let fontSize=39,lineH=58,body=wrapBody(fontSize);
   while(body.length*lineH>3600&&fontSize>24){fontSize-=2;lineH=Math.round(fontSize*1.48);body=wrapBody(fontSize)}
   const titleBlock=250+titleLines.length*65+55;
   const needed=titleBlock+body.length*lineH+160;
   const truncated=needed>MAX_H;
   const H=Math.max(1350,Math.min(MAX_H,needed));
   c.width=W;c.height=H;
   const bg=x.createLinearGradient(0,0,W,H);
   bg.addColorStop(0,'#f7f4ff');bg.addColorStop(.55,'#edf6ff');bg.addColorStop(1,'#fff1f5');
   x.fillStyle=bg;x.fillRect(0,0,W,H);
   x.fillStyle='#6429ed';x.fillRect(0,0,W,22);
   x.fillStyle='#14234d';x.font='bold 34px Arial';x.textAlign='left';
   x.fillText('MANGA, ANIMÉ ET ACTUALITÉS',pad,105);
   x.fillStyle='#6a35e8';x.font='bold 23px Arial';x.fillText(String(type||'PUBLICATION').toUpperCase(),pad,165);
   x.fillStyle='#17234b';x.font=`bold ${titleSize}px Arial`;
   titleLines.forEach((line,i)=>x.fillText(line,pad,250+i*65));
   let y=titleBlock;
   x.strokeStyle='#c8b8ff';x.lineWidth=4;x.beginPath();x.moveTo(pad,y-28);x.lineTo(W-pad,y-28);x.stroke();
   x.fillStyle='#26365e';x.font=`${fontSize}px Arial`;x.textAlign='left';
   body.forEach(line=>{if(line)x.fillText(line,pad,y);y+=lineH});
   x.fillStyle='#6b35e8';x.fillRect(pad,H-92,inner,3);
   x.fillStyle='#5e6d8c';x.font='bold 22px Arial';x.textAlign='left';x.fillText('ANIME TREND STUDIO',pad,H-48);
   x.textAlign='right';x.fillText('Créez • Inspirez • Partagez',W-pad,H-48);x.textAlign='left';
   c.toBlob(blob=>{
    try{
     if(!blob){reject(new Error('Impossible de créer le PNG.'));return}
     const slug=titleText.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,45)||'publication';
     const url=URL.createObjectURL(blob),a=document.createElement('a');
     a.href=url;a.download=`anime-trend-${slug}.png`;document.body.appendChild(a);a.click();a.remove();
     setTimeout(()=>{URL.revokeObjectURL(url);resolve({truncated})},1800);
    }catch(err){reject(err)}
   },'image/png');
  }catch(err){reject(err)}
 });
}
document.getElementById('savePost').onclick=async()=>{
 const btn=document.getElementById('savePost');
 const t=document.getElementById('postResult').value.trim();
 if(!t)return alert('Composez d’abord le texte.');
 const title=document.getElementById('postTopic').value.trim()||'Publication';
 const type=document.getElementById('postType').value;
 if(!addPost(title,type,t))return;
 btn.disabled=true;
 try{
  const r=await downloadPostCapture(title,type,t);
  alert(r.truncated?'Publication enregistrée dans la file. Le texte est trop long pour le visuel PNG : la version complète reste dans la file.':'Publication enregistrée dans la file et visuel PNG téléchargé. Sur Android, retrouvez-le dans Téléchargements.');
 }catch(err){
  console.error(err);
  alert('Le texte est enregistré dans la file, mais le téléchargement PNG a échoué. Essayez avec Chrome et autorisez les téléchargements.');
 }finally{btn.disabled=false}
};
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));document.getElementById('postText').hidden=b.dataset.tab!=='postText';document.getElementById('postView').hidden=b.dataset.tab!=='postView';document.getElementById('postPreview').textContent=document.getElementById('postResult').value});
function composeReel(){let topic=document.getElementById('reelTopic').value.trim();if(!topic)return alert('Indiquez le concept du Reel.');let d=+document.getElementById('reelDuration').value,style=document.getElementById('reelStyle').value,voice=document.getElementById('reelVoice').value,n=d<=7?2:d<=15?4:d<=30?5:7,step=d/n;let scenes=['Accroche visuelle : installer le lieu et attirer l’attention dès la première seconde.','Révélation : montrer le sujet et créer une émotion claire.','Montée : rapproché caméra, mouvement fluide, tension ou énergie.','Moment fort : image mémorable, changement de rythme ou détail symbolique.','Conclusion : laisser une question ou une image qui donne envie de commenter.'];let out=`TITRE : ${topic}\nFORMAT : vertical 9:16 | DURÉE : ${d}s | STYLE : ${style}\nAUDIO : ${voice}\n\n`;for(let i=0;i<n;i++){let a=Math.round(i*step),b=Math.round((i+1)*step);out+=`SCÈNE ${i+1} — ${a}-${b}s\n${scenes[i%scenes.length]}\nVisuel : ${topic}, esthétique anime originale, ${style.toLowerCase()}, cadrage vertical, cohérence du personnage et du décor.\nCaméra : ${i===0?'plan d’ensemble dynamique':i===1?'travelling lent':'mouvement maîtrisé avec transition douce'}.\nTexte écran : ${i===0?'UNE HISTOIRE À DÉCOUVRIR':i===n-1?'ET VOUS, QU’EN PENSEZ-VOUS ?':''}\n\n`}out+=`FIN — Vérifier la musique, les droits des images et la lisibilité des textes avant publication.`;document.getElementById('reelResult').value=out}
document.getElementById('buildReel').onclick=composeReel;document.getElementById('copyReel').onclick=()=>copyText(document.getElementById('reelResult').value);document.getElementById('saveReel').onclick=()=>{let t=document.getElementById('reelResult').value;if(!t)return alert('Créez d’abord un storyboard.');if(addPost(document.getElementById('reelTopic').value.trim()||'Reel','Script Reel',t))alert('Script enregistré dans la file éditoriale.')};


let artImage=null;
const canvas=document.getElementById('artCanvas'),ctx=canvas.getContext('2d');
const artSizes={portrait:[1080,1350,'Fil Facebook'],square:[1080,1080,'Publication carrée'],story:[1080,1920,'Story / Reel'],landscape:[1920,1080,'Couverture paysage']};
function fitText(context,text,maxWidth,fontSize){
 let size=fontSize;context.font=`900 ${size}px Arial`;
 while(context.measureText(text).width>maxWidth&&size>25){size-=2;context.font=`900 ${size}px Arial`;}
 return size;
}
function paintArt(target,opts={}){
 const format=opts.format||document.getElementById('artFormat').value;
 const [w,h]=artSizes[format];target.width=w;target.height=h;
 const x=target.getContext('2d');
 const title=opts.title??document.getElementById('artTitle').value;
 const subtitle=opts.subtitle??document.getElementById('artSubtitle').value;
 const signature=document.getElementById('artSignature').value;
 const accent=document.getElementById('artAccent').value;
 const theme=document.getElementById('artTheme').value;
 x.fillStyle=theme==='light'?'#f3f7ff':'#080d19';x.fillRect(0,0,w,h);
 if(artImage){
  const scale=Math.max(w/artImage.width,h/artImage.height),iw=artImage.width*scale,ih=artImage.height*scale;
  x.drawImage(artImage,(w-iw)/2,(h-ih)/2,iw,ih);
 }else{
  const g=x.createLinearGradient(0,0,w,h);
  if(theme==='light'){g.addColorStop(0,'#eaf2ff');g.addColorStop(.52,'#d9e8ff');g.addColorStop(1,'#eee3ff');}
  else if(theme==='neon'){g.addColorStop(0,'#080d26');g.addColorStop(.55,'#25104a');g.addColorStop(1,'#071b36');}
  else{g.addColorStop(0,'#301448');g.addColorStop(.5,'#10213c');g.addColorStop(1,'#07101c');}
  x.fillStyle=g;x.fillRect(0,0,w,h);
  x.save();x.globalAlpha=.45;x.strokeStyle=accent;x.lineWidth=Math.max(5,w*.008);
  for(let i=0;i<5;i++){x.beginPath();x.arc(w*.73,h*.34,w*(.12+i*.055),0,Math.PI*2);x.stroke();}
  x.restore();x.fillStyle=theme==='light'?'#20345f':'#fff';x.textAlign='center';
  x.font=`900 ${Math.round(w*.09)}px Arial`;x.fillText('ANIME TREND',w/2,h*.34);
  x.font=`600 ${Math.round(w*.028)}px Arial`;x.fillText('CONTENT STUDIO',w/2,h*.40);
 }
 const bandY=h*(format==='story'?.61:format==='landscape'?.57:.59);
 const grad=x.createLinearGradient(0,bandY,0,h);
 grad.addColorStop(0,'rgba(4,8,18,0)');
 grad.addColorStop(.22,theme==='light'?'rgba(255,255,255,.76)':'rgba(3,6,15,.72)');
 grad.addColorStop(1,theme==='light'?'rgba(255,255,255,.96)':'rgba(3,6,15,.96)');
 x.fillStyle=grad;x.fillRect(0,bandY,w,h-bandY);
 const light=theme==='light';x.textAlign='center';x.shadowColor=light?'rgba(255,255,255,.2)':'rgba(0,0,0,.7)';x.shadowBlur=16;
 x.fillStyle=accent;x.font=`900 ${Math.round(w*.027)}px Arial`;x.fillText('MANGA  •  ANIME  •  ACTUALITÉS',w/2,h*.12);
 const maxW=w*.84;
 let titleSize=Math.round(w*(format==='landscape'?.065:.075));
 const wrapT=size=>{x.font=`900 ${size}px Arial`;const out=[];let ln='';title.split(/\s+/).filter(Boolean).forEach(word=>{const test=ln?ln+' '+word:word;if(x.measureText(test).width>maxW&&ln){out.push(ln);ln=word}else ln=test});if(ln)out.push(ln);return out};
 let lines=wrapT(titleSize);
 while((lines.length>3||lines.some(l=>x.measureText(l).width>maxW))&&titleSize>25){titleSize-=2;lines=wrapT(titleSize)}
 const lineH=titleSize*1.15,titleStart=h*.78-(lines.length-1)*lineH/2;
 x.font=`900 ${titleSize}px Arial`;x.fillStyle=light?'#14264d':'#fff';
 lines.forEach((ln,i)=>x.fillText(ln,w/2,titleStart+i*lineH));
 x.shadowBlur=0;x.fillStyle=accent;x.font=`700 ${Math.round(w*.027)}px Arial`;
 x.fillText(clip(subtitle,75),w/2,Math.min(h*.90,titleStart+Math.min(lines.length,3)*lineH+titleSize*.55));
 x.fillStyle=light?'#26395f':'#fff';x.font=`700 ${Math.round(w*.018)}px Arial`;x.fillText(clip(signature,60),w/2,h*.96);
 x.strokeStyle=accent;x.lineWidth=Math.max(3,w*.003);x.strokeRect(w*.025,h*.02,w*.95,h*.96);
 return target;
}
function drawArt(){
 paintArt(canvas);
 const f=document.getElementById('artFormat').value,[w,h,dest]=artSizes[f];
 document.getElementById('artDimension').textContent=`${w} × ${h}`;
 document.getElementById('artDestination').textContent=dest;
}
function saveCanvasPNG(c,name){
 const a=document.createElement('a');a.download=name;a.href=c.toDataURL('image/png');
 document.body.appendChild(a);a.click();a.remove();
}
document.getElementById('artFile').onchange=e=>{
 const f=e.target.files[0];if(!f)return;
 if(!f.type.startsWith('image/'))return alert('Choisissez un fichier image.');
 if(f.size>12*1024*1024)return alert('Image trop lourde. Choisissez une image de moins de 12 Mo.');
 const u=URL.createObjectURL(f),im=new Image();
 im.onload=()=>{artImage=im;drawArt();URL.revokeObjectURL(u);};
 im.onerror=()=>{URL.revokeObjectURL(u);alert('Impossible de lire cette image.');};
 im.src=u;
};
['artFormat','artTitle','artSubtitle','artAccent','artTheme','artSignature'].forEach(id=>document.getElementById(id).addEventListener('input',drawArt));
document.getElementById('renderArt').onclick=drawArt;
document.getElementById('downloadArt').onclick=()=>{
 drawArt();saveCanvasPNG(canvas,'anime-trend-publication-'+document.getElementById('artFormat').value+'.png');
 document.getElementById('visualStatus').textContent='Visuel PNG téléchargé.';
};
document.getElementById('downloadStory').onclick=()=>{
 const c=document.createElement('canvas');paintArt(c,{format:'story'});saveCanvasPNG(c,'anime-trend-story-9x16.png');
 document.getElementById('visualStatus').textContent='Story 9:16 exportée.';drawArt();
};
document.getElementById('downloadSquare').onclick=()=>{
 const c=document.createElement('canvas');paintArt(c,{format:'square'});saveCanvasPNG(c,'anime-trend-carre-1x1.png');
 document.getElementById('visualStatus').textContent='Visuel carré exporté.';drawArt();
};
document.getElementById('downloadCarousel').onclick=()=>{
 const lines=document.getElementById('carouselText').value.split(/\n+/).map(s=>s.trim()).filter(Boolean).slice(0,5);
 if(lines.length<2)return alert('Saisissez au moins deux idées, une par ligne.');
 lines.forEach((line,i)=>{
  const c=document.createElement('canvas');
  paintArt(c,{format:'square',title:line,subtitle:`CARTE ${i+1} / ${lines.length}`});
  saveCanvasPNG(c,`anime-trend-carrousel-${String(i+1).padStart(2,'0')}.png`);
 });
 document.getElementById('visualStatus').textContent=`${lines.length} cartes PNG préparées. Vérifiez les téléchargements dans Chrome.`;
 drawArt();
};
drawArt();
document.getElementById('buildQuiz').onclick=()=>{let t=document.getElementById('quizTopic').value.trim();if(!t)return alert('Ajoutez un thème.');let f=document.getElementById('quizFormat').value,n=+document.getElementById('quizCount').value,out=`${f.toUpperCase()} — ${t}\n\n`;for(let i=1;i<=n;i++){if(f==='Sondage communautaire')out+=`Question ${i} : Quel est votre choix concernant ${t} ?\nA. Option 1\nB. Option 2\nC. Option 3\nD. Autre (expliquez)\n\n`;else if(f==='Question débat')out+=`Débat ${i} : Que pensez-vous de ${t} ? Donnez un argument et respectez les avis différents.\n\n`;else if(f==='Vrai ou faux')out+=`Affirmation ${i} à vérifier : ${t}.\nRéponse : à compléter après vérification d'une source fiable.\n\n`;else out+=`Question ${i} : Quel fait vérifié connaissez-vous à propos de ${t} ?\nA. Proposition à compléter\nB. Proposition à compléter\nC. Proposition à compléter\nRéponse correcte : à confirmer à partir d'une source fiable.\n\n`}out+='Modération : éviter les insultes, les spoilers non annoncés et les affirmations inventées.';document.getElementById('quizResult').value=out};document.getElementById('copyQuiz').onclick=()=>copyText(document.getElementById('quizResult').value);

let campaignPack = [];
function buildCampaign(){
 const topic=document.getElementById('campTopic').value.trim();
 if(!topic){alert('Ajoutez le thème de la campagne.');return;}
 const goal=document.getElementById('campGoal').value, mood=document.getElementById('campMood').value;
 const audience=document.getElementById('campAudience').value.trim()||'Fans de manga et d’anime';
 const facts=document.getElementById('campFacts').value.trim();
 const selected={post:document.getElementById('campPost').checked,reel:document.getElementById('campReel').checked,story:document.getElementById('campStory').checked,carousel:document.getElementById('campCarousel').checked,visual:document.getElementById('campVisual').checked};
 if(!Object.values(selected).some(Boolean)){alert('Sélectionnez au moins un format.');return;}
 const opener=mood==='Émotionnelle'?'Certaines histoires nous touchent bien au-delà de l’écran.':mood==='Énergique'?'La communauté anime, on lance le débat !':mood==='Mystérieuse'?'Et si un détail changeait toute notre lecture de cette histoire ?':mood==='Éducative'?'Prenons un instant pour explorer ce sujet avec nuance.':'Dans l’univers manga et anime, certains thèmes méritent une vraie discussion.';
 const context=facts?'\n\nÉléments fournis à vérifier/attribuer : '+facts:'';
 campaignPack=[];
 if(selected.post) campaignPack.push({type:'Post Facebook',text:`${opener}\n\nAujourd’hui, parlons de : ${topic}.\n\n${goal}. L’objectif est de partager des points de vue, des expériences et des arguments sans imposer une seule réponse.${context}\n\nEt vous, quel est votre avis ? Expliquez votre point de vue dans le respect de chacun.\n\n#Manga #Anime #CommunautéAnime`});
 if(selected.reel) campaignPack.push({type:'Script Reel 20 secondes',text:`CONCEPT : ${topic}\nFORMAT : 9:16 · 20 secondes · ${mood}\nPUBLIC : ${audience}\n\n0–3 s — ACCROCHE\nTexte écran : « Et si on parlait de ${topic} ? »\nVisuel : plan fort original, composition verticale, mouvement immédiat.\n\n3–8 s — CONTEXTE\nVoix off : « Ce sujet suscite des réactions différentes dans la communauté. »\nVisuel : détails symboliques et plans rapprochés.\n\n8–15 s — IDÉE CENTRALE\nVoix off : « Voici un angle à explorer : ${goal.toLowerCase()}. »\nVisuel : progression visuelle, changement de cadrage, rythme maîtrisé.\n\n15–20 s — CONCLUSION\nTexte écran : « Et vous, qu’en pensez-vous ? »\nVisuel : plan final lisible, fondu propre.\n\nPRODUCTION : utiliser des visuels originaux/licenciés et une musique autorisée. Ne pas reprendre des extraits protégés sans autorisation.`});
 if(selected.story) campaignPack.push({type:'Story en 3 écrans',text:`STORY 1 — ACCROCHE\n« Parlons de ${topic} »\nVisuel : fond original cinématique, titre court.\n\nSTORY 2 — INTERACTION\n« Quel aspect vous intéresse le plus ? »\nAjouter un sticker sondage avec deux options réellement pertinentes.\n\nSTORY 3 — COMMUNAUTÉ\n« Votre avis compte : partagez votre analyse. »\nAjouter une boîte à questions. Modérer les réponses et éviter les spoilers non annoncés.`});
 if(selected.carousel) campaignPack.push({type:'Carrousel 5 cartes',text:`CARTE 1 — TITRE\n${topic}\n\nCARTE 2 — CONTEXTE\nPrésenter le sujet en une phrase simple, sans spoiler.\n\nCARTE 3 — PREMIER ANGLE\nUne idée ou un fait vérifié qui aide à comprendre le sujet.\n\nCARTE 4 — AUTRE PERSPECTIVE\nPrésenter une nuance ou un contrepoint honnête.\n\nCARTE 5 — DISCUSSION\n« Quel est votre point de vue ? »\n\nDIRECTION ARTISTIQUE : format carré 1:1, typographie lisible, contraste élevé, marges régulières, identité de page discrète. Utiliser des illustrations originales ou des médias autorisés.`});
 if(selected.visual) campaignPack.push({type:'Prompt visuel original',text:`Créer une illustration originale pour une publication de la page « Manga, Animé et Actualités ».\nSUJET : ${topic}\nAMBIANCE : ${mood}\nOBJECTIF : ${goal}\nPUBLIC : ${audience}\nFORMAT : vertical 4:5, composition adaptée au fil Facebook.\nDIRECTION : esthétique anime contemporaine, personnage entièrement original, silhouette expressive, décor narratif cohérent, lumière cinématographique, profondeur, détails soignés, espace négatif pour ajouter le titre ensuite.\nCONTRAINTES : ne pas copier un personnage, une scène, un logo ou un style distinctif protégé ; aucun texte illisible, aucun filigrane, aucune marque tierce. Prévoir une version sans texte pour ajouter la typographie dans le Studio visuel.`});
 const all=campaignPack.map((x,i)=>`===== ${i+1}. ${x.type.toUpperCase()} =====\n${x.text}`).join('\n\n');
 document.getElementById('campaignOutput').textContent=all;
 document.getElementById('campaignStatus').textContent=`${campaignPack.length} format(s) prêt(s) · Sujet : ${topic} · Rien n’est publié automatiquement.`;
}
document.getElementById('buildCampaign').onclick=buildCampaign;
document.getElementById('copyCampaign').onclick=()=>{if(!campaignPack.length)return alert('Générez d’abord un pack.');copyText(campaignPack.map(x=>x.type+'\n'+x.text).join('\n\n'))};
document.getElementById('downloadCampaign').onclick=()=>{if(!campaignPack.length)return alert('Générez d’abord un pack.');download('anime-trend-pack-campagne.txt',campaignPack.map(x=>x.type+'\n'+x.text).join('\n\n'+'—'.repeat(24)+'\n\n'),'text/plain;charset=utf-8')};
document.getElementById('saveCampaign').onclick=()=>{if(!campaignPack.length)return alert('Générez d’abord un pack.');campaignPack.forEach(x=>db.posts.unshift({id:uid(),title:document.getElementById('campTopic').value.trim()+' — '+x.type,type:x.type,text:x.text,status:'Brouillon',created:new Date().toISOString()}));save();alert(campaignPack.length+' format(s) enregistré(s) dans la file éditoriale.')};

async function loadNews(){let status=document.getElementById('newsStatus');status.textContent='Lecture du fichier du radar…';try{let r=await fetch('data/latest-news.json?ts='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('Fichier absent ('+r.status+')');let data=await r.json();newsItems=Array.isArray(data.items)?data.items.filter(x=>isObj(x)&&typeof x.title==='string'):[];status.textContent=`${newsItems.length} article(s) · dernière collecte : ${data.updatedAt?new Date(data.updatedAt).toLocaleString('fr-FR'):'inconnue'}`;renderNews();renderAll()}catch(e){status.textContent='Radar non initialisé';document.getElementById('newsList').innerHTML='<div class="empty">Aucune collecte disponible pour le moment.<br>Déployez la V3 puis lancez le workflow « Anime Trend RSS Radar » dans GitHub Actions.</div>'}}
function renderNews(){
 const f=document.getElementById('newsFilter').value,el=document.getElementById('newsList');
 const arr=newsItems.map((x,i)=>({x,i})).filter(o=>f==='all'||o.x.source===f);
 el.innerHTML=arr.length?arr.map(({x,i})=>{const u=/^https?:\/\//i.test(String(x.url||''))?x.url:'#';return `<article class="card news-card"><div class="news-meta"><span class="badge">${safe(x.source)}</span><span>${validIso(x.publishedAt)?safe(new Date(x.publishedAt).toLocaleDateString('fr-FR')):'Date inconnue'}</span></div><h4>${safe(x.title)}</h4><p>${safe(clip(x.summary,220))}</p><div class="actions"><a class="btn sm" href="${safe(u)}" target="_blank" rel="noopener noreferrer">Lire la source ↗</a><button class="btn sm" data-news-save="${safe(i)}">Enregistrer</button><button class="btn sm" data-news="${safe(i)}">Préparer un post</button></div></article>`}).join(''):'<div class="empty">Aucun article pour ce filtre.</div>';
}
window.useNewsByIndex=(index)=>{let item=newsItems[index];if(!item)return;navigate('writer');document.getElementById('postType').value='Actualité vérifiée';document.getElementById('postTopic').value=item.title;document.getElementById('postQuestion').value='Qu’en pensez-vous ? Source : '+item.url;};
document.getElementById('reloadNews').onclick=loadNews;document.getElementById('newsFilter').onchange=renderNews;
function renderQueue(){
 const f=document.getElementById('queueFilter').value,arr=db.posts.filter(p=>f==='all'||p.status===f),el=document.getElementById('queueList');
 el.innerHTML=arr.length?arr.map(p=>`<div class="item"><div style="min-width:0"><strong>${safe(p.title||p.type)}</strong><small>${safe(p.type)} · ${new Date(p.created).toLocaleDateString('fr-FR')} · <span class="badge ${p.status==='Prêt'||p.status==='Publié manuellement'?'green':'orange'}">${safe(p.status)}</span></small></div><div class="actions"><button class="btn sm" data-act="copy" data-id="${safe(p.id)}">Copier</button><button class="btn sm" data-act="status" data-id="${safe(p.id)}">Statut</button><button class="btn sm" data-act="remove" data-id="${safe(p.id)}">×</button></div></div>`).join(''):'<div class="empty">Aucun contenu dans cette catégorie.</div>';
}
function copyPostId(id){const p=db.posts.find(x=>x.id===id);if(p)copyText(p.text)}
/* Le passage à « Publié manuellement » exige une confirmation explicite : rien n'est publié automatiquement. */
function cyclePost(id){const p=db.posts.find(x=>x.id===id);if(!p)return;const order=statuses();const next=order[(order.indexOf(p.status)+1)%order.length];if(next==='Publié manuellement'&&!confirm('Confirmez-vous avoir publié ce contenu manuellement sur Facebook ? L’application ne publie rien automatiquement.'))return;p.status=next;save()}
function removePost(id){if(confirm('Supprimer ce contenu ? Cette action est définitive.')){db.posts=db.posts.filter(x=>x.id!==id);save()}}
document.getElementById('queueFilter').onchange=renderQueue;
document.getElementById('exportBackup').onclick=()=>download('anime-trend-backup-v3.json',JSON.stringify(db,null,2),'application/json');function download(n,d,t){let a=document.createElement('a'),u=URL.createObjectURL(new Blob([d],{type:t}));a.href=u;a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
document.getElementById('importBackupBtn').onclick=()=>document.getElementById('importBackup').click();
document.getElementById('importBackup').onchange=async e=>{const file=e.target.files&&e.target.files[0];e.target.value='';if(!file)return;if(file.size>25*1024*1024)return alert('Sauvegarde trop volumineuse (maximum 25 Mo).');let parsed;try{parsed=JSON.parse(await file.text())}catch(err){return alert('Fichier invalide : ce n’est pas un JSON lisible.')}if(!isObj(parsed)||!Array.isArray(parsed.posts))return alert('Fichier de sauvegarde invalide : la liste des contenus est absente.');const next=normalizeDb(parsed);if(!confirm(`Remplacer les données locales par cette sauvegarde ?\n${next.posts.length} contenu(s), ${next.calendar.length} échéance(s), ${next.media.length} visuel(s).\nLes données actuelles seront remplacées.`))return;db=next;if(save())alert('Sauvegarde importée.')};
document.getElementById('addCal').onclick=()=>{const t=document.getElementById('calTitle').value.trim(),d=document.getElementById('calDate').value,tm=document.getElementById('calTime').value;if(!t||!d)return alert('Ajoutez un titre et une date.');if(!validDay(d))return alert('Date invalide.');if(tm&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(tm))return alert('Heure invalide.');db.calendar.push({id:uid(),title:cut(t,200),date:d,time:tm,type:document.getElementById('calType').value,status:document.getElementById('calStatus').value});if(save())document.getElementById('calTitle').value=''};
/* Calendrier : vues Liste, Jour, Semaine, Mois. Les dates sont manipulées en heure locale (pas d'UTC). */
let calView='list';
let calCursor=parseDay(dayKey(new Date()));
function pad2(n){return String(n).padStart(2,"0")}
function dayKey(d){return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())}
function parseDay(s){const [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d)}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function mondayOf(d){const x=new Date(d);x.setDate(x.getDate()-((x.getDay()+6)%7));return x}
function calItemHtml(c){
 const opts=calendarStatuses().map(s=>`<option value="${safe(s)}" ${s===c.status?'selected':''}>${safe(s)}</option>`).join('');
 return `<div class="item"><div style="min-width:0"><strong>${c.time?safe(c.time)+' · ':''}${safe(c.title)}</strong><small>${safe(c.type)} · ${new Date(c.date+'T12:00:00').toLocaleDateString('fr-FR')}</small><div style="margin-top:6px"><select data-cal-status="${safe(c.id)}" aria-label="Statut de l’échéance" style="max-width:220px;min-height:34px;padding:5px 8px;font-size:11px">${opts}</select></div></div><div class="actions"><button class="btn sm" data-cal-act="move" data-id="${safe(c.id)}">Déplacer</button><button class="btn sm" data-cal-act="remove" data-id="${safe(c.id)}">Supprimer</button></div></div>`;
}
function renderCalendar(){
 const el=document.getElementById('calList');
 db.calendar.sort((a,b)=>(a.date+' '+a.time).localeCompare(b.date+' '+b.time));
 document.querySelectorAll('[data-cal-view]').forEach(t=>t.classList.toggle('active',t.dataset.calView===calView));
 const nav=calView!=='list';
 ['calPrev','calToday','calNext'].forEach(id=>document.getElementById(id).hidden=!nav);
 const period=document.getElementById('calPeriod');
 const onDay=k=>db.calendar.filter(c=>c.date===k);
 const empty='<div class="empty">Aucune échéance.</div>';
 if(calView==='list'){
  period.textContent='Toutes les échéances';
  el.innerHTML=db.calendar.length?db.calendar.map(calItemHtml).join(''):empty;
 }else if(calView==='day'){
  period.textContent=calCursor.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const items=onDay(dayKey(calCursor));
  el.innerHTML=items.length?items.map(calItemHtml).join(''):empty;
 }else if(calView==='week'){
  const start=mondayOf(calCursor),end=addDays(start,6);
  period.textContent='Semaine du '+start.toLocaleDateString('fr-FR')+' au '+end.toLocaleDateString('fr-FR');
  el.innerHTML='<div class="cal-week">'+[0,1,2,3,4,5,6].map(i=>{const d=addDays(start,i),k=dayKey(d),items=onDay(k);return `<div class="cal-col"><div class="cal-colhead">${d.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric'})}</div>${items.map(calItemHtml).join('')||'<div class="footnote">—</div>'}</div>`}).join('')+'</div>';
 }else{
  const first=new Date(calCursor.getFullYear(),calCursor.getMonth(),1);
  period.textContent=first.toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
  const start=mondayOf(first),todayK=dayKey(new Date());
  let cells='';
  for(let i=0;i<42;i++){const d=addDays(start,i),k=dayKey(d),n=onDay(k).length;cells+=`<button class="cal-cell${d.getMonth()!==calCursor.getMonth()?' out':''}${k===todayK?' today':''}" data-cal-day="${safe(k)}" aria-label="${safe(d.toLocaleDateString('fr-FR',{day:'numeric',month:'long'}))}, ${n} échéance(s)"><span>${d.getDate()}</span>${n?`<b>${n}</b>`:''}</button>`}
  el.innerHTML='<div class="cal-month">'+['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(j=>`<div class="cal-colhead">${j}</div>`).join('')+cells+'</div><div class="footnote" style="margin-top:8px">Touchez un jour pour voir ses échéances.</div>';
 }
}
document.querySelectorAll('[data-cal-view]').forEach(t=>t.onclick=()=>{calView=t.dataset.calView;renderCalendar()});
document.getElementById('calPrev').onclick=()=>{calCursor=calView==='day'?addDays(calCursor,-1):calView==='week'?addDays(calCursor,-7):new Date(calCursor.getFullYear(),calCursor.getMonth()-1,1);renderCalendar()};
document.getElementById('calNext').onclick=()=>{calCursor=calView==='day'?addDays(calCursor,1):calView==='week'?addDays(calCursor,7):new Date(calCursor.getFullYear(),calCursor.getMonth()+1,1);renderCalendar()};
document.getElementById('calToday').onclick=()=>{calCursor=parseDay(dayKey(new Date()));renderCalendar()};
document.getElementById('calList').addEventListener('click',e=>{
 const day=e.target.closest('[data-cal-day]');if(day){calCursor=parseDay(day.dataset.calDay);calView='day';renderCalendar();return}
 const b=e.target.closest('[data-cal-act]');if(!b)return;const c=db.calendar.find(x=>x.id===b.dataset.id);if(!c)return;
 if(b.dataset.calAct==='remove'){if(confirm('Supprimer cette échéance ?')){db.calendar=db.calendar.filter(x=>x!==c);save()}return}
 if(b.dataset.calAct==='move'){const nd=prompt('Nouvelle date (AAAA-MM-JJ) :',c.date);if(nd===null)return;if(!validDay(nd.trim()))return alert('Date invalide.');c.date=nd.trim();save()}
});
document.getElementById('calList').addEventListener('change',e=>{const sel=e.target.closest('[data-cal-status]');if(!sel)return;const c=db.calendar.find(x=>x.id===sel.dataset.calStatus);if(!c)return;if(sel.value==='Publié manuellement'&&!confirm('Confirmez-vous avoir publié ce contenu manuellement sur Facebook ? L’application ne publie rien automatiquement.')){sel.value=c.status;return}c.status=sel.value;save()});
function compressImage(file){return new Promise((resolve,reject)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{try{const max=1280,k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*k));c.height=Math.max(1,Math.round(im.height*k));const cx=c.getContext('2d');cx.fillStyle='#ffffff';cx.fillRect(0,0,c.width,c.height);cx.drawImage(im,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',0.85))}catch(e){reject(e)}finally{URL.revokeObjectURL(u)}};im.onerror=()=>{URL.revokeObjectURL(u);reject(new Error('Image illisible'))};im.src=u})}
document.getElementById('mediaFiles').onchange=async e=>{const files=[...e.target.files];e.target.value='';let added=0;for(const f of files){if(!/^image\/(png|jpeg|webp|gif)$/.test(f.type)){alert(f.name+' : format non pris en charge (PNG, JPEG, WebP ou GIF).');continue}if(f.size>12*1024*1024){alert(f.name+' dépasse 12 Mo.');continue}try{const data=await compressImage(f);if(!isSafeImage(data))throw new Error('format');db.media.push({id:uid(),name:cut(f.name,120),data});added++}catch(err){alert('Impossible d’importer '+f.name+'.')}}if(added)save()};
function renderMedia(){const el=document.getElementById('mediaGrid');el.innerHTML=db.media.map(m=>`<div class="card"><img src="${safe(m.data)}" alt="${safe(m.name)}" style="width:100%;height:130px;object-fit:cover;border-radius:8px"><p class="small">${safe(m.name)}</p><button class="btn sm" data-media="${safe(m.id)}">Supprimer</button></div>`).join('')||'<div class="empty">Aucun visuel importé.</div>'}
document.getElementById('runQuality').onclick=()=>{let t=document.getElementById('qualityText').value.trim(),rights=document.getElementById('mediaRights').value,fact=document.getElementById('factStatus').value;if(!t)return alert('Ajoutez le texte à contrôler.');let checks=[];if(/urgent!!!|partagez 20 fois|cliquez immédiatement|abonnez-vous sinon/i.test(t))checks.push('Réécrire les formulations insistantes ou assimilables à du spam.');if(/officiel|confirmé|annonce|date de sortie|décès|scandale/i.test(t))checks.push('Vérifier chaque fait, la date et la source originale avant publication.');if(rights==='unknown')checks.push('Origine des médias inconnue : ne pas publier avant vérification des droits.');if(rights==='official')checks.push('Une image officielle n’est pas automatiquement libre de réutilisation.');if(fact==='unchecked')checks.push('Actualité non vérifiée : rechercher une confirmation indépendante et la source primaire.');let out='CHECKLIST DE PRÉVENTION\n\n'+(checks.length?checks.map(x=>'• '+x).join('\n'):'• Aucun signal automatique évident. Cela ne signifie pas que le contenu est garanti conforme.')+'\n\nÀ contrôler manuellement : exactitude, spoilers, respect des personnes, musique, droits des images, licence, source et date.\n\nCe contrôle ne prédit pas les décisions de Facebook et ne garantit pas l’absence de réclamation.';document.getElementById('qualityResult').textContent=out};
document.getElementById('saveSettings').onclick=()=>{db.settings={...db.settings,pageName:document.getElementById('pageName').value,fontSize:+document.getElementById('fontSize').value,density:document.getElementById('density').value,workerUrl:document.getElementById('workerUrl').value.trim()};save();applySettings();alert('Réglages enregistrés.')};function applySettings(){document.documentElement.style.setProperty('--font',(db.settings.fontSize||14)+'px');if(db.settings.density==='compact')document.documentElement.style.setProperty('--radius','10px');document.getElementById('pageName').value=db.settings.pageName||blank.settings.pageName;document.getElementById('fontSize').value=db.settings.fontSize||14;document.getElementById('density').value=db.settings.density||'comfortable';document.getElementById('workerUrl').value=db.settings.workerUrl||'https://wild-field-da5f.rasllaonjaonja.workers.dev'}
document.getElementById('resetData').onclick=()=>{if(confirm('Effacer toutes les données locales ? Exportez d’abord une sauvegarde.')){localStorage.removeItem(STORE);db=JSON.parse(JSON.stringify(blank));save();applySettings();alert('Données locales effacées.')}};
function renderAll(){document.getElementById('sPosts').textContent=db.posts.length;document.getElementById('sDrafts').textContent=db.posts.filter(p=>p.status==='Brouillon'||p.status==='À vérifier').length;document.getElementById('sNews').textContent=newsItems.length;document.getElementById('sMedia').textContent=db.media.length;renderQueue();renderCalendar();renderMedia();let r=document.getElementById('homeRecent');r.innerHTML=db.posts.slice(0,4).map(p=>`<div class="item"><div><strong>${safe(p.title)}</strong><small>${safe(p.type)} · ${safe(p.status)}</small></div><span class="badge">${new Date(p.created).toLocaleDateString('fr-FR')}</span></div>`).join('')||'<div class="empty">Vos créations apparaîtront ici.</div>'}
function renderHomeExtras(){
 const sysRss=document.getElementById('sysRss'),sysSrc=document.getElementById('sysSources'),sysSt=document.getElementById('sysStorage');
 if(sysRss)sysRss.textContent=newsItems.length?newsItems.length+' article(s)':'En attente';
 if(sysSt){let ok=true;try{localStorage.setItem('__t','1');localStorage.removeItem('__t')}catch(e){ok=false}sysSt.textContent=ok?'Actif':'Indisponible';sysSt.className=ok?'ok':'';}
 const hn=document.getElementById('homeNews');
 if(hn)hn.innerHTML=newsItems.length?newsItems.slice(0,5).map(x=>{const u=/^https?:\/\//.test(x.url||'')?x.url:'#';return `<div class="news-row"><div style="min-width:0"><a href="${safe(u)}" target="_blank" rel="noopener noreferrer">${safe(x.title)}</a><small>${safe(x.source||'Source')} · ${x.publishedAt?safe(new Date(x.publishedAt).toLocaleDateString('fr-FR')):'date inconnue'}</small></div></div>`}).join(''):'<div class="empty">Aucune actualité pour le moment. Ouvrez le Radar pour lancer une collecte.</div>';
 const tr=document.getElementById('homeTrends');
 if(tr){
  const stop=new Set(['dans','pour','avec','mais','sont','cette','elle','elles','leurs','leur','plus','entre','comme','aussi','tout','tous','nouveau','nouvelle','après','avant','depuis','vers','chez','sans','sous','selon','cette','c’est','d’une','d’un','l’anime','l’animé','from','with','this','that','the','and','anime','manga','news','new']);
  const freq={};
  newsItems.forEach(x=>{(String(x.title||'').toLowerCase().match(/[\p{L}][\p{L}'’-]{3,}/gu)||[]).forEach(w=>{if(!stop.has(w))freq[w]=(freq[w]||0)+1})});
  const top=Object.entries(freq).filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]).slice(0,6);
  tr.innerHTML=top.length?'<div class="trend-list">'+top.map(([w,n])=>`<span class="trend-chip">${safe(w)} <b>${n}</b></span>`).join('')+'</div>':'<div class="empty">Pas encore de mot récurrent dans le radar.</div>';
 }
 const act=document.getElementById('homeActivity');
 if(act)act.innerHTML=db.posts.length?db.posts.slice(0,5).map(p=>`<div class="item"><div><strong>${safe(p.title||p.type)}</strong><small>${new Date(p.created).toLocaleDateString('fr-FR')} · ${safe(p.status)}</small></div></div>`).join(''):'<div class="empty">Aucune activité enregistrée.</div>';
 const pv=document.getElementById('homePreview');
 if(pv){const p=db.posts[0];pv.innerHTML=p?`<div class="preview-card"><div class="thumb-ph">✦</div><div style="min-width:0"><strong>${safe(p.title||p.type)}</strong><small class="muted" style="display:block;margin-top:4px">${safe(p.type)} · ${safe(p.status)}</small><p class="small" style="margin:8px 0 0;white-space:pre-wrap;max-height:110px;overflow:hidden">${safe((p.text||'').slice(0,260))}</p></div></div>`:'<div class="empty">Créez un contenu dans l\'Atelier pour voir son aperçu ici.</div>'}
}
const _renderAllBase=renderAll;
renderAll=function(){_renderAllBase();renderHomeExtras();renderSavedNews()};
lastPersisted=JSON.stringify(db);
applySettings();renderAll();
loadNews();
