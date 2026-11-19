# Конструктор по форматам (этап 1: H2H Points) — план реализации

> **Для исполнителя:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development или superpowers:executing-plans. Шаги с чекбоксами `- [ ]`.

**Цель:** выбор формата, настройки лиги, реальный прогноз очков за период, Generate with AI для пустого/частичного состава, сохранение черновика и восстановление.

**Архитектура:** серверный сервис прогнозов (`projections`) считает очки по статам MLB и правилам лиги. Тот же сервис кормит пул игроков (через `POST /api/me/projections`) и AI-фичу. Детерминированный оптимизатор выбирает состав, модель пишет объяснение. Настройки (формат, период, замены, правила, слоты) хранятся в `FantasyTeam`.

**Стек:** Next.js App Router, TypeScript, Zustand/SWR, Prisma + PostgreSQL, Zod, Vitest. FSD и серверные правила из `CLAUDE.md`.

**Spec:** `docs/superpowers/specs/2026-11-19-format-builder-design.md`

## Global Constraints

- Фетчеры только через `withErrorHandling`, не инлайнить в `useSWR`; DTO не выходят за `api/`; импорт слайса только из его `index.ts` (`CLAUDE.md`).
- Route handler парсит `request.json()`, контроллер получает `unknown`; Zod-схемы только в `server/entities/**/*.schema.ts`; классы без parameter-property shorthand.
- Файлы и папки в `kebab-case`; `{entity}.type.ts`, `{entity}.const.ts` для новых файлов.
- После правки `prisma/schema/*.prisma` — `npx prisma migrate dev --name <name>` из корня; миграции руками не править; `db push` нельзя.
- Формат работает только `H2H_POINTS`; остальные три видны, но не выбираются («скоро»).
- Кэп зарплат в Points выключен (`salaryCap: null`); фейковые `salary` и `proj` от id в этом сценарии не используются.
- Правила очков по умолчанию — наши, редактируемые (спека).
- Коммитить только если пользователь попросит. В рабочем дереве есть чужие незакоммиченные изменения — не трогать их, не делать `git add -A`.
- Тестов минимум: один целевой тест на изменение (предпочтение пользователя).

## Review Focus

Входы, которые спека подразумевает, а пользователь встретит:
1. Межсезонье (сегодня ноябрь): в периоде нет игр → прогноз всё равно есть по темпу сезона (Task 3).
2. Игрок с 0 игр / 0 IP / нет статлайна → `points: null` и причина, не `NaN`/`Infinity` (Task 2).
3. Закреплённый игрок не из загруженного пула (другая команда, правка старой команды) → слот занят, AI его не дублирует (Task 4).
4. Старая команда: три OF-строки с `slotIndex` 0 и поле `scoringPreset` → открывается с LF/CF/RF заполнены и настройками по умолчанию (Task 1).
5. Невозможный подбор (в `slotConfig` больше P, чем игроков в пуле; кэп ниже минимальной цены) → `unfilled` с причиной и числами, частичный результат не теряется (Task 4, Task 5).

---

## Task 1: Общие типы, схемы и персистентность настроек

**Files:**
- Create: `src/shared/team-builder/format.type.ts`, `src/shared/team-builder/scoring-rules.const.ts`, `src/shared/team-builder/slots.ts`
- Modify: `src/shared/team-builder/types.ts`, `roster-rules.ts`, `index.ts`; `src/shared/teams/types.ts`
- Create: `server/entities/me/team-settings.schema.ts`
- Modify: `server/entities/me/create-team.schema.ts`, `update-lineup.schema.ts` (имена файлов уточнить в `server/entities/me/`), `prisma/schema/fantasy-team.prisma`, `server/models/fantasy-team/fantasy-team.model.ts`, `server/repositories/fantasy-team/*`, `server/services/me/me.service.ts`
- Test: `server/services/me/__tests__/me.service.test.ts`, `src/shared/team-builder/__tests__/slots.test.ts`

