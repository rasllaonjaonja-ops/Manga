/* ANIME TREND V4 — assistant éditorial avancé */
(() => {
  'use strict';
  if (window.AnimeTrendAssistant) return;
  const MEMORY_KEY='animeTrendAssistantMemoryV2', STORE_KEY='animeTrendStudio.v2';
  const $=(s,r=document)=>r.querySelector(s);
  const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(_){return d}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(_){return false}};
  const clean=v=>String(v??'').trim().slice(0,1600);
  const unique=items=>[...new Map(items.filter(x=>x&&x.title).map(x=>[String(x.url||x.title).toLowerCase(),x])).values()];
  const style=document.createElement('style');
  style.textContent=[
    '#at-ai-launch{position:fixed;right:18px;bottom:18px;z-index:9998;border:0;border-radius:999px;padding:13px 17px;background:linear-gradient(135deg,#514bd2,#167eb8);color:#fff;font-weight:800;box-shadow:0 8px 28px #1e3a8a55;cursor:pointer}',
    '#at-ai-panel{position:fixed;z-index:9999;right:16px;bottom:78px;width:min(440px,calc(100vw - 24px));height:min(680px,calc(100dvh - 110px));display:none;grid-template-rows:auto auto 1fr auto;background:var(--card,#fff);color:var(--text,#172033);border:1px solid var(--line,#d9e1ef);border-radius:18px;box-shadow:0 18px 60px #0b173744;overflow:hidden}',
    '#at-ai-panel.open{display:grid}.at-ai-head{padding:13px 15px;background:#151c36;color:white;display:flex;align-items:center;justify-content:space-between;gap:10px}.at-ai-head strong{display:block}.at-ai-head small{color:#c8d3f4}.at-ai-head button{border:0;background:#ffffff20;color:white;border-radius:9px;padding:7px 10px;cursor:pointer}',
    '#at-ai-log{padding:13px;overflow:auto;display:flex;flex-direction:column;gap:10px;background:var(--bg,#f5f7fc)}.at-ai-msg{max-width:96%;padding:10px 12px;border-radius:13px;font-size:13px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}.at-ai-msg.bot{align-self:flex-start;background:var(--card,#fff);border:1px solid var(--line,#dce3ef)}.at-ai-msg.user{align-self:flex-end;background:#e8edff;color:#172554}.at-ai-meta{font-size:10px;color:var(--muted,#69758b);margin-top:5px}',
    '.at-ai-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.at-ai-actions button{border:1px solid #cbd5e1;border-radius:8px;padding:7px 9px;background:#f8fafc;color:#24324a;font-size:11px;font-weight:700;cursor:pointer}',
    '.at-ai-composer{padding:11px;border-top:1px solid var(--line,#dce3ef);display:grid;grid-template-columns:1fr auto;gap:8px;background:var(--card,#fff)}#at-ai-input{width:100%;min-height:46px;max-height:120px;resize:vertical;border:1px solid var(--line,#cbd5e1);border-radius:11px;padding:10px;font:inherit;font-size:13px;background:var(--bg,#fff);color:inherit}#at-ai-send{border:0;border-radius:11px;padding:0 14px;background:#4658d8;color:white;font-weight:800;cursor:pointer}#at-ai-send:disabled{opacity:.55;cursor:wait}',
    '.at-ai-shortcuts{display:flex;gap:6px;overflow:auto;padding:8px 11px;background:var(--card,#fff);border-top:1px solid var(--line,#e2e8f0)}.at-ai-shortcuts button{white-space:nowrap;border:1px solid var(--line,#dce3ef);border-radius:20px;padding:6px 9px;background:transparent;color:inherit;font-size:11px;cursor:pointer}',
    '.at-ai-tutorial{padding:8px 12px;background:#f0f5ff;border-bottom:1px solid #d9e5fb;color:#20345d;font-size:11px;line-height:1.45}.at-ai-tutorial summary{cursor:pointer;font-weight:800;color:#174b91}.at-ai-tutorial ol{margin:7px 0 5px;padding-left:18px}.at-ai-tutorial li{margin:4px 0}.at-ai-tutorial p{margin:6px 0 0;color:#586987}',
    '@media(max-width:600px){#at-ai-launch{right:12px;bottom:12px}#at-ai-panel{right:8px;bottom:68px;width:calc(100vw - 16px);height:min(76dvh,680px)}}'
  ].join('');
  document.head.appendChild(style);
  const panel=document.createElement('section');
  panel.id='at-ai-panel';panel.setAttribute('aria-label','Assistant éditorial avancé Anime Trend');
  panel.innerHTML=[
    '<header class="at-ai-head"><div><strong>✦ ANIME TREND AI</strong><small>Assistant éditorial avancé · V4</small></div><button type="button" id="at-ai-close" aria-label="Fermer">✕</button></header>',
    '<details class="at-ai-tutorial" id="at-ai-tutorial"><summary>📘 Tutoriel : bien utiliser l’assistant (ouvrir)</summary><ol><li><b>Choisis ton contexte :</b> ouvre le Radar pour les actualités ou le Studio complet et sélectionne un brouillon.</li><li><b>Utilise un raccourci :</b> Radar, Rédiger, Contrôle qualité, Visuel ou Planning. Tu peux aussi écrire ta propre demande.</li><li><b>Envoie ta consigne :</b> l’assistant récupère les titres visibles, les sources enregistrées et le brouillon sélectionné quand ils sont disponibles.</li><li><b>Vérifie la réponse :</b> copie-la ou utilise « Utiliser dans le Studio ». Contrôle toujours les faits dans les articles originaux.</li><li><b>Finalise :</b> prépare le visuel, vérifie l’aperçu Facebook, puis publie toi-même depuis Meta Business Suite.</li></ol><p><b>À savoir :</b> si le Worker est indisponible, l’assistant passe en mode local limité. Il ne lit pas automatiquement les articles complets, les commentaires Facebook ni les statistiques Meta. Il ne publie jamais à ta place.</p></details>',
    '<div id="at-ai-log" aria-live="polite"><div class="at-ai-msg bot">Bonjour ! Je suis ton copilote éditorial. Je peux analyser les actualités chargées, préparer et améliorer les textes, contrôler les sources, organiser les idées et t’aider avec les visuels. Je ne publie jamais sur Facebook. Ouvre le tutoriel ci-dessus pour apprendre à m’utiliser.</div></div>',
    '<div><div class="at-ai-shortcuts">',
    '<button data-prompt="Analyse les actualités du Radar visibles dans le Studio et classe les sujets à examiner. N’invente aucun fait.">Radar</button>',
    '<button data-prompt="Recherche Internet : Dragon Ball Z. Trouve des actualités récentes, indique les médias et conserve les liens. Ne confirme aucun fait sans source originale.">Recherche Internet</button>',
    '<button data-prompt="Prépare une publication Facebook à partir de l’actualité sélectionnée et des sources présentes dans le Studio.">Rédiger</button>',
    '<button data-prompt="Contrôle la qualité du brouillon actuel : faits, sources, clarté, répétitions et hashtags.">Contrôle qualité</button>',
    '<button data-prompt="Propose une idée de visuel original et un prompt d’image lié au brouillon actuel.">Visuel</button>',
    '<button data-prompt="Aide-moi à organiser les publications du jour sans créer de faits d’actualité.">Planning</button>',
    '</div><form class="at-ai-composer" id="at-ai-form"><textarea id="at-ai-input" rows="2" maxlength="4000" placeholder="Écris une instruction…"></textarea><button id="at-ai-send" type="submit">Envoyer</button></form></div>'
  ].join('');
  document.body.appendChild(panel);
  const launch=document.createElement('button');launch.id='at-ai-launch';launch.type='button';launch.textContent='✦ Assistant IA';launch.setAttribute('aria-label','Ouvrir l’assistant IA avancé');document.body.appendChild(launch);
  const log=$('#at-ai-log'),input=$('#at-ai-input'),form=$('#at-ai-form'),send=$('#at-ai-send');
  const memory=read(MEMORY_KEY,[]);
  function addMessage(content,who='bot',meta=''){
    const el=document.createElement('div');el.className='at-ai-msg '+who;el.textContent=content;
    if(meta){const m=document.createElement('div');m.className='at-ai-meta';m.textContent=meta;el.appendChild(m)}
    log.appendChild(el);log.scrollTop=log.scrollHeight;return el;
  }
  function collectVisibleNews(){
    const found=[];
    ['#topNewsList','#newsList','#homeNews','#savedNewsList'].forEach(selector=>{
      const root=$(selector);if(!root)return;
      root.querySelectorAll('a[href],article,.news-card,.news-item,.trend-card').forEach(card=>{
        const link=card.matches('a[href]')?card:$('a[href]',card);
        const title=clean(link?.textContent||card.querySelector('h3,h4,strong')?.textContent||card.textContent);
        if(title.length>8)found.push({title,url:link?.href||'',source:clean(card.querySelector('small,.muted')?.textContent||'')});
      });
    });
    return unique(found).slice(0,12);
  }
  function currentContext(){
    const db=read(STORE_KEY,{}),posts=Array.isArray(db.posts)?db.posts:[],saved=Array.isArray(db.news)?db.news:[];
    const selectedId=$('#artPostSelect')?.value||'',selected=posts.find(p=>String(p.id)===String(selectedId))||null;
    const visible=collectVisibleNews();
    const headlines=unique(visible.concat(saved.slice(0,12).map(n=>({title:n.title,url:n.url,source:n.source,summary:n.summary})))).slice(0,12);
    return {
      brand:'Manga, Animé et Actualités',
      module:clean($('#title')?.textContent||$('.page.active h2')?.textContent||'Studio'),
      pageName:clean(db.settings?.pageName||'Manga, Animé et Actualités'),
      topic:clean(selected?.title||$('#postTopic')?.value||$('#artTitle')?.value||''),
      selectedPost:selected?{title:selected.title,status:selected.status,sourceUrl:selected.sourceUrl,sourceName:selected.sourceName,workflowStage:selected.workflowStage}:null,
      draft:clean(selected?.text||$('#artCaption')?.value||$('#postResult')?.value||'').slice(0,5000),
      headlines,
      savedNews:saved.slice(0,8).map(n=>({title:n.title,source:n.source,url:n.url,summary:n.summary,verified:n.verified===true})),
      postCounts:{total:posts.length,drafts:posts.filter(p=>p.status==='Brouillon').length,toCheck:posts.filter(p=>p.status==='À vérifier').length,ready:posts.filter(p=>p.status==='Prêt').length,manuallyPublished:posts.filter(p=>p.status==='Publié manuellement').length},
      dailyDrafts:posts.filter(p=>p.dailyDate===new Date().toISOString().slice(0,10)).slice(0,4).map(p=>({title:p.title,status:p.status,dailySlot:p.dailySlot})),
      recentHistory:memory.slice(-5).map(x=>({message:x.message,answer:x.answer}))
    };
  }
  function navigateForRequest(message){
    const m=message.toLowerCase(),rules=[
      [/radar|actualité|actualités|source/,'radar'],
      [/rédig|publication|post|texte|visuel|image|vidéo|capture|médiathèque/,'visual'],
      [/calendrier|planning|planifier/,'calendar'],
      [/github|workflow|erreur|diagnostic/,'automation'],
      [/réglage|paramètre|sauvegarde/,'settings'],
      [/suivi|publications faites|contenus enregistrés/,'publications']
    ],hit=rules.find(x=>x[0].test(m));
    if(hit){const nav=$('[data-page="'+hit[1]+'"]');if(nav)nav.click();else $('[data-go="'+hit[1]+'"]')?.click()}
  }
  function localAnswer(message,ctx){
    const m=message.toLowerCase();
    if(/analyse|résume|priorit|tendance|radar/.test(m)){
      if(!ctx.headlines.length)return 'Je ne vois aucun titre du Radar dans le contexte chargé. Ouvre Actualités · Radar et actualise les données, puis relance l’analyse. Je ne vais pas inventer de sujets.';
      return 'Éléments visibles dans le Radar ('+ctx.headlines.length+') :\n'+ctx.headlines.slice(0,8).map((n,i)=>(i+1)+'. '+n.title+(n.source?' — '+n.source:'')+(n.url?'\n   '+n.url:'')).join('\n')+'\n\nLimite : le mode local lit les titres et extraits affichés, pas le contenu intégral des articles. Ouvre les sources originales avant de présenter les faits comme confirmés.';
    }
    if(/contrôle|qualité|corrig|vérifi/.test(m)){
      if(!ctx.draft)return 'Je ne trouve pas de brouillon chargé. Ouvre le Studio complet, sélectionne une publication et charge-la avant le contrôle.';
      const checks=['Sujet identifiable : '+(ctx.draft.length>45?'oui':'à développer'),'Question finale : '+(/\?/.test(ctx.draft)?'présente':'à envisager'),'Hashtags : '+(/#\w+/.test(ctx.draft)?'présents':'à ajouter seulement s’ils sont pertinents'),'Source liée : '+(ctx.selectedPost?.sourceUrl||'non détectée dans la publication sélectionnée'),'Exactitude factuelle : vérification humaine nécessaire'];
      return 'Contrôle structurel local :\n• '+checks.join('\n• ')+'\n\nJe n’ai pas vérifié les faits auprès des médias. Compare les noms, dates et chiffres à la source originale.';
    }
    if(/visuel|image/.test(m)){
      const subject=ctx.topic||ctx.headlines[0]?.title;
      if(!subject)return 'Choisis d’abord une actualité ou un brouillon dans le Studio. Je pourrai ensuite préparer un concept visuel et un prompt adapté.';
      return 'Concept visuel à préparer pour : '+subject+'\n\nCréer une composition originale au format Facebook 4:5, avec un sujet principal lisible, un arrière-plan cohérent, un espace réservé au titre et la signature « MANGA, ANIMÉ ET ACTUALITÉS ». Évite les logos non autorisés et les personnages déformés.\n\nLe mode local ne génère pas lui-même l’image. Utilise les outils de création d’image du Studio puis importe le résultat.';
    }
    return 'Mode local disponible. Je peux lire les titres et brouillons chargés, ouvrir le module adapté et effectuer un contrôle de structure. Pour une analyse et une rédaction IA avancées, le Worker doit répondre sur sa route /assistant. Sans connexion, je ne prétends pas utiliser un modèle IA.';
  }
  function addResponseActions(element,answer){
    const actions=document.createElement('div');actions.className='at-ai-actions';
    const copy=document.createElement('button');copy.type='button';copy.textContent='Copier la réponse';
    copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(answer);copy.textContent='Copié ✓'}catch(_){copy.textContent='Copie indisponible'}});
    const transfer=document.createElement('button');transfer.type='button';transfer.textContent='Utiliser dans le Studio';
    transfer.addEventListener('click',()=>{
      const target=$('#artCaption')||$('#postResult');if(!target){transfer.textContent='Champ introuvable';return}
      target.value=answer;target.dispatchEvent(new Event('input',{bubbles:true}));target.dispatchEvent(new Event('change',{bubbles:true}));
      if(target.id==='postResult'&&$('#postPreview'))$('#postPreview').textContent=answer;
      transfer.textContent='Texte transféré ✓';$('[data-page="visual"]')?.click();
    });
    actions.append(copy,transfer);element.appendChild(actions);
  }
  function workerBase(){
    const db=read(STORE_KEY,{}),stored=String(db.settings?.workerUrl||'').trim(),value=( !stored || stored==='https://wild-field-da5f.rasllaonjaonja.workers.dev' ? 'https://manga-trend-studio-v4-assistant-2.rasllaonjaonja.workers.dev' : stored ).replace(/\/+$/,'');
    if(!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(value))throw new Error('Adresse du Worker invalide. Vérifie Réglages.');
    return value;
  }
  async function ask(message){
    addMessage(message,'user');input.value='';send.disabled=true;
    let ctx=currentContext(),wait=addMessage('Analyse du contexte du Studio…','bot'),searchCount=null;
    try{
      const searchMode=/recherche internet|recherche libre|cherche sur internet|actualités récentes/i.test(message);
      if(searchMode){
        const query=(message.includes(':')?message.split(':').slice(1).join(':').trim():message.replace(/recherche internet|recherche libre|cherche sur internet|actualités récentes/ig,'').trim()).slice(0,120);
        if(query.length<2)throw new Error('Précise le manga, l’anime ou le sujet à rechercher.');
        wait.textContent='Recherche des actualités sur « '+query+' »…';
        const sr=await fetch(workerBase()+'/search?q='+encodeURIComponent(query),{headers:{'Accept':'application/json'}});
        const sd=await sr.json();
        if(!sr.ok||sd.success!==true)throw new Error(sd.error||'La recherche Internet a échoué.');
        searchCount=sd.count||0;
        ctx={...ctx,webSearch:{query:sd.query,provider:sd.provider,count:searchCount,results:sd.results||[],notice:sd.note}};
        wait.textContent='Recherche terminée : '+searchCount+' résultat(s). Vérification éditoriale en cours…';
      }
      const response=await fetch(workerBase()+'/assistant',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({message,context:ctx,language:'fr',mode:'advanced'})});
      const raw=await response.text();let data={};try{data=raw?JSON.parse(raw):{}}catch(_){}
      if(!response.ok||data.success!==true||!data.answer)throw new Error(data.error||'La route Assistant IA ne renvoie pas de réponse exploitable (HTTP '+response.status+').');
      wait.textContent=data.answer;
      const meta=document.createElement('div');meta.className='at-ai-meta';meta.textContent='Mode avancé · '+(data.provider||'moteur IA connecté')+(searchCount!==null?' · Recherche web : '+searchCount+' résultat(s)':'')+(data.fallback?' · moteur de secours utilisé':'');wait.appendChild(meta);
      addResponseActions(wait,data.answer);
    }catch(error){
      const answer=localAnswer(message,ctx);wait.textContent=answer;
      const meta=document.createElement('div');meta.className='at-ai-meta';meta.textContent='Mode local de secours · '+String(error.message||error).slice(0,180);wait.appendChild(meta);
      addResponseActions(wait,answer);
    }finally{
      memory.push({at:new Date().toISOString(),message,answer:wait.textContent.slice(0,1200)});
      while(memory.length>30)memory.shift();write(MEMORY_KEY,memory);send.disabled=false;input.focus();
    }
  }
  launch.addEventListener('click',()=>{panel.classList.toggle('open');if(panel.classList.contains('open'))input.focus()});
  $('#at-ai-close').addEventListener('click',()=>panel.classList.remove('open'));
  form.addEventListener('submit',event=>{event.preventDefault();const value=input.value.trim();if(value){navigateForRequest(value);ask(value)}});
  panel.querySelectorAll('[data-prompt]').forEach(button=>button.addEventListener('click',()=>{input.value=button.dataset.prompt;input.focus()}));
  document.addEventListener('keydown',event=>{if(event.key==='Escape')panel.classList.remove('open')});
  window.AnimeTrendAssistant={open:()=>panel.classList.add('open'),ask,getContext:currentContext};
})();