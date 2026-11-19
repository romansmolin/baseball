# H2H Categories и Roto (этап 2) — план реализации

> **Для исполнителя:** REQUIRED SUB-SKILL: superpowers:executing-plans (выбран ранее: Native) или superpowers:subagent-driven-development. Шаги с чекбоксами `- [ ]`.

**Цель:** форматы H2H Categories и Roto работают в конструкторе: прогноз по категориям, вклад игроков, Generate with AI под слабые категории, сохранение и восстановление.

**Архитектура:** сервис прогнозов дополнительно отдаёт компоненты статистики и масштабы (`scales`). Чистые функции в `src/shared/team-builder` считают z-ценность игрока, веса нужды и оценку баланса. Существующий оптимизатор из этапа 1 максимизирует оценку игрока вместо очков.

**Стек:** как в этапе 1 (Next.js, TypeScript, Prisma, Zod, Vitest, SWR).

**Spec:** `docs/superpowers/specs/2026-11-19-categories-roto-design.md` (и этап 1: `2026-11-19-format-builder-design.md`).

## Global Constraints

- Правила `CLAUDE.md` и ограничения плана этапа 1 действуют без изменений (FSD, fetchers через `withErrorHandling`, route парсит body, Zod только в `server/entities`, миграции через `prisma migrate dev`).
- Категории ровно 10: `R, HR, RBI, SB, AVG` (hitting) и `W, SV, K, ERA, WHIP` (pitching); `ERA` и `WHIP` — чем меньше, тем лучше.
- Вес категории `1 + clamp(−среднее z состава, 0, 1.5)`; проходов оптимизации не больше 3; `teamBalance = Σ sign(S)·√|S|`.
- Roto всегда `forecastPeriod = SEASON`.
- Коммитить только если пользователь попросит; чужие незакоммиченные изменения не трогать (`git add` только своих файлов).
- Тестов минимум: один целевой тест на изменение.

## Review Focus

1. Игрок без стат (`ab = 0` или `ip = 0`) не даёт `NaN` в AVG/ERA/WHIP и не ломает итоги состава (Task 1).
2. Включены категории только одной стороны (например одни hitting): подбор всё равно заполняет питчерские слоты, без ошибок (Task 4).
3. Старые команды без `categories` (`[]`) открываются со всеми 10 категориями (Task 2).
4. Пул из одного игрока или все игроки с одинаковым значением (sd = 0): z = 0, не деление на ноль (Task 1).
5. Переключение формата Points ↔ Categories при редактировании не теряет состав и закреплённых игроков (Task 5).

---

## Task 1: Категории и математика ценности (shared)

**Files:**
- Create: `src/shared/team-builder/categories.ts`, `src/shared/team-builder/category-value.ts`
- Modify: `src/shared/team-builder/index.ts`, `format.type.ts` (`SUPPORTED_FORMATS` включает `H2H_CATEGORIES`, `ROTO`)
- Test: `src/shared/team-builder/__tests__/category-value.test.ts`

**Interfaces:**
- Produces (`categories.ts`): `CATEGORY_KEYS`, `type CategoryKey`, `type CategorySide = 'hitting' | 'pitching'`, `CATEGORY_SIDE: Record<CategoryKey, CategorySide>`, `CATEGORY_LABEL`, `DEFAULT_CATEGORIES: CategoryKey[]` (все 10), `LOWER_IS_BETTER: CategoryKey[]` (`ERA`, `WHIP`), `interface ProjectedStats { side: CategorySide; r: number; hr: number; rbi: number; sb: number; ab: number; h: number; w: number; sv: number; k: number; ip: number; er: number; bbh: number }` (поля чужой стороны нули).
- Produces (`category-value.ts`):
  - `type CategoryScales = Partial<Record<CategoryKey, { mean: number; sd: number }>>`
  - `type CategoryValues = Partial<Record<CategoryKey, number>>`
  - `buildCategoryScales(pool: ProjectedStats[]): CategoryScales` (все 10 категорий; для ставочных `mean` — ставка пула: `Σh/Σab`, `9·Σer/Σip`, `Σbbh/Σip`, `sd` — по вкладам игроков с объёмом).
  - `playerCategoryValues(stats: ProjectedStats, scales: CategoryScales, categories: CategoryKey[]): CategoryValues`
  - `categoryTotals(stats: ProjectedStats[]): Partial<Record<CategoryKey, number>>` (счётные суммой, `AVG = Σh/Σab`, `ERA = 9·Σer/Σip`, `WHIP = Σbbh/Σip`; нет объёма — категория отсутствует).
  - `categoryWeights(rosterValues: CategoryValues[], categories: CategoryKey[]): Record<CategoryKey, number>`
  - `weightedScore(values: CategoryValues, weights: Record<CategoryKey, number>, categories: CategoryKey[]): number`
  - `teamBalanceScore(rosterValues: CategoryValues[], categories: CategoryKey[]): number`

