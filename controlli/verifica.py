#!/usr/bin/env python3
"""Verifica di accettazione del sito di Athena Trasporti.

Solo libreria standard. Si lancia dalla radice del repository (o da qualunque
cartella: la radice si ricava dalla posizione di questo file):

    python3 controlli/verifica.py

Stampa ✅/❌ per ogni punto ed esce con 0 solo se tutti i punti passano.
"""

import json
import os
import re
import sys
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote

RADICE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGINA = os.path.join(RADICE, "index.html")

TELEFONO = "tel:+393775947995"
WHATSAPP = "wa.me/393775947995"
MAIL = "mailto:jja.athenatrasporti@gmail.com"
PIVA = "09546240962"
# la pagina di JJA-VIS, chiesta da DATI.md nel piè di pagina: è un link normale
# (si apre solo se lo si tocca), non una risorsa caricata dalla pagina
JJAVIS = "https://jjoeboy93.github.io/JJA-VIS/"
PESO_MAX = 1.5 * 1024 * 1024

# Le parole vietate sono spezzate, così questo file non le contiene.
VIETATE = ["Via " + "Gro" + "ane", "Gro" + "ane"]
# Codice fiscale di persona fisica: 6 lettere, 2 cifre, lettera, 2 cifre, lettera, 3 cifre, lettera.
CODICE_FISCALE = re.compile(r"(?<![A-Za-z0-9])[A-Za-z]{6}\d{2}[A-Za-z]\d{2}[A-Za-z]\d{3}[A-Za-z](?![A-Za-z0-9])")
TESTI = {".html", ".htm", ".css", ".js", ".json", ".md", ".txt", ".py", ".xml", ".svg", ".yml", ".yaml", ""}


def esterno(url):
    """Vero se l'indirizzo punta a un altro dominio (http, https, //dominio)."""
    url = url.strip()
    return bool(re.match(r"^(?:[a-z][a-z0-9+.-]*:)?//", url, re.I))


def link_ammesso(url):
    u = url.strip()
    if u.startswith(("tel:", "mailto:", "#")) or not esterno(u) and ":" not in u.split("/")[0]:
        return True
    parti = urlsplit(u)
    if parti.scheme == "https" and parti.netloc == "wa.me":
        return True
    return u == JJAVIS