**Interfaces:**
- Produces (shared, `@/shared/team-builder`):
  - `FANTASY_FORMATS = ['H2H_POINTS','H2H_CATEGORIES','ROTO','DFS']`, `type FantasyFormat`, `SUPPORTED_FORMATS: FantasyFormat[]` (= `['H2H_POINTS']`), `FORMAT_LABEL`, `FORMAT_DESCRIPTION: Record<FantasyFormat,string>` (одно предложение, как определяется результат, из таблицы задачи).
  - `FORECAST_PERIODS = ['DAY','WEEK','SEASON']`, `LINEUP_CHANGES = ['DAILY','WEEKLY']`, `type ForecastPeriod`, `type LineupChanges`.
  - `interface ScoringRules { hitting: { single; double; triple; homeRun; run; rbi; walk; hitByPitch; stolenBase; strikeOut: number }; pitching: { inningPitched; strikeOut; earnedRun; hitAllowed; walkAllowed; win; save: number } }`, `DEFAULT_SCORING_RULES: ScoringRules`.
  - `type SlotType = 'P'|'C'|'1B'|'2B'|'3B'|'SS'|'OF'|'UTIL'|'BENCH'`, `type SlotConfig = { slot: SlotType; count: number }[]`, `DEFAULT_SLOT_CONFIG` (P1 C1 1B1 2B1 3B1 SS1 OF3), `type SlotId = string` (формат `` `${SlotType}:${index}` ``), `interface RosterSlotDef { id: SlotId; type: SlotType; index: number; label: string }`, `buildSlots(config: SlotConfig): RosterSlotDef[]`, `slotAcceptsPoolPosition(type: SlotType, pos: PoolPosition): boolean` (UTIL — любой не-P, BENCH — любой).
  - `SlotKey` заменяется на `SlotId` везде; `Roster = Record<SlotId, number | null>`; `FIELD_SLOTS` остаётся только как раскладка ромба (`slotId → {x, y, label}`), id `OF:0/1/2` показываются как LF/CF/RF.
  - `BuilderRosterSlotPayload.slotKey` → `slotId: SlotId`, `salaryAtLock: number | null`.
  - `CreateTeamPayload` / `UpdateLineupPayload` / `Team` получают `format`, `forecastPeriod`, `lineupChanges`, `scoringRules`, `slotConfig`, `salaryCap: number | null`, `isComplete: boolean`; `players` может быть пустым.
- Produces (server): `fantasyFormatSchema`, `forecastPeriodSchema`, `lineupChangesSchema`, `scoringRulesSchema`, `slotConfigSchema` (каждый слот `count` 0–10, суммарно ≥ 1 и ≤ 30) в `server/entities/me/team-settings.schema.ts`.

