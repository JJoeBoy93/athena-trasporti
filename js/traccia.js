/* La pagina del tracciamento (12/10): chiede alla porta di JJA-VIS lo stato della spedizione col suo codice.
   La porta risponde solo codice, stati, ore e comune: niente nomi, vie o contatti. */
(function () {
  "use strict";
  var PORTA = "https://jjavis-porta.19-jjardito93.workers.dev/traccia";
  var $ = function (id) { return document.getElementById(id); };
  var ora = function (iso) {
    try { return new Date(iso).toLocaleString("it-IT", { timeZone: "Europe/Rome", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
    catch (e) { return iso; }
  };
  function cerca(c) {
    c = String(c || "").trim().toUpperCase().replace(/\s/g, "");
    if (/^AT[A-Z0-9]{5}$/.test(c)) c = "AT-" + c.slice(2);
    $("codice").value = c;
    $("risultato").hidden = true;
    if (!/^AT-[A-Z0-9]{5}$/.test(c)) { $("stato").textContent = "Il codice è fatto così: AT- e cinque lettere o numeri."; return; }
    $("stato").textContent = "Cerco…";
    fetch(PORTA + "?c=" + encodeURIComponent(c)).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (x) {
        if (!x.ok) { $("stato").textContent = x.d && x.d.no === "non trovata" ? "Non trovo una spedizione con questo codice: controlla di averlo scritto giusto." : "Il codice non va: controllalo."; return; }
        var d = x.d, ultimo = d.stati[d.stati.length - 1];
        $("stato").textContent = "";
        $("titolo").textContent = ultimo.emoji + " " + ultimo.stato + (d.comune ? " · " + d.comune : "");
        var ol = $("passi"); ol.textContent = "";
        d.stati.slice().reverse().forEach(function (s, i) {
          var li = document.createElement("li"); if (i === 0) li.className = "adesso";
          li.textContent = s.emoji + " " + s.stato + " — " + ora(s.quando); ol.appendChild(li);
        });
        $("risultato").hidden = false;
        try { history.replaceState(null, "", "?c=" + c); } catch (e) {}
      })
      .catch(function () { $("stato").textContent = "Non riesco a collegarmi: riprova fra poco, o scrivici su WhatsApp."; });
  }
  $("cerca").addEventListener("submit", function (e) { e.preventDefault(); cerca($("codice").value); });
  var c = new URLSearchParams(location.search).get("c"); if (c) cerca(c);
})();
