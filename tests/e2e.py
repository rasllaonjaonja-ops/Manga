"""Tests navigateur V4 : parcours réellement présents dans l'interface actuelle.
Lancement : APP_URL=http://127.0.0.1:8790/index.html python tests/e2e.py
"""
import asyncio, os
from playwright.async_api import async_playwright

URL=os.environ.get("APP_URL","http://127.0.0.1:8790/index.html")
results=[]
def check(name, condition, detail=""):
    results.append((name,bool(condition)))
    print(("PASS " if condition else "FAIL ")+name+(" — "+str(detail) if detail and not condition else ""))

async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(args=["--no-sandbox"])
        ctx=await browser.new_context(viewport={"width":1366,"height":900},accept_downloads=True)
        page=await ctx.new_page()
        errors=[]; dialogs=[]
        page.on("pageerror",lambda e: errors.append(str(e)+" | stack: "+str(getattr(e, "stack", "non disponible"))))
        page.on("console",lambda m: errors.append(m.text) if m.type=="error" and "Failed to load resource" not in m.text else None)
        async def dialog_handler(d):
            dialogs.append((d.type,d.message))
            await d.accept()
        page.on("dialog",lambda d: asyncio.ensure_future(dialog_handler(d)))
        await page.goto(URL); await page.wait_for_timeout(350)
        check("chargement initial sans erreur JavaScript",not errors,errors[:3])

        # Les pages réellement disponibles dans la V4.
        page_ids=["home","create","visual","radar","publications","calendar","library","automation","settings","help"]
        for page_id in page_ids:
            await page.evaluate("(id)=>navigate(id)",page_id)
            visible=await page.locator("#p-"+page_id).evaluate("(e)=>getComputedStyle(e).display!=='none'")
            check("navigation "+page_id,visible)
        check("navigation sans erreur JavaScript",not errors,errors[:3]); errors.clear()

        # Création et contrôle de la rédaction.
        await page.evaluate("navigate('create')")
        await page.fill("#postTopic","Mashle : actualité de test")
        await page.click("#buildPost")
        generated=await page.input_value("#postResult")
        check("rédaction : génération de texte",len(generated)>80,generated[:100])
        await page.click("#savePost")
        await page.wait_for_timeout(150)
        created=await page.evaluate("db.posts.length>0")
        check("rédaction : enregistrement du brouillon",created)

        # Sauvegarde transactionnelle : le quota dépassé restaure exactement l'état précédent.
        rollback=await page.evaluate("""()=>{
          const before=JSON.stringify(db),original=Storage.prototype.setItem;
          Storage.prototype.setItem=function(){throw new Error('QuotaExceededError')};
          addPost('Doit être annulé','Brouillon','contenu test');
          const after=JSON.stringify(db),banner=(document.getElementById('issueText')||{}).textContent||'';
          Storage.prototype.setItem=original;document.getElementById('issueBanner')?.remove();
          return {same:before===after,banner}
        }""")
        check("quota plein : retour exact à l'état sauvegardé",rollback["same"])
        check("quota plein : message explicite","stockage" in rollback["banner"].lower(),rollback["banner"])
        errors.clear()

        # Transfert d'une actualité vérifiée : la source doit rester attachée au brouillon.
        await page.evaluate("navigate('visual')")
        await page.evaluate("""()=>{
          db.news.unshift({id:'news-e2e',title:'Annonce officielle Mashle',source:'MyAnimeList',url:'https://myanimelist.net/news/test',publishedAt:null,summary:'Résumé de test',savedAt:new Date().toISOString(),verified:false,trendArticles:[{title:'Annonce officielle Mashle',source:'MyAnimeList',url:'https://myanimelist.net/news/test',summary:'Résumé vérifié de test',summaryTruncated:false},{title:'Mashle coverage',source:'Anime News Network',url:'https://www.animenewsnetwork.com/news/test',summary:'Secondaire extrait',summaryTruncated:true}]});
          renderSavedNews()
        }""")
        await page.locator('#savedNewsList [data-saved="verify"][data-id="news-e2e"]').click()
        await page.locator('#savedNewsList [data-saved="draft"][data-id="news-e2e"]').click()
        transferred=await page.evaluate("""()=>{
          const p=db.posts.find(x=>x.sourceUrl==='https://myanimelist.net/news/test');
          return !!p&&p.sourceName==='MyAnimeList'&&p.workflowStage==='redaction'
        }""")
        check("actualité vérifiée : transfert avec source originale conservée",transferred)

        dedupe_result=await page.evaluate("""()=>{
          const before=db.news.filter(n=>n.title==='Annonce officielle Mashle').length;
          const merged=saveNewsItem({title:'Annonce officielle Mashle',source:'Anime Herald',url:'https://animeherald.com/news/test?utm_source=radar',summary:'Troisième source indépendante'},true);
          const matches=db.news.filter(n=>n.title==='Annonce officielle Mashle');
          const urls=matches[0]?.trendArticles?.map(a=>a.url)||[];
          return {before,after:matches.length,merged,sourceCount:urls.length,hasNew:urls.some(u=>u.includes('animeherald.com'))};
        }""")
        check("radar : doublon de titre fusionné sans créer une seconde actualité",dedupe_result["before"]==1 and dedupe_result["after"]==1 and dedupe_result["hasNew"],dedupe_result)

        prompt_preview=await page.evaluate("""()=>{
          const p=db.posts.find(x=>x.sourceUrl==='https://myanimelist.net/news/test');
          loadArtPostById(p.id);
          const prompt=document.getElementById('artWritingPrompt').value;
          const links=[...document.querySelectorAll('#fbPreviewSources a')].map(a=>({text:a.textContent,href:a.href}));
          return {hasTitle:prompt.includes('Annonce officielle Mashle'),hasRules:prompt.includes('N’invente aucun nom'),hasTruncated:prompt.includes('EXTRAIT SIGNALÉ COMME COUPÉ : OUI'),links,buttons:['copyWritingPrompt','openWritingChatGPT','openWritingGemini','openWritingClaude'].every(id=>!!document.getElementById(id))};
        }""")
        check("prompt IA : contexte, garde-fous et extraits sources intégrés",prompt_preview["hasTitle"] and prompt_preview["hasRules"] and prompt_preview["hasTruncated"],prompt_preview)
        required_sources={"MyAnimeList","Anime News Network"}
        displayed_sources={x["text"].strip().replace("↗", "").strip() for x in prompt_preview["links"]}
        links_are_clickable=all(x["href"].startswith("https://") for x in prompt_preview["links"])
        check("aperçu Facebook : sources affichées en liens cliquables",len(prompt_preview["links"])>=2 and required_sources.issubset(displayed_sources) and links_are_clickable,prompt_preview["links"])
        check("prompt IA : commandes copier et ouvrir ChatGPT, Gemini, Claude",prompt_preview["buttons"])
        await page.fill("#artCaption","Texte final corrigé pour le test.")
        live_prompt=await page.input_value("#artWritingPrompt")
        check("prompt IA : synchronisation avec les corrections du texte", "Texte final corrigé pour le test." in live_prompt)

        # Progression de workflow et persistance après rechargement.
        pid=await page.evaluate("db.posts.find(x=>x.sourceUrl==='https://myanimelist.net/news/test').id")
        await page.evaluate("(id)=>advanceWorkflow(id)",pid)
        stage1=await page.evaluate("(id)=>db.posts.find(x=>x.id===id).workflowStage",pid)
        await page.evaluate("(id)=>advanceWorkflow(id)",pid)
        stage2=await page.evaluate("(id)=>db.posts.find(x=>x.id===id).workflowStage",pid)
        await page.evaluate("(id)=>advanceWorkflow(id)",pid)
        stage3=await page.evaluate("(id)=>db.posts.find(x=>x.id===id).workflowStage",pid)
        status=await page.evaluate("(id)=>db.posts.find(x=>x.id===id).status",pid)
        await page.reload(); await page.wait_for_timeout(250)
        restored=await page.evaluate("(id)=>{const p=db.posts.find(x=>x.id===id);return p&&p.workflowStage==='pret'&&p.status==='Prêt'}",pid)
        check("workflow : étapes rédaction → visuel → projet → prête",stage1=="visuel" and stage2=="projet" and stage3=="pret" and status=="Prêt")
        check("workflow : étape et statut conservés après rechargement",bool(restored))

        # Les quatre emplacements du jour et la liste générale ne doivent pas dupliquer les posts.
        await page.evaluate("navigate('publications')")
        counts=await page.evaluate("({all:db.posts.length,project:document.querySelectorAll('#projectPosts .publication-entry').length,published:document.querySelectorAll('#publishedPosts .publication-entry').length})")
        check("publications : listes projet/publiées cohérentes",counts["project"]+counts["published"]==counts["all"],counts)

        # Les brouillons quotidiens doivent survivre à un rechargement et rester modifiables.
        await page.evaluate("""()=>{
          db.posts.unshift({id:'daily-restore-e2e',title:'Brouillon quotidien restauré',type:'Actualité vérifiée',text:'Texte initial',status:'Brouillon',created:new Date().toISOString(),dailyDate:dayKey(new Date()),dailySlot:1,sourceUrl:'https://example.com/anime-news',sourceName:'Source test',workflowStage:'redaction',visualExports:[],visualMediaId:''});
          save()
        }""")
        await page.reload(); await page.wait_for_timeout(200)
        restored_daily=await page.evaluate("""()=>({count:dailyPack.length,id:dailyPack[0]?.postId,text:document.querySelector('#dailyText0')?.value||''})""")
        check("brouillons du jour : restauration après rechargement",restored_daily["id"]=="daily-restore-e2e" and restored_daily["text"]=="Texte initial",restored_daily)
        await page.evaluate("navigate('visual')")
        await page.locator("#dailyText0").wait_for(state="visible")
        await page.fill("#dailyText0","Texte modifié durablement")
        await page.reload(); await page.wait_for_timeout(150)
        await page.evaluate("navigate('publications')")
        edited_daily=await page.evaluate("db.posts.find(x=>x.id==='daily-restore-e2e')?.text")
        check("brouillons du jour : édition conservée après rechargement",edited_daily=="Texte modifié durablement",edited_daily)

        # Réglages : un échec de sauvegarde ne doit ni conserver la modification ni afficher un succès.
        await page.evaluate("navigate('settings')")
        settings_result=await page.evaluate("""()=>{
          const before=JSON.stringify(db.settings),original=Storage.prototype.setItem;
          Storage.prototype.setItem=function(){throw new Error('QuotaExceededError')};
          document.getElementById('pageName').value='Modification non persistée';
          document.getElementById('saveSettings').click();
          const after=JSON.stringify(db.settings);
          Storage.prototype.setItem=original;
          document.getElementById('pageName').value=db.settings.pageName;
          document.getElementById('issueBanner')?.remove();
          return {same:before===after}
        }""")
        check("réglages : rollback si stockage plein",settings_result["same"])
        check("réglages : aucun faux succès",not any("Réglages enregistrés" in msg for _,msg in dialogs))
        errors.clear()  # échec de quota volontaire, déjà contrôlé ci-dessus

        # Calendrier et dates.
        await page.evaluate("navigate('calendar')")
        await page.fill("#calTitle","Échéance E2E")
        await page.fill("#calDate","2026-12-01")
        await page.click("#addCal"); await page.wait_for_timeout(100)
        cal_count=await page.evaluate("db.calendar.filter(x=>x.title==='Échéance E2E').length")
        check("calendrier : création d'une échéance",cal_count==1)
        check("dates : jour impossible rejeté",await page.evaluate("validDay('2026-02-31')===false"))
        check("dates : année bissextile acceptée",await page.evaluate("validDay('2028-02-29')===true"))

        # Autodiagnostic de l'interface actuelle.
        await page.evaluate("navigate('settings')")
        await page.click("#runSelfTest")
        report=await page.inner_text("#selfTestResult")
        check("autodiagnostic : aucune référence DOM manquante","Éléments manquants" not in report,report)
        check("autodiagnostic : échappement HTML vérifié","Échappement HTML vérifié" in report)
        check("aucune erreur JavaScript inattendue",not errors,errors[:5])

        await browser.close()
    passed=sum(1 for _,ok in results if ok)
    print(f"\\n{passed}/{len(results)} vérifications réussies")
    if passed!=len(results):
        raise SystemExit(1)

asyncio.run(main())
