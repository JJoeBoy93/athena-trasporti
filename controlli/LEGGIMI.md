# Controlli del sito

`verifica.py` controlla il sito prima di ogni pull request. Usa solo la
libreria standard di Python 3: non c'è niente da installare.

## Come si lancia

Dalla cartella del repository:

```sh
python3 controlli/verifica.py
```

(funziona anche lanciato da un'altra cartella: la radice del sito si ricava
dalla posizione dello script).

Per ogni punto stampa ✅ o ❌, con i dettagli di cosa non va. Esce con **0**
se tutti i punti passano, con **1** altrimenti: così si può usare anche in
un'automazione (`python3 controlli/verifica.py && echo ok`).

## Cosa controlla

1. Nessun foglio di stile, script, font o immagine caricato da un dominio
   esterno (compresi i `url()` dentro i CSS). I link esterni ammessi sono
   `wa.me`, `tel:`, `mailto:` e la pagina di JJA-VIS che `DATI.md` chiede nel
   piè di pagina (un link normale, non carica niente).
2. La P.IVA 09546240962 compare nel `<footer>`; in nessun file del
   repository compaiono la via della sede, il nome della via né qualcosa
   che abbia la forma di un codice fiscale.
3. Ci sono i link `tel:+393775947995`, `https://wa.me/393775947995` e
   `mailto:jja.athenatrasporti@gmail.com`.
4. Ogni `<img>` ha un `alt` non vuoto; il blocco JSON-LD è JSON valido e ha
   `vatID`.
5. Nel CSS c'è una regola `@media (prefers-reduced-motion: reduce)`.
6. Il peso totale della pagina (HTML + CSS + JS + font + immagini) è sotto
   1,5 MB. Per prudenza conta tutte le varianti di un'immagine (WebP e
   PNG/JPG), anche se il browser ne scarica una sola.
7. Ci sono le cinque schede (`#home`, `#servizi`, `#mezzi`, `#preventivo`,
   `#contatti`), ognuna una `<section>` con quell'`id` e un link nella barra
   delle schede.

## Altezza delle schede sul telefono

`verifica.py` usa solo la libreria standard e non apre un browser. L'altezza
di ogni scheda a 390×844 si misura a parte con la skill `webapp-testing`
(Playwright), per esempio:

```sh
python3 .claude/skills/webapp-testing/scripts/with_server.py \
  --server "exec python3 -m http.server 8766 >/dev/null 2>&1" --port 8766 -- python3 controlli/altezze.py
```