- [ ] **Step 1: Тесты** `category-value.test.ts`:
  - `counting z-score`: три hitter'а с `hr` 10, 20, 30 → значения HR `−1.22, 0, 1.22` (допуск 0.01); pitcher в HR получает `0`.
  - `AVG weights volume`: hitter 0.300 на 600 ab ценнее, чем 0.300 на 100 ab (значения AVG строго больше).
  - `lower is better`: питчер с меньшим ERA получает больший ERA-вклад.
  - `no volume is not NaN`: `ab = 0` и `ip = 0` → все значения `0`, `categoryTotals([])` без ключей AVG/ERA/WHIP, никаких `NaN`.
  - `sd = 0`: пул из одинаковых игроков → значения `0`.
  - `weights follow weakness`: состав со средним z по SB `−1` → вес SB `2`; со средним `+1` → вес `1`; ниже `−1.5` ограничивается весом `2.5`.
  - `balance prefers spread`: два состава с одинаковой суммой z, но один распределён по категориям, другой в одной → баланс первого выше.
- [ ] **Step 2: Прогнать** `npx vitest run src/shared/team-builder` — FAIL.
- [ ] **Step 3: Реализовать** файлы по сигнатурам выше; sd — выборочное отклонение по игрокам своей стороны (`0` если меньше двух игроков); `weightedScore` суммирует только включённые категории.
- [ ] **Step 4: Прогнать** — PASS.

---

## Task 2: Хранение категорий и поддержка форматов

**Files:**
- Modify: `prisma/schema/fantasy-team.prisma`, `server/entities/me/team-settings.schema.ts`, `create-team.schema.ts`, `update-lineup.schema.ts`, `server/repositories/fantasy-team/*`, `server/services/me/me.service.ts`, `src/shared/team-builder/types.ts` (`TeamSettings.categories`), `src/shared/teams/types.ts`
- Test: `server/services/me/__tests__/me.service.test.ts`, `server/entities/__tests__/me-team.schema.test.ts`

**Interfaces:**
- Produces: `categoriesSchema` (`z.array(z.enum(CATEGORY_KEYS)).min(1)` без повторов); `FantasyTeam.categories Json @default("[]")`; `TeamSettings.categories: CategoryKey[]`; `Team.categories` всегда непустой (`[]` в БД читается как `DEFAULT_CATEGORIES`); для `ROTO` сервис сохраняет `forecastPeriod = 'SEASON'` независимо от присланного.

- [ ] **Step 1: Тесты:** (a) старая строка с `categories: []` → `toWidgetTeam` отдаёт все 10; (b) `createMyTeam` с `format: 'ROTO'`, `forecastPeriod: 'WEEK'` передаёт в репозиторий `forecastPeriod: 'SEASON'`; (c) `updateMyTeamLineup` пропускает `categories` в настройки и по-прежнему не передаёт `players`/`platform` в `settings`; (d) схема отклоняет пустой и повторяющийся список категорий.
- [ ] **Step 2: Прогнать** — FAIL.
- [ ] **Step 3: Реализовать.** Поле в Prisma + `npx prisma migrate dev --name fantasy-team-add-categories`; Zod; сервис (`resolveSettings`, `settingsOf`, пик настроек, правило Roto); репозиторий (`settingsData` уже спредит настройки).
- [ ] **Step 4: Прогнать** `npx vitest run server` и `npx tsc --noEmit`.

---

## Task 3: Компоненты прогноза и масштабы в API

**Files:**
- Modify: `server/services/projections/projections.type.ts`, `project-points.ts`, `projections.service.ts`, `projections.service.interface.ts`, `server/controllers/projections/projections.controller.ts`, `src/entities/projections/api/{types,mappers,fetch-projections}.ts`, `src/entities/projections/model/projection.type.ts`, `index.ts`
- Test: `server/services/projections/__tests__/project-points.test.ts`, `src/entities/projections/api/mappers.test.ts`

