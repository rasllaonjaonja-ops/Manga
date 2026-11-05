"""Tests de bout en bout de l'application (navigateur réel).

Prérequis (hors dépôt, à lancer une fois) :
  pip install playwright && python -m playwright install chromium
Lancement :
  python -m http.server 8790        # à la racine du projet, dans un autre terminal
  APP_URL=http://localhost:8790/index.html python tests/e2e.py
Le script vérifie les parcours utilisateur : pages, boutons, textes générés, statuts,
sauvegarde annulée si le stockage est plein, import hostile, visuels, PNG, autodiagnostic.
"""
import asyncio, pathlib, json, base64
from playwright.async_api import async_playwright
import os
URL=os.environ.get('APP_URL','http://localhost:8790/index.html')
PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
results=[]
def check(name,cond,extra=''):
    results.append((name,bool(cond)))
    print(('PASS ' if cond else 'FAIL ')+name+(' — '+str(extra) if extra and not cond else ''))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-sandbox'])
        ctx=await b.new_context(viewport={'width':1366,'height':900},accept_downloads=True)
        pg=await ctx.new_page()
        errs=[]; dialogs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.on('console',lambda m: errs.append('console:'+m.text) if m.type=='error' and 'Failed to load resource' not in m.text else None)
        mode={'confirm':True}
        async def on_dialog(d):
            dialogs.append((d.type,d.message))
            if d.type=='confirm' and not mode['confirm']: await d.dismiss()
            else: await d.accept()
        pg.on('dialog',lambda d: asyncio.ensure_future(on_dialog(d)))
        await pg.goto(URL); await pg.wait_for_timeout(400)
        check('chargement sans erreur', not errs, errs)

        # 1. Toutes les pages et tous les boutons visibles
        pages=['writer','campaign','reels','quiz','radar','queue','calendar','visual','library','quality','automation','settings','help','about']
        for pgid in pages:
            await pg.evaluate(f"navigate('{pgid}')"); await pg.wait_for_timeout(120)
            btns=await pg.evaluate(f"""()=>[...document.querySelectorAll('#p-{pgid} button')].filter(b=>b.offsetParent!==null&&!/Vider|Importer|Remplacer|Effacer|resetData/i.test(b.textContent)).length""")
            for i in range(btns):
                await pg.evaluate(f"""()=>{{const bs=[...document.querySelectorAll('#p-{pgid} button')].filter(b=>b.offsetParent!==null&&!/Vider|Importer|Effacer/i.test(b.textContent));const b=bs[{i}];if(b)b.click()}}""")
                await pg.wait_for_timeout(60)
        check('toutes les pages et boutons sans erreur JS', not errs, errs[:5])
        errs.clear()

        # 2. Préparer un post depuis une actualité (bug : onclick cassé)
        await pg.evaluate("navigate('radar')"); await pg.wait_for_timeout(500)
        await pg.evaluate("newsItems=[{title:'Titre \"piégé\" <b>x</b>',source:'MyAnimeList',url:'https://x.test/a',summary:'résumé',publishedAt:null}];renderNews()")
        await pg.click('#newsList button[data-news]')
        topic=await pg.input_value('#postTopic')
        check('Préparer un post remplit le sujet', topic.startswith('Titre "piégé"'), topic)
        check('Préparer un post sans erreur', not errs, errs)
        errs.clear()

        # 3. Texte généré et contrôle qualité : pas de \n littéraux
        await pg.evaluate("navigate('writer');document.getElementById('postTopic').value='Test';document.getElementById('postType').value='Citation / réflexion';composePost()")
        t=await pg.input_value('#postResult')
        check('texte généré sans \\n littéraux', '\\' not in t, repr(t[:80]))
        await pg.evaluate("navigate('quality');document.getElementById('qualityText').value='urgent!!! officiel';document.getElementById('runQuality').click()")
        q=await pg.inner_text('#qualityResult')
        check('contrôle qualité sans \\n littéraux', '\\' not in q)

        # 4. Enregistrer une publication une seule fois (double alerte + doublon)
        await pg.evaluate("navigate('writer')")
        before=await pg.evaluate("db.posts.length")
        await pg.evaluate("document.getElementById('savePost').click();document.getElementById('savePost').click()")
        await pg.wait_for_timeout(2600)
        after=await pg.evaluate("db.posts.length")
        check('un seul enregistrement par clic double', after-before==1, (before,after))

        # 5. Sauvegarde transactionnelle : stockage plein => rollback
        before=await pg.evaluate("JSON.stringify(db)")
        await pg.evaluate("(()=>{window.__origSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new Error('QuotaExceededError')};return 1})()")
        await pg.evaluate("addPost('Doit être annulé','Brouillon','x')")
        after=await pg.evaluate("JSON.stringify(db)")
        banner=await pg.evaluate("(document.getElementById('issueText')||{}).textContent||''")
        check('stockage plein : état annulé', before==after)
        check('stockage plein : message clair', 'stockage' in banner.lower(), banner)
        errs.clear()  # erreur console volontaire pendant la simulation
        await pg.evaluate("(()=>{Storage.prototype.setItem=window.__origSet;return 1})()")
        await pg.evaluate("document.getElementById('issueBanner')&&document.getElementById('issueBanner').remove()")

        # 6. Statuts : « Publié manuellement » exige une confirmation ; les autres étapes non
        mode['confirm']=False
        await pg.evaluate("navigate('queue')")
        pid=await pg.evaluate("db.posts[0].id")
        await pg.evaluate(f"db.posts.find(p=>p.id==='{pid}').status='Prêt';renderQueue()")
        await pg.click(f'#queueList button[data-act="status"][data-id="{pid}"]')
        st=await pg.evaluate(f"db.posts.find(p=>p.id==='{pid}').status")
        check('statut : refus de la confirmation sans changement', st=='Prêt', st)
        mode['confirm']=True
        await pg.click(f'#queueList button[data-act="status"][data-id="{pid}"]')
        st=await pg.evaluate(f"db.posts.find(p=>p.id==='{pid}').status")
        check('statut : publication manuelle confirmée', st=='Publié manuellement', st)

        # 7. Sauvegarde corrompue : aucune injection, données invalides écartées
        evil={'posts':[{'id':'1','title':'ok','status':'Hack'}],'media':[{'id':'m','name':'x','data':'" onerror="alert(1)'}],'calendar':[{'id':'c','title':'t','date':'pas-une-date'}]}
        open('/tmp/evil.json','w').write(json.dumps(evil))
        await pg.evaluate("navigate('settings')")
        await pg.set_input_files('#importBackup','/tmp/evil.json'); await pg.wait_for_timeout(400)
        st=await pg.evaluate("db.posts[0].status"); media=await pg.evaluate("db.media.length"); cal=await pg.evaluate("db.calendar.length")
        check('import : statut invalide corrigé', st=='Brouillon', st)
        check('import : visuel hostile rejeté', media==0, media)
        check('import : date invalide rejetée', cal==0, cal)
        open('/tmp/bad.json','w').write('{pas du json')
        await pg.set_input_files('#importBackup','/tmp/bad.json'); await pg.wait_for_timeout(300)
        check('import : JSON cassé refusé sans erreur', not errs, errs)

        # 8. Visuel importé : compressé et rendu échappé
        open('/tmp/pix.png','wb').write(PNG)
        await pg.evaluate("navigate('library')")
        await pg.set_input_files('#mediaFiles','/tmp/pix.png'); await pg.wait_for_timeout(700)
        src=await pg.evaluate("db.media.length?db.media[0].data.slice(0,22):''")
        check('visuel compressé en JPEG', src.startswith('data:image/jpeg'), src)
        check('visuel affiché dans la médiathèque', await pg.evaluate("document.querySelectorAll('#mediaGrid img').length")==1)

        # 9. Calendrier : ajout et suppression sans erreur
        await pg.evaluate("navigate('calendar');calView='list';renderCalendar()")
        await pg.fill('#calTitle','Test échéance'); await pg.fill('#calDate','2026-12-01')
        await pg.click('#addCal'); await pg.wait_for_timeout(150)
        n=await pg.evaluate("db.calendar.length")
        await pg.click('#calList button[data-cal-act="remove"]'); await pg.wait_for_timeout(150)
        check('calendrier : ajout puis suppression', n==1 and await pg.evaluate("db.calendar.length")==0)

        # 10. Dates calendaires réelles et impossibles
        check('calendrier : date impossible refusée', await pg.evaluate("validDay('2026-02-31')===false"))
        check('calendrier : année bissextile acceptée', await pg.evaluate("validDay('2028-02-29')===true"))

        # 11. Réglages : taille de police et densité réversibles
        await pg.evaluate("navigate('settings');document.getElementById('fontSize').value='16';document.getElementById('density').value='compact';document.getElementById('saveSettings').click()")
        await pg.wait_for_timeout(100)
        compact=await pg.evaluate("({font:getComputedStyle(document.documentElement).fontSize,radius:getComputedStyle(document.documentElement).getPropertyValue('--radius').trim()})")
        check('réglages : police grande appliquée', compact['font']=='16px', compact)
        check('réglages : densité compacte appliquée', compact['radius']=='10px', compact)
        await pg.evaluate("document.getElementById('fontSize').value='14';document.getElementById('density').value='comfortable';document.getElementById('saveSettings').click()")
        await pg.wait_for_timeout(100)
        normal=await pg.evaluate("({font:getComputedStyle(document.documentElement).fontSize,radius:getComputedStyle(document.documentElement).getPropertyValue('--radius').trim()})")
        check('réglages : retour au confort réinitialise les styles', normal['font']=='14px' and normal['radius']=='14px', normal)

        # 12. Une sauvegarde refusée ne doit pas afficher un faux succès
        before=await pg.evaluate("JSON.stringify(db.settings)")
        dialog_count=len(dialogs)
        await pg.evaluate("window.__settingsSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new Error('QuotaExceededError')};document.getElementById('pageName').value='Ne doit pas être enregistré';document.getElementById('saveSettings').click()")
        await pg.wait_for_timeout(100)
        after=await pg.evaluate("JSON.stringify(db.settings)")
        false_success=any('Réglages enregistrés' in msg for typ,msg in dialogs[dialog_count:])
        check('réglages : échec de stockage annulé', before==after, (before,after))
        check('réglages : aucun faux message de succès', not false_success)
        await pg.evaluate("Storage.prototype.setItem=window.__settingsSet;document.getElementById('pageName').value=db.settings.pageName")
        errs.clear()  # l'erreur console est volontaire pendant le test du quota
        await pg.evaluate("document.getElementById('issueBanner')&&document.getElementById('issueBanner').remove()")

        # 10. Export PNG : long texte signalé, court texte non tronqué
        r=await pg.evaluate("downloadPostCapture('Court','Débat communautaire','Un texte court.').then(r=>r)")
        check('PNG texte court non tronqué', r['truncated'] is False, r)
        r=await pg.evaluate("downloadPostCapture('Long','Débat communautaire',Array(900).fill('Ligne de texte assez longue pour boucler plusieurs fois.').join('\\n')).then(r=>r)")
        check('PNG texte très long : signalé', r['truncated'] is True, r)

        # 11. Autodiagnostic
        await pg.evaluate("navigate('settings')"); await pg.click('#runSelfTest')
        out=await pg.inner_text('#selfTestResult')
        check('autodiagnostic : aucun élément manquant', 'manquants' not in out, out)
        check('autodiagnostic : échappement vérifié', 'Échappement HTML vérifié' in out)

        # 12. Stockage corrompu au démarrage
        await pg.evaluate(f"localStorage.setItem('{'animeTrendStudio.v2'}','{{pas valide')")
        await pg.reload(); await pg.wait_for_timeout(400)
        check('démarrage avec stockage corrompu : pas de crash', await pg.evaluate("Array.isArray(db.posts)"))
        check('démarrage corrompu : copie de sauvegarde conservée', await pg.evaluate("!!localStorage.getItem('animeTrendStudio.v2.corrupt')"))
        check('démarrage corrompu : aucune erreur JS', not errs, errs[:3])

        await b.close()
    ok=sum(1 for _,c in results if c); print(f'\n{ok}/{len(results)} vérifications réussies')
asyncio.run(main())
