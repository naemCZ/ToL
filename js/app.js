// Uživatelské rozhraní testu, měření časů a ukládání výsledků.
(function () {
  "use strict";

  var STORAGE_KEY = "tol.results.v1";
  var SVG_NS = "http://www.w3.org/2000/svg";
  var BALL_R = 24;
  var PEG_X = [70, 180, 290];
  var BASE_Y = 205;
  // Hranice sloupců kolíků v souřadnicích desky (šířka 360). Celá pracovní deska je klikací
  // a kliknutí kamkoli do sloupce platí pro jeho kolík, takže není nutné mířit přesně na kuličku.
  var COL_BOUNDS = [0, 125, 235, 360];
  var hoverCol = null;

  var $ = function (id) { return document.getElementById(id); };

  var testSet = null;     // aktuálně načtená, zvalidovaná sada
  var session = null;     // probíhající relace
  var trial = null;       // probíhající pokus
  var timerId = null;

  // ---------- Ukládání výsledků ----------

  function loadResults() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
  }

  function saveResult(record) {
    var all = loadResults();
    all.push(record);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); }
    catch (e) { console.warn("Výsledek se nepodařilo uložit do prohlížeče:", e); }
  }

  // ---------- Odesílání výsledků na server (Google Tabulka) ----------
  // Každý záznam se nejdřív zařadí do fronty v localStorage a odtud se odesílá.
  // Když odeslání selže (např. bez internetu), zkusí se znovu později. Server duplicity podle record_id přeskočí.

  var OUTBOX_KEY = "tol.outbox.v1";
  var sending = false;

  function endpoint() {
    return (window.TOL_CONFIG && window.TOL_CONFIG.resultsEndpoint) || "";
  }

  function loadOutbox() {
    try { return JSON.parse(localStorage.getItem(OUTBOX_KEY)) || []; }
    catch (e) { return []; }
  }

  function storeOutbox(list) {
    try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(list)); }
    catch (e) { console.warn("Frontu k odeslání se nepodařilo uložit:", e); }
  }

  function enqueue(record) {
    if (!endpoint()) return;
    var list = loadOutbox();
    list.push(record);
    storeOutbox(list);
    flushOutbox();
  }

  function flushOutbox() {
    if (!endpoint() || sending) return Promise.resolve();
    var batch = loadOutbox();
    if (!batch.length) { updateSyncInfo(); return Promise.resolve(); }
    sending = true;
    updateSyncInfo();
    // text/plain = „jednoduchý“ požadavek bez CORS preflightu, který Apps Script nepodporuje.
    return fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ records: batch })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.ok) throw new Error((data && data.error) || "neznámá chyba serveru");
        var sent = {};
        batch.forEach(function (r) { sent[r.record_id] = true; });
        // Mezitím mohly přibýt nové záznamy – odebereme jen ty odeslané.
        storeOutbox(loadOutbox().filter(function (r) { return !sent[r.record_id]; }));
        lastSyncError = null;
      })
      .catch(function (err) {
        lastSyncError = err.message || String(err);
        console.warn("Odeslání výsledků selhalo, zkusí se znovu později:", err);
      })
      .then(function () {
        sending = false;
        updateSyncInfo();
        if (!lastSyncError && loadOutbox().length) flushOutbox();
      });
  }

  var lastSyncError = null;

  function updateSyncInfo() {
    var text;
    if (!endpoint()) text = "Online ukládání není nastavené (js/config.js), výsledky jsou jen v tomto prohlížeči.";
    else {
      var pending = loadOutbox().length;
      if (sending) text = "Odesílám výsledky na server…";
      else if (!pending) text = "Všechny výsledky jsou odeslané na server.";
      else text = "Na odeslání čeká " + pending + " pokusů" + (lastSyncError ? " (poslední pokus selhal: " + lastSyncError + ")" : "") + ". Odešlou se automaticky, jakmile to půjde.";
    }
    ["sync-info", "sync-info-end"].forEach(function (id) { if ($(id)) $(id).textContent = text; });
    if ($("btn-sync")) $("btn-sync").hidden = !endpoint() || !loadOutbox().length || sending;
  }

  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  var COLUMNS = [
    "record_id", "participant", "session_id", "set_name", "trial_order", "test_id", "practice",
    "pair", "condition", "obstacle", "greedy_conflicts_min", "nonprogress_moves_min", "away_moves_min",
    "optimal_solutions", "greedy_traps_start",
    "min_moves", "moves", "excess_moves", "result", "solved",
    "planning_time_ms", "first_move_end_ms", "first_move_duration_ms", "execution_time_ms", "total_time_ms",
    "cancelled_pickups", "invalid_drops",
    "progress_moves", "neutral_moves", "away_moves", "optimal_moves", "lured_moves",
    "first_move_progress", "first_move_optimal", "move_progress",
    "max_moves", "time_limit_s", "started_at", "move_sequence", "move_pickup_times_ms", "move_times_ms",
    "screen", "user_agent"
  ];

  function toCsv(records) {
    var esc = function (v) {
      if (v === null || v === undefined) return "";
      var s = String(v);
      return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    var lines = [COLUMNS.join(";")];
    records.forEach(function (r) {
      lines.push(COLUMNS.map(function (c) { return esc(r[c]); }).join(";"));
    });
    return "﻿" + lines.join("\r\n");
  }

  function download(filename, content, mime) {
    var blob = new Blob([content], { type: mime });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  function stamp() {
    return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  }

  function updateStoredInfo() {
    var all = loadResults();
    var people = {};
    all.forEach(function (r) { people[r.participant] = true; });
    $("stored-info").textContent = all.length
      ? "Uloženo " + all.length + " pokusů od " + Object.keys(people).length + " účastníků."
      : "Zatím nejsou uložené žádné výsledky.";
  }

  // ---------- Sada testů ----------

  function useSet(raw) {
    var res = ToL.validateSet(raw);
    var errBox = $("set-errors");
    errBox.innerHTML = "";
    res.errors.forEach(function (msg) {
      var li = document.createElement("li");
      li.textContent = msg;
      errBox.appendChild(li);
    });
    res.set.tests.forEach(function (t) {
      if (t.minMoves < 0) {
        var li = document.createElement("li");
        li.textContent = "Test " + t.id + ": cílový stav nelze ze startu dosáhnout.";
        errBox.appendChild(li);
      }
    });
    errBox.hidden = !errBox.children.length;
    res.set.tests = res.set.tests.filter(function (t) { return t.minMoves >= 0; });

    testSet = res.set;
    var practice = testSet.tests.filter(function (t) { return t.practice; }).length;
    $("set-name").textContent = testSet.name;
    $("set-info").textContent = "(" + (testSet.tests.length - practice) + " testů + " + practice + " cvičné)";
    $("btn-start").disabled = testSet.tests.length === 0;
  }

  // ---------- Vykreslení desky ----------

  function el(name, attrs, parent) {
    var node = document.createElementNS(SVG_NS, name);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function drawBoard(svg, state, opts) {
    opts = opts || {};
    svg.innerHTML = "";
    var caps = testSet.capacities;
    el("rect", { x: 10, y: BASE_Y, width: 340, height: 16, rx: 4, "class": "base" }, svg);

    caps.forEach(function (cap, p) {
      var x = PEG_X[p];
      var h = cap * BALL_R * 2 + 12;
      var g = el("g", { "class": state[p].length >= cap ? "peg-full" : "" }, svg);
      if (opts.interactive) {
        // Zvýraznění sloupce pod myší. Kliknutí samotné řeší handler na celé desce (viz pegFromEvent).
        el("rect", {
          x: COL_BOUNDS[p] + 3, y: 3, width: COL_BOUNDS[p + 1] - COL_BOUNDS[p] - 6, height: 224, rx: 8,
          "class": "col-hl" + (hoverCol === p ? " on" : "")
        }, g);
      }
      el("rect", { x: x - 5, y: BASE_Y - h, width: 10, height: h, rx: 3, "class": "peg" }, g);

      state[p].forEach(function (ball, i) {
        var lifted = opts.held && opts.held.peg === p && i === state[p].length - 1;
        var cy = lifted ? BALL_R + 2 : BASE_Y - BALL_R - i * BALL_R * 2;
        el("circle", {
          cx: x, cy: cy, r: BALL_R - 1,
          fill: testSet.colors[ball] || "#999",
          "class": "ball" + (lifted ? " held" : "")
        }, svg);
      });
    });
  }

  // ---------- Průběh relace ----------

  function show(id) {
    ["screen-setup", "screen-task", "screen-between", "screen-end"].forEach(function (s) {
      $(s).hidden = s !== id;
    });
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function startSession() {
    var participant = $("participant").value.trim();
    if (!participant) {
      $("participant").focus();
      $("participant").placeholder = "Vyplňte ID účastníka";
      return;
    }
    var practice = testSet.tests.filter(function (t) { return t.practice; });
    var main = testSet.tests.filter(function (t) { return !t.practice; });
    if ($("opt-shuffle").checked) shuffle(main);

    session = {
      id: participant + "-" + stamp(),
      participant: participant,
      order: practice.concat(main),
      index: 0,
      records: [],
      showCounter: $("opt-counter").checked,
      showMin: $("opt-min").checked
    };
    startTrial();
  }

  function startTrial() {
    var test = session.order[session.index];
    trial = {
      test: test,
      state: ToL.clone(test.start),
      held: null,
      moves: [],
      moveTimes: [],          // časy položení kuličky (dokončení tahu)
      pickupTimes: [],        // časy zvednutí kuličky u dokončených tahů
      cancelledPickups: 0,    // zvednutí a vrácení na stejný kolík
      invalidDrops: 0,        // pokus položit kuličku na plný kolík
      distToGoal: ToL.distances(test.goal, testSet.capacities).dist,
      progress: [],           // u každého tahu: +1 přiblížil cíl, 0 neutrální, -1 odebral kuličku z cílové pozice
      optimal: [],            // u každého tahu: 1 = zkrátil vzdálenost k cíli (leží na nějakém optimálním řešení)
      firstActionAt: null,
      startedAt: new Date(),
      t0: performance.now(),
      done: false
    };
    show("screen-task");
    var mainCount = session.order.filter(function (t) { return !t.practice; }).length;
    var mainIndex = session.order.slice(0, session.index + 1).filter(function (t) { return !t.practice; }).length;
    $("trial-label").textContent = test.practice
      ? "Cvičná úloha " + test.id
      : "Úloha " + mainIndex + " / " + mainCount;
    drawBoard($("goal-board"), test.goal);
    render();
    clearInterval(timerId);
    if (test.timeLimitSec) timerId = setInterval(tick, 200);
  }

  function elapsed() { return performance.now() - trial.t0; }

  function tick() {
    if (!trial || trial.done) return;
    if (trial.test.timeLimitSec && elapsed() >= trial.test.timeLimitSec * 1000) finishTrial("timeout");
    else updateStatus();
  }

  function updateStatus() {
    var parts = [];
    if (session.showCounter) parts.push("Tahy: " + trial.moves.length + (trial.test.maxMoves ? " / " + trial.test.maxMoves : ""));
    if (session.showMin) parts.push("Minimum: " + trial.test.minMoves);
    if (trial.test.timeLimitSec) {
      var left = Math.max(0, trial.test.timeLimitSec - elapsed() / 1000);
      parts.push("Zbývá: " + Math.ceil(left) + " s");
    }
    $("trial-status").textContent = parts.join("   ·   ");
  }

  function render() {
    drawBoard($("work-board"), trial.state, { interactive: true, held: trial.held });
    updateStatus();
  }

  function onPeg(p) {
    if (!trial || trial.done) return;
    var caps = testSet.capacities;
    if (trial.firstActionAt === null && trial.state[p].length) trial.firstActionAt = elapsed();

    if (trial.held === null) {
      if (trial.state[p].length) trial.held = { peg: p, at: elapsed() };
    } else if (trial.held.peg === p) {
      trial.held = null;                       // položení zpět na stejný kolík se nepočítá jako tah
      trial.cancelledPickups++;
    } else if (ToL.canMove(trial.state, caps, trial.held.peg, p)) {
      var before = trial.state;
      trial.state = ToL.applyMove(trial.state, trial.held.peg, p);
      trial.progress.push(ToL.moveProgress(before, trial.state, trial.test.goal));
      trial.optimal.push(trial.distToGoal[ToL.key(trial.state)] === trial.distToGoal[ToL.key(before)] - 1 ? 1 : 0);
      trial.moves.push((trial.held.peg + 1) + ">" + (p + 1));
      trial.pickupTimes.push(Math.round(trial.held.at));
      trial.moveTimes.push(Math.round(elapsed()));
      trial.held = null;
    } else {
      trial.invalidDrops++;
    }
    render();

    if (ToL.equal(trial.state, trial.test.goal)) finishTrial("solved");
    else if (trial.test.maxMoves && trial.moves.length >= trial.test.maxMoves) finishTrial("max_moves");
  }

  function finishTrial(result) {
    if (trial.done) return;
    trial.done = true;
    clearInterval(timerId);
    var total = Math.round(elapsed());
    var planning = trial.firstActionAt === null ? null : Math.round(trial.firstActionAt);
    var firstMoveEnd = trial.moveTimes.length ? trial.moveTimes[0] : null;
    var test = trial.test;
    var data = {
      record_id: newId(),
      participant: session.participant,
      session_id: session.id,
      set_name: testSet.name,
      trial_order: session.index + 1,
      test_id: test.id,
      practice: test.practice ? 1 : 0,
      pair: test.pair,
      condition: test.condition,
      obstacle: test.info.obstacle ? 1 : 0,
      greedy_conflicts_min: test.info.minGreedyConflicts,
      nonprogress_moves_min: test.info.minNonProgressMoves,
      away_moves_min: test.info.minAwayMoves,
      optimal_solutions: test.info.optimalSolutions,
      greedy_traps_start: test.info.greedyTraps,
      min_moves: test.minMoves,
      moves: trial.moves.length,
      excess_moves: result === "solved" ? trial.moves.length - test.minMoves : null,
      result: result,
      solved: result === "solved" ? 1 : 0,
      planning_time_ms: planning,
      first_move_end_ms: firstMoveEnd,
      first_move_duration_ms: firstMoveEnd === null ? null : firstMoveEnd - trial.pickupTimes[0],
      execution_time_ms: planning === null ? null : total - planning,
      total_time_ms: total,
      cancelled_pickups: trial.cancelledPickups,
      invalid_drops: trial.invalidDrops,
      progress_moves: count(trial.progress, function (v) { return v > 0; }),
      neutral_moves: count(trial.progress, function (v) { return v === 0; }),
      away_moves: count(trial.progress, function (v) { return v < 0; }),
      optimal_moves: count(trial.optimal, function (v) { return v === 1; }),
      // Tah, který viditelně přiblížil cíl, ale prodloužil cestu k řešení – „skočil na návnadu“.
      lured_moves: count(trial.progress, function (v, i) { return v > 0 && !trial.optimal[i]; }),
      first_move_progress: trial.progress.length ? trial.progress[0] : null,
      first_move_optimal: trial.optimal.length ? trial.optimal[0] : null,
      move_progress: trial.progress.join(" "),
      max_moves: test.maxMoves,
      time_limit_s: test.timeLimitSec,
      started_at: trial.startedAt.toISOString(),
      move_sequence: trial.moves.join(" "),
      move_pickup_times_ms: trial.pickupTimes.join(" "),
      move_times_ms: trial.moveTimes.join(" "),
      screen: screen.width + "x" + screen.height,
      user_agent: navigator.userAgent
    };
    // Klíče v pořadí sloupců – podle nich server sestaví hlavičku tabulky.
    var record = {};
    COLUMNS.forEach(function (c) { record[c] = data[c] === undefined ? null : data[c]; });
    session.records.push(record);
    saveResult(record);
    enqueue(record);

    var titles = { solved: "Správně!", max_moves: "Došly tahy", timeout: "Čas vypršel", skipped: "Úloha přeskočena" };
    $("between-title").textContent = titles[result] || "";
    $("between-text").textContent = result === "solved"
      ? "Vyřešeno na " + record.moves + " " + plural(record.moves) + "."
      : "";
    var last = session.index >= session.order.length - 1;
    $("btn-next").textContent = last ? "Zobrazit výsledky" : "Další úloha";
    // Krátká prodleva, aby účastník viděl poslední tah.
    setTimeout(function () { show("screen-between"); $("btn-next").focus(); }, result === "solved" ? 500 : 0);
  }

  function count(arr, pred) {
    return arr.filter(pred).length;
  }

  function plural(n) { return n === 1 ? "tah" : (n >= 2 && n <= 4 ? "tahy" : "tahů"); }

  function nextTrial() {
    session.index++;
    if (session.index < session.order.length) startTrial();
    else endSession();
  }

  function endSession() {
    trial = null;
    show("screen-end");
    var cols = ["trial_order", "test_id", "practice", "obstacle", "min_moves", "moves", "lured_moves", "result", "planning_time_ms", "first_move_end_ms", "total_time_ms"];
    var heads = ["#", "Test", "Cvičná", "Překážka", "Min. tahů", "Tahů", "Návnady", "Výsledek", "Plánování (ms)", "Konec 1. tahu (ms)", "Celkem (ms)"];
    var table = $("results-table");
    table.innerHTML = "";
    var tr = table.insertRow();
    heads.forEach(function (h) { var th = document.createElement("th"); th.textContent = h; tr.appendChild(th); });
    session.records.forEach(function (r) {
      var row = table.insertRow();
      cols.forEach(function (c) { row.insertCell().textContent = r[c] === null ? "–" : r[c]; });
    });
    updateStoredInfo();
  }

  // ---------- Události ----------

  // Index kolíku podle vodorovné pozice ukazatele nad pracovní deskou (i nad popiskem a okraji).
  function pegFromEvent(e) {
    var rect = $("work-board").getBoundingClientRect();
    var x = (e.clientX - rect.left) / rect.width * 360;
    for (var p = 0; p < COL_BOUNDS.length - 1; p++) {
      if (x < COL_BOUNDS[p + 1]) return p;
    }
    return COL_BOUNDS.length - 2;
  }

  function setHover(p) {
    if (p === hoverCol) return;
    hoverCol = p;
    var cols = $("work-board").querySelectorAll(".col-hl");
    for (var i = 0; i < cols.length; i++) cols[i].classList.toggle("on", i === p);
  }

  var workArea = $("work-board").parentNode;
  // pointerdown místo click: reaguje hned při stisku a nezahodí se, když se myš mezi stiskem
  // a uvolněním trochu posune (click by se v takovém případě nemusel vůbec vyvolat).
  workArea.addEventListener("pointerdown", function (e) {
    if (e.button !== 0) return;
    e.preventDefault();
    onPeg(pegFromEvent(e));
  });
  workArea.addEventListener("pointermove", function (e) { setHover(pegFromEvent(e)); });
  workArea.addEventListener("pointerleave", function () { setHover(null); });

  $("set-file").addEventListener("change", function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try { useSet(JSON.parse(reader.result)); }
      catch (err) {
        $("set-errors").innerHTML = "<li>Soubor není platný JSON: " + err.message + "</li>";
        $("set-errors").hidden = false;
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });
  $("set-default").addEventListener("click", function () { useSet(window.DEFAULT_TEST_SET); });
  $("btn-start").addEventListener("click", startSession);
  $("participant").addEventListener("keydown", function (e) { if (e.key === "Enter") startSession(); });
  $("btn-next").addEventListener("click", nextTrial);
  $("btn-skip").addEventListener("click", function () { finishTrial("skipped"); });
  $("btn-abort").addEventListener("click", function () {
    if (!confirm("Opravdu ukončit test? Dosavadní výsledky zůstanou uložené.")) return;
    clearInterval(timerId);
    if (session.records.length) endSession();
    else { trial = null; show("screen-setup"); }
  });
  $("btn-home").addEventListener("click", function () { show("screen-setup"); updateStoredInfo(); });
  $("btn-export-session").addEventListener("click", function () {
    download("tol_" + session.id + ".csv", toCsv(session.records), "text/csv;charset=utf-8");
  });
  $("btn-export-all").addEventListener("click", function () {
    download("tol_vysledky_" + stamp() + ".csv", toCsv(loadResults()), "text/csv;charset=utf-8");
  });
  $("btn-export-json").addEventListener("click", function () {
    download("tol_vysledky_" + stamp() + ".json", JSON.stringify(loadResults(), null, 2), "application/json");
  });
  $("btn-clear").addEventListener("click", function () {
    if (!confirm("Opravdu smazat všechny uložené výsledky? Před smazáním je doporučeno je exportovat.")) return;
    localStorage.removeItem(STORAGE_KEY);
    updateStoredInfo();
  });

  $("btn-sync").addEventListener("click", function () { flushOutbox(); });
  window.addEventListener("online", function () { flushOutbox(); });
  setInterval(function () { if (loadOutbox().length) flushOutbox(); }, 60000);

  useSet(window.DEFAULT_TEST_SET);
  updateStoredInfo();
  updateSyncInfo();
  flushOutbox();
})();
