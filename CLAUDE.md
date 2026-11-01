# Tower of London – kontext projektu

Webová aplikace kognitivního testu Tower of London pro školní výzkumný projekt. Uživatelská dokumentace (formát testů, logované sloupce, nasazení) je v `README.md`. Tento soubor shrnuje rozhodnutí, která z kódu nejsou na první pohled zřejmá.

## Technické zásady

- Čistě statická stránka (HTML + CSS + vanilla JS, ES5 styl s IIFE). Žádný build, žádné závislosti. Musí fungovat i otevřením `index.html` z disku (`file://`), proto se sada testů načítá jako `js/tests.js` (globální proměnná), ne přes `fetch`.
- Texty v UI, komentáře i dokumentace jsou česky.
- `js/tol.js` je sdílený pro prohlížeč i Node (`module.exports`), takže logiku úloh jde testovat a analyzovat z příkazové řádky (`require("./js/tol.js")`).
- Kolíky mají kapacity 3/2/1, kuličky R/G/B, stav = pole kolíků odspodu nahoru.

## Výzkumná hypotéza a sada úloh

Hypotéza: lidé preferují tahy, které viditelně přibližují cíl, takže úlohy s „překážkou“ jsou těžší i při stejném minimálním počtu tahů.

- Kulička je **na cílové pozici**, když je na stejném kolíku a ve stejné výšce jako v cíli.
- **Konflikt**: existuje tah přibližující cíl, ale optimální řešení musí udělat jiný.
- **Překážka** (`obstacle`): každé optimální řešení obsahuje aspoň jeden konflikt. Počítá `analyze()` v `js/tol.js`.
- Výchozí sada (`js/tests.js`): 10 dvojic `bez`/`prekazka` pro 4–8 tahů (2 dvojice na délku) + 2 cvičné úlohy. Úlohy ve dvojici mají stejný min. počet tahů, počet optimálních řešení, počet neprogresivních tahů i počet kuliček na cíli na startu. Vybráno úplným průchodem všech 1 260 kombinací start/cíl.
- U 1–3 tahů překážka se 3 kuličkami nastat nemůže. Silnější varianta (`away_moves_min > 0`, nutnost sundat kuličku z cíle) existuje až od 5 tahů a záměrně není v sadě.
- Při změně sady vždy ověřit, že `condition` odpovídá vypočtenému `obstacle` a že dvojice jsou spárované.

## Měření a logování

- Každý pokus = jeden záznam, sloupce v `COLUMNS` v `js/app.js` (popis v README). Uživatel chce měřit spíš víc než méně.
- Časy v ms od zobrazení úlohy. Interakce reaguje na `pointerdown` (ne `click`) a celá pracovní deska je rozdělená na tři sloupce bez mezer. Účelem je, aby přesnost mířením neovlivňovala naměřené časy.
- Tah se počítá až po položení na jiný kolík. Vrácení na stejný kolík = `cancelled_pickups`.

## Ukládání výsledků

- Každý záznam se uloží do `localStorage` (záloha, export CSV se středníkem a BOM pro Excel) a zařadí do fronty k odeslání.
- Odesílání: Google Apps Script (`apps-script/Code.gs`) zapisuje do Google Tabulky. URL je v `js/config.js`. POST s `Content-Type: text/plain`, aby nevznikl CORS preflight, který Apps Script nepodporuje. Při selhání zůstává záznam ve frontě a odešle se později. Server deduplikuje podle `record_id`.
- Skript má `@OnlyCurrentDoc`, bez toho Google autorizaci zablokoval („This app is blocked“).
- Při lokálním testování nikdy neodesílat data do skutečné tabulky: endpoint v testu vypnout nebo podvrhnout.

## Otevřené body

- Úvodní obrazovka s informovaným souhlasem: podobu ladí uživatel s kolegou, zatím neimplementovat.