- [ ] **Step 1: Тест `buildSlots`** — `buildSlots(DEFAULT_SLOT_CONFIG)` возвращает 9 слотов с id `P:0,C:0,1B:0,2B:0,3B:0,SS:0,OF:0,OF:1,OF:2`; конфиг `[{slot:'P',count:3},{slot:'UTIL',count:1},{slot:'BENCH',count:2}]` даёт ids `P:0..P:2,UTIL:0,BENCH:0,BENCH:1`; `slotAcceptsPoolPosition('UTIL','P') === false`, `('UTIL','SS') === true`, `('BENCH','P') === true`.
- [ ] **Step 2: Прогнать** `npx vitest run src/shared/team-builder` — FAIL.
- [ ] **Step 3: Реализовать** файлы shared выше; перевести `roster-rules.ts` (`slotAcceptsProviderPosition` тоже принимает `SlotType`) и все импорты `SlotKey`/`FIELD_SLOTS` (tsc покажет места, исправлять механически).
- [ ] **Step 4: Prisma.** В `fantasy-team.prisma` добавить enum `FantasyFormat`, `ForecastPeriod`, `LineupChanges` и поля `format @default(H2H_POINTS)`, `forecastPeriod @default(WEEK)`, `lineupChanges @default(DAILY)`, `scoringRules Json @default("{}")`, `slotConfig Json @default("[]")`, `salaryCap Int?` в `FantasyTeam`; `slotIndex Int @default(0)` и `salaryAtLock Int?` в `RosterSlot`. Пустые `{}`/`[]` на чтении означают «по умолчанию» (миграция существующих строк без SQL правок). Запустить `npx prisma migrate dev --name fantasy-team-add-format-settings`.
- [ ] **Step 5: Zod-схемы и сервис.** Создать `team-settings.schema.ts`; расширить схемы create/update (настройки опциональны с дефолтами, `players` `min(0)`, `max(30)`, `slotKey` → `slotId` как `z.string().regex(/^(P|C|1B|2B|3B|SS|OF|UTIL|BENCH):\d+$/)`). В `MeService`: убрать `ROSTER_SIZE`/`SALARY_CAP_DEFAULT` проверки полного состава и бюджета; валидировать eligibility через `slotAcceptsPoolPosition` по типу из `slotId`, дубли игроков и слотов, слот есть в `buildSlots(slotConfig)`; писать `slotPosition` = маппинг типа в enum (OF/UTIL/BENCH уже в enum), `slotIndex` из `slotId`; `toWidgetTeam` отдаёт настройки, `isComplete`, слот как `slotId`. **Legacy:** строки с одинаковыми `(slotPosition, slotIndex)` получают индексы по порядку (`createdAt`, потом `id`); `{}` правил → `DEFAULT_SCORING_RULES`, `[]` слотов → `DEFAULT_SLOT_CONFIG`. `getBudget` возвращает `{ salaryCap: null }`-совместимый тип (`BuilderBudget.salaryCap: number | null`).
- [ ] **Step 6: Тест сервиса** в `me.service.test.ts` с fake-репозиторием: legacy-команда с тремя OF-строками (`slotIndex 0`) и `scoringRules: {}` → `toWidgetTeam` даёт слоты `OF:0,OF:1,OF:2`, `DEFAULT_SCORING_RULES`, `format 'H2H_POINTS'`, и `createMyTeam` с одним игроком (черновик) проходит, а с двумя игроками на одном `slotId` бросает validation error.
- [ ] **Step 7: Проверка:** `npx tsc --noEmit` и `npx vitest run server/services/me src/shared/team-builder` — без ошибок в изменённых местах.

---

## Task 2: Математика прогноза очков (чистая функция)

**Files:**
- Create: `server/services/projections/project-points.ts`, `server/services/projections/projections.type.ts`
- Test: `server/services/projections/__tests__/project-points.test.ts`

**Interfaces:**
- Consumes: `ScoringRules` (Task 1), `num`, `innings` из `server/shared/stat-parse.ts`, `ProviderPlayer` с `battingStats`/`pitchingStats`.
- Produces (`projections.type.ts`): `type ProjectionBasis = 'schedule' | 'season-pace'`; `interface Projection { points: number | null; games: number; starts: number; confidence: 'normal' | 'low'; basis: ProjectionBasis; reason?: 'NO_STATS' | 'INACTIVE' | 'NO_GAMES' }`; `interface ProjectionInput { player: ProviderPlayer; teamGames: number; basis: ProjectionBasis; teamSeasonGames: number | null; announcedStarts?: number; rules: ScoringRules }`.
- Produces: `projectPlayerPoints(input: ProjectionInput): Projection`.

- [ ] **Step 1: Тесты** (имена и числа):
  - `hitter: per-game rates × expected games`: игрок 100 игр, 20 HR, 60 R, 70 RBI, 10 SB, 80 K, 50 BB, 150 H (из них 30 2B, 3 3B), 5 HBP; `teamGames 6`, `teamSeasonGames 100`, правила `homeRun 4, single 1, double 2, triple 3, run 1, rbi 1, walk 1, hitByPitch 1, stolenBase 2, strikeOut -0.5` → ожидаемые очки равны `6 × (на-игру очки)`, сверить вручную в тесте.
  - `starter: announcedStarts overrides rotation`: `announcedStarts 2` против `teamGames 6` (ротация 6/5 = 1.2) → `starts === 2`.
  - `reliever: appearances scale by availability`.
  - `zero games / zero IP / empty stat line → points null, reason NO_STATS, no NaN`.
  - `inactive player (player.active false) → points null, reason INACTIVE`.
  - `low sample: PA < 50 или IP < 20 → confidence 'low'` (пороги вынести в `estimates.const.ts` рядом с существующими).
