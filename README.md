# Tower of London

Webová aplikace pro kognitivní test Tower of London. Nepotřebuje instalaci ani server: stačí otevřít `index.html` v prohlížeči. Volitelně může výsledky automaticky ukládat do Google Tabulky (viz „Online sběr výsledků“).

## Soubory

| Soubor | Obsah |
|---|---|
| `index.html` | Obrazovky aplikace |
| `css/style.css` | Vzhled |
| `js/tol.js` | Logika úlohy: tahy, validace sady, výpočet minimálního počtu tahů a rozbor překážek |
| `js/tests.js` | Výchozí sada testů: 2 cvičné + 20 testů (10 dvojic s překážkou a bez ní, 4–8 tahů) |
| `js/app.js` | Průběh testu, měření časů, ukládání, odesílání na server a export |
| `js/config.js` | Nastavení: adresa, kam se odesílají výsledky |
| `apps-script/Code.gs` | Skript pro Google Tabulku, který přijímá výsledky |
| `tests-example.json` | Příklad vlastní sady, kterou lze načíst tlačítkem v aplikaci |

## Formát sady testů

```json
{
  "name": "Moje sada",
  "capacities": [3, 2, 1],
  "tests": [
    { "id": "P1", "practice": true, "start": [["R","G"],["B"],[]], "goal": [["R"],["B","G"],[]] },
    { "id": "T1", "start": [["R","G"],["B"],[]], "goal": [["G"],["B"],["R"]], "maxMoves": 10, "timeLimitSec": 60 }
  ]
}
```

- Kolíky se zapisují **odspodu nahoru**. `R` = červená, `G` = zelená, `B` = modrá.
- `practice`: cvičná úloha, která se vždy zobrazí první. Ve výsledcích je označená sloupcem `practice = 1`.
- `maxMoves` a `timeLimitSec` jsou nepovinné limity.
- `condition` a `pair` jsou nepovinné popisky (podmínka a ID dvojice). Jen se přepíšou do výsledků.
- Minimální počet tahů a charakteristiky úlohy (viz níže) se dopočítají automaticky.

## Úlohy s překážkou

Hypotéza: lidé preferují tahy, které viditelně přibližují cíl. Úlohy, kde optimální řešení vyžaduje dočasně odložit kuličku mimo její cílovou pozici, jsou proto těžší, i když mají stejný minimální počet tahů.

**Definice (počítá `analyze()` v `js/tol.js`):**

- Kulička je **na cílové pozici**, když leží na stejném kolíku a ve stejné výšce jako v cílovém stavu.
- Tah **přibližuje cíl** (`+1`), když po něm přibude kulička na cílové pozici. Tah je **neutrální** (`0`), když se počet nezmění. Tah **jde od cíle** (`−1`), když odebere kuličku z cílové pozice.
- **Konflikt** nastává, když je v dané situaci k dispozici tah přibližující cíl, ale optimální řešení musí udělat jiný tah.
- **Úloha s překážkou** je taková, kde *každé* optimální řešení obsahuje aspoň jeden konflikt. Jinými slovy, strategie „kdykoli to jde, polož kuličku na cílovou pozici“ k optimálnímu řešení nevede.

**Výchozí sada** obsahuje pro každou délku řešení 4, 5, 6, 7 a 8 tahů dvě dvojice úloh (`bez` / `prekazka`). Úlohy ve dvojici mají stejný:

- minimální počet tahů,
- počet různých optimálních řešení,
- minimální počet tahů, které cíl viditelně nepřibližují,
- počet kuliček na cílové pozici na začátku (všude 0).

Dvojice se tak liší jen přítomností konfliktu. U 5–7 tahů mají úlohy ve dvojici i stejný výchozí stav. U 4 a 8 tahů taková dvojice neexistuje, proto mají různé starty se stejnými parametry.

Se třemi kuličkami a kolíky 3/2/1 nemůže překážka podle této definice nastat u úloh na 1–3 tahy. Proto jsou cvičné úlohy (2 a 3 tahy) bez překážky. Výběr vznikl úplným průchodem všech 1 260 kombinací startu a cíle.

Silnější varianta překážky, kdy je nutné kuličku z cílové pozice dokonce sundat (`away_moves_min > 0`), existuje až od 5 tahů. Ve výchozí sadě ji nemá žádná úloha, aby se nemíchaly dva typy překážek.

## Logované údaje (CSV, oddělovač `;`)

