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
        page.on("pageerror",lambda e: errors.append(str(e)))
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
        check("rédaction : génération de texte",len(generated)>80 and "Mashle" in generated,generated[:100])
        await page.click("#savePost")
        await page.wait_for_timeout(150)
        created=await page.evaluate("db.posts.length>0")
        check("rédaction : enregistrement du brouillon",created)

        # Sauvegarde transactionnelle : le quota dépassé restaure exactement l'état précédent.
        before=await page.evaluate("JSON.stringify(db)")
        await page.evaluate("window.__origSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new Error('QuotaExceededError')}")
        await page.evaluate("addPost('Doit être annulé','Brouillon','contenu test')")
        after=await page.evaluate("JSON.stringify(db)")
        banner=await page.evaluate("(document.getElementById('issueText')||{}).textContent||''")
        check("quota plein : retour exact à l'état sauvegardé",before==after,(before[:120],after[:120]))
        check("quota plein : message explicite","stockage" in banner.lower(),banner)
        await page.evaluate("Storage.prototype.setItem=window.__origSet;document.getElementById('issueBanner')?.remove()")
        errors.clear()

        # Transfert d'une actualité vérifiée : la source doit rester attachée au brouillon.
        await page.evaluate("""()=>{
          db.news.unshift({id:'news-e2e',title:'Annonce officielle Mashle',source:'MyAnimeList',url:'https://myanimelist.net/news/test',publishedAt:null,summary:'Résumé de test',savedAt:new Date().toISOString(),verified:false});
          renderSavedNews()
        }""")
        await page.locator('#savedNewsList [data-saved="verify"][data-id="news-e2e"]').click()
        await page.locator('#savedNewsList [data-saved="draft"][data-id="news-e2e"]').click()
        transferred=await page.evaluate("""()=>{
          const p=db.posts.find(x=>x.sourceUrl==='https://myanimelist.net/news/test');
          return !!p&&p.sourceName==='MyAnimeList'&&p.workflowStage==='redaction'
        }""")
        check("actualité vérifiée : transfert avec source originale conservée",transferred)

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

        # Réglages : un échec de sauvegarde ne doit ni conserver la modification ni afficher un succès.
        await page.evaluate("navigate('settings')")
        before_settings=await page.evaluate("JSON.stringify(db.settings)")
        dialog_start=len(dialogs)
        await page.evaluate("""()=>{
          window.__settingsSet=Storage.prototype.setItem;
          Storage.prototype.setItem=function(){throw new Error('QuotaExceededError')};
          document.getElementById('pageName').value='Modification non persistée';
          document.getElementById('saveSettings').click()
        }""")
        await page.wait_for_timeout(100)
        after_settings=await page.evaluate("JSON.stringify(db.settings)")
        false_success=any("Réglages enregistrés" in msg for _,msg in dialogs[dialog_start:])
        check("réglages : rollback si stockage plein",before_settings==after_settings)
        check("réglages : aucun faux succès",not false_success)
        await page.evaluate("Storage.prototype.setItem=window.__settingsSet;document.getElementById('pageName').value=db.settings.pageName;document.getElementById('issueBanner')?.remove()")

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