- [ ] **Step 2: Прогнать** `npx vitest run server/services/projections` — FAIL.
- [ ] **Step 3: Реализовать** `projectPlayerPoints`. Роль по `primaryPosition`: `SP` → starter, `RP` → reliever, иначе hitter. Hitter: ставка события = итог/`gamesPlayed`; ожидаемые игры = `teamGames × min(1, gamesPlayed / teamSeasonGames)` (если `teamSeasonGames` null — множитель 1); синглы = `hits − doubles − triples − homeRuns`. Starter: на старт = итог/`gamesStarted`; `starts = announcedStarts ?? teamGames / 5`. Reliever: появления = `teamGames × min(1, gamesPlayed/teamSeasonGames)`, на появление = итог/`gamesPlayed`. Очки пересчитываются по `rules`. `games` — ожидаемые игры/появления, округление до 0.1 при выводе.
- [ ] **Step 4: Прогнать тест** — PASS.

---

## Task 3: Сервис прогнозов и API

**Files:**
- Create: `server/services/projections/projections.service.ts`, `projections.service.interface.ts`, `projections.composition.ts`
- Create: `server/entities/projections/projections.schema.ts`, `server/controllers/projections/projections.controller.ts` (+ `.interface.ts`)
- Create: `src/app/api/me/projections/route.ts`
- Test: `server/services/projections/__tests__/projections.service.test.ts`

**Interfaces:**
- Consumes: `projectPlayerPoints` (Task 2), `ISportsProvider` (`getPlayersByTeam({ statsSeason })`, `getSchedule`, `getGameContexts`, `getTeamStandings`), `scoringRulesSchema`, `forecastPeriodSchema`, `baseballLeagueEnum`.
- Produces: `interface IProjectionsService { projectTeams(input: { league?: BaseballProviderLeague; teamIds: number[]; period: ForecastPeriod; rules: ScoringRules; now?: Date }): Promise<{ basis: ProjectionBasis; projections: Record<number, Projection>; players: ProviderPlayer[] }> }` (`players` — те же игроки, что и в расчёте, нужны AI-фиче).
- Produces: `projectionsRequestSchema` = `{ league?, teamIds: int[] (1..6), period, rules }`; `POST /api/me/projections` → `{ basis, projections: Record<number, Projection> }`; 401 без авторизации.

- [ ] **Step 1: Тест сервиса** с fake `ISportsProvider`: (a) `period WEEK`, расписание пусто (межсезонье) → `basis 'season-pace'`, у игрока со статлайном `points` не null и `games` ≈ 6 × доступность; (b) расписание из 5 игр команды → `basis 'schedule'`, `games` основан на 5; (c) игрок без статов → `points null, reason NO_STATS`.
- [ ] **Step 2: Прогнать** — FAIL.
- [ ] **Step 3: Реализовать** `ProjectionsService`: окно периода (DAY — сегодня; WEEK — сегодня + 6 дней; SEASON — сегодня … 30 сентября сезона); число игр команды из `getSchedule` по окну, статусы CANCELLED/POSTPONED не считаются; если игр нет ни у одной команды из запроса — `season-pace` (DAY 1, WEEK 6, SEASON 162). `statsSeason` = текущий год, если игроков со статами нет — предыдущий. `announcedStarts` из `getGameContexts` только для DAY/WEEK (вероятные питчеры в окне; ошибка загрузки контекстов не валит расчёт). `teamSeasonGames` из `getTeamStandings` для MLB (wins+losses), иначе null. Загрузки команд параллельно, одна упавшая не блокирует остальные (как в текущем autofill).
- [ ] **Step 4: Схема, контроллер, route** по образцу `server/controllers/analytics` и `src/app/api/me/ai/team-builder-autofill/route.ts` (аутентификация через `getAuthenticatedUser`, body парсит route, контроллер принимает `unknown` и использует `safeParse`).
- [ ] **Step 5: Прогнать** тесты сервиса — PASS; `npx tsc --noEmit`.

