/* Athena Trasporti — il furgone sulla strada e il modulo del preventivo.
   Niente richieste a server: il modulo compone il messaggio e apre WhatsApp. */
(function () {
  "use strict";

  var ridotto = window.matchMedia("(prefers-reduced-motion: reduce)");
  var radice = document.documentElement;

  /* ---------- La strada: il furgone segue lo scorrimento ---------- */
  var sezione = document.getElementById("strada");
  var percorso = document.getElementById("percorso");
  var oro = document.getElementById("percorso-oro");
  var furgone = document.getElementById("furgone");
  var verso = document.getElementById("furgone-verso");
  var ruote = [document.getElementById("ruota-dietro"), document.getElementById("ruota-davanti")];
  var posRuote = ["translate(-36 -10)", "translate(36 -10)"];

  if (sezione && percorso && furgone && percorso.getTotalLength) {
    var L = percorso.getTotalLength();
    var inizio = 50, fine = L - 85;   // il furgone resta dentro la strada
    var N = 240, tabella = [];
    var GRADI = 180 / Math.PI, INCLINAZIONE = 30;

    // I punti della strada si calcolano una volta sola: poi solo letture.
    for (var i = 0; i <= N; i++) {
      var s = inizio + (fine - inizio) * i / N;
      var a = percorso.getPointAtLength(Math.max(0, s - 2));
      var b = percorso.getPointAtLength(Math.min(L, s + 2));
      var p = percorso.getPointAtLength(s);
      tabella.push({ x: p.x, y: p.y, ang: Math.atan2(b.y - a.y, b.x - a.x) * GRADI, s: s });
    }
    oro.style.strokeDasharray = L + " " + L;

    var obiettivo = 0, attuale = 0, inCorsa = false, attivo = false;

    function limita(v, min, max) { return v < min ? min : v > max ? max : v; }

    function disegna(t) {
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
    }

    function leggi() {
      var r = sezione.getBoundingClientRect();
      var corsa = r.height - window.innerHeight;
      obiettivo = corsa > 0 ? limita(-r.top / corsa, 0, 1) : 0;
    }

    function passo() {
      // un po' d'inerzia: il furgone raggiunge la posizione con dolcezza
      var d = obiettivo - attuale;
      attuale = Math.abs(d) < .0005 ? obiettivo : attuale + d * .22;
      disegna(attuale);
      if (attuale !== obiettivo && attivo) {
        requestAnimationFrame(passo);
      } else {
        inCorsa = false;
      }
    }

    function suScorrimento() {
      if (!attivo) return;
      leggi();
      if (!inCorsa) { inCorsa = true; requestAnimationFrame(passo); }
    }

    function accendi() {
      attivo = true;
      radice.classList.add("anima");
      leggi(); attuale = obiettivo; disegna(attuale);
    }

    function spegni() {
      // movimento ridotto: si ferma e resta un disegno fermo
      attivo = false;
      radice.classList.remove("anima");
    }

    window.addEventListener("scroll", suScorrimento, { passive: true });
    window.addEventListener("resize", suScorrimento, { passive: true });
    var cambia = function () { ridotto.matches ? spegni() : accendi(); };
    if (ridotto.addEventListener) ridotto.addEventListener("change", cambia);
    else if (ridotto.addListener) ridotto.addListener(cambia);
    if (!ridotto.matches) accendi();
  }

  /* ---------- Il preventivo: compone il messaggio e apre WhatsApp ---------- */
  var modulo = document.getElementById("modulo");
  var esito = document.getElementById("esito");
  var NUMERO = "393775947995";

  if (modulo) {
    modulo.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(modulo);
      var righe = ["Buongiorno, vorrei un preventivo."];
      [["servizio", "Servizio"], ["da", "Da"], ["a", "A"], ["quando", "Quando"], ["note", "Note"]].forEach(function (c) {
        var v = String(d.get(c[0]) || "").trim();
        if (v) righe.push(c[1] + ": " + v);
      });
      var url = "https://wa.me/" + NUMERO + "?text=" + encodeURIComponent(righe.join("\n"));

      esito.textContent = "Si sta aprendo WhatsApp… Se non si apre, ";
      var a = document.createElement("a");
      a.href = url;
      a.className = "collegamento";
      a.textContent = "tocca qui";
      esito.appendChild(a);
      esito.appendChild(document.createTextNode("."));

      if (ridotto.matches) { window.location.href = url; return; }
      modulo.classList.add("parte");   // il furgone parte…
      setTimeout(function () { window.location.href = url; }, 800);   // …e dopo 0,8 s si apre WhatsApp
    });

    // tornando indietro dal WhatsApp, il furgone è di nuovo al suo posto
    window.addEventListener("pageshow", function () { modulo.classList.remove("parte"); });
  }
})();