class Lettore(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tag = []            # (tag, attributi)
        self.jsonld = []
        self.stili = []
        self._in = None          # "jsonld" | "style"
        self._buf = []
        self.pila = []
        self.testo_piede = []

    def handle_starttag(self, tag, attrs):
        a = {k: (v or "") for k, v in attrs}
        self.tag.append((tag, a))
        if tag == "script" and a.get("type", "").lower() == "application/ld+json":
            self._in, self._buf = "jsonld", []
        elif tag == "style":
            self._in, self._buf = "style", []
        if tag not in ("meta", "link", "img", "source", "input", "br", "hr", "use", "path",
                       "circle", "rect", "ellipse", "line"):
            self.pila.append(tag)

    def handle_startendtag(self, tag, attrs):
        a = {k: (v or "") for k, v in attrs}
        self.tag.append((tag, a))

    def handle_endtag(self, tag):
        if self._in == "jsonld" and tag == "script":
            self.jsonld.append("".join(self._buf))
            self._in = None
        elif self._in == "style" and tag == "style":
            self.stili.append("".join(self._buf))
            self._in = None
        if tag in self.pila:
            while self.pila and self.pila.pop() != tag:
                pass

    def handle_data(self, data):
        if self._in:
            self._buf.append(data)
        if "footer" in self.pila:
            self.testo_piede.append(data)


def locale(rif, base):
    """Percorso sul disco di un riferimento locale (senza ? e #)."""
    rif = unquote(rif.split("#")[0].split("?")[0])
    if not rif:
        return None
    if rif.startswith("/"):
        return os.path.normpath(os.path.join(RADICE, rif.lstrip("/")))
    return os.path.normpath(os.path.join(base, rif))


def url_css(css):
    rif = re.findall(r"url\(\s*['\"]?([^'\")]+)['\"]?\s*\)", css)
    rif += re.findall(r"@import\s+['\"]([^'\"]+)['\"]", css)
    return [r for r in rif if not r.startswith("data:")]


def main():
    risultati = []

    def punto(ok, titolo, dettagli=()):
        risultati.append(ok)
        print(("✅ " if ok else "❌ ") + titolo)
        for d in dettagli:
            print("     · " + d)

    if not os.path.isfile(PAGINA):
        print("❌ index.html non trovato in " + RADICE)
        return 1
    with open(PAGINA, encoding="utf-8") as f:
        html = f.read()
    let = Lettore()
    let.feed(html)

    # Le risorse che la pagina carica: fogli di stile, script, font, immagini, icone.
    risorse = []              # (riferimento, cartella base)
    esterni = []
    for tag, a in let.tag:
        for attr in ("src", "poster", "data"):
            if a.get(attr):
                risorse.append((a[attr], RADICE))
        if a.get("srcset"):
            for pezzo in a["srcset"].split(","):
                if pezzo.strip():
                    risorse.append((pezzo.strip().split()[0], RADICE))
        if tag == "link" and a.get("href"):
            rel = a.get("rel", "").lower().split()
            if not set(rel) <= {"canonical", "alternate"}:
                risorse.append((a["href"], RADICE))
        if tag == "a" and a.get("href") and not link_ammesso(a["href"]):
            esterni.append("link non ammesso: " + a["href"])
        if tag == "form" and a.get("action") and not link_ammesso(a["action"]):
            esterni.append("modulo verso: " + a["action"])
        if a.get("style"):
            risorse += [(r, RADICE) for r in url_css(a["style"])]
        for attr in ("href", "xlink:href"):
            if tag == "use" and a.get(attr) and not a[attr].startswith("#"):
                risorse.append((a[attr], RADICE))
    for css in let.stili:
        risorse += [(r, RADICE) for r in url_css(css)]

    # Anche i fogli di stile locali possono caricare font e immagini.
    visti, file_caricati, mancanti = set(), [], []
    coda = list(risorse)
    while coda:
        rif, base = coda.pop(0)
        if esterno(rif):
            esterni.append("risorsa esterna: " + rif)
            continue
        if rif.startswith("data:"):
            continue
        percorso = locale(rif, base)
        if not percorso or percorso in visti:
            continue
        visti.add(percorso)
        if not os.path.isfile(percorso):
            mancanti.append(os.path.relpath(percorso, RADICE))
            continue
        file_caricati.append(percorso)
        if percorso.endswith(".css"):
            with open(percorso, encoding="utf-8") as f:
                coda += [(r, os.path.dirname(percorso)) for r in url_css(f.read())]

    # 1. Niente risorse da domini esterni
    punto(not esterni and not mancanti,
          "1. nessuna risorsa (stile, script, font, immagine) da domini esterni; link solo wa.me, tel:, mailto: (più la pagina di JJA-VIS chiesta da DATI.md)",
          esterni + ["file mancante: " + m for m in mancanti])

    # 2. P.IVA nel piè di pagina; niente via, parola vietata o codice fiscale in nessun file
    piede = " ".join(let.testo_piede)
    trovati = []
    for cartella, sotto, nomi in os.walk(RADICE):
        sotto[:] = [s for s in sotto if s != ".git"]
        for nome in nomi:
            p = os.path.join(cartella, nome)
            with open(p, "rb") as f:
                dati = f.read()
            rel = os.path.relpath(p, RADICE)
            for v in VIETATE:
                if v.lower().encode() in dati.lower():
                    trovati.append("«%s» in %s" % (v, rel))
            if os.path.splitext(nome)[1].lower() in TESTI:
                testo = dati.decode("utf-8", "replace")
                for m in CODICE_FISCALE.findall(testo):
                    trovati.append("possibile codice fiscale «%s» in %s" % (m, rel))
    punto(PIVA in piede and not trovati,
          "2. P.IVA %s nel piè di pagina; nessuna via, «Gro…ane» o codice fiscale in nessun file" % PIVA,
          ([] if PIVA in piede else ["P.IVA assente dal <footer>"]) + trovati)

    # 3. Contatti come link veri
    href = [a.get("href", "") for t, a in let.tag if t == "a"]
    manca = []
    if not any(h == TELEFONO for h in href):
        manca.append("manca un link " + TELEFONO)
    if not any(re.match(r"^https://" + re.escape(WHATSAPP) + r"(\?|$)", h) for h in href):
        manca.append("manca un link https://" + WHATSAPP)
    if not any(h.startswith(MAIL) for h in href):
        manca.append("manca un link " + MAIL)
    punto(not manca, "3. link tel:, wa.me e mailto: presenti", manca)

    # 4. alt su ogni immagine; JSON-LD valido con vatID
    senza_alt = [a.get("src", "?") for t, a in let.tag if t == "img" and not a.get("alt", "").strip()]
    problemi = ["<img> senza alt: " + s for s in senza_alt]
    if not let.jsonld:
        problemi.append("nessun blocco JSON-LD")
    for blocco in let.jsonld:
        try:
            dati = json.loads(blocco)
        except ValueError as e:
            problemi.append("JSON-LD non valido: %s" % e)
            continue
        elementi = dati if isinstance(dati, list) else dati.get("@graph", [dati])
        if not any(isinstance(el, dict) and el.get("vatID") for el in elementi):
            problemi.append("JSON-LD senza vatID")
    punto(not problemi, "4. ogni <img> ha un alt non vuoto; JSON-LD valido con vatID", problemi)

    # 5. prefers-reduced-motion
    css_tutti = "\n".join(let.stili)
    for p in file_caricati:
        if p.endswith(".css"):
            with open(p, encoding="utf-8") as f:
                css_tutti += f.read()
    punto(re.search(r"@media[^{]*prefers-reduced-motion\s*:\s*reduce", css_tutti) is not None,
          "5. c'è una regola @media (prefers-reduced-motion: reduce)")

    # 6. Peso totale: HTML + tutto ciò che carica (per prudenza si contano
    #    tutte le varianti di un'immagine, anche se il browser ne scarica una sola)
    peso = os.path.getsize(PAGINA) + sum(os.path.getsize(p) for p in file_caricati)
    elenco = ["%-38s %7.1f kB" % (os.path.relpath(p, RADICE), os.path.getsize(p) / 1024)
              for p in [PAGINA] + file_caricati]
    punto(peso < PESO_MAX,
          "6. peso totale della pagina %.0f kB (limite %.0f kB)" % (peso / 1024, PESO_MAX / 1024),
          elenco)

    ok = all(risultati)
    print("\n%s: superati %d controlli su %d." % ("Tutto a posto" if ok else "Qualcosa non va",
                                                  sum(risultati), len(risultati)))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
