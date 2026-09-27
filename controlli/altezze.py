#!/usr/bin/env python3
"""Altezza di ogni scheda a 390x844, misurata in un browser vero (skill webapp-testing).

Serve Playwright per Python (pip install playwright) e un server sul sito:

    python3 .claude/skills/webapp-testing/scripts/with_server.py \\
      --server "exec python3 -m http.server 8766 >/dev/null 2>&1" --port 8766 -- python3 controlli/altezze.py

Stampa ✅/❌ per ogni scheda: la Home deve stare in una schermata, le altre
in una schermata e mezza (barra delle schede compresa). Esce 0 se va tutto bene.
"""
import os
import sys
from playwright.sync_api import sync_playwright

URL = os.environ.get("SITO", "http://localhost:8766/")
LARGO, ALTO = 390, 844
LIMITI = {"home": 1.0, "servizi": 1.5, "mezzi": 1.5, "preventivo": 1.5, "contatti": 1.5}
CHROMIUM = os.environ.get("CHROMIUM") or next(
    (p for p in ("/opt/pw-browsers/chromium-1194/chrome-linux/chrome",) if os.path.exists(p)), None)

MISURA = """id => {
  const s = document.getElementById(id), d = s.querySelector('.dentro'), cs = getComputedStyle(s);
  // l'altezza vera del contenuto, non quella della finestra che lo contiene
  const contenuto = d.offsetHeight + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  return { contenuto: Math.round(contenuto), barra: document.getElementById('barra').offsetHeight };
}"""

ok = True
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, **({"executable_path": CHROMIUM} if CHROMIUM else {}))
    ctx = b.new_context(viewport={"width": LARGO, "height": ALTO}, is_mobile=True, has_touch=True)
    for id, limite in LIMITI.items():
        pg = ctx.new_page()
        pg.goto(URL + "#" + id)
        pg.wait_for_load_state("networkidle")
        pg.evaluate("document.fonts.ready")
        m = pg.evaluate(MISURA, id)
        totale = m["contenuto"] + m["barra"]
        schermate = totale / ALTO
        bene = schermate <= limite + 1e-9
        ok &= bene
        print("%s %-11s %4d px di scheda + %d px di barra = %4d px  →  %.2f schermate (limite %.1f)"
              % ("✅" if bene else "❌", id, m["contenuto"], m["barra"], totale, schermate, limite))
        pg.close()
    b.close()
sys.exit(0 if ok else 1)
