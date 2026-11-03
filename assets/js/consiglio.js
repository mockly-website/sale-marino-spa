/* Tre domande che consigliano un trattamento */
(function () {
  "use strict";
  var quiz = document.querySelector("[data-quiz]");
  if (!quiz || !window.SALE_DATI) return;

  var byId = {};
  window.SALE_DATI.trattamenti.forEach(function (t) { byId[t.id] = t; });

  // punti per ogni risposta
  var POINTS = {
    spalle: { "pietre-calde": 3, "massaggio-rilassante": 3, "linfodrenaggio": 2, "scrub-sale": 1 },
    pelle: { "pulizia-viso": 3, "maschera-alghe": 3, "scrub-sale": 2, "laminazione-ciglia": 1 },
    ordine: { "manicure-semi": 3, "pedicure": 3, "sopracciglia": 2, "laminazione-ciglia": 2 },
    breve: { "maschera-alghe": 2, "scrub-sale": 2, "sopracciglia": 2 },
    ora: { "massaggio-rilassante": 2, "pulizia-viso": 2, "manicure-semi": 2, "pedicure": 2, "laminazione-ciglia": 2, "linfodrenaggio": 1 },
    lungo: { "pietre-calde": 3, "pulizia-viso": 1, "linfodrenaggio": 2 },
    mani: { "massaggio-rilassante": 2, "pietre-calde": 2, "linfodrenaggio": 2, "pedicure": 1 },
    silenzio: { "maschera-alghe": 2, "pulizia-viso": 2, "pietre-calde": 1 },
    risultato: { "manicure-semi": 2, "sopracciglia": 2, "laminazione-ciglia": 2, "scrub-sale": 1 }
  };
  var WHY = {
    spalle: "Hai detto che ti servono spalle più leggere",
    pelle: "Hai detto che vuoi una pelle che respira",
    ordine: "Hai detto che vuoi sentirti in ordine"
  };

  var steps = quiz.querySelectorAll(".quiz__step");
  var bars = quiz.querySelectorAll(".quiz__progress span");
  var back = quiz.querySelector("[data-quiz-back]");
  var result = quiz.querySelector("[data-quiz-result]");
  var answers = [];
  var busy = false;

  function show(i) {
    steps.forEach(function (s, n) { s.hidden = n !== i; });
    bars.forEach(function (b, n) { b.classList.toggle("is-done", n < i); });
    back.hidden = i === 0;
    result.hidden = true;
    steps[i].querySelectorAll(".answer").forEach(function (a) { a.classList.remove("is-picked"); });
    if (answers.length) steps[i].querySelector(".quiz__q").focus({ preventScroll: true });
  }

  function finish() {
    var score = {};
    answers.forEach(function (a) {
      var p = POINTS[a] || {};
      Object.keys(p).forEach(function (id) { score[id] = (score[id] || 0) + p[id]; });
    });
    var ranked = Object.keys(score).sort(function (a, b) { return score[b] - score[a] || byId[b].prezzo - byId[a].prezzo; });
    var best = byId[ranked[0]];
    var also = byId[ranked[1]];
    steps.forEach(function (s) { s.hidden = true; });
    bars.forEach(function (b) { b.classList.add("is-done"); });
    back.hidden = true;
    result.innerHTML =
      '<div class="result">' +
        '<p class="result__kicker">' + WHY[answers[0]] + ". Ti consigliamo:</p>" +
        '<h3 class="result__name" tabindex="-1">' + best.nome + "</h3>" +
        '<p class="result__meta"><span>' + best.min + " min</span><span>" + best.prezzo + " € di esempio</span></p>" +
        '<p class="result__why">' + best.desc + "</p>" +
        '<p class="result__tip">Prima di venire: ' + best.prima + "</p>" +
        '<div class="result__actions">' +
          '<a class="btn btn--light" href="prenota.html?t=' + best.id + '">Prenota questo</a>' +
          '<button class="result__again" type="button">Rifai le domande</button>' +
        "</div>" +
        (also ? '<p class="result__also">Ti potrebbe piacere anche: <a href="trattamenti.html#' + also.cat + '">' + also.nome + "</a></p>" : "") +
      "</div>";
    result.hidden = false;
    result.querySelector(".result__name").focus({ preventScroll: true });
    result.querySelector(".result__again").addEventListener("click", function () {
      answers = [];
      show(0);
      steps[0].querySelector(".quiz__q").focus({ preventScroll: true });
    });
  }

  quiz.addEventListener("click", function (e) {
    var btn = e.target.closest(".answer");
    if (!btn || busy) return;
    busy = true;
    var i = answers.length;
    btn.classList.add("is-picked");
    answers.push(btn.getAttribute("data-answer"));
    bars[i].classList.add("is-done");
    // una piccola pausa: si vede la scelta prima di passare oltre
    setTimeout(function () {
      busy = false;
      if (answers.length === steps.length) finish(); else show(answers.length);
    }, 260);
  });
  back.addEventListener("click", function () {
    answers.pop();
    show(answers.length);
  });
})();
