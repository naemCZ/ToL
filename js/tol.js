// Logika úlohy Tower of London: stav, tahy, validace a výpočet minimálního počtu tahů.
// Stav = pole kolíků, každý kolík je pole kuliček odspodu nahoru, např. [["R","G"],["B"],[]].
(function (root) {
  "use strict";

  function key(state) {
    return state.map(function (peg) { return peg.join(""); }).join("|");
  }

  function clone(state) {
    return state.map(function (peg) { return peg.slice(); });
  }

  function equal(a, b) {
    return key(a) === key(b);
  }

  function canMove(state, capacities, from, to) {
    return from !== to && state[from].length > 0 && state[to].length < capacities[to];
  }

  function applyMove(state, from, to) {
    var next = clone(state);
    next[to].push(next[from].pop());
    return next;
  }

  // Nejkratší řešení pomocí BFS. Vrací počet tahů, nebo -1, když řešení neexistuje.
  function minMoves(start, goal, capacities) {
    var goalKey = key(goal);
    if (key(start) === goalKey) return 0;
    var seen = {};
    seen[key(start)] = true;
    var frontier = [start];
    var depth = 0;
    while (frontier.length) {
      depth++;
      var next = [];
      for (var i = 0; i < frontier.length; i++) {
        var s = frontier[i];
        for (var from = 0; from < s.length; from++) {
          for (var to = 0; to < s.length; to++) {
            if (!canMove(s, capacities, from, to)) continue;
            var n = applyMove(s, from, to);
            var k = key(n);
            if (k === goalKey) return depth;
            if (!seen[k]) { seen[k] = true; next.push(n); }
          }
        }
      }
      frontier = next;
    }
    return -1;
  }

  // Vzdálenosti (v tazích) ze stavu `from` do všech dosažitelných stavů.
  function distances(from, capacities) {
    var dist = {}, states = {};
    dist[key(from)] = 0;
    states[key(from)] = from;
    var frontier = [from];
    while (frontier.length) {
      var next = [];
      frontier.forEach(function (s) {
        var d = dist[key(s)];
        for (var f = 0; f < s.length; f++) {
          for (var t = 0; t < s.length; t++) {
            if (!canMove(s, capacities, f, t)) continue;
            var n = applyMove(s, f, t), k = key(n);
            if (k in dist) continue;
            dist[k] = d + 1;
            states[k] = n;
            next.push(n);
          }
        }
      });
      frontier = next;
    }
    return { dist: dist, states: states };
  }

  // Počet kuliček, které už leží na své cílové pozici (stejný kolík i výška jako v cíli).
  function correctCount(state, goal) {
    var n = 0;
    state.forEach(function (peg, p) {
      peg.forEach(function (ball, h) { if (goal[p][h] === ball) n++; });
    });
    return n;
  }

  // Změna počtu kuliček na cílové pozici po tahu: +1 tah viditelně přibližuje cíl,
  // 0 neutrální tah, -1 tah odebírá kuličku z její cílové pozice („protiintuitivní“ tah).
  function moveProgress(before, after, goal) {
    return correctCount(after, goal) - correctCount(before, goal);
  }

  // Rozbor úlohy. Všechny tahy jsou vratné, takže vzdálenost do cíle = BFS od cíle.
  //   minMoves            – délka optimálního řešení
  //   optimalSolutions    – počet různých optimálních řešení
  //   minNonProgressMoves – nejmenší počet tahů, které nepřiblíží cíl (progress <= 0), v optimálním řešení
  //   minGreedyConflicts  – nejmenší počet situací v optimálním řešení, kdy je k dispozici tah přibližující cíl,
  //                         ale optimální je jiný tah (kuličku je nutné dočasně odložit mimo cílovou pozici)
  //   obstacle            – úloha s překážkou: minGreedyConflicts > 0, tj. strategie „vždy, když to jde,
  //                         polož kuličku na cílovou pozici“ nevede k optimálnímu řešení
  //   minAwayMoves        – nejmenší počet tahů, které musí kuličku odebrat z její cílové pozice (silnější překážka)
  //   greedyTraps         – počet prvních tahů, které viditelně přibližují cíl, ale nevedou k optimálnímu řešení
  function analyze(start, goal, capacities) {
    var fromStart = distances(start, capacities);
    var fromGoal = distances(goal, capacities);
    var L = fromStart.dist[key(goal)];
    if (L === undefined) return { minMoves: -1 };

    // Hrany optimálních řešení: u -> v, kde dS(u) + 1 + dG(v) = L.
    function optimalNext(s) {
      var out = [];
      var ds = fromStart.dist[key(s)];
      for (var f = 0; f < s.length; f++) {
        for (var t = 0; t < s.length; t++) {
          if (!canMove(s, capacities, f, t)) continue;
          var n = applyMove(s, f, t);
          if (ds + 1 + fromGoal.dist[key(n)] === L) out.push(n);
        }
      }
      return out;
    }

    // Dynamické programování od cíle zpět po vrstvách optimálních řešení.
    // Existuje ze stavu s nějaký legální tah, který viditelně přibližuje cíl?
    function hasProgressMove(s) {
      for (var f = 0; f < s.length; f++) {
        for (var t = 0; t < s.length; t++) {
          if (canMove(s, capacities, f, t) && moveProgress(s, applyMove(s, f, t), goal) > 0) return true;
        }
      }
      return false;
    }

    var memo = {};
    function solve(s) {
      var k = key(s);
      if (memo[k]) return memo[k];
      if (k === key(goal)) return (memo[k] = { paths: 1, away: 0, nonProgress: 0, conflicts: 0 });
      var best = { paths: 0, away: Infinity, nonProgress: Infinity, conflicts: Infinity };
      var tempting = hasProgressMove(s);
      optimalNext(s).forEach(function (n) {
        var sub = solve(n);
        var prog = moveProgress(s, n, goal);
        best.paths += sub.paths;
        best.away = Math.min(best.away, sub.away + (prog < 0 ? 1 : 0));
        best.nonProgress = Math.min(best.nonProgress, sub.nonProgress + (prog <= 0 ? 1 : 0));
        // Konflikt: k dispozici je tah přibližující cíl, ale optimální řešení musí udělat jiný.
        best.conflicts = Math.min(best.conflicts, sub.conflicts + (tempting && prog <= 0 ? 1 : 0));
      });
      return (memo[k] = best);
    }
    var res = solve(start);

    var traps = 0;
    for (var f = 0; f < start.length; f++) {
      for (var t = 0; t < start.length; t++) {
        if (!canMove(start, capacities, f, t)) continue;
        var n = applyMove(start, f, t);
        if (moveProgress(start, n, goal) > 0 && 1 + fromGoal.dist[key(n)] !== L) traps++;
      }
    }

    return {
      minMoves: L,
      optimalSolutions: res.paths,
      obstacle: res.conflicts > 0,
      minGreedyConflicts: res.conflicts,
      minNonProgressMoves: res.nonProgress,
      minAwayMoves: res.away,
      greedyTraps: traps,
      startCorrect: correctCount(start, goal)
    };
  }

  // Zkontroluje sadu testů a doplní výchozí hodnoty. Vrací { set, errors }.
  function validateSet(raw) {
    var errors = [];
    var set = {
      name: raw.name || "Bez názvu",
      capacities: raw.capacities || [3, 2, 1],
      colors: raw.colors || { R: "#d93b3b", G: "#2f9e44", B: "#1c6fd1" },
      tests: []
    };
    if (!Array.isArray(raw.tests) || raw.tests.length === 0) {
      errors.push("Sada neobsahuje pole \"tests\" s alespoň jedním testem.");
      return { set: set, errors: errors };
    }
    raw.tests.forEach(function (t, i) {
      var label = t.id || ("#" + (i + 1));
      var problems = [];
      [["start", t.start], ["goal", t.goal]].forEach(function (pair) {
        var st = pair[1];
        if (!Array.isArray(st) || st.length !== set.capacities.length) {
          problems.push(pair[0] + ": musí mít " + set.capacities.length + " kolíky");
          return;
        }
        st.forEach(function (peg, p) {
          if (peg.length > set.capacities[p]) problems.push(pair[0] + ": kolík " + (p + 1) + " je přeplněný");
        });
      });
      if (!problems.length) {
        var a = [].concat.apply([], t.start).sort().join("");
        var b = [].concat.apply([], t.goal).sort().join("");
        if (a !== b) problems.push("start a goal nemají stejné kuličky");
      }
      if (problems.length) {
        errors.push("Test " + label + ": " + problems.join("; "));
        return;
      }
      var info = analyze(t.start, t.goal, set.capacities);
      set.tests.push({
        id: t.id || ("T" + (i + 1)),
        start: t.start,
        goal: t.goal,
        practice: !!t.practice,
        condition: t.condition || "",   // volný popisek podmínky ze sady testů
        pair: t.pair || "",             // ID spárované dvojice úloh
        maxMoves: t.maxMoves || null,
        timeLimitSec: t.timeLimitSec || null,
        minMoves: info.minMoves,
        info: info
      });
    });
    return { set: set, errors: errors };
  }

  var api = {
    key: key, clone: clone, equal: equal, canMove: canMove, applyMove: applyMove,
    minMoves: minMoves, distances: distances, correctCount: correctCount, moveProgress: moveProgress,
    analyze: analyze, validateSet: validateSet
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ToL = api;
})(this);