---

## Task 4: Оптимизатор состава (чистая функция)

**Files:**
- Create: `server/services/ai/features/optimize-lineup.ts`
- Test: `server/services/ai/__tests__/features/optimize-lineup.test.ts`

**Interfaces:**
- Consumes: `RosterSlotDef`, `SlotId`, `slotAcceptsPoolPosition`, `PoolPosition` (Task 1).
- Produces:
  ```ts
  interface OptimizerPlayer { id: number; name: string; pos: PoolPosition; points: number | null; salary: number | null; available: boolean }
  interface OptimizerInput { slots: RosterSlotDef[]; pinned: { slotId: SlotId; playerId: number; salary: number | null }[]; pool: OptimizerPlayer[]; salaryCap: number | null }
  type UnfilledCode = 'NO_ELIGIBLE_PLAYER' | 'NO_PROJECTION' | 'CAP_TOO_LOW' | 'POOL_EMPTY'
  interface UnfilledSlot { slotId: SlotId; code: UnfilledCode; message: string }
  interface OptimizerResult { picks: { slotId: SlotId; playerId: number }[]; unfilled: UnfilledSlot[]; totalPoints: number }
  function optimizeLineup(input: OptimizerInput): OptimizerResult
  ```

- [ ] **Step 1: Тесты:**
  - `keeps pinned players untouched` (два закреплённых, `picks` не содержит их слотов).
  - `never duplicates`: закреплённый игрок, которого нет в `pool`, не появляется в `picks`; игрок из пула не занимает два слота.
  - `respects eligibility`: SS-слот не получает 1B; `UTIL` не получает `P`; `BENCH` получает лучшего оставшегося.
  - `beats greedy`: пул — OF-игрок A (20 очков) и 1B-игрок B (15) и 1B-игрок C (14); слоты `1B:0`, `UTIL:0`, `OF:0`. Оптимум 20+15+14: A→OF, B→1B, C→UTIL; жадность по слотам, начав с UTIL, берёт A в UTIL и теряет очки.
  - `skips players with null points` и отдаёт `NO_PROJECTION`, если подходят только они.
  - `empty pool for a position → NO_ELIGIBLE_PLAYER` с `message`, называющим слот.
  - `cap too low`: `salaryCap 10000`, закреплённый игрок за 7600 и самый дешёвый SS за 2700 при остатке 2400 → `CAP_TOO_LOW` с сообщением, содержащим `$2,400` и `$2,700` (формат валюты `en-US`, как в спеке).
- [ ] **Step 2: Прогнать** — FAIL.
- [ ] **Step 3: Реализовать** `optimizeLineup`: пустые слоты = слоты без `pinned`; кандидаты = `available`, `points != null`, не закреплены; назначение максимизирует сумму очков (алгоритм венгерской или поток минимальной стоимости на кандидатах топ-K по очкам, выбор за исполнителем; жадность по слотам тест `beats greedy` не пройдёт). `BENCH` заполняется последним из остатка. Кэп (если задан): перед назначением вычесть цены закреплённых, дальше требовать, чтобы остаток ≥ суммы самых дешёвых допустимых для ещё не заполненных слотов; слот, который нельзя профинансировать, → `CAP_TOO_LOW`. Частичный результат возвращается всегда.
- [ ] **Step 4: Прогнать** — PASS.

---

## Task 5: AI-фича autofill на оптимизаторе

**Files:**
- Modify: `server/services/ai/features/team-builder-autofill.feature.ts`, `server/services/ai/prompts/team-builder-autofill.prompt.ts`, `src/app/api/me/ai/team-builder-autofill/route.ts`
- Modify: `server/services/ai/__tests__/features/team-builder-autofill.test.ts`
- Check: `server/services/ai/features/ai-features.service*.ts` и `server/controllers/ai/features/*` на использование старого входа/выхода

