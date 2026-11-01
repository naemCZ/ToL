// Výchozí sada testů. Stejný formát lze načíst ze souboru .json (viz tests-example.json).
// Kolíky se zapisují odspodu nahoru, kapacity kolíků jsou 3, 2 a 1.
// R = červená, G = zelená, B = modrá. Minimální počet tahů a charakteristiky úlohy aplikace dopočítá sama.
//
// Sada testuje hypotézu, že lidé preferují tahy, které viditelně přibližují cíl.
// Pro každou délku řešení (4–8 tahů) jsou dvě spárované dvojice úloh:
//   condition "bez"      – optimální řešení lze provést tak, že kdykoli jde kuličku položit na cílovou pozici, udělá se to
//   condition "prekazka" – optimální řešení vyžaduje aspoň jednou odmítnout tah na cílovou pozici
//                          a kuličku dočasně odložit jinam
// Úlohy ve dvojici mají stejný minimální počet tahů, stejný počet optimálních řešení i stejný počet
// tahů, které cíl viditelně nepřibližují; liší se tedy jen přítomností překážky.
// U 5–7 tahů mají úlohy ve dvojici i stejný výchozí stav (u 4 a 8 tahů taková dvojice neexistuje).
// Pro 2–3 tahy překážka se třemi kuličkami nastat nemůže, proto jsou tyto délky jen cvičné.
window.DEFAULT_TEST_SET = {
  name: "Tower of London – překážky",
  capacities: [3, 2, 1],
  tests: [
    { id: "P1", practice: true, start: [["R", "G"], ["B"], []], goal: [["R", "B"], [], ["G"]] },
    { id: "P2", practice: true, start: [["R", "G"], ["B"], []], goal: [[], ["G", "R"], ["B"]] },

    { id: "L4a-bez",      pair: "L4a", condition: "bez",      start: [["R", "G"], [], ["B"]], goal: [["B"], ["G"], ["R"]] },
    { id: "L4a-prekazka", pair: "L4a", condition: "prekazka", start: [["R"], ["B"], ["G"]],   goal: [[], ["G", "R"], ["B"]] },
    { id: "L4b-bez",      pair: "L4b", condition: "bez",      start: [[], ["B", "G"], ["R"]], goal: [["G"], ["R"], ["B"]] },
    { id: "L4b-prekazka", pair: "L4b", condition: "prekazka", start: [["R"], ["G"], ["B"]],   goal: [[], ["B", "R"], ["G"]] },

    { id: "L5a-bez",      pair: "L5a", condition: "bez",      start: [["R", "G"], ["B"], []], goal: [["B"], ["G"], ["R"]] },
    { id: "L5a-prekazka", pair: "L5a", condition: "prekazka", start: [["R", "G"], ["B"], []], goal: [["G", "R", "B"], [], []] },
    { id: "L5b-bez",      pair: "L5b", condition: "bez",      start: [["R"], ["B", "G"], []], goal: [["G"], ["R"], ["B"]] },
    { id: "L5b-prekazka", pair: "L5b", condition: "prekazka", start: [["R"], ["B", "G"], []], goal: [[], ["G", "B"], ["R"]] },

    { id: "L6a-bez",      pair: "L6a", condition: "bez",      start: [["R", "G"], ["B"], []], goal: [["G"], ["R", "B"], []] },
    { id: "L6a-prekazka", pair: "L6a", condition: "prekazka", start: [["R", "G"], ["B"], []], goal: [["B", "R"], [], ["G"]] },
    { id: "L6b-bez",      pair: "L6b", condition: "bez",      start: [["R"], ["B", "G"], []], goal: [["B", "R"], ["G"], []] },
    { id: "L6b-prekazka", pair: "L6b", condition: "prekazka", start: [["R"], ["B", "G"], []], goal: [[], ["R", "B"], ["G"]] },

    { id: "L7a-bez",      pair: "L7a", condition: "bez",      start: [["R"], ["B", "G"], []], goal: [["B", "R", "G"], [], []] },
    { id: "L7a-prekazka", pair: "L7a", condition: "prekazka", start: [["R"], ["B", "G"], []], goal: [["B"], ["R"], ["G"]] },
    { id: "L7b-bez",      pair: "L7b", condition: "bez",      start: [["G"], ["B", "R"], []], goal: [["B", "G", "R"], [], []] },
    { id: "L7b-prekazka", pair: "L7b", condition: "prekazka", start: [["G"], ["B", "R"], []], goal: [["B"], ["G"], ["R"]] },

    { id: "L8a-bez",      pair: "L8a", condition: "bez",      start: [[], ["B", "G"], ["R"]],  goal: [["B", "R", "G"], [], []] },
    { id: "L8a-prekazka", pair: "L8a", condition: "prekazka", start: [["R", "G", "B"], [], []], goal: [[], ["R", "B"], ["G"]] },
    { id: "L8b-bez",      pair: "L8b", condition: "bez",      start: [[], ["B", "R"], ["G"]],  goal: [["B", "G", "R"], [], []] },
    { id: "L8b-prekazka", pair: "L8b", condition: "prekazka", start: [["R", "B", "G"], [], []], goal: [[], ["R", "G"], ["B"]] }
  ]
};