**Interfaces:**
- Consumes: `ProjectedStats`, `buildCategoryScales`, `CategoryScales` (Task 1).
- Produces: `Projection.stats?: ProjectedStats` (задан, если есть статы); `ProjectTeamsResult.scales: CategoryScales`; ответ API `{ basis, projections, scales }`; клиент `ProjectionsResult.scales`, `PlayerProjection.stats?`.
- `projectPlayerPoints` продолжает возвращать очки; расчёт игр и появлений общий, компоненты считаются по тем же ставкам (`ставка на игру × игры`, питчер `ставка на старт × старты`).

- [ ] **Step 1: Тесты:** hitter из теста этапа 1 (100 игр, `teamGames 6`, 20 HR, 60 R, 70 RBI, 10 SB, 150 H, 450 PA) → `stats.hr = 1.2`, `stats.sb = 0.6`, `stats.side = 'hitting'`; starter из теста этапа 1 с `announcedStarts 2` → `stats.k = 2·(200/30)`, `stats.ip = 2·(180/30)`, `stats.side = 'pitching'`; игрок без статов → `stats` отсутствует; маппер клиента переносит `stats` и `scales`.
- [ ] **Step 2: Прогнать** — FAIL.
- [ ] **Step 3: Реализовать:** вынести подсчёт ожидаемых игр/стартов из `projectHitter`/`projectPitcher` и заполнить `stats`; сервис считает `scales = buildCategoryScales(...)` по игрокам с `stats`; контроллер отдаёт `scales`; клиентский DTO/маппер/модель расширены.
- [ ] **Step 4: Прогнать** `npx vitest run server src/entities` и `npx tsc --noEmit`.

---

## Task 4: Generate with AI для категорийных форматов

**Files:**
- Modify: `server/entities/ai/team-builder-autofill.schema.ts`, `server/services/ai/features/team-builder-autofill.feature.ts`, `server/services/ai/prompts/team-builder-autofill.prompt.ts`, `src/app/api/me/ai/team-builder-autofill/route.ts` (если нужно)
- Create: `server/services/ai/features/category-lineup.ts`
- Test: `server/services/ai/__tests__/features/category-lineup.test.ts`, `team-builder-autofill.test.ts`

**Interfaces:**
- Consumes: `optimizeLineup` (этап 1), функции Task 1, `Projection.stats`/`scales` (Task 3).
- Produces: `tbAutofillInputSchema.format` допускает `H2H_POINTS | H2H_CATEGORIES | ROTO`; новое поле `categories: CategoryKey[]` (по умолчанию все 10); `rules` остаётся (используется только в Points). Выход: каждый pick получает `score: number` (в Points равен очкам). Функция `planCategoryLineup(input: { slots: RosterSlotDef[]; pinned: { slotId: SlotId; playerId: number; salary: number | null }[]; pool: Array<OptimizerPlayer & { stats: ProjectedStats | null }>; scales: CategoryScales; categories: CategoryKey[]; salaryCap: number | null }): OptimizerResult & { scores: Record<number, number> }` — до 3 проходов `optimizeLineup` с весами нужды, выбор прохода по `teamBalanceScore`.

- [ ] **Step 1: Тесты** `category-lineup.test.ts`: (a) состав без SB (закреплённый 1B без SB), два кандидата в OF: slugger (HR 30) против base stealer (SB 25) при равной общей ценности → выбран base stealer; (b) закреплённые игроки не трогаются, дубли невозможны; (c) включены только hitting: питчерские слоты всё равно заполнены (оценка 0), без ошибок; (d) игроки без `stats` пропускаются с причиной `NO_PROJECTION`. В `team-builder-autofill.test.ts`: формат `H2H_CATEGORIES` возвращает 9 picks со `score`, а `H2H_POINTS` по-прежнему работает как в этапе 1.
- [ ] **Step 2: Прогнать** — FAIL.
- [ ] **Step 3: Реализовать:** `planCategoryLineup` (значение игрока → оценка `weightedScore` → `optimizeLineup` с `points = score`); фича выбирает путь по формату; Roto использует тот же путь; промпт получает формат и список категорий и объясняет выбор по категориям (без выдуманных чисел).
- [ ] **Step 4: Прогнать** `npx vitest run server/services/ai` и `npx tsc --noEmit`.

