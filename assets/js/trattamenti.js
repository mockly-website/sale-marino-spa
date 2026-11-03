/* Filtro dei trattamenti per categoria */
(function () {
  "use strict";
  var row = document.querySelector("[data-filter]");
  if (!row) return;
  var chips = row.querySelectorAll(".chip");
  var cats = document.querySelectorAll("[data-cat]");
  var status = document.querySelector("[data-filter-status]");
  var list = document.querySelector(".menu-list");
  var filterBar = document.querySelector(".filter");

  function apply(which) {
    var count = 0;
    chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.getAttribute("data-show") === which)); });
    cats.forEach(function (cat) {
      var on = which === "tutti" || cat.getAttribute("data-cat") === which;
      cat.hidden = !on;
      if (on) {
        count += cat.querySelectorAll(".titem").length;
        // chi filtra vuole vedere subito: niente attesa delle comparse
        cat.querySelectorAll("[data-reveal]").forEach(function (el) { el.classList.add("is-in"); });
      }
    });
    if (status) status.textContent = count + " trattamenti";
    // porta l'inizio della lista sotto la barra dei filtri, se l'avevi superato
    var top = list.getBoundingClientRect().top + window.scrollY - filterBar.offsetHeight - 70;
    if (window.scrollY > top) window.scrollTo({ top: top });
  }

  row.addEventListener("click", function (e) {
    var chip = e.target.closest(".chip");
    if (chip) apply(chip.getAttribute("data-show"));
  });
})();