**Interfaces:**
- Consumes: `IProjectionsService.projectTeams` (Task 3), `optimizeLineup` (Task 4), схемы настроек (Task 1).
- Produces: `tbAutofillInputSchema` = `{ league?, mlbTeamIds: int[] (min 1), format: 'H2H_POINTS', period, rules: ScoringRules, slotConfig: SlotConfig, salaryCap?: int | null, filledSlots?: { slotId: SlotId; externalPlayerId: int }[] }`.
- Produces: `tbAutofillOutputSchema` = `{ suggestedPicks: { slotId; externalPlayerId; playerName; projectedPoints: number }[]; unfilled: UnfilledSlot[]; explanation: string; totalPoints: number; basis: ProjectionBasis }`.
- Конструктор `TeamBuilderAutofillFeature(provider: IOpenAIProvider, projections: IProjectionsService)`.

- [ ] **Step 1: Переписать тест** `team-builder-autofill.test.ts` под новый контракт с fake `IProjectionsService` и fake `IOpenAIProvider`: пустой состав из 9 слотов → 9 `suggestedPicks`; два закреплённых → их слоты не в `suggestedPicks`, остальные заполнены; пул без SS → `unfilled` содержит `SS:0` с `NO_ELIGIBLE_PLAYER`, остальные слоты всё равно заполнены; `explanation` берётся из ответа fake-модели.
- [ ] **Step 2: Прогнать** — FAIL.
- [ ] **Step 3: Реализовать:** `invoke` получает пул и прогнозы из `projectTeams`, строит слоты `buildSlots(slotConfig)`, вызывает `optimizeLineup`, затем модель (`tier: 'cheap'`, схема `{ explanation: string }`) получает итоговый состав, `unfilled` и топ альтернатив и пишет 2–4 предложения о ключевых выборах (период, правила, конкретные игроки). Удалить `completeAutofill` и фейковую `fauxSalaryAndProjection`. Промпт переписать: модель не выбирает игроков, только объясняет; запрещено выдумывать числа, использовать только поданные. Route: заменить локальный `requestSchema` на `tbAutofillInputSchema` из feature или `server/entities` (Zod-схемы не живут в route по правилам — вынести в `server/entities/ai/team-builder-autofill.schema.ts`, feature импортирует оттуда), собрать `TeamBuilderAutofillFeature` с `buildProjectionsService()`.
- [ ] **Step 4: Прогнать** `npx vitest run server/services/ai` — PASS; обновить/удалить мёртвые ссылки на старый контракт в `ai-feature.service.test.ts`, если tsc их покажет.

---

## Task 6: Клиентский API-слой

**Files:**
- Create: `src/entities/projections/` (`api/fetch-projections.ts`, `api/types.ts`, `api/mappers.ts`, `model/use-projections-data.ts`, `index.ts`, `model/projection.type.ts`)
- Modify: `src/entities/team-builder/api/catalog/fetch-players-by-team.ts`, `src/entities/team-builder/api/user/create-team.ts`, `src/entities/my-teams/api/update-team-lineup.ts`, `fetch-my-teams.ts` (и их DTO/мапперы), `src/features/team-builder-autofill/api/autofill-team-builder.ts`, `src/entities/team-builder/api/user/use-budget-data.ts`
- Test: `src/entities/projections/api/mappers.test.ts`

**Interfaces:**
- Consumes: `POST /api/me/projections`, обновлённые контракты create/update/teams/autofill (Tasks 1, 3, 5).
- Produces: `interface PlayerProjection { points: number | null; games: number; starts: number; confidence: 'normal' | 'low'; basis: ProjectionBasis; reason?: 'NO_STATS' | 'INACTIVE' | 'NO_GAMES' }` (domain model, camelCase); `fetchProjections(args: { leagueSlug: string; teamIds: number[]; period: ForecastPeriod; rules: ScoringRules }): Promise<{ basis: ProjectionBasis; projections: Map<number, PlayerProjection> }>` (обёрнут `withErrorHandling`); `useProjectionsData(args | null)` — SWR-ключ `['projections', leagueSlug, teamIds, period, JSON.stringify(rules)]`, `null` отключает.
- `PoolPlayer`: `salary: number | null`, `proj: number | null`; `fetchPlayersByTeam` больше не считает фейковые значения (оба `null`).
- Autofill-фетчер принимает/возвращает новый контракт Task 5 (domain-модель `AutofillResult` с `suggestedPicks`, `unfilled`, `explanation`, `totalPoints`, `basis`).

