/* Athena Trasporti — le schede, il furgone sulla strada e il modulo del preventivo.
   Il modulo manda la richiesta alla porta di JJA-VIS; se non risponde, apre WhatsApp. */
(function () {
  "use strict";

  var ridotto = window.matchMedia("(prefers-reduced-motion: reduce)");
  var radice = document.documentElement;

  /* ---------- Il furgone: percorre la strada quando si apre la Home ---------- */
  var furgoneParte = function () {};
  var furgoneFerma = function () {};
  var percorso = document.getElementById("percorso");
  var oro = document.getElementById("percorso-oro");
  var furgone = document.getElementById("furgone");
  var verso = document.getElementById("furgone-verso");
  var ruote = [document.getElementById("ruota-dietro"), document.getElementById("ruota-davanti")];
  var posRuote = ["translate(-36 -10)", "translate(36 -10)"];

  if (percorso && furgone && percorso.getTotalLength) {
    var L = percorso.getTotalLength();
    var inizio = 50, fine = L - 85;   // il furgone resta dentro la strada
    var N = 240, tabella = [];
    var GRADI = 180 / Math.PI, INCLINAZIONE = 30, DURATA = 3600;

    // I punti della strada si calcolano una volta sola: poi solo letture.
    for (var i = 0; i <= N; i++) {
      var s = inizio + (fine - inizio) * i / N;
      var a = percorso.getPointAtLength(Math.max(0, s - 2));
      var b = percorso.getPointAtLength(Math.min(L, s + 2));
      var p = percorso.getPointAtLength(s);
      tabella.push({ x: p.x, y: p.y, ang: Math.atan2(b.y - a.y, b.x - a.x) * GRADI, s: s });
    }
    oro.style.strokeDasharray = L + " " + L;

    var limita = function (v, min, max) { return v < min ? min : v > max ? max : v; };

    var disegna = function (t) {
      var f = t * N, k = Math.floor(f), r = f - k;
      var A = tabella[k], B = tabella[Math.min(N, k + 1)];
      var x = A.x + (B.x - A.x) * r, y = A.y + (B.y - A.y) * r, s = A.s + (B.s - A.s) * r;
      var ang = r < .5 ? A.ang : B.ang;
      var destra = Math.abs(ang) <= 90;
      var incl = destra ? ang : ang - 180;
      if (incl < -180) incl += 360;
      incl = limita(incl, -INCLINAZIONE, INCLINAZIONE);
      furgone.setAttribute("transform", "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ") rotate(" + incl.toFixed(1) + ")");
      verso.setAttribute("transform", destra ? "" : "scale(-1 1)");
      var giro = (s * GRADI / 12).toFixed(0);   // ruote di raggio 10, disegno in scala 1,2
      ruote[0].setAttribute("transform", posRuote[0] + " rotate(" + giro + ")");
      ruote[1].setAttribute("transform", posRuote[1] + " rotate(" + giro + ")");
      oro.style.strokeDashoffset = (L - s).toFixed(1);
    };

    var corsa = 0;
    var dolce = function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };

    furgoneParte = function () {
      if (ridotto.matches) return;          // movimento ridotto: resta il disegno fermo
      radice.classList.add("anima");
      cancelAnimationFrame(corsa);
      var t0 = null;
      var passo = function (ora) {
        if (t0 === null) t0 = ora;
        var t = limita((ora - t0) / DURATA, 0, 1);
        disegna(dolce(t));
        if (t < 1) corsa = requestAnimationFrame(passo);
      };
      disegna(0);
      corsa = requestAnimationFrame(passo);
    };
    furgoneFerma = function () { cancelAnimationFrame(corsa); };

    var cambiaMoto = function () {
      if (ridotto.matches) { furgoneFerma(); radice.classList.remove("anima"); }
    };
    if (ridotto.addEventListener) ridotto.addEventListener("change", cambiaMoto);
    else if (ridotto.addListener) ridotto.addListener(cambiaMoto);
  }

  /* ---------- Le schede ---------- */
  var binario = document.getElementById("binario");
  var barra = document.getElementById("barra");
  var schede = binario ? Array.prototype.slice.call(binario.querySelectorAll(".scheda")) : [];
  var linguette = barra ? Array.prototype.slice.call(barra.querySelectorAll("a[data-scheda]")) : [];
  var attuale = -1;

  var indiceDi = function (id) {
    for (var i = 0; i < schede.length; i++) if (schede[i].id === id) return i;
    return -1;
  };

  var segna = function (i) {
    if (i === attuale) return;
    var prima = attuale;
    attuale = i;
    linguette.forEach(function (a, k) {
      if (k === i) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    // la linguetta aperta al centro della barra, se la barra scorre
    var a = linguette[i];
    if (a && barra.scrollWidth > barra.clientWidth) {
      barra.scrollTo({ left: a.offsetLeft - (barra.clientWidth - a.offsetWidth) / 2, behavior: ridotto.matches ? "auto" : "smooth" });
    }
    var id = schede[i].id;
    if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
    if (id === "home") furgoneParte();
    else if (prima === indiceDi("home")) furgoneFerma();
  };

  var mira = -1, miraScade = 0;   // durante un cambio di scheda animato, le schede di passaggio non contano
  var vai = function (i, subito) {
    if (i < 0 || i >= schede.length) return;
    mira = i;
    clearTimeout(miraScade);
    miraScade = setTimeout(function () { mira = -1; }, 1200);
    binario.scrollTo({ left: i * binario.clientWidth, behavior: subito || ridotto.matches ? "auto" : "smooth" });
    segna(i);
  };

  if (binario && schede.length && linguette.length) {
    // clic su un link interno (#servizi, #preventivo…): si apre la scheda, senza saltare la pagina
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var i = indiceDi(a.getAttribute("href").slice(1));
      if (i < 0) return;
      e.preventDefault();
      vai(i);
    });

    // frecce della tastiera sulla barra
    barra.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var i = Math.max(0, Math.min(schede.length - 1, attuale + (e.key === "ArrowRight" ? 1 : -1)));
      vai(i);
      linguette[i].focus();
      e.preventDefault();
    });

    // scorrendo col dito di lato: la scheda che si ferma al centro diventa quella aperta
    var attesa = 0;
    binario.addEventListener("scroll", function () {
      cancelAnimationFrame(attesa);
      attesa = requestAnimationFrame(function () {
        var i = Math.round(binario.scrollLeft / binario.clientWidth);
        if (mira >= 0) {
          if (Math.abs(binario.scrollLeft - mira * binario.clientWidth) > 2) return;
          mira = -1;
        }
        segna(i);
      });
    }, { passive: true });

    // girando il telefono si resta sulla stessa scheda
    window.addEventListener("resize", function () {
      binario.scrollTo({ left: attuale * binario.clientWidth, behavior: "auto" });
    });

    // tasto indietro o link con #: si va alla scheda giusta
    window.addEventListener("hashchange", function () {
      var i = indiceDi(location.hash.slice(1));
      if (i >= 0 && i !== attuale) vai(i);
    });

    var partenza = indiceDi(location.hash.slice(1));
    vai(partenza < 0 ? 0 : partenza, true);
  }

  /* ---------- Condividi il sito — 27 settembre 2026 ----------
     JJ: «manca il tasto per condividere il link se vogliono mandarlo a
     qualcuno o se vogliono sponsorizzarmi». Sul telefono si apre il menu di
     condivisione del sistema (WhatsApp, Telegram, SMS…); dove non c'e', il
     link si copia. L'indirizzo e' quello del sito, senza la scheda aperta. */
  var INDIRIZZO = location.origin + location.pathname;
  document.querySelectorAll("[data-condividi]").forEach(function (b) {
    b.addEventListener("click", function () {
      var dove = document.getElementById("condividi-esito");
      var dati = { title: "Athena Trasporti", text: "Consegne conto terzi, consegne urgenti e sgomberi da Limbiate:", url: INDIRIZZO };
      if (navigator.share) { navigator.share(dati).catch(function () {}); return; }
      (navigator.clipboard ? navigator.clipboard.writeText(INDIRIZZO) : Promise.reject())
        .then(function () { if (dove) dove.textContent = "Link copiato: incollalo dove vuoi."; else alert("Link copiato: " + INDIRIZZO); },
              function () { prompt("Copia il link:", INDIRIZZO); });
    });
  });

  /* ---------- Il preventivo ----------
     27 settembre 2026: la richiesta va alla porta di JJA-VIS, che calcola il
     percorso e la manda a JJ su Telegram; il prezzo al cliente lo manda JJ,
     dopo averlo controllato. Il sito non vede mai un prezzo.
     Se la porta non risponde, si apre WhatsApp col messaggio pronto come
     prima: un cliente non si perde per un server giù. */
  var modulo = document.getElementById("modulo");
  var esito = document.getElementById("esito");
  var NUMERO = "393775947995";
  var PORTA = "https://jjavis-porta.19-jjardito93.workers.dev/preventivo";

  function versoWhatsApp(d, prima) {
    var righe = ["Buongiorno, vorrei un preventivo."];
    [["servizio", "Servizio"], ["ingombro", "Ingombro"], ["da", "Da"], ["tappe", "Tappe"], ["a", "A"], ["quando", "Quando"], ["note", "Note"], ["nome", "Nome"]].forEach(function (c) {
      var v = String(d.get(c[0]) || "").trim();
      if (v) righe.push(c[1] + ": " + v);
    });
    var url = "https://wa.me/" + NUMERO + "?text=" + encodeURIComponent(righe.join("\n"));
    esito.textContent = prima + "Si sta aprendo WhatsApp… Se non si apre, ";
    var a = document.createElement("a");
    a.href = url;
    a.className = "collegamento";
    a.textContent = "tocca qui";
    esito.appendChild(a);
    esito.appendChild(document.createTextNode("."));
    setTimeout(function () { window.location.href = url; }, ridotto.matches ? 0 : 800);
  }

  /* L'ingombro (27 settembre, JJ): «se selezionano sgombero solo furgone». */
  function allineaIngombro() {
    var sgombero = modulo.querySelector("input[name=servizio][value=Sgombero]:checked");
    modulo.querySelectorAll("input[name=ingombro]").forEach(function (r) {
      r.disabled = Boolean(sgombero) && r.value !== "furgone";
      if (sgombero && r.value === "furgone") r.checked = true;
    });
  }

  /* Le aziende (27 settembre, JJ): «per le aziende devi per forza fare
     fattura». I campi della fattura si aprono solo con la spunta. */
  var spuntaAzienda = document.getElementById("azienda");
  function allineaAzienda() {
    var si = spuntaAzienda && spuntaAzienda.checked;
    document.getElementById("dati-azienda").hidden = !si;
    ["ragione_sociale", "piva", "sdi_pec", "sede"].forEach(function (n) { modulo.querySelector("[name=" + n + "]").required = si; });
  }

  if (modulo) {
    if (spuntaAzienda) spuntaAzienda.addEventListener("change", allineaAzienda);
    modulo.querySelectorAll("input[name=servizio]").forEach(function (r) { r.addEventListener("change", allineaIngombro); });
    modulo.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(modulo);
      var tel = String(d.get("telefono") || "").trim(), mail = String(d.get("mail") || "").trim();
      if (!tel && !mail) { esito.textContent = "Lascia un telefono o una mail: serve per mandarti il prezzo."; return; }
      var corpo = { consenso: d.get("consenso") === "on" };
      if (d.get("azienda") === "on") {
        var sp = String(d.get("sdi_pec") || "").trim();
        corpo.azienda = true;
        corpo.ragione_sociale = String(d.get("ragione_sociale") || "");
        corpo.piva = String(d.get("piva") || "");
        corpo.sede = String(d.get("sede") || "");
        if (sp.indexOf("@") >= 0) corpo.pec = sp; else corpo.sdi = sp;
      }
      ["servizio", "ingombro", "da", "a", "tappe", "quando", "note", "nome", "telefono", "mail", "sito"].forEach(function (k) { corpo[k] = String(d.get(k) || ""); });
      var pulsante = modulo.querySelector("button[type=submit]");
      pulsante.disabled = true;
      esito.textContent = "Invio in corso…";
      if (!ridotto.matches) modulo.classList.add("parte");   // il furgone parte…
      fetch(PORTA, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { r: r, j: j }; }); })
        .then(function (x) {
          pulsante.disabled = false;
          if (x.r.ok) {
            esito.textContent = "Richiesta arrivata, grazie. Controllo il percorso e ti mando il prezzo " +
              (tel ? "su WhatsApp" : "per mail") + ".";
            modulo.reset();
          } else if (x.r.status === 400 && x.j.errore) {
            modulo.classList.remove("parte");
            esito.textContent = "Manca qualcosa: " + x.j.errore + ".";
          } else {
            versoWhatsApp(d, "Il modulo non è arrivato. ");
          }
        })
        .catch(function () { pulsante.disabled = false; versoWhatsApp(d, "Il modulo non è arrivato. "); });
    });

    // tornando indietro dal WhatsApp, il furgone è di nuovo al suo posto
    window.addEventListener("pageshow", function () { modulo.classList.remove("parte"); });
  }
})();
