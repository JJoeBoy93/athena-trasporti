/* Athena Trasporti — la pagina del link nel preventivo (27 settembre 2026).
   Il cliente vede il prezzo approvato da JJ e i giorni liberi, sceglie e
   conferma: la porta di JJA-VIS segna il calendario e avvisa JJ. Il link porta
   id e chiave del preventivo; senza la chiave la porta non risponde. La
   pagina sa solo quali momenti sono presi, non da chi. */
(function () {
  "use strict";
  var PORTA = "https://jjavis-porta.19-jjardito93.workers.dev/prenota";
  var q = new URLSearchParams(location.search);
  var p = q.get("p") || "", k = q.get("k") || "";
  var stato = document.getElementById("stato");
  var GIORNI = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
  var MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
  var MESI_LUNGHI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
  var dati, giornoScelto = "", fasciaScelta = "";

  function data(iso) { return new Date(iso + "T12:00:00Z"); }
  var GIORNI_LUNGHI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
  function leggibile(iso) { var d = data(iso); return GIORNI_LUNGHI[d.getUTCDay()] + " " + d.getUTCDate() + " " + MESI_LUNGHI[d.getUTCMonth()]; }
  function prese(iso) { return (dati.occupati && dati.occupati[iso]) || []; }
  function pieno(iso) { var x = prese(iso); return dati.giornata ? x.length > 0 : x.length >= 2; }
  function fatto(g, f) {
    document.getElementById("scelta").hidden = true;
    stato.textContent = "Prenotato: " + leggibile(g) + ", " + f + ". Ti ricontatto per i dettagli. Grazie!";
  }

  function disegnaFasce() {
    var box = document.getElementById("fasce");
    box.textContent = "";
    ["mattina", "pomeriggio"].forEach(function (f) {
      var l = document.createElement("label");
      var i = document.createElement("input");
      i.type = "radio"; i.name = "fascia"; i.value = f;
      i.disabled = prese(giornoScelto).indexOf(f) >= 0;
      i.addEventListener("change", function () { fasciaScelta = f; aggiorna(); });
      var s = document.createElement("span"); s.textContent = f === "mattina" ? "Mattina" : "Pomeriggio";
      l.appendChild(i); l.appendChild(s); box.appendChild(l);
    });
  }
  function aggiorna() {
    document.getElementById("conferma").disabled = !giornoScelto || (!dati.giornata && !fasciaScelta);
  }
  function disegnaGiorni() {
    var box = document.getElementById("giorni");
    dati.giorni.forEach(function (iso) {
      var d = data(iso);
      var b = document.createElement("button");
      b.type = "button"; b.className = "prenota-giorno";
      b.disabled = pieno(iso);
      b.setAttribute("aria-pressed", "false");
      b.innerHTML = "<small></small><strong></strong><small></small>";
      b.children[0].textContent = GIORNI[d.getUTCDay()];
      b.children[1].textContent = d.getUTCDate();
      b.children[2].textContent = MESI[d.getUTCMonth()];
      b.setAttribute("aria-label", leggibile(iso) + (b.disabled ? ", occupato" : ""));
      b.addEventListener("click", function () {
        Array.prototype.forEach.call(box.children, function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
        giornoScelto = iso; fasciaScelta = "";
        if (!dati.giornata) { document.getElementById("fasce-box").hidden = false; disegnaFasce(); }
        aggiorna();
        // la scelta dopo il giorno e il tasto stanno sotto la griglia: ci si scende da soli
        var dopo = dati.giornata ? document.getElementById("conferma") : document.getElementById("fasce-box");
        dopo.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      });
      box.appendChild(b);
    });
  }

  if (!/^[0-9a-f]{8}$/.test(p) || !/^[0-9a-f]{16}$/.test(k)) { stato.textContent = "Link non valido: aprilo dal messaggio col preventivo."; return; }
  fetch(PORTA + "?p=" + p + "&k=" + k)
    .then(function (r) { return r.json().then(function (j) { return { r: r, j: j }; }); })
    .then(function (x) {
      if (!x.r.ok) { stato.textContent = (x.j && x.j.errore ? x.j.errore.charAt(0).toUpperCase() + x.j.errore.slice(1) : "Qualcosa non va") + ". Scrivimi al 377 594 7995."; return; }
      dati = x.j;
      document.getElementById("tratta").textContent = dati.servizio + ": " + [dati.da].concat(dati.tappe || [], dati.a ? [dati.a] : []).join(" → ");
      document.getElementById("prezzo").textContent = dati.prezzo;
      document.getElementById("riepilogo").hidden = false;
      if (dati.stato === "confermato") { fatto(dati.giorno, dati.fascia); return; }
      stato.textContent = "";
      document.getElementById("nota-durata").textContent = dati.giornata
        ? "Questo lavoro prende la giornata intera: scegli un giorno libero." : "I giorni grigi sono già pieni.";
      document.getElementById("scelta").hidden = false;
      disegnaGiorni();
    })
    .catch(function () { stato.textContent = "Non riesco a caricare il preventivo. Riprova tra poco, o scrivimi al 377 594 7995."; });

  document.getElementById("conferma").addEventListener("click", function () {
    var b = this; b.disabled = true; stato.textContent = "Confermo…";
    fetch(PORTA, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p: p, k: k, giorno: giornoScelto, fascia: fasciaScelta }) })
      .then(function (r) { return r.json().then(function (j) { return { r: r, j: j }; }); })
      .then(function (x) {
        if (x.r.ok) { fatto(x.j.giorno, x.j.fascia); return; }
        stato.textContent = (x.j.errore || "Non riuscito") + ".";
        b.disabled = false;
      })
      .catch(function () { stato.textContent = "Non riuscito: riprova, o scrivimi al 377 594 7995."; b.disabled = false; });
  });
})();
