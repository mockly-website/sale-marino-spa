/* Comportamenti comuni a tutte le pagine */
(function () {
  "use strict";
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;

  /* Intestazione: diventa piena quando la pagina scorre */
  var header = document.querySelector("[data-header]");
  function onScrollHeader() {
    if (header) header.classList.toggle("is-solid", window.scrollY > 24);
  }
  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  /* Menu da telefono: X, Esc, tocco fuori dai link, pagina dietro bloccata */
  var menu = document.querySelector("[data-menu]");
  var openBtn = document.querySelector("[data-menu-open]");
  if (menu && openBtn) {
    var closeBtn = menu.querySelector("[data-menu-close]");
    var lastFocus = null;
    var focusables = function () {
      return Array.prototype.slice.call(menu.querySelectorAll("a[href], button"));
    };
    var open = function () {
      lastFocus = document.activeElement;
      menu.classList.add("is-open");
      root.classList.add("is-locked");
      openBtn.setAttribute("aria-expanded", "true");
      setTimeout(function () { closeBtn.focus(); }, 30);
    };
    var close = function (keepFocus) {
      menu.classList.remove("is-open");
      root.classList.remove("is-locked");
      openBtn.setAttribute("aria-expanded", "false");
      if (!keepFocus && lastFocus) lastFocus.focus();
    };
    openBtn.addEventListener("click", open);
    closeBtn.addEventListener("click", function () { close(); });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) { close(true); return; }
      if (!e.target.closest("button, .menu__links, .menu__foot")) close();
    });
    document.addEventListener("keydown", function (e) {
      if (!menu.classList.contains("is-open")) return;
      if (e.key === "Escape") { close(); return; }
      if (e.key === "Tab") {
        var f = focusables();
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 960 && menu.classList.contains("is-open")) close(true);
    });
  }

  /* Comparse lente allo scroll */
  var reveals = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !calm) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* Ingresso della prima schermata */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { document.body.classList.add("is-entered"); });
  });

  /* Colonne che scivolano piano mentre scorri (solo transform) */
  var drifters = Array.prototype.slice.call(document.querySelectorAll("[data-drift]"));
  if (drifters.length && !calm) {
    var ticking = false;
    var update = function () {
      ticking = false;
      var vh = window.innerHeight;
      var range = Math.min(window.innerWidth * 0.05, 48);
      drifters.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        var p = (r.top + r.height / 2) / vh - 0.5; // -0.5 .. 0.5 circa
        var dir = parseFloat(el.getAttribute("data-drift")) || 1;
        el.style.transform = "translate3d(" + (p * range * dir * 2).toFixed(1) + "px,0,0)";
      });
    };
    var request = function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    update();
  }

  /* Finale: la foto si assesta quando arrivi */
  var finale = document.querySelector("[data-finale]");
  if (finale && "IntersectionObserver" in window) {
    var fo = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { finale.classList.add("is-in"); fo.disconnect(); }
    }, { threshold: 0.25 });
    fo.observe(finale);
  }

  /* Bottone fisso "Prenota": sparisce quando c’è già un invito a prenotare in vista */
  var dock = document.querySelector("[data-dock]");
  if (dock && "IntersectionObserver" in window) {
    var targets = document.querySelectorAll(".hero, .finale, .foot");
    var visible = new Set();
    var dio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) visible.add(en.target); else visible.delete(en.target);
      });
      dock.classList.toggle("is-hidden", visible.size > 0);
    }, { threshold: 0.35 });
    targets.forEach(function (t) { dio.observe(t); });
  }

  /* Orari di esempio: evidenzia oggi e dice se è aperto adesso */
  var hours = document.querySelector("[data-hours]");
  var status = document.querySelector("[data-status]");
  if (hours) {
    var now = new Date();
    var d = now.getDay();
    hours.querySelectorAll("li").forEach(function (li) {
      if ((" " + li.getAttribute("data-day") + " ").indexOf(" " + d + " ") > -1) li.classList.add("is-today");
    });
    if (status) {
      var m = now.getHours() * 60 + now.getMinutes();
      var openNow = (d >= 2 && d <= 5 && m >= 570 && m < 1170) || (d === 6 && m >= 540 && m < 780);
      status.textContent = openNow ? "Adesso è aperto" : "Adesso è chiuso";
      status.classList.toggle("is-open", openNow);
      status.hidden = false;
    }
  }
})();