- [ ] **Step 1: Тест маппера** — DTO ответа проекций (объект с числовыми ключами-строками) → `Map<number, PlayerProjection>`; игрок `points: null, reason: 'NO_STATS'` сохраняет `null` (не 0).
- [ ] **Step 2: Прогнать** — FAIL.
- [ ] **Step 3: Реализовать** слой по правилам из `docs/api.md` и `docs/mappers.md` (fetcher + mapper внутри, хук `useProjectionsData` в `model/`); обновить create/update/fetch-my-teams DTO и маппинг настроек и `slotId`; удалить фейковую формулу из `fetch-players-by-team.ts`; `useBudgetData` допускает `salaryCap: null`.
- [ ] **Step 4: Прогнать** `npx vitest run src/entities` и `npx tsc --noEmit` — PASS (ошибки в widgets допустимы до Task 7, фиксируются там).

---

## Task 7: Состояние конструктора (хук)

**Files:**
- Modify: `src/widgets/team-builder/model/use-team-builder-state.ts`, `team-builder-roster.ts`, `team-builder.type.ts`
- Create: `src/widgets/team-builder/model/use-autofill-preview.ts` (превью предложения AI: принять/отклонить)
- Modify tests: `src/widgets/team-builder/model/__tests__/team-builder-roster.test.ts`, `src/widgets/team-builder/ui/__tests__/team-builder-manual-edit.test.tsx`

**Interfaces:**
- Consumes: Tasks 1 и 6.
- Produces в `TeamBuilderState` (добавить к существующему, убрать `salaryUsed/salaryLeft/isOverCap/captain*` из Points-пути, сохранив их, если `salaryCap != null`): `format`, `setFormat`, `forecastPeriod`, `setForecastPeriod`, `lineupChanges`, `setLineupChanges`, `scoringRules`, `setScoringRules`, `resetScoringRules()`, `slotConfig`, `setSlotConfig`, `slots: RosterSlotDef[]` (из `buildSlots`), `formatChosen: boolean`, `projectionFor(playerId): PlayerProjection | undefined`, `projectionBasis`, `autofillPreview: { picks; unfilled; explanation; totalPoints; basis } | null`, `acceptAutofill()`, `discardAutofill()`, `canSave` (имя и лига заданы; полный состав НЕ требуется), `isComplete`.
- Поведение: `roster` ключуется `SlotId` и пересобирается при смене `slotConfig` (игроки из удалённых слотов остаются в пуле выбранных не теряются молча: показать toast с их именами и вернуть в пул, а не стирать без сообщения); `autofill()` отправляет `filledSlots` со `slotId`, при успехе пишет `autofillPreview` (состав не применяется до `acceptAutofill`), при `unfilled` показывает причины, текущий черновик не меняется на любой ошибке; `placementFor`/`mergeAutofillPicks` работают по `slotId`; ранжирование `visiblePool` по `proj` (null — в конец).

- [ ] **Step 1: Обновить тесты** `team-builder-roster.test.ts` под `SlotId`: `mergeAutofillPicks` применяет пики только в пустые слоты, пропускает дубли и неподходящих; `evaluatePlayerPlacement` не использует кэп, когда он `null`. Тест `team-builder-manual-edit.test.tsx` — подставить новый контракт.
- [ ] **Step 2: Прогнать** — FAIL.
- [ ] **Step 3: Реализовать** хук по списку выше; восстановление при открытии существующей команды берёт формат, период, замены, правила, слоты и игроков из `Team`; `saveLineup` отправляет настройки и неполный состав (черновик), сообщение toast «Черновик сохранён» для неполного.
- [ ] **Step 4: Прогнать** `npx vitest run src/widgets/team-builder` и `npx tsc --noEmit` — PASS.

---

