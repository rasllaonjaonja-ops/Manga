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
function validDay(s){const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return false;const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]);if(mo<1||mo>12||d<1)return false;const date=new Date(0);date.setUTCHours(0,0,0,0);date.setUTCFullYear(y,mo-1,d);return date.getUTCFullYear()===y&&date.getUTCMonth()===mo-1&&date.getUTCDate()===d;}
function validIso(s){return typeof s==='string'&&s!==''&&!Number.isNaN(Date.parse(s));}
function isSafeImage(d){return typeof d==='string'&&/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(d);}
function normalizeDb(x){
 const src=isObj(x)?x:{};
const out={posts:[],calendar:[],media:[],news:[],settings:{pageName:blank.settings.pageName,fontSize:14,density:'comfortable',workerUrl:'https://wild-field-da5f.rasllaonjaonja.workers.dev'}};
 if(Array.isArray(src.posts))out.posts=src.posts.filter(isObj).slice(0,2000).map(p=>({id:p.id!=null&&String(p.id)!==''?String(p.id):uid(),title:cut(p.title,200),type:cut(p.type||'Publication',80),text:cut(p.text,20000),status:statuses().includes(p.status)?p.status:'Brouillon',created:validIso(p.created)?p.created:new Date().toISOString(),dailyDate:validDay(p.dailyDate)?p.dailyDate:null,dailySlot:Number.isInteger(+p.dailySlot)&&+p.dailySlot>=1&&+p.dailySlot<=4?+p.dailySlot:null,sourceUrl:/^https?:\/\//i.test(String(p.sourceUrl||''))?String(p.sourceUrl):'',sourceName:cut(p.sourceName||'',100),visualExports:Array.isArray(p.visualExports)?p.visualExports.filter(v=>typeof v==='string').slice(0,20):[],visualMediaId:typeof p.visualMediaId==='string'?p.visualMediaId:''}));
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
 const required=['postTopic','postType','postTone','postLength','postQuestion','buildPost','postResult','savePost','postPreview','aiSources','generateWithAI','aiStatus','workerUrl','testWorker','workerStatus','artCanvas','artFormat','renderArt','downloadArt','openChatGPTImage','openGeminiImage','imageAiPrompt','copyImagePrompt','artPostSelect','loadArtPost','artCaption','copyArtCaption','artLinkedStatus','artExportHistory','newsList','calList','mediaGrid','qualityText','runQuality','qualityResult','pageName','saveSettings','exportBackup','importBackup','sPosts','sDrafts','sNews','sMedia','homeRecent','homeNews','homeActivity','homePreview','homeTrends','publishedCount','projectCount','publishedPosts','projectPosts'];
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
document.getElementById('topNewsList').addEventListener('click',e=>{const b=e.target.closest('[data-trend]');if(b)useNewsByIndex(+b.dataset.trend)});
function saveNewsItem(n){
 if(!n||!/^https?:\/\//i.test(String(n.url||'')))return alert('Actualité invalide : lien manquant.');
 if(db.news.some(x=>x.url===n.url))return alert('Cette actualité est déjà enregistrée.');
 db.news.unshift({id:uid(),title:cut(n.title,300),source:cut(n.source||'Source',80),url:String(n.url),publishedAt:validIso(n.publishedAt)?n.publishedAt:null,summary:cut(n.summary,400),savedAt:new Date().toISOString(),verified:false});
 if(save())alert('Actualité enregistrée. Vérifiez-la dans la source originale avant de publier.');
}
function renderSavedNews(){
 const el=document.getElementById('savedNewsList');if(!el)return;
 el.innerHTML=db.news.length?db.news.map(n=>`<div class="item"><div style="min-width:0"><strong>${safe(n.title)}</strong><small>${safe(n.source)} · ${validIso(n.publishedAt)?new Date(n.publishedAt).toLocaleDateString('fr-FR'):'date inconnue'} · <span class="badge ${n.verified?'green':'orange'}">${n.verified?'Vérifiée':'À vérifier'}</span></small><small><a href="${safe(n.url)}" target="_blank" rel="noopener noreferrer">Source originale ↗</a></small></div><div class="actions"><button class="btn sm" data-saved="verify" data-id="${safe(n.id)}">${n.verified?'Marquer à revérifier':'Marquer vérifiée'}</button><button class="btn sm" data-saved="draft" data-id="${safe(n.id)}" ${n.verified?'':'disabled title="Vérifiez d’abord l’actualité"'}>Marquer pour rédaction →</button><button class="btn sm" data-saved="remove" data-id="${safe(n.id)}">×</button></div></div>`).join(''):'<div class="empty">Aucune actualité enregistrée.</div>';
}
document.getElementById('savedNewsList').addEventListener('click',e=>{
 const b=e.target.closest('[data-saved]');if(!b)return;const n=db.news.find(x=>x.id===b.dataset.id);if(!n)return;
 if(b.dataset.saved==='verify'){
  if(!n.verified&&!confirm('Confirmez-vous avoir consulté la source originale et vérifié cette information ?'))return;
  n.verified=!n.verified;save();
 }else if(b.dataset.saved==='draft'){
  if(!n.verified)return alert('Vérifiez d’abord l’actualité.');
  const text=`${n.title}\n\nSource : ${n.source}\nLien : ${n.url}\n\nÀ compléter : votre commentaire original, avec attribution de la source.`;
  if(addPost(n.title,'Actualité vérifiée',text)){
   const created=db.posts.find(x=>x.title===cut(n.title,200)&&x.text===cut(text,20000));
   if(created){created.sourceUrl=n.url;created.sourceName=n.source;created.workflowStage='redaction';save();}
   alert('Actualité transférée en rédaction. La source originale reste associée au brouillon.');
  }
 }else if(b.dataset.saved==='remove'){
  if(confirm('Retirer cette actualité de la liste enregistrée ?')){db.news=db.news.filter(x=>x!==n);save()}
 }
});
document.getElementById('publishedPosts').addEventListener('click',handlePublicationAction);
document.getElementById('projectPosts').addEventListener('click',handlePublicationAction);
function handlePublicationAction(e){const b=e.target.closest('[data-hub-act]');if(!b)return;const id=b.dataset.id;if(b.dataset.hubAct==='copy')copyPostId(id);else if(b.dataset.hubAct==='status')cyclePost(id);else if(b.dataset.hubAct==='next')advanceWorkflow(id);else if(b.dataset.hubAct==='remove')removePost(id);}

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
 const enrichedTopic=topic+'\nFormat demandé : '+type+'. Ton : '+tone+'. Longueur : '+lengthLabel+'. Langue : français naturel, adapté à Facebook. Termine par '+(question?'cette question : '+question:'une question engageante pour la communauté')+'. RÈGLES DE FIABILITÉ : utilise uniquement les faits explicitement présents dans les sources transmises. N’invente aucun nom, rôle, date, chiffre, casting, citation ou annonce. Ne transforme jamais une hypothèse en fait confirmé. Le résumé RSS peut être incomplet : ne le présente pas comme l’article intégral et n’ajoute aucun détail absent. Si une information manque ou reste incertaine, omets-la ou signale clairement qu’elle n’est pas précisée. Conserve les liens originaux et attribue les informations au média correspondant. Plusieurs reprises d’un même communiqué ne sont pas des confirmations indépendantes. En cas de divergence, signale-la. N’affirme jamais avoir consulté une page si son contenu n’a pas été fourni.';
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

/* Programme quotidien : quatre sujets RSS distincts, sans inventer d’actualité. */
let dailyPack=[];
let dailyRejected=new Set();
function dailyKey(item){return String(item.url||item.title||'').trim().toLowerCase()}
function dailyCandidates(){
 const used=new Set(dailyPack.map(p=>dailyKey(p.item)));
 return newsItems.map((item,index)=>({item,index}))
  .filter(o=>/^https?:\/\//i.test(String(o.item.url||''))&&!dailyRejected.has(dailyKey(o.item))&&!used.has(dailyKey(o.item)))
  .sort((a,b)=>(Number(b.item.trendScore)||0)-(Number(a.item.trendScore)||0)||Date.parse(b.item.publishedAt||0)-Date.parse(a.item.publishedAt||0));
}
function dailyType(item){
 const t=(String(item.title||'')+' '+String(item.summary||'')).toLowerCase();
 if(/adaptation|live.action|film|movie|anime adaptation/.test(t))return 'Découverte manga / anime';
 if(/trailer|teaser|cast|staff|opening|ending|visual|premiere|release date|announc/.test(t))return 'Actualité vérifiée';
 if(/ranking|ranked|top \d|poll|survey|versus|vs\./.test(t))return 'Comparaison';
 return 'Débat communautaire';
}
function saveDailyDraft(p,slot){
 const today=dayKey(new Date());
 const existing=db.posts.find(x=>x.dailyDate===today&&x.dailySlot===slot);
 const record={id:existing?existing.id:uid(),title:cut(p.item.title,200),type:cut(p.type,80),text:cut(p.text,20000),status:existing?existing.status:'Brouillon',workflowStage:existing?.workflowStage||'redaction',created:existing?existing.created:new Date().toISOString(),dailyDate:today,dailySlot:slot,sourceUrl:String(p.item.url||''),sourceName:cut(p.item.source||'Source RSS',100)};
 if(existing)Object.assign(existing,record);else db.posts.unshift(record);
 if(!save())return false;
 p.saved=true;p.postId=record.id;p.status='Brouillon enregistré automatiquement dans Publications';
 return true;
}
function renderDailyInlineVisual(index){
 const p=dailyPack[index];if(!p)return;
 const canvasEl=document.getElementById('dailyArtCanvas'+index);
 const captionEl=document.getElementById('dailyInlineCaption'+index);
 if(!canvasEl)return;
 if(captionEl)captionEl.textContent=p.text||'Le texte de la publication apparaîtra ici.';
 const savedPost=p.postId?db.posts.find(x=>x.id===p.postId):null;
 const media=savedPost&&savedPost.visualMediaId?db.media.find(x=>x.id===savedPost.visualMediaId):null;
 const paint=(image)=>paintArt(canvasEl,{format:'portrait',title:p.item.title||'Actualité manga et anime',subtitle:p.type||'MANGA · ANIME · ACTUALITÉS',image:image||null});
 if(media&&isSafeImage(media.data)){
  const image=new Image();image.onload=()=>paint(image);image.onerror=()=>paint(null);image.src=media.data;
 }else paint(null);
}
function renderDailyPack(){
 const el=document.getElementById('dailyPackList');if(!el)return;
 const btn=document.getElementById('generateDailyPack');
 if(btn)btn.disabled=dailyPack.length!==4||dailyPack.some(p=>p.generating);
 if(!dailyPack.length){el.innerHTML='<div class="empty">Aucun programme préparé.</div>';return}
 el.innerHTML=dailyPack.map((p,i)=>`<article class="daily-card daily-tone-${i+1}" data-daily-card="${i}">
  <div class="daily-card-head"><span class="daily-publication-label"><i></i> Publication ${i+1}/4</span><span class="badge orange">${safe(p.type)}</span></div>
  <h4>${safe(p.item.title)}</h4>
  <p class="small muted">${safe(p.item.source||'Source RSS')} · ${safe(p.item.publishedAt?new Date(p.item.publishedAt).toLocaleDateString('fr-FR'):'Date non précisée')}</p>
  <p class="daily-summary">${safe(clip(p.item.summary||'Résumé non fourni.',260))}</p>
  <p class="small"><a href="${safe(p.item.url)}" target="_blank" rel="noopener noreferrer">Consulter la source originale ↗</a></p>
  <div class="field"><label for="dailyText${i}">Texte Facebook modifiable</label><textarea id="dailyText${i}" data-daily-text="${i}" rows="7" placeholder="Générez ce brouillon avec l’IA…">${safe(p.text||'')}</textarea></div>
  <div class="daily-facebook-preview" id="dailyPreview${i}" aria-label="Aperçu fidèle d’une publication Facebook non publiée">
   <div class="daily-fb-head"><div class="daily-fb-avatar">M</div><div><strong>Manga, Animé et Actualités</strong><small>À l’instant · 🌐</small></div><span>•••</span></div>
   <div class="daily-fb-caption" id="dailyFbCaption${i}">${safe(p.text||'Votre texte Facebook apparaîtra ici.')}</div>
   <div class="daily-fb-source">Source : <a href="${safe(p.item.url)}" target="_blank" rel="noopener noreferrer">${safe(p.item.source||'Article original')} ↗</a></div>
   <div class="daily-fb-engagement"><span>👍 ❤️ 😮</span><span>J’aime · Commentaires · Partages</span></div>
   <div class="daily-fb-actions"><span>♡ J’aime</span><span>▢ Commenter</span><span>↗ Partager</span></div>
  </div>
  <p class="footnote" id="dailyStatus${i}" aria-live="polite">${safe(p.status||'En attente de génération')}</p>
  <div class="actions"><button class="btn sm" data-daily-act="copy" data-index="${i}">Copier</button><button class="btn sm" data-daily-act="save" data-index="${i}" ${p.saved?'disabled':''}>Enregistrer le brouillon</button><button class="btn sm" data-daily-act="art" data-index="${i}" ${p.text?'':'disabled'}>Marquer pour l’étape suivante : visuel →</button><button class="btn sm" data-daily-act="png" data-index="${i}" ${p.text?'':'disabled'}>Télécharger PNG</button><button class="btn sm danger" data-daily-act="replace" data-index="${i}">Refuser / remplacer</button></div>
  <section class="daily-inline-preview" id="dailyInlinePreview${i}" hidden aria-label="Aperçu du visuel de la publication ${i+1}">
   <div class="daily-inline-preview-head"><strong>Prévisualisation du visuel · Publication ${i+1}/4</strong><span>Maquette non publiée</span></div>
   <div class="daily-inline-facebook">
    <div class="daily-inline-fb-head"><span class="daily-inline-avatar">M</span><div><strong>Manga, Animé et Actualités</strong><small>À l’instant · 🌐</small></div><span class="daily-inline-more">•••</span></div>
    <div class="daily-inline-caption" id="dailyInlineCaption${i}"></div>
    <canvas id="dailyArtCanvas${i}" width="1080" height="1350" aria-label="Visuel généré pour cette publication"></canvas>
    <div class="daily-inline-fb-actions"><span>♡ J’aime</span><span>▢ Commenter</span><span>↗ Partager</span></div>
   </div>
   <p class="footnote">Aperçu du visuel réellement rendu par le studio. Pour utiliser une image créée avec ChatGPT, importez-la dans le Studio de publication : elle sera ensuite associée à ce brouillon.</p>
  </section>
 </article>`).join('');
}
document.getElementById('prepareDailyPack').onclick=()=>{
 dailyRejected=new Set();
 const unique=dailyCandidates();
 if(unique.length<4){document.getElementById('dailyPackStatus').textContent='Seulement '+unique.length+' actualité(s) distincte(s) disponible(s). Le programme attend quatre sujets fiables ; aucune actualité ne sera inventée.';dailyPack=[];renderDailyPack();return}
 dailyPack=unique.slice(0,4).map(({item})=>({item,type:dailyType(item),text:'',saved:false,generating:false,status:'Prêt à générer · source à vérifier'}));
 document.getElementById('dailyPackStatus').textContent='4 sujets distincts sélectionnés selon les tendances du Radar. Chaque sujet peut être remplacé individuellement.';
 renderDailyPack();
};
document.getElementById('generateDailyPack').onclick=async()=>{
 if(dailyPack.length!==4)return;
 const btn=document.getElementById('generateDailyPack');btn.disabled=true;
 for(let i=0;i<dailyPack.length;i++){
  const p=dailyPack[i];p.generating=true;p.status='Génération IA en cours…';renderDailyPack();
  try{
   const sourceArticles=Array.isArray(p.item.trendArticles)?p.item.trendArticles.slice(0,4):[];
   const sourceText='Titre RSS : '+p.item.title+'\nRésumé RSS (extrait, non intégral) : '+(p.item.summary||'Non fourni')+'\nSource principale : '+(p.item.source||'Source RSS')+'\nLien principal : '+p.item.url+'\nSources associées : '+sourceArticles.map(a=>(a.source||'Source')+' — '+(a.title||'')+' — '+(a.url||'')).join('\n');
   const topic='Rédige une publication Facebook en français sur cette actualité manga/anime. Sujet exact : '+p.item.title+'. Format éditorial : '+p.type+'. Ton naturel, engageant, précis et non sensationnaliste. Longueur moyenne. Accroche forte, paragraphes courts, question finale communautaire et 3 à 6 hashtags pertinents. Attribue clairement la source et conserve son lien. Ne dis pas que tu as lu l’article complet. N’ajoute aucun détail absent des éléments fournis. Si l’extrait est insuffisant, reste prudent et limite-toi aux faits visibles. N’invente ni casting, ni date, ni chiffre, ni citation, ni annonce. Distingue les faits des opinions. Le texte doit être spécifique à cette actualité et ne pas devenir un discours générique.';
   const response=await fetch(getWorkerBase()+'/generate',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({topic,sources:sourceText})});
   const raw=await response.text();let data;try{data=raw?JSON.parse(raw):{}}catch(_){data={text:raw}}
   if(!response.ok||data.success===false)throw new Error(data.error||('Erreur HTTP '+response.status));
   p.text=String(data.article||data.content||data.text||data.output||data.result||data.response||(data.data&&(data.data.article||data.data.content||data.data.text))||'').trim();
   if(!p.text)throw new Error('Réponse IA vide');
   if(!saveDailyDraft(p,i+1))throw new Error('Échec de l’enregistrement local du brouillon.');
   p.status='Brouillon enregistré automatiquement · à vérifier';
  }catch(err){p.status='Échec : '+(err.message||'erreur inconnue');}
  p.generating=false;renderDailyPack();
 }
 document.getElementById('dailyPackStatus').textContent='Traitement terminé. Relisez les quatre textes et ouvrez les sources originales. Aucun contenu n’a été publié sur Facebook.';
};
document.getElementById('dailyPackList').addEventListener('input',e=>{
 const i=Number(e.target.dataset.dailyText);if(!Number.isInteger(i)||!dailyPack[i])return;
 dailyPack[i].text=e.target.value;if(dailyPack[i].postId){const saved=db.posts.find(x=>x.id===dailyPack[i].postId);if(saved){saved.text=cut(e.target.value,20000);localStorage.setItem(STORE,JSON.stringify(db));lastPersisted=JSON.stringify(db)}}const preview=document.getElementById('dailyFbCaption'+i);if(preview)preview.textContent=e.target.value||'Votre texte Facebook apparaîtra ici.';
 const png=document.querySelector('[data-daily-act="png"][data-index="'+i+'"]');if(png)png.disabled=!e.target.value.trim();
});
document.getElementById('dailyPackList').addEventListener('click',async e=>{
 const b=e.target.closest('[data-daily-act]');if(!b)return;const i=Number(b.dataset.index),p=dailyPack[i];if(!p)return;
 if(b.dataset.dailyAct==='replace'){
  const next=dailyCandidates()[0];
  if(!next){document.getElementById('dailyPackStatus').textContent='Aucun autre sujet distinct disponible dans le Radar. Le brouillon existant est conservé.';return}
  dailyRejected.add(dailyKey(p.item));
  if(p.postId){db.posts=db.posts.filter(x=>x.id!==p.postId);if(!save())return;}
  dailyPack[i]={item:next.item,type:dailyType(next.item),text:'',saved:false,generating:false,status:'Sujet de remplacement sélectionné · prêt à générer'};
  document.getElementById('dailyPackStatus').textContent='Le sujet refusé a été écarté pour ce programme et remplacé par une autre actualité tendance. Aucun contenu n’a été publié.';
  renderDailyPack();return;
 }
 const textValue=document.getElementById('dailyText'+i).value.trim();p.text=textValue;
 if(b.dataset.dailyAct==='copy'){if(!textValue)return alert('Générez ou saisissez d’abord le texte.');copyText(textValue);return}
 if(b.dataset.dailyAct==='save'){if(!textValue)return alert('Générez ou saisissez d’abord le texte.');p.text=textValue;if(!saveDailyDraft(p,i+1))return;renderDailyPack();return}
 if(b.dataset.dailyAct==='art'){
  if(!textValue)return alert('Générez ou saisissez d’abord le texte de cette publication.');
  p.text=textValue;if(!saveDailyDraft(p,i+1))return;
  const linkedPost=db.posts.find(x=>x.id===p.postId);if(linkedPost){linkedPost.workflowStage='visuel';if(!save())return;}
  const panel=document.getElementById('dailyInlinePreview'+i);if(!panel)return;
  const opening=panel.hidden;panel.hidden=!opening;
  b.textContent=opening?'Masquer l’aperçu':'Créer le visuel associé →';
  if(opening){
   renderDailyInlineVisual(i);
   loadArtPostById(p.postId);
   document.getElementById('artLinkedStatus').textContent='Publication du jour '+(i+1)+'/4 liée au studio graphique. Le texte complet reste associé au brouillon.';
  }
  return;
 }
 if(b.dataset.dailyAct==='png'){if(!textValue)return;try{await downloadPostCapture(p.item.title,p.type,textValue);alert('Visuel PNG téléchargé. Le texte complet reste dans le brouillon.')}catch(err){alert('Échec du téléchargement PNG : '+(err.message||'erreur'))}}
});


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
document.getElementById('postPreview').textContent=document.getElementById('postResult').value||'Votre publication apparaîtra ici pendant la rédaction.';
let activeArtPostId='';
function renderArtPostLinks(){
 const select=document.getElementById('artPostSelect');if(!select)return;
 const keep=activeArtPostId||select.value;
 const sorted=db.posts.slice().sort((a,b)=>new Date(b.created)-new Date(a.created));
 select.innerHTML='<option value="">Choisir une publication enregistrée…</option>'+sorted.map(p=>'<option value="'+safe(p.id)+'">'+safe((p.dailySlot?'Jour '+p.dailySlot+'/4 · ':'')+(p.title||p.type||'Publication')+' · '+p.status)+'</option>').join('');
 if(keep&&db.posts.some(p=>p.id===keep))select.value=keep;
 const post=db.posts.find(p=>p.id===activeArtPostId);
 const history=document.getElementById('artExportHistory');
 if(history)history.textContent=post&&post.visualExports&&post.visualExports.length?'Exports liés : '+post.visualExports.slice(-5).join(' · '):'Aucun export enregistré pour cette publication.';
}
function loadArtPostById(id){
 const p=db.posts.find(x=>x.id===String(id));if(!p)return alert('Cette publication est introuvable dans les brouillons.');
 activeArtPostId=p.id;
 document.getElementById('artPostSelect').value=p.id;
 document.getElementById('artTitle').value=p.title||'PUBLICATION MANGA / ANIME';
 document.getElementById('artSubtitle').value=[p.type,p.dailySlot?'PUBLICATION DU JOUR '+p.dailySlot+'/4':''].filter(Boolean).join(' • ').toUpperCase().slice(0,90);
 document.getElementById('artCaption').value=p.text||'';
 artImage=null;
 const savedVisual=db.media.find(m=>m.id===p.visualMediaId);
 if(savedVisual&&isSafeImage(savedVisual.data)){const restored=new Image();restored.onload=()=>{artImage=restored;drawArt();};restored.src=savedVisual.data;}
 document.getElementById('artLinkedStatus').textContent='Lié à : '+(p.title||p.type)+' · '+p.status+'. Les modifications du texte seront enregistrées dans ce brouillon.';
 renderArtPostLinks();drawArt();
}
function artExportName(kind){
 const p=db.posts.find(x=>x.id===activeArtPostId);
 const base=String(p&&p.title||'publication').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||'publication';
 return 'manga-anime-'+base+'-'+kind+'.png';
}
function markArtExport(format,name){
 const p=db.posts.find(x=>x.id===activeArtPostId);
 if(!p){document.getElementById('visualStatus').textContent='Export téléchargé. Il n’est pas associé à un brouillon.';return}
 if(!Array.isArray(p.visualExports))p.visualExports=[];
 p.visualExports.push(format+' · '+name+' · '+new Date().toLocaleString('fr-FR'));
 p.visualExports=p.visualExports.slice(-20);
 if(!save())return;
 document.getElementById('visualStatus').textContent='Export téléchargé et rattaché au brouillon : '+p.title;
}
document.getElementById('loadArtPost').onclick=()=>{const id=document.getElementById('artPostSelect').value;if(!id)return alert('Sélectionnez d’abord un brouillon.');loadArtPostById(id)};
document.getElementById('artPostSelect').onchange=()=>{const id=document.getElementById('artPostSelect').value;if(id)loadArtPostById(id)};
document.getElementById('artCaption').addEventListener('input',e=>{
 updateFacebookPreview();
 const p=db.posts.find(x=>x.id===activeArtPostId);if(!p)return;
 p.text=cut(e.target.value,20000);
 try{const payload=JSON.stringify(db);localStorage.setItem(STORE,payload);lastPersisted=payload;document.getElementById('artLinkedStatus').textContent='Texte synchronisé avec le brouillon : '+p.title;}
 catch(err){showIssue('Impossible de synchroniser le texte avec le brouillon : stockage local indisponible.');}
});
document.getElementById('copyArtCaption').onclick=()=>{const t=document.getElementById('artCaption').value.trim();if(!t)return alert('Aucun texte Facebook à copier.');copyText(t)};
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
 const ink='#101322',accent='#b83263',paper='#ffffff';
 x.fillStyle=ink;x.fillRect(0,0,w,h);
 const sourceImage=Object.prototype.hasOwnProperty.call(opts,'image')?opts.image:artImage;
 if(sourceImage){
  const scale=Math.max(w/sourceImage.width,h/sourceImage.height),iw=sourceImage.width*scale,ih=sourceImage.height*scale;
  x.drawImage(sourceImage,(w-iw)/2,(h-ih)/2,iw,ih);
 }else{
  const g=x.createLinearGradient(0,0,w,h);
  g.addColorStop(0,'#22243a');g.addColorStop(.55,'#17182a');g.addColorStop(1,'#0b1020');
  x.fillStyle=g;x.fillRect(0,0,w,h);
  x.save();x.globalAlpha=.18;x.strokeStyle='#ffffff';x.lineWidth=Math.max(3,w*.003);
  for(let i=0;i<6;i++){x.beginPath();x.arc(w*.78,h*.30,w*(.10+i*.065),0,Math.PI*2);x.stroke();}
  x.restore();
  x.fillStyle='#ffffff';x.textAlign='center';
  x.font=`900 ${Math.round(w*.075)}px Arial`;x.fillText('MANGA & ANIME',w/2,h*.34);
  x.font=`600 ${Math.round(w*.027)}px Arial`;x.fillText('ACTUALITÉS · PASSION · COMMUNAUTÉ',w/2,h*.40);
 }
 const bandY=h*(format==='story'?.60:format==='landscape'?.56:.58);
 const grad=x.createLinearGradient(0,bandY,0,h);
 grad.addColorStop(0,'rgba(8,12,24,0)');
 grad.addColorStop(.20,'rgba(8,12,24,.78)');
 grad.addColorStop(1,'rgba(8,12,24,.98)');
 x.fillStyle=grad;x.fillRect(0,bandY,w,h-bandY);
 x.textAlign='center';x.shadowColor='rgba(0,0,0,.55)';x.shadowBlur=14;
 x.fillStyle='#ffffff';x.font=`800 ${Math.round(w*.026)}px Arial`;x.fillText('MANGA  •  ANIME  •  ACTUALITÉS',w/2,h*.12);
 const maxW=w*.84;
 let titleSize=Math.round(w*(format==='landscape'?.065:.075));
 const wrapT=size=>{x.font=`900 ${size}px Arial`;const out=[];let ln='';title.split(/\s+/).filter(Boolean).forEach(word=>{const test=ln?ln+' '+word:word;if(x.measureText(test).width>maxW&&ln){out.push(ln);ln=word}else ln=test});if(ln)out.push(ln);return out};
 let lines=wrapT(titleSize);
 while((lines.length>3||lines.some(l=>x.measureText(l).width>maxW))&&titleSize>25){titleSize-=2;lines=wrapT(titleSize)}
 const lineH=titleSize*1.15,titleStart=h*.78-(lines.length-1)*lineH/2;
 x.font=`900 ${titleSize}px Arial`;x.fillStyle='#ffffff';
 lines.forEach((ln,i)=>x.fillText(ln,w/2,titleStart+i*lineH));
 x.shadowBlur=0;x.fillStyle='#f0b4c7';x.font=`700 ${Math.round(w*.027)}px Arial`;
 x.fillText(clip(subtitle,75),w/2,Math.min(h*.90,titleStart+Math.min(lines.length,3)*lineH+titleSize*.55));
 x.fillStyle='#ffffff';x.font=`700 ${Math.round(w*.018)}px Arial`;x.fillText(clip(signature,60),w/2,h*.96);
 x.strokeStyle='#b83263';x.lineWidth=Math.max(3,w*.003);x.strokeRect(w*.025,h*.02,w*.95,h*.96);
 return target;
}
function updateFacebookPreview(){
 const caption=document.getElementById('artCaption').value.trim();
 const preview=document.getElementById('fbPreviewCaption');
 if(preview)preview.textContent=caption||'Votre texte Facebook apparaîtra ici après sélection d’un brouillon.';
}
function drawArt(){
 paintArt(canvas);
 const f=document.getElementById('artFormat').value,[w,h,dest]=artSizes[f];
 document.getElementById('artDimension').textContent=`${w} × ${h}`;
 document.getElementById('artDestination').textContent=dest;
 updateFacebookPreview();
}
function saveCanvasPNG(c,name){
 const a=document.createElement('a');a.download=name;a.href=c.toDataURL('image/png');
 document.body.appendChild(a);a.click();a.remove();
}
function buildImagePrompt(){
 const p=db.posts.find(x=>x.id===activeArtPostId),title=(document.getElementById('artTitle').value||'Actualité manga et anime').trim(),caption=(document.getElementById('artCaption').value||'').trim(),format=document.getElementById('artFormat').value;
 const ratio={portrait:'4:5 vertical (1080 × 1350)',square:'1:1 carré',story:'9:16 vertical (1080 × 1920)',landscape:'16:9 paysage'}[format]||'4:5 vertical';
 const source=p&&p.sourceUrl?'Source à respecter : '+p.sourceUrl:'Aucune source URL enregistrée dans le brouillon.';
 return 'Crée une image éditoriale professionnelle originale pour la page Facebook « Manga, Animé et Actualités ».\\nSujet exact : '+title+'.\\nContexte du brouillon : '+(caption?caption.slice(0,2200):'Aucun texte de publication fourni.')+'\\n'+source+'\\nDirection artistique : illustration anime/manga originale de haute qualité, composition cinématographique, éclairage maîtrisé, détails soignés, contraste lisible. Ne copie aucun personnage protégé ni aucune image officielle.\\nFormat : '+ratio+'. Prévoir une zone de respiration pour le recadrage.\\nIMPORTANT : ne pas inventer de logos, dates, citations ou détails factuels. Ne pas écrire de texte, lettres ni watermark dans l’image. Le texte sera ajouté séparément dans le studio. Produire une seule image nette, prête pour Facebook.';
}
function prepareExternalImageAI(provider){
 const prompt=buildImagePrompt(),box=document.getElementById('imageAiPrompt');box.value=prompt;box.focus();box.select();
 window.open(provider==='gemini'?'https://gemini.google.com/':'https://chatgpt.com/','_blank','noopener');
 const label=provider==='gemini'?'Gemini':'ChatGPT';
 try{if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(prompt).then(()=>{document.getElementById('imageAiStatus').textContent='Prompt copié. '+label+' est ouvert : collez-le, générez l’image puis revenez l’importer ici.';}).catch(()=>{document.getElementById('imageAiStatus').textContent='Service ouvert. Copiez le prompt affiché ci-dessous manuellement.';});}else document.getElementById('imageAiStatus').textContent='Service ouvert. Copiez le prompt affiché ci-dessous manuellement.';}catch(err){document.getElementById('imageAiStatus').textContent='Copiez le prompt affiché ci-dessous manuellement.';}
}
document.getElementById('openChatGPTImage').onclick=()=>prepareExternalImageAI('chatgpt');
document.getElementById('openGeminiImage').onclick=()=>prepareExternalImageAI('gemini');
document.getElementById('copyImagePrompt').onclick=()=>copyText(document.getElementById('imageAiPrompt').value.trim());
document.getElementById('artFile').onchange=e=>{
 const f=e.target.files[0];if(!f)return;
 if(!f.type.startsWith('image/'))return alert('Choisissez un fichier image.');
 if(f.size>12*1024*1024)return alert('Image trop lourde. Choisissez une image de moins de 12 Mo.');
 const u=URL.createObjectURL(f),im=new Image();
 im.onload=()=>{
  artImage=im;drawArt();URL.revokeObjectURL(u);
  const p=db.posts.find(x=>x.id===activeArtPostId);
  if(!p){document.getElementById('visualStatus').textContent='Image chargée pour l’aperçu. Sélectionnez un brouillon pour la conserver avec sa publication.';return;}
  try{
   const c=document.createElement('canvas'),scale=Math.min(1,1280/Math.max(im.width,im.height));
   c.width=Math.max(1,Math.round(im.width*scale));c.height=Math.max(1,Math.round(im.height*scale));
   c.getContext('2d').drawImage(im,0,0,c.width,c.height);
   let data=c.toDataURL('image/jpeg',.78);
   if(data.length>1800000)data=c.toDataURL('image/jpeg',.62);
   if(data.length>2200000)throw new Error('Image encore trop volumineuse après optimisation.');
   const mediaId=uid();db.media.unshift({id:mediaId,name:cut(f.name||'visuel importé',120),data});db.media=db.media.slice(0,300);p.visualMediaId=mediaId;p.workflowStage='projet';
   if(save())document.getElementById('visualStatus').textContent='Visuel associé : la publication est maintenant dans l’étape « Publication projet » : '+p.title;
  }catch(err){showIssue('Image affichée mais non enregistrée : '+err.message+' Exportez-la avant de quitter le studio.');}
 };
 im.onerror=()=>{URL.revokeObjectURL(u);alert('Impossible de lire cette image.');};im.src=u;
};
['artFormat','artTitle','artSubtitle','artSignature'].forEach(id=>document.getElementById(id).addEventListener('input',drawArt));
document.getElementById('renderArt').onclick=drawArt;
document.getElementById('downloadArt').onclick=()=>{
 drawArt();const kind=document.getElementById('artFormat').value,name=artExportName(kind);
 saveCanvasPNG(canvas,name);markArtExport(kind,name);
};
document.getElementById('downloadStory').onclick=()=>{
 const c=document.createElement('canvas');paintArt(c,{format:'story'});const name=artExportName('story-9x16');saveCanvasPNG(c,name);markArtExport('Story 9:16',name);drawArt();
};
document.getElementById('downloadSquare').onclick=()=>{
 const c=document.createElement('canvas');paintArt(c,{format:'square'});const name=artExportName('carre-1x1');saveCanvasPNG(c,name);markArtExport('Carré 1:1',name);drawArt();
};
document.getElementById('downloadCarousel').onclick=()=>{
 const lines=document.getElementById('carouselText').value.split(/\n+/).map(s=>s.trim()).filter(Boolean).slice(0,5);
 if(lines.length<2)return alert('Saisissez au moins deux idées, une par ligne.');
 lines.forEach((line,i)=>{
  const c=document.createElement('canvas');
  paintArt(c,{format:'square',title:line,subtitle:`CARTE ${i+1} / ${lines.length}`});
  saveCanvasPNG(c,artExportName('carrousel-'+String(i+1).padStart(2,'0')));
 });
 const name=artExportName('carrousel-'+lines.length+'-cartes');markArtExport('Carrousel '+lines.length+' cartes',name);
 document.getElementById('visualStatus').textContent=`${lines.length} cartes PNG préparées et associées au brouillon sélectionné si disponible.`;
 drawArt();
};
drawArt();
async function loadNews(){let status=document.getElementById('newsStatus');status.textContent='Lecture du fichier du radar…';try{let r=await fetch('data/latest-news.json?ts='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('Fichier absent ('+r.status+')');let data=await r.json();newsItems=Array.isArray(data.items)?data.items.filter(x=>isObj(x)&&typeof x.title==='string'):[];status.textContent=`${newsItems.length} article(s) · dernière collecte : ${data.updatedAt?new Date(data.updatedAt).toLocaleString('fr-FR'):'inconnue'}`;renderNews();renderAll()}catch(e){status.textContent='Radar non initialisé';document.getElementById('newsList').innerHTML='<div class="empty">Aucune collecte disponible pour le moment.<br>Déployez la V4 puis lancez le workflow « Anime Trend RSS Radar » dans GitHub Actions.</div>'}}
function getTopNews(){
 return newsItems.map((x,i)=>({x,i}))
  .sort((a,b)=>(Number(b.x.trendScore)||0)-(Number(a.x.trendScore)||0)||Date.parse(b.x.publishedAt||0)-Date.parse(a.x.publishedAt||0))
  .slice(0,5);
}
function renderTopNews(){
 const el=document.getElementById('topNewsList');if(!el)return;
 const top=getTopNews();
 el.innerHTML=top.length?top.map(({x,i},rank)=>{
  const sources=Array.isArray(x.trendSources)?x.trendSources:[x.source||'Source unique'];
  const articles=Array.isArray(x.trendArticles)&&x.trendArticles.length?x.trendArticles:[{title:x.title,source:x.source||'Source',url:x.url}];
  const sourceLinks=articles.slice(0,5).map(a=>{const u=/^https?:\/\//i.test(String(a.url||''))?a.url:'#';return '<a href="'+safe(u)+'" target="_blank" rel="noopener noreferrer">'+safe(a.source||'Source')+' ↗</a>';}).join(' · ');
  const u=/^https?:\/\//i.test(String(x.url||''))?x.url:'#';
  return '<article class="card news-card"><div class="news-meta"><span class="badge">#'+(rank+1)+' · Tendance estimée</span><span>'+(Number(x.trendSourceCount)||sources.length||1)+' source(s)</span></div><h4>'+safe(x.title)+'</h4><p>'+safe(clip(x.summary,220))+'</p><p class="small muted">Articles sources : '+sourceLinks+'</p><div class="actions"><a class="btn sm" href="'+safe(u)+'" target="_blank" rel="noopener noreferrer">Lire la source principale ↗</a><button class="btn primary sm" data-trend="'+safe(i)+'">Préparer cette publication</button></div></article>';
 }).join(''):'<div class="empty">Aucune tendance disponible pour le moment.</div>';
}function renderNews(){
 const f=document.getElementById('newsFilter').value,el=document.getElementById('newsList');
 const arr=newsItems.map((x,i)=>({x,i})).filter(o=>f==='all'||o.x.source===f);
 el.innerHTML=arr.length?arr.map(({x,i})=>{const u=/^https?:\/\//i.test(String(x.url||''))?x.url:'#';return `<article class="card news-card"><div class="news-meta"><span class="badge">${safe(x.source)}</span><span>${validIso(x.publishedAt)?safe(new Date(x.publishedAt).toLocaleDateString('fr-FR')):'Date inconnue'}</span></div><h4>${safe(x.title)}</h4><p>${safe(clip(x.summary,220))}</p><div class="actions"><a class="btn sm" href="${safe(u)}" target="_blank" rel="noopener noreferrer">Lire la source ↗</a><button class="btn sm" data-news-save="${safe(i)}">Enregistrer</button><button class="btn sm" data-news="${safe(i)}">Préparer un post</button></div></article>`}).join(''):'<div class="empty">Aucun article pour ce filtre.</div>';
 renderTopNews();
}
window.useNewsByIndex=(index)=>{
 const item=newsItems[index];
 if(!item)return;
 navigate('visual');
 document.getElementById('postType').value='Actualité vérifiée';
 document.getElementById('postTopic').value=item.title;
 document.getElementById('postQuestion').value='Qu’en pensez-vous ?';
 const related=Array.isArray(item.trendArticles)&&item.trendArticles.length
  ?item.trendArticles.slice(0,5)
  :[{title:item.title,source:item.source||'Source',url:item.url,summary:item.summary||'',summaryTruncated:item.summaryTruncated===true}];
 const sourceDetails=related.map((a,i)=>[
  'MÉDIA '+(i+1)+' : '+(a.source||'Source non précisée'),
  'TITRE : '+(a.title||item.title),
  'LIEN : '+(a.url||'Non fourni'),
  'EXTRAIT RSS : '+(String(a.summary||'Résumé non fourni').slice(0,700)),
  'EXTRAIT COUPÉ PAR LE COLLECTEUR : '+(a.summaryTruncated===true?'OUI':'NON')
 ].join('\n')).join('\n\n');
 document.getElementById('aiSources').value=[
  'SUJET REGROUPÉ : '+item.title,
  'DATE LA PLUS RÉCENTE : '+(item.publishedAt||'Non précisée'),
  'NOMBRE DE MÉDIAS RÉPERTORIÉS : '+(Number(item.trendSourceCount)||related.length),
  '',
  'SOURCES ET EXTRAITS DISPONIBLES :',
  sourceDetails,
  '',
  'RÈGLES DE FIABILITÉ OBLIGATOIRES :',
  'Ces contenus sont des extraits RSS, pas nécessairement les articles intégraux.',
  'Ne complète jamais un résumé coupé et ne déduis aucun détail absent.',
  'Conserve les liens originaux et attribue chaque information au média qui la rapporte.',
  'Plusieurs reprises du même communiqué ne constituent pas automatiquement plusieurs confirmations indépendantes.',
  'En cas de divergence entre les médias, signale-la au lieu de choisir arbitrairement.',
  'Si une information n’est pas présente dans les extraits, omets-la.'
 ].join('\n');
};
document.getElementById('reloadNews').onclick=loadNews;document.getElementById('newsFilter').onchange=renderNews;
const workflowLabels={actualite:'Actualité à vérifier',redaction:'À rédiger',visuel:'À illustrer',projet:'Publication projet',pret:'Prête à publier'};
function workflowStageOf(p){return workflowLabels[p.workflowStage]||workflowLabels.redaction}
function advanceWorkflow(id){
 const p=db.posts.find(x=>x.id===id);if(!p)return;
 if(p.status==='Publié manuellement')return alert('Cette publication est déjà marquée comme publiée manuellement.');
 const stages=['redaction','visuel','projet','pret'];
 const current=stages.indexOf(p.workflowStage||'redaction');
 p.workflowStage=stages[Math.min(stages.length-1,current+1)];
 if(p.workflowStage==='projet'&&p.status==='Brouillon')p.status='En projet';
 if(save())showIssue('Étape mise à jour : '+workflowLabels[p.workflowStage]+'.');
}
function renderPublications(){
 const today=dayKey(new Date());
 const daily=db.posts.filter(p=>p.dailyDate===today&&p.dailySlot).sort((a,b)=>a.dailySlot-b.dailySlot);
 const published=db.posts.filter(p=>p.status==='Publié manuellement');
 const projects=db.posts.filter(p=>p.status!=='Publié manuellement');
 const card=p=>`<article class="publication-entry"><div class="publication-entry-head"><strong>${safe(p.title||p.type||'Publication')}</strong><span class="badge ${p.status==='Publié manuellement'?'green':p.status==='Prêt'?'green':'orange'}">${safe(p.status)}</span></div><small class="muted">${safe(p.type)} · ${new Date(p.created).toLocaleDateString('fr-FR')}${p.dailySlot?' · Publication du jour '+p.dailySlot+'/4':''}</small><span class="badge">${safe(workflowStageOf(p))}</span><details><summary>Voir le texte complet</summary><p class="publication-text">${safe(p.text)}</p></details>${p.sourceUrl?`<small><a href="${safe(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">Source : ${safe(p.sourceName||'article original')} ↗</a></small>`:''}<div class="actions"><button class="btn sm primary" data-hub-act="next" data-id="${safe(p.id)}">Marquer pour l’étape suivante →</button><button class="btn sm" data-hub-act="copy" data-id="${safe(p.id)}">Copier</button><button class="btn sm" data-hub-act="status" data-id="${safe(p.id)}">Statut</button><button class="btn sm" data-hub-act="remove" data-id="${safe(p.id)}">Supprimer</button></div></article>`;
 const dailyEl=document.getElementById('dailyDraftPosts');
 if(dailyEl){
  document.getElementById('dailyDraftCount').textContent=daily.length+'/4 brouillons';
  dailyEl.innerHTML=daily.length?daily.map(p=>`<article class="daily-draft-row"><div class="daily-draft-number">${p.dailySlot}</div><div class="daily-draft-content"><strong>${safe(p.title)}</strong><small>${safe(p.type)} · ${safe(p.status)}</small><details><summary>Lire le brouillon</summary><p class="publication-text">${safe(p.text)}</p></details>${p.sourceUrl?`<a href="${safe(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">Consulter la source ↗</a>`:''}</div><div class="actions"><button class="btn sm primary" data-hub-act="next" data-id="${safe(p.id)}">Étape suivante →</button><button class="btn sm" data-hub-act="copy" data-id="${safe(p.id)}">Copier</button><button class="btn sm" data-hub-act="status" data-id="${safe(p.id)}">Statut</button></div></article>`).join(''):'<div class="empty">Aucun brouillon quotidien enregistré pour aujourd’hui. Générez les quatre textes depuis l’Atelier.</div>';
 }
 document.getElementById('publishedCount').textContent=published.length+' publiée(s)';
 document.getElementById('projectCount').textContent=projects.length+' en projet';
 document.getElementById('publishedPosts').innerHTML=published.length?published.map(card).join(''):'<div class="empty">Aucune publication confirmée pour le moment.</div>';
 document.getElementById('projectPosts').innerHTML=projects.length?projects.map(card).join(''):'<div class="empty">Aucun projet enregistré pour le moment.</div>';
}
function copyPostId(id){const p=db.posts.find(x=>x.id===id);if(p)copyText(p.text)}
/* Le passage à « Publié manuellement » exige une confirmation explicite : rien n'est publié automatiquement. */
function cyclePost(id){const p=db.posts.find(x=>x.id===id);if(!p)return;const order=statuses();const next=order[(order.indexOf(p.status)+1)%order.length];if(next==='Publié manuellement'&&!confirm('Confirmez-vous avoir publié ce contenu manuellement sur Facebook ? L’application ne publie rien automatiquement.'))return;p.status=next;save()}
function removePost(id){if(confirm('Supprimer ce contenu ? Cette action est définitive.')){db.posts=db.posts.filter(x=>x.id!==id);save()}}
document.getElementById('exportBackup').onclick=()=>download('anime-trend-backup-v4.json',JSON.stringify(db,null,2),'application/json');function download(n,d,t){let a=document.createElement('a'),u=URL.createObjectURL(new Blob([d],{type:t}));a.href=u;a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
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
document.getElementById('useArtTextForQuality').onclick=()=>{document.getElementById('qualityText').value=document.getElementById('artCaption').value.trim()};
document.getElementById('runQuality').onclick=()=>{let t=document.getElementById('qualityText').value.trim(),rights=document.getElementById('mediaRights').value,fact=document.getElementById('factStatus').value;if(!t)return alert('Ajoutez le texte à contrôler.');let checks=[];if(/urgent!!!|partagez 20 fois|cliquez immédiatement|abonnez-vous sinon/i.test(t))checks.push('Réécrire les formulations insistantes ou assimilables à du spam.');if(/officiel|confirmé|annonce|date de sortie|décès|scandale/i.test(t))checks.push('Vérifier chaque fait, la date et la source originale avant publication.');if(rights==='unknown')checks.push('Origine des médias inconnue : ne pas publier avant vérification des droits.');if(rights==='official')checks.push('Une image officielle n’est pas automatiquement libre de réutilisation.');if(fact==='unchecked')checks.push('Actualité non vérifiée : rechercher une confirmation indépendante et la source primaire.');let out='CHECKLIST DE PRÉVENTION\n\n'+(checks.length?checks.map(x=>'• '+x).join('\n'):'• Aucun signal automatique évident. Cela ne signifie pas que le contenu est garanti conforme.')+'\n\nÀ contrôler manuellement : exactitude, spoilers, respect des personnes, musique, droits des images, licence, source et date.\n\nCe contrôle ne prédit pas les décisions de Facebook et ne garantit pas l’absence de réclamation.';document.getElementById('qualityResult').textContent=out};
document.getElementById('saveSettings').onclick=()=>{const workerUrl=document.getElementById('workerUrl').value.trim().replace(/\/+$/,'');if(!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(workerUrl))return alert('Adresse Worker invalide. Utilisez une adresse HTTPS sans chemin.');db.settings={...db.settings,pageName:document.getElementById('pageName').value,fontSize:+document.getElementById('fontSize').value,density:document.getElementById('density').value,workerUrl};if(!save())return;applySettings();alert('Réglages enregistrés.')};function applySettings(){document.documentElement.style.setProperty('--font-size',(db.settings.fontSize||14)+'px');document.documentElement.style.setProperty('--radius',db.settings.density==='compact'?'10px':'14px');document.getElementById('pageName').value=db.settings.pageName||blank.settings.pageName;document.getElementById('fontSize').value=db.settings.fontSize||14;document.getElementById('density').value=db.settings.density||'comfortable';document.getElementById('workerUrl').value=db.settings.workerUrl||'https://wild-field-da5f.rasllaonjaonja.workers.dev'}
document.getElementById('resetData').onclick=()=>{if(confirm('Effacer toutes les données locales ? Exportez d’abord une sauvegarde.')){db=normalizeDb(null);if(!save())return;applySettings();alert('Données locales effacées.')}};
function renderAll(){document.getElementById('sPosts').textContent=db.posts.length;document.getElementById('sDrafts').textContent=db.posts.filter(p=>p.status==='Brouillon'||p.status==='À vérifier').length;document.getElementById('sNews').textContent=newsItems.length;document.getElementById('sMedia').textContent=db.media.length;renderPublications();renderCalendar();renderMedia();renderArtPostLinks();let r=document.getElementById('homeRecent');r.innerHTML=db.posts.slice(0,4).map(p=>`<div class="item"><div><strong>${safe(p.title)}</strong><small>${safe(p.type)} · ${safe(p.status)}</small></div><span class="badge">${new Date(p.created).toLocaleDateString('fr-FR')}</span></div>`).join('')||'<div class="empty">Vos créations apparaîtront ici.</div>'}
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
