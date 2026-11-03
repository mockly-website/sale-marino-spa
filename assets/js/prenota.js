/* Prenotazione e buono regalo: tutto finisce in un messaggio WhatsApp già scritto */
(function () {
  "use strict";
  var WA = "https://wa.me/393517578080?text=";
  var DATI = window.SALE_DATI;
  if (!DATI) return;
  var byId = {};
  DATI.trattamenti.forEach(function (t) { byId[t.id] = t; });

  /* ---------- Schede: Per te / Da regalare ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll("[data-tab]"));
  function selectTab(id, focus) {
    tabs.forEach(function (t) {
      var on = t.getAttribute("data-tab") === id;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      if (on && focus) t.focus();
    });
    history.replaceState(null, "", location.pathname + location.search + (id === "buono" ? "#buono" : ""));
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { selectTab(t.getAttribute("data-tab")); });
    t.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        var n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
        selectTab(n.getAttribute("data-tab"), true);
      }
    });
  });
  if (location.hash === "#buono") selectTab("buono");
  window.addEventListener("hashchange", function () { selectTab(location.hash === "#buono" ? "buono" : "per-te"); });

  /* ---------- Aiuti ---------- */
  function setError(form, name, msg) {
    var p = form.querySelector('[data-error-for="' + name + '"]');
    if (p) {
      p.textContent = msg || "";
      var field = p.closest(".field");
      if (field) field.classList.toggle("is-error", !!msg);
    }
  }
  function openWhatsApp(form, text) {
    var url = WA + encodeURIComponent(text);
    var panel = form.closest(".panel");
    var btn = panel.querySelector('[type="submit"]');
    var label = btn.textContent;
    btn.setAttribute("aria-busy", "true");
    btn.textContent = "Apro WhatsApp…";
    window.open(url, "_blank", "noopener");
    var done = panel.querySelector("[data-done]");
    done.querySelector("[data-done-link]").href = url;
    done.hidden = false;
    setTimeout(function () { btn.removeAttribute("aria-busy"); btn.textContent = label; }, 1400);
  }
  function fmtDay(d) {
    return d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  }
  function hm(min) { return Math.floor(min / 60) + ":" + String(min % 60).padStart(2, "0"); }

  /* ---------- Prenotazione ---------- */
  var booking = document.querySelector("[data-booking]");
  if (booking) {
    var sel = booking.querySelector("#b-trattamento");
    var daysBox = booking.querySelector("[data-days]");
    var slotsBox = booking.querySelector("[data-slots]");
    var state = { day: null, time: null };

    // orari di esempio: martedì-venerdì 9:30-19:30, sabato 9-13
    var SLOTS = { week: [570, 660, 750, 900, 990, 1080], sat: [540, 630, 720] };
    function closing(d) { return d.getDay() === 6 ? 780 : 1170; }
    function slotsFor(d) { return d.getDay() === 6 ? SLOTS.sat : SLOTS.week; }

    // prossimi giorni di apertura
    var now = new Date();
    var days = [];
    for (var i = 0; days.length < 10 && i < 21; i++) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      if (d.getDay() === 0 || d.getDay() === 1) continue;
      if (i === 0) {
        var nowMin = now.getHours() * 60 + now.getMinutes();
        if (!slotsFor(d).some(function (s) { return s > nowMin + 60; })) continue;
      }
      days.push(d);
    }
    days.forEach(function (d, n) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "day";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", "false");
      b.setAttribute("aria-label", fmtDay(d));
      b.tabIndex = n === 0 ? 0 : -1;
      var wd = d.toLocaleDateString("it-IT", { weekday: "short" }).replace(".", "");
      b.innerHTML = "<span>" + wd + "</span><b>" + d.getDate() + "</b><span>" + d.toLocaleDateString("it-IT", { month: "short" }).replace(".", "") + "</span>";
      b._date = d;
      daysBox.appendChild(b);
    });

    function radioKeys(box) {
      box.addEventListener("keydown", function (e) {
        var keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
        if (!keys[e.key]) return;
        var items = Array.prototype.slice.call(box.querySelectorAll('[role="radio"]:not(:disabled)'));
        var i = items.indexOf(document.activeElement);
        if (i < 0) return;
        e.preventDefault();
        var n = items[(i + keys[e.key] + items.length) % items.length];
        n.focus();
        n.click();
      });
    }
    radioKeys(daysBox);
    radioKeys(slotsBox);

    function check(box, btn) {
      box.querySelectorAll('[role="radio"]').forEach(function (b) {
        var on = b === btn;
        b.setAttribute("aria-checked", String(on));
        b.tabIndex = on ? 0 : -1;
      });
    }

    function renderSlots() {
      slotsBox.innerHTML = "";
      if (!state.day) {
        slotsBox.innerHTML = '<p class="slots-empty">Prima scegli il giorno.</p>';
        return;
      }
      var t = byId[sel.value];
      var len = t ? t.min : 0;
      var isToday = state.day.toDateString() === now.toDateString();
      var nowMin = now.getHours() * 60 + now.getMinutes();
      var first = null;
      slotsFor(state.day).forEach(function (s) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "chip";
        b.setAttribute("role", "radio");
        b.textContent = hm(s);
        b._min = s;
        var tooLate = s + len > closing(state.day);
        var past = isToday && s <= nowMin + 60;
        if (tooLate || past) {
          b.disabled = true;
          b.title = past ? "Orario già passato" : "Il trattamento finirebbe dopo la chiusura";
          b.setAttribute("aria-label", hm(s) + ", non disponibile");
        }
        var on = state.time === s && !b.disabled;
        b.setAttribute("aria-checked", String(on));
        b.tabIndex = -1;
        if (on) b.tabIndex = 0;
        if (!b.disabled && first === null) first = b;
        slotsBox.appendChild(b);
      });
      if (state.time !== null && !slotsBox.querySelector('[aria-checked="true"]')) state.time = null;
      if (!slotsBox.querySelector('[tabindex="0"]') && first) first.tabIndex = 0;
      if (!first) slotsBox.insertAdjacentHTML("beforeend", '<p class="slots-empty">Nessun orario libero per questo trattamento in questo giorno.</p>');
    }

    var sum = {};
    booking.ownerDocument.querySelectorAll("[data-sum]").forEach(function (dd) { sum[dd.getAttribute("data-sum")] = dd; });
    function put(key, val, empty) {
      sum[key].textContent = val || empty;
      sum[key].classList.toggle("is-empty", !val);
    }
    function summary() {
      var t = byId[sel.value];
      put("trattamento", t && t.nome, "da scegliere");
      put("durata", t && t.min + " minuti", "—");
      put("prezzo", t && t.prezzo + " € (esempio)", "—");
      put("giorno", state.day && fmtDay(state.day), "da scegliere");
      put("ora", state.time !== null && hm(state.time), "da scegliere");
    }

    daysBox.addEventListener("click", function (e) {
      var b = e.target.closest(".day");
      if (!b) return;
      state.day = b._date;
      check(daysBox, b);
      setError(booking, "giorno");
      renderSlots();
      summary();
    });
    slotsBox.addEventListener("click", function (e) {
      var b = e.target.closest(".chip");
      if (!b || b.disabled) return;
      state.time = b._min;
      check(slotsBox, b);
      setError(booking, "ora");
      summary();
    });
    sel.addEventListener("change", function () {
      setError(booking, "trattamento");
      renderSlots();
      summary();
    });
    booking.querySelector("#b-nome").addEventListener("input", function () { setError(booking, "nome"); });

    // arrivi da "Prenota questo"
    var pre = new URLSearchParams(location.search).get("t");
    if (pre && byId[pre]) sel.value = pre;
    summary();

    booking.addEventListener("submit", function (e) {
      e.preventDefault();
      var nome = booking.querySelector("#b-nome").value.trim();
      var errors = [];
      if (!byId[sel.value]) { setError(booking, "trattamento", "Scegli un trattamento."); errors.push(sel); }
      if (!state.day) { setError(booking, "giorno", "Scegli un giorno."); errors.push(daysBox.querySelector(".day")); }
      if (state.time === null) {
        setError(booking, "ora", state.day ? "Scegli un orario." : "Scegli prima il giorno, poi l’orario.");
        errors.push(slotsBox.querySelector(".chip:not(:disabled)") || daysBox.querySelector(".day"));
      }
      if (nome.length < 2) { setError(booking, "nome", "Scrivi il tuo nome: ci serve per segnarti."); errors.push(booking.querySelector("#b-nome")); }
      if (errors.length) { if (errors[0]) errors[0].focus(); return; }
      var t = byId[sel.value];
      var nota = booking.querySelector("#b-nota").value.trim();
      var text = "Ciao! Vorrei prenotare (prova dalla demo Sale Marino Spa di Mockly, non è un centro vero).\n\n" +
        "Trattamento: " + t.nome + " (" + t.min + " min, " + t.prezzo + " € di esempio)\n" +
        "Giorno: " + fmtDay(state.day) + "\n" +
        "Ora: " + hm(state.time) + "\n" +
        "Nome: " + nome + (nota ? "\nNota: " + nota : "");
      openWhatsApp(booking, text);
    });
  }

  /* ---------- Buono regalo ---------- */
  var gift = document.querySelector("[data-gift]");
  if (gift) {
    var v = document.querySelector("[data-voucher]");
    var what = v.querySelector('[data-v="cosa"]');
    var who = v.querySelector('[data-v="chi"]');
    var msg = v.querySelector('[data-v="msg"]');
    var cosa = gift.querySelector("#g-cosa");
    var per = gift.querySelector("#g-per");
    var da = gift.querySelector("#g-da");
    var txt = gift.querySelector("#g-msg");
    var count = gift.querySelector("[data-count]");

    function label(val) {
      if (!val) return "";
      if (val.indexOf("importo-") === 0) return "Buono da " + val.split("-")[1] + " €";
      return byId[val] ? byId[val].nome : "";
    }
    function preview() {
      what.textContent = label(cosa.value) || "Un’ora per te";
      var p = per.value.trim(), f = da.value.trim();
      who.textContent = "per " + (p || "…") + ", da " + (f || "…");
      var m = txt.value.trim();
      msg.hidden = !m;
      msg.textContent = m ? "«" + m + "»" : "";
      count.textContent = txt.value.length + " / 120";
    }
    cosa.addEventListener("change", function () {
      setError(gift, "cosa");
      preview();
      v.classList.remove("is-bump");
      void v.offsetWidth;
      v.classList.add("is-bump");
    });
    [per, da, txt].forEach(function (el) {
      el.addEventListener("input", function () { setError(gift, el.name); preview(); });
    });
    var pre2 = new URLSearchParams(location.search).get("t");
    if (pre2 && byId[pre2]) cosa.value = pre2;
    preview();

    gift.addEventListener("submit", function (e) {
      e.preventDefault();
      var errors = [];
      if (!cosa.value) { setError(gift, "cosa", "Scegli cosa regalare."); errors.push(cosa); }
      if (per.value.trim().length < 2) { setError(gift, "per", "Scrivi il nome di chi riceve il buono."); errors.push(per); }
      if (da.value.trim().length < 2) { setError(gift, "da", "Scrivi il tuo nome."); errors.push(da); }
      if (errors.length) { errors[0].focus(); return; }
      var m = txt.value.trim();
      var text = "Ciao! Vorrei un buono regalo (prova dalla demo Sale Marino Spa di Mockly, non è un centro vero).\n\n" +
        "Cosa: " + label(cosa.value) + "\n" +
        "Per: " + per.value.trim() + "\n" +
        "Da parte di: " + da.value.trim() + (m ? "\nMessaggio: " + m : "");
      openWhatsApp(gift, text);
    });
  }
})();