## Task 8: UI

**Files:**
- Create: `src/widgets/team-builder/ui/format-picker.tsx`, `team-settings-panel.tsx`, `scoring-rules-editor.tsx`, `slot-config-editor.tsx`, `lineup-slot-list.tsx`, `autofill-preview-bar.tsx`
- Modify: `player-pool.tsx`, `player-pool-row.tsx`, `autofill-modal.tsx` (кнопка и тексты Generate with AI), `field-diamond.tsx`/`field-slots-overlay.tsx`/`field-slot.tsx` (SlotId), `budget-meter.tsx`, `team-builder-meter-bar.tsx`, `save-bar.tsx`, `team-builder-subbar.tsx`, `src/views/team-builder/team-builder-view.tsx`, `src/widgets/my-teams/*` (бейдж «Черновик»), `src/widgets/team-builder/index.ts`
- UI — чистые рендереры: логика только из `useTeamBuilderState` (CLAUDE.md).

**Interfaces:** Consumes `TeamBuilderState` (Task 7). Produces: компоненты принимают пропсы из состояния и вызывают его колбэки; новых хуков с эффектами в UI нет.

- [ ] **Step 1: Format picker.** При создании (не edit) и `!formatChosen` вид показывает 4 карточки с `FORMAT_DESCRIPTION`; H2H раскрывает Points / Categories; недоступные (`!SUPPORTED_FORMATS.includes`) отключены с «скоро».
- [ ] **Step 2: Панель настроек.** Период, частота замен, редактор слотов (счётчик на тип, кнопка «по умолчанию»), редактор правил очков (поля по `ScoringRules`, «сбросить»); показывается над составом, сворачиваемая.
- [ ] **Step 3: Состав.** Ромб при `slotConfig` равном `DEFAULT_SLOT_CONFIG`, иначе `lineup-slot-list`; клик по слоту/игроку работает как сейчас (`focusSlot`, `addPlayer`, `removeSlot`).
- [ ] **Step 4: Пул.** Колонка ожидаемых очков за период (`projectionFor`), «нет прогноза» с причиной в подсказке, бейджи `low confidence` и «оценка межсезонья» (`basis === 'season-pace'`); скрыть салари/бюджет-метр, если `salaryCap == null`.
- [ ] **Step 5: Generate with AI.** Кнопка работает для пустого и частичного состава; пока идёт запрос — disabled; после ответа показывается `autofill-preview-bar` с итогом очков, `explanation`, перечнем `unfilled` (с причинами) и кнопками «Принять» / «Отклонить»; предложенные игроки подсвечены в слотах до принятия.
- [ ] **Step 6: Список команд.** Неполные команды показывают «Черновик» (`!isComplete`).
- [ ] **Step 7: Проверка.** `npx tsc --noEmit`, `npx eslint src server`, `npx vitest run`.

---

## Task 9: Сквозная проверка

- [ ] **Step 1:** Применить миграцию на локальной БД (`npx prisma migrate dev`), убедиться, что существующая команда открывается: настройки по умолчанию, LF/CF/RF заполнены.
- [ ] **Step 2:** Запустить dev-сервер (`preview_start`/launch.json) и в браузере пройти приёмку: выбрать H2H Points → вручную добавить двух игроков → Generate with AI → принять → сохранить → переоткрыть: игроки на прежних слотах, остальные слоты заполнены. Изменить правила очков → ожидаемые очки в пуле пересчитались. Сделать невозможный случай (убрать позицию из пула, например конфиг с P×30) → видна причина, черновик жив. Без `OPENAI_API_KEY` проверить, что ошибка модели не стирает черновик и показывается понятное сообщение (оптимизатор работает независимо; зафиксировать, если без ключа проверить нельзя).
- [ ] **Step 3:** Обновить `todo.md`: снять пункт про кэп/бюджет (решён: выключен в Points), добавить хвосты этапов 2–3 (Categories, Roto, DFS CSV) и удаление `scoringPreset`.
- [ ] **Step 4:** Отчёт: что проверено, что нет (особенно AI с реальным ключом и межсезонье в production).