---

## Task 5: Состояние конструктора для Categories и Roto

**Files:**
- Modify: `src/widgets/team-builder/model/use-team-builder-state.ts`, `team-builder-roster.ts` (если нужно), `src/features/team-builder-autofill/api/autofill-team-builder.ts`
- Create: `src/widgets/team-builder/model/category-view.ts`
- Test: `src/widgets/team-builder/model/__tests__/category-view.test.ts`

**Interfaces:**
- Consumes: Task 1–4.
- Produces (`category-view.ts`): `playerCategoryChips(values: CategoryValues, limit?: number): { key: CategoryKey; value: number }[]` (лучшие положительные вклады, по убыванию, по умолчанию 2); `rosterCategoryTotals(...)` — обёртка `categoryTotals` по игрокам состава с `stats`.
- Produces в `TeamBuilderState`: `categories: CategoryKey[]`, `setCategories(next: CategoryKey[])`, `isCategoryFormat: boolean`, `categoryTotals`, `poolWithCategoryView` (для категорийных форматов пул сортируется по оценке игрока и каждая строка получает `categoryChips`), `lineupScore`. `chooseFormat('ROTO')` ставит период `SEASON`; `setForecastPeriod` игнорируется для Roto. Автозаполнение отправляет `categories`; для Points — как раньше. Переключение формата при редактировании не очищает состав.

- [ ] **Step 1: Тест `category-view.test.ts`:** чипы выбирают два лучших положительных вклада и пропускают отрицательные; пустой ввод → `[]`.
- [ ] **Step 2: Прогнать** — FAIL.
- [ ] **Step 3: Реализовать** (оценка игрока в пуле — `weightedScore` с весами нужды по текущему составу и `scales` из ответа проекций; отдельный `useMemo`, не эффект); восстановление `categories` при открытии команды; сохранение категорий в create/update.
- [ ] **Step 4: Прогнать** `npx vitest run src/widgets` и `npx tsc --noEmit`.

---

## Task 6: UI

**Files:**
- Create: `src/widgets/team-builder/ui/category-selector.tsx`, `category-totals.tsx`
- Modify: `format-picker.tsx` (Categories и Roto доступны), `team-settings-panel.tsx` (категории вместо правил очков; период скрыт для Roto), `projection-meter.tsx` (итоги по категориям), `player-pool-row.tsx` и `player-pool.tsx` (чипы категорий), `autofill-preview-bar.tsx` (score), `src/views/team-builder/team-builder-view.tsx`, `src/widgets/my-teams/ui/team-card.tsx`, `src/widgets/team-builder/index.ts`
- Test: `src/widgets/team-builder/ui/__tests__/format-picker-and-preview.test.tsx` (обновить)

- [ ] **Step 1: Обновить тест пикера:** все четыре формата, из них доступны три (H2H Points, H2H Categories, Roto), DFS отключён «Soon».
- [ ] **Step 2: Прогнать** — FAIL.
- [ ] **Step 3: Реализовать:** селектор 10 чекбоксов по сторонам (минимум одна категория выбрана); итоги состава по категориям (AVG/ERA/WHIP в формате `.268`, `3.45`, `1.18`); чипы в строке пула («HR +1.2», «SB +0.8»); в превью AI для категорийных форматов показывается score, для Points очки; для Roto период отображается «Season» и недоступен для изменения.
- [ ] **Step 4: Прогнать** `npx vitest run`, `npx tsc --noEmit`, `npx eslint src/widgets/team-builder`.

---

## Task 7: Сквозная проверка и документация

- [ ] **Step 1:** в браузере (тестовый аккаунт, сервер на `localhost:3000`): создать H2H Categories, добавить двух игроков вручную, Generate with AI, принять, сохранить, открыть заново; отключить категорию и убедиться, что пул пересортировался; создать Roto и проверить период «Season».
- [ ] **Step 2:** убедиться, что один и тот же игрок получает разные значения в Points и Categories (чипы и порядок пула).
- [ ] **Step 3:** обновить `todo.md` (убрать пункты Categories и Roto, оставить DFS и хвосты) и отчёт: что проверено, что нет.
