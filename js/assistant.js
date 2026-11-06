/* ANIME TREND V4 — assistant hybride global */
(() => {
  'use strict';
  const KEY='animeTrendAssistantMemoryV1';
  const $=(s,r=document)=>r.querySelector(s);
  const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read=(k,fallback)=>{try{return JSON.parse(localStorage.getItem(k))??fallback}catch(_){return fallback}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
  const memory=read(KEY,[]);
  const style=`
  #at-ai-launch{position:fixed;right:18px;bottom:18px;z-index:9998;border:0;border-radius:999px;padding:13px 17px;background:linear-gradient(135deg,#5b55df,#168fcb);color:#fff;font-weight:800;box-shadow:0 8px 28px #1e3a8a55;cursor:pointer}
  #at-ai-panel{position:fixed;z-index:9999;right:16px;bottom:78px;width:min(420px,calc(100vw - 24px));height:min(620px,calc(100dvh - 110px));display:none;grid-template-rows:auto 1fr auto;background:var(--card,#fff);color:var(--text,#172033);border:1px solid var(--line,#d9e1ef);border-radius:18px;box-shadow:0 18px 60px #0b173744;overflow:hidden}
  #at-ai-panel.open{display:grid}
  .at-ai-head{padding:13px 15px;background:#151c36;color:white;display:flex;align-items:center;justify-content:space-between;gap:10px}
  .at-ai-head strong{display:block}.at-ai-head small{color:#c8d3f4}
  .at-ai-head button{border:0;background:#ffffff20;color:white;border-radius:9px;padding:7px 10px;cursor:pointer}
  #at-ai-log{padding:13px;overflow:auto;display:flex;flex-direction:column;gap:10px;background:var(--bg,#f5f7fc)}
  .at-ai-msg{max-width:92%;padding:10px 12px;border-radius:13px;font-size:13px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}
  .at-ai-msg.bot{align-self:flex-start;background:var(--card,#fff);border:1px solid var(--line,#dce3ef)}
  .at-ai-msg.user{align-self:flex-end;background:#e8edff;color:#172554}
  .at-ai-meta{font-size:10px;color:var(--muted,#69758b);margin-top:4px}
  .at-ai-composer{padding:11px;border-top:1px solid var(--line,#dce3ef);display:grid;grid-template-columns:1fr auto;gap:8px;background:var(--card,#fff)}
  #at-ai-input{width:100%;min-height:44px;max-height:110px;resize:vertical;border:1px solid var(--line,#cbd5e1);border-radius:11px;padding:10px;font:inherit;font-size:13px;background:var(--bg,#fff);color:inherit}
  #at-ai-send{border:0;border-radius:11px;padding:0 14px;background:#4658d8;color:white;font-weight:800;cursor:pointer}
  .at-ai-shortcuts{display:flex;gap:6px;overflow:auto;padding:8px 11px;background:var(--card,#fff);border-top:1px solid var(--line,#e2e8f0)}
  .at-ai-shortcuts button{white-space:nowrap;border:1px solid var(--line,#dce3ef);border-radius:20px;padding:6px 9px;background:transparent;color:inherit;font-size:11px}
  @media(max-width:600px){#at-ai-launch{right:12px;bottom:12px}#at-ai-panel{right:8px;bottom:68px;width:calc(100vw - 16px);height:min(72dvh,620px)}}
  `;
  const css=document.createElement('style');css.textContent=style;document.head.appendChild(css);
  const panel=document.createElement('section');panel.id='at-ai-panel';panel.setAttribute('aria-label','Assistant intelligent Anime Trend');
  panel.innerHTML='<header class="at-ai-head"><div><strong>✦ ANIME TREND AI</strong><small>Assistant hybride · tous les modules</small></div><button type="button" id="at-ai-close" aria-label="Fermer">✕</button></header><div id="at-ai-log" aria-live="polite"><div class="at-ai-msg bot">Bonjour ! Je suis ton assistant de studio. Décris ce que tu veux préparer : actualité, rédaction, visuel, vidéo, médiathèque, calendrier ou diagnostic. Je peux utiliser le moteur local ou le Worker IA configuré.</div></div><div><div class="at-ai-shortcuts"><button data-prompt="Analyse les actualités disponibles et propose les sujets prioritaires.">Radar</button><button data-prompt="Prépare une publication Facebook à partir du sujet sélectionné.">Rédiger</button><button data-prompt="Aide-moi à préparer les visuels de la publication.">Visuels</button><button data-prompt="Fais un contrôle qualité de mon contenu actuel.">Contrôle</button></div><form class="at-ai-composer" id="at-ai-form"><textarea id="at-ai-input" rows="2" placeholder="Écris une instruction…"></textarea><button id="at-ai-send" type="submit">Envoyer</button></form></div>';
  document.body.appendChild(panel);
  const launch=document.createElement('button');launch.id='at-ai-launch';launch.type='button';launch.textContent='✦ Assistant IA';document.body.appendChild(launch);
  const log=$('#at-ai-log'),input=$('#at-ai-input'),form=$('#at-ai-form');
  function add(text,who='bot',meta=''){const el=document.createElement('div');el.className='at-ai-msg '+who;el.textContent=text;if(meta){const m=document.createElement('div');m.className='at-ai-meta';m.textContent=meta;el.appendChild(m)}log.appendChild(el);log.scrollTop=log.scrollHeight;return el}
  function currentContext(){
    const page=$('.page.active');const title=$('#title')?.textContent||page?.querySelector('h2')?.textContent||'Studio';
    const stored=read('animeTrendStudio.v2',{});const news=Array.isArray(stored.news)?stored.news:[];const headlines=news.slice(0,12).map(n=>({title:n.title,url:n.url,source:n.source}));
    const topic=$('#postTopic')?.value||$('#pipelineTopic')?.value||'';
    const draft=$('#postResult')?.value||$('#pipelineWritingText')?.value||'';
    return {module:title,headlines,topic,draft:draft.slice(0,5000),history:memory.slice(-6)};
  }
  function localAnswer(message,ctx){
    const m=message.toLowerCase();
    const routes=[['radar|actualité|actualités|source','radar'],['rédig|publication|post|texte|commentaire','visual'],['visuel|image|vidéo|capture|médiathèque','visual'],['calendrier|planning','calendar'],['github|workflow|erreur|diagnostic','automation'],['réglage|paramètre|sauvegarde','settings'],['publication.*suivi|contenus enregistrés','publications']];
    const hit=routes.find(([re])=>new RegExp(re,'i').test(m));
    if(hit){const target=hit[1];const nav=document.querySelector('[data-page="'+target+'"]');if(nav)nav.click();else{const go=document.querySelector('[data-go="'+target+'"]');if(go)go.click()}}
    if(/analyse|résume|priorit|tendance/.test(m)&&ctx.headlines.length){
      return 'Analyse locale du radar ('+ctx.headlines.length+' titres disponibles) :\n'+ctx.headlines.slice(0,5).map((n,i)=>(i+1)+'. '+(n.title||'Titre indisponible')+(n.source?' — '+n.source:'')).join('\n')+'\n\nOuvre les sources originales pour vérifier les faits avant publication. Le moteur local ne lit pas automatiquement le contenu intégral des articles.';
    }
    if(/rédig|publication|écris|compose|post/.test(m)){
      const subject=ctx.topic||ctx.headlines[0]?.title||'actualité manga ou anime à préciser';
      const text='✨ '+subject+'\n\nUn nouveau sujet mérite notre attention dans l’univers manga et anime. Prenons le temps de distinguer les informations confirmées des rumeurs et de consulter la source originale avant de partager.\n\nEt vous, qu’en pensez-vous ? Dites-le-nous en commentaire !\n\n#Manga #Anime #ActualitésAnime';
      const field=$('#postResult');if(field){field.value=text;field.dispatchEvent(new Event('input',{bubbles:true}))}
      return 'Voici un brouillon local à vérifier et personnaliser :\n\n'+text+'\n\nCe brouillon est volontairement prudent : ajoute une source vérifiée et les faits précis pour obtenir une publication informative.';
    }
    if(/contrôle|qualité|corrig|vérifi/.test(m)){
      const draft=ctx.draft;
      if(!draft)return 'Je ne trouve pas de texte dans le champ de rédaction actuel. Ouvre le Studio complet, ajoute ton brouillon, puis demande-moi de le contrôler.';
      const checks=['Présence d’un sujet clair : '+(draft.length>40?'oui':'à renforcer'),'Question communautaire : '+(/[?]/.test(draft)?'présente':'à ajouter'),'Hashtags : '+(/#\w+/.test(draft)?'présents':'facultatifs, à ajouter si pertinents'),'Sources : '+(ctx.headlines.length?'titres du radar disponibles, vérifier les sources originales':'aucune source radar détectée')];
      return 'Contrôle local préliminaire :\n• '+checks.join('\n• ')+'\n\nCe contrôle ne confirme pas l’exactitude factuelle. Vérifie noms, dates, chiffres et droits des visuels.';
    }
    return 'Je peux déjà agir localement : ouvrir le bon module, analyser les titres chargés, préparer un brouillon prudent et effectuer un contrôle de structure. Pour une rédaction plus riche, configure l’adresse du Worker dans Réglages. Sans Worker, je ne prétends pas effectuer une génération par modèle IA.';
  }
  async function ask(message){
    add(message,'user');input.value='';const ctx=currentContext();const wait=add('Je traite ta demande…','bot');
    const stored=read('animeTrendStudio.v2',{});const worker=(stored.settings||{}).workerUrl||$('#workerUrl')?.value||'';
    try{
      if(worker){
        const response=await fetch(worker.replace(/\/$/,'')+'/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,context:ctx,language:'fr'})});
        const data=await response.json();if(!response.ok||!data.success)throw new Error(data.error||'Service IA indisponible');
        wait.textContent=data.answer||data.article||'Réponse vide';const meta='IA : '+(data.provider||'connectée')+(data.fallback?' · basculement effectué':'');const m=document.createElement('div');m.className='at-ai-meta';m.textContent=meta;wait.appendChild(m);
      }else{wait.textContent=localAnswer(message,ctx);const m=document.createElement('div');m.className='at-ai-meta';m.textContent='Mode local · configure le Worker pour activer les modèles IA';wait.appendChild(m)}
    }catch(error){wait.textContent=localAnswer(message,ctx)+'\n\nConnexion IA : '+String(error.message||error)+'. Le mode local reste disponible.'}
    memory.push({at:new Date().toISOString(),message,answer:wait.textContent.slice(0,1200)});while(memory.length>30)memory.shift();write(KEY,memory);
  }
  launch.addEventListener('click',()=>{panel.classList.toggle('open');if(panel.classList.contains('open'))input.focus()});
  $('#at-ai-close').addEventListener('click',()=>panel.classList.remove('open'));
  form.addEventListener('submit',e=>{e.preventDefault();const v=input.value.trim();if(v)ask(v)});
  panel.querySelectorAll('[data-prompt]').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.prompt;input.focus()}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')panel.classList.remove('open')});
  window.AnimeTrendAssistant={open:()=>panel.classList.add('open'),ask};
})();