| Sloupec | Význam |
|---|---|
| `record_id` | Unikátní ID pokusu (slouží k odhalení duplicit) |
| `participant`, `session_id` | ID účastníka a relace |
| `trial_order`, `test_id`, `practice` | Pořadí, ID testu, zda jde o cvičnou úlohu |
| `pair`, `condition` | ID dvojice a podmínka ze sady testů (`bez` / `prekazka`) |
| `obstacle` | Vypočteno: 1 = úloha s překážkou (každé optimální řešení obsahuje konflikt) |
| `greedy_conflicts_min` | Nejmenší počet konfliktů v optimálním řešení |
| `nonprogress_moves_min` | Nejmenší počet tahů, které v optimálním řešení cíl viditelně nepřiblíží |
| `away_moves_min` | Nejmenší počet tahů, které musí sundat kuličku z cílové pozice |
| `optimal_solutions` | Počet různých optimálních řešení |
| `greedy_traps_start` | Počet prvních tahů, které viditelně přibližují cíl, ale nevedou k optimálnímu řešení |
| `min_moves`, `moves`, `excess_moves` | Minimum tahů, skutečný počet, tahy navíc (jen u vyřešených) |
| `result`, `solved` | `solved` / `max_moves` / `timeout` / `skipped` |
| `planning_time_ms` | Čas od zobrazení úlohy po první zvednutí kuličky |
| `first_move_end_ms` | Čas od zobrazení úlohy po položení kuličky v prvním dokončeném tahu (zachytí i plánování s kuličkou „v ruce“) |
| `first_move_duration_ms` | Jak dlouho byla kulička prvního dokončeného tahu zvednutá |
| `execution_time_ms` | Čas od prvního zvednutí po konec pokusu |
| `total_time_ms` | Celkový čas pokusu |
| `cancelled_pickups` | Kolikrát účastník kuličku zvedl a vrátil na stejný kolík |
| `invalid_drops` | Kolikrát se pokusil položit kuličku na plný kolík |
| `progress_moves`, `neutral_moves`, `away_moves` | Kolik tahů účastníka přiblížilo cíl, bylo neutrálních a šlo od cíle |
| `optimal_moves` | Kolik tahů zkrátilo vzdálenost k cíli |
| `lured_moves` | Kolikrát účastník „skočil na návnadu“: tah viditelně přiblížil cíl, ale cestu k řešení prodloužil |
| `first_move_progress`, `first_move_optimal` | Totéž pro první tah (`+1`/`0`/`−1` a `1`/`0`) |
| `move_progress` | Hodnoty `+1`/`0`/`−1` pro všechny tahy v pořadí |
| `move_sequence` | Jednotlivé tahy, např. `1>2 3>1` |
| `move_pickup_times_ms`, `move_times_ms` | Časy zvednutí a položení u každého dokončeného tahu, měřené od začátku pokusu |
| `screen`, `user_agent` | Rozlišení obrazovky a prohlížeč účastníka |

V Google Tabulce je navíc první sloupec `received_at`, tedy čas, kdy server záznam přijal.

Všechny časy jsou v milisekundách a měří se od zobrazení úlohy.

Tah se započítá až po položení kuličky na **jiný** kolík. Zvednutí a vrácení kuličky na stejný kolík se jako tah nepočítá.

## Ukládání výsledků

Po každém pokusu se výsledek:

1. uloží do prohlížeče (localStorage). Tuto zálohu lze kdykoli exportovat do CSV na úvodní obrazovce.
2. odešle do Google Tabulky, pokud je online sběr nastavený (viz níže). Když odeslání selže (např. bez internetu), záznam čeká ve frontě a odešle se automaticky: při dalším pokusu, po obnovení připojení, každou minutu nebo při příštím otevření stránky. Server záznamy se stejným `record_id` přeskočí, takže opakované odeslání nevytvoří duplicity.

## Online sběr výsledků (Google Tabulka)

### 1. Tabulka a skript

1. Na [sheets.google.com](https://sheets.google.com) vytvořte novou prázdnou tabulku, např. „ToL výsledky“.
2. V menu zvolte **Rozšíření → Apps Script**.
3. Smažte obsah souboru `Kód.gs` a vložte do něj celý obsah souboru `apps-script/Code.gs`. Uložte (Ctrl+S).
4. Klikněte na **Nasadit → Nové nasazení**. U „Vyberte typ“ (ozubené kolečko) zvolte **Webová aplikace** a nastavte:
   - **Spustit jako:** Já
   - **Kdo má přístup:** Kdokoli
5. Klikněte na **Nasadit** a povolte přístup ke svému účtu. Google zobrazí varování, že aplikace není ověřená: zvolte *Rozšířené → Přejít na … (nebezpečné)*. Jde o váš vlastní skript.
6. Zkopírujte **URL webové aplikace** (končí na `/exec`). Když ji otevřete v prohlížeči, měla by se zobrazit zpráva `"ok": true`.

### 2. Propojení aplikace

Do souboru `js/config.js` vložte zkopírovanou URL:

```js
resultsEndpoint: "https://script.google.com/macros/s/…/exec"
```

Na úvodní obrazovce aplikace se pak zobrazí stav odesílání. List „Výsledky“ i s hlavičkou se v tabulce vytvoří sám při prvním odeslaném výsledku.

**„This app is blocked“ při autorizaci:** Google zablokoval přístup skriptu k účtu. Nejčastěji jde o školní nebo pracovní účet (Google Workspace), kde správce zakázal neověřené aplikace. Řešení:

- Ověřte, že skript obsahuje komentář s `@OnlyCurrentDoc` (je v `apps-script/Code.gs`). Skript pak žádá jen přístup k jedné tabulce.
- Vytvořte tabulku a skript pod soukromým účtem `@gmail.com`. Tam to funguje bez omezení.
- Případně požádejte správce školního Google účtu o povolení Apps Scriptu.

Upravíte-li později skript, je potřeba ho znovu nasadit: **Nasadit → Spravovat nasazení → upravit (tužka) → Verze: Nová verze**. URL zůstane stejná.

### 3. Zveřejnění testu

Aplikace je statická (jen HTML, CSS a JS), takže ji lze zdarma vystavit například takto:

- **Netlify Drop:** na [app.netlify.com/drop](https://app.netlify.com/drop) přetáhněte celou složku projektu. Získáte veřejnou adresu.
- **GitHub Pages:** nahrajte projekt do repozitáře na GitHubu a v *Settings → Pages* zapněte publikování z větve `main`.

Složku `apps-script` není nutné nahrávat, ale nevadí to.

### Poznámky

- URL skriptu je v kódu stránky veřejně čitelná. Teoreticky tak kdokoli může do tabulky poslat vymyšlená data. U školního projektu to obvykle nevadí, podezřelé řádky lze odfiltrovat například podle `user_agent` nebo `received_at`.
- Doporučujeme, aby účastníci zadávali jen pseudonymní ID (např. P001), ne jméno nebo e-mail.
