# Winter Baseball and Contest History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Подключить реальные зимние бейсбольные матчи к Daily Classic и сделать Replay историей завершённых конкурсов.

**Architecture:** Расширить существующий MLB-провайдер источником `winter-leagues`, сохранив отдельный каталог лиг недельных турниров. Календарь и scoring используют общий загрузчик расписания с обработкой сезонов. Представления current/history независимы от происхождения LIVE/REPLAY; архив доступен только для чтения.

**Tech Stack:** Существующие Next.js, React, TypeScript, Prisma/PostgreSQL, SWR, Zod, Vitest и MLB Stats API. Новые зависимости не требуются.

**Spec:** `docs/superpowers/specs/2026-11-01-winter-baseball-and-history-design.md`

## Global Constraints

- Только бейсбол; платные API и скрейпинг в эту работу не входят.
- Единственный новый источник календаря — Winter Leagues в существующем MLB Stats API, `sportId=17`.
- Winter Leagues подключаются только к ежедневным конкурсам; список лиг недельных турниров и общего team builder не расширяется.
- Продуктовые тексты остаются на английском.
- Существующие правила Daily Classic сохраняются: девять позиций, бюджет `80 000`, капитан `1.5`, бесплатное участие, существующий scoring engine.
- Существующие аккаунты, платежи, составы, завершённые конкурсы и результаты сохраняются.
- Демоучастия остаются демонстрационными данными; реальные и демонстрационные показатели не смешиваются.
- Получение данных и бизнес-логика находятся в серверных слоях; UI использует entity hooks.
- Миграция схемы БД не планируется. Все интеграционные проверки и операции наполнения сначала выполняются на отдельной базе через `TEST_DATABASE_URL`.
- Рабочее дерево содержит изменения прошлых задач: не откатывать их и не включать посторонние изменения в коммиты.

## Review Focus

1. Январский матч относится к предыдущему API-сезону: календарь находит его, а ростер получает правильный `season` — Task 2.
2. DST и doubleheader: три игровых дня не пропускаются, две игры одного дня сохраняют разные `gamePk` — Task 2.
3. Нет расписания, ростера или box score: новый непроверенный конкурс не публикуется, сохранённые данные остаются доступны, очки предварительные — Task 2.
4. Прямой запрос к Replay обходит UI: сервер запрещает запись, незавершённый Replay скрыт, история содержит также завершённые LIVE — Task 3.
5. Повторная отмена старых Replay и параллельный tick: завершённые данные и связи сохраняются, новые архивные копии и участия не возникают — Task 3.

---

### Task 1: Источник Winter Leagues в существующем провайдере

**Files:**
- Modify: `src/shared/baseball/league.ts`, `src/shared/baseball/index.ts` — отдельный тип источника данных.
- Modify: `server/providers/sports-provider.interface.ts`, `server/providers/dto/provider-schedule.dto.ts` — параметры источника.
- Modify: `server/providers/mlb/mlb-leagues.config.ts`, `server/providers/mlb/mlb.provider.ts` — маршрутизация и типизация.
- Test: `server/providers/mlb/__tests__/mlb-leagues.config.test.ts`, `server/providers/mlb/__tests__/mlb.provider.test.ts`.
- Test: `src/shared/baseball/__tests__/league.test.ts`.

**Interfaces:**
- Produces: `BaseballProviderLeague = SupportedBaseballLeague | 'winter-leagues'`, экспорт через `@/shared/baseball`.
- `GetTeamsFilters.league`, `GetTeamByIdOptions.league`, `GetPlayersByTeamOptions.league`, `GetBoxScoreOptions.league`, `GetScheduleFilters.league` принимают этот тип.
- `resolveSportId(league?: BaseballProviderLeague | null): number` и `sportIdFor(league: BaseballProviderLeague): number`.
- `SupportedBaseballLeague` и `BASEBALL_LEAGUES` сохраняют прежние значения.

- [ ] **Step 1: Написать тесты маршрутизации.** `winter_uses_sport_17` проверяет расписание, команды и targeted schedule внутри box score; `default_remains_mlb` проверяет `1`; `winter_is_not_a_weekly_picker_option` проверяет отсутствие нового slug в продуктовом каталоге. Mock-ответы ростера и box score содержат реальные по форме строки отбивания и питчинга.

```ts
expect(sportIdFor('winter-leagues')).toBe(17)
expect(resolveSportId()).toBe(1)
expect(isSupportedBaseballLeague('winter-leagues')).toBe(false)
```

- [ ] **Step 2: Подтвердить падение.** Запустить `npm test -- server/providers/mlb/__tests__/mlb-leagues.config.test.ts server/providers/mlb/__tests__/mlb.provider.test.ts src/shared/baseball/__tests__/league.test.ts`; новые проверки должны падать из-за отсутствия маршрутизации `17`.
- [ ] **Step 3: Реализовать тип и mapping.** Добавить `winter-leagues: 17` только в конфигурацию провайдера; обновить внутренний `buildTeamLookup` и остальные затронутые сигнатуры. Существующие парсеры расписания, ростера и box score переиспользовать; корректировать их только при доказанном несовпадении fixture. Не добавлять новую лигу в недельные селекторы.
- [ ] **Step 4: Проверить.** Повторить команду Step 2 и `npx tsc --noEmit`; новые тесты проходят, существующие проверки provider routing продолжают проходить. Существующие посторонние ошибки записать отдельно.
- [ ] **Step 5: Коммит.** Зафиксировать только изменения этой задачи: `feat: support winter baseball data in MLB provider`.

### Task 2: Зимний календарь, сезоны и расчёт

**Files:**
- Create: `server/services/daily-contests/daily-schedule.service.ts` — общий загрузчик с API-сезоном каждого матча.
- Modify: `server/services/daily-contests/daily-calendar.service.ts`, `server/services/daily-contests/daily-scoring.service.ts`, `server/services/daily-contests/daily-rules.ts`.
- Test: `server/services/daily-contests/daily-schedule.service.test.ts`, `server/services/daily-contests/daily-calendar.service.test.ts`, `server/services/daily-contests/daily-scoring.service.test.ts`, `server/services/daily-contests/daily-rules.test.ts`.
- Create: `server/services/daily-contests/fixtures/winter-baseball.json` — небольшой обезличенный ответ расписания, ростера и завершённого box score; указать исходные URL и время получения рядом с данными.

**Interfaces:**
- Consumes: `BaseballProviderLeague` и методы `ISportsProvider` из Task 1.
- Produces: `DailyScheduledGame = { game: ProviderScheduledGame; apiSeason: number }`.
- Produces: `loadDailySchedule(provider: ISportsProvider, input: { league: BaseballProviderLeague; startDateUtc: Date; endDateUtc: Date; revalidateSeconds?: number }): Promise<DailyScheduledGame[]>`.
- Сохраняет публичные сигнатуры `publishDailyContests({ now, lookaheadDays })` и `refreshDailyScores(contestId, now)`.

- [ ] **Step 1: Написать тесты.** `january_uses_source_season_for_rosters` возвращает январскую игру только из предыдущего `season` и проверяет его передачу в ростер. `cross_year_schedule_deduplicates_game_pk` проверяет единственный экземпляр матча. `new_york_dst_keeps_three_calendar_days` использует переходы 2026-03-08 и 2026-11-01; `late_utc_game_stays_in_local_day` — `2026-11-02T01:00:00Z`; `doubleheader_keeps_both_games` — разные ID. `winter_pool_must_fill_nine_slots_under_80000` проверяет отказ при отсутствии C или превышении бюджета. `upstream_failure_preserves_published_snapshot` проверяет неизменность старого пула и отсутствие нового конкурса. `winter_missing_box_remains_provisional` проверяет отсутствие финализации при недоступной статистике.

```ts
expect(januaryGame.apiSeason).toBe(2026) // fixture: 2027-01-05
expect(rosterCall.season).toBe(2026)
expect(new Set(games.map(row => row.game.gamePk)).size).toBe(games.length)
expect(missingBoxResult.complete).toBe(false)
```

- [ ] **Step 2: Подтвердить падение.** `npm test -- server/services/daily-contests/daily-schedule.service.test.ts server/services/daily-contests/daily-calendar.service.test.ts server/services/daily-contests/daily-scoring.service.test.ts server/services/daily-contests/daily-rules.test.ts`; новые тесты должны падать на отсутствующем загрузчике и зимней публикации.
- [ ] **Step 3: Реализовать загрузчик расписания.** Для winter запросить уникальные годы диапазона и предыдущий год каждого из них, по убыванию; объединить по `gamePk`, сохраняя первый `apiSeason`. Для остальных источников запросить годы диапазона без зимнего дополнения. Ошибку полного получения расписания передать вызывающему коду; частичный ответ не считать проверенным набором для публикации.
- [ ] **Step 4: Подключить загрузчик к календарю.** Добавить `winter-leagues` к трём текущим источникам. Получать ростеры/команды по `apiSeason`, кешировать их в рамках запуска по паре team/season, строить уникальный допустимый пул. Обход трёх дней выполнять по календарю New York; сохранять реальные матчи, исходные времена, цены и earliest lock. Использовать имя `Winter Leagues Daily Classic`. При ошибке конкретного источника сохранять старые данные и продолжать остальные источники; не переписывать опубликованный снимок.
- [ ] **Step 5: Подключить загрузчик к scoring.** Передавать `winter-leagues` в box score без приведения к старому узкому типу. Сохранить общий снимок матча, предварительность, 72 часа и существующую математику. Провести fixture через текущий scoring engine; не создавать случайные итоговые очки.
- [ ] **Step 6: Проверить.** Повторить Step 2; запустить `npm test -- server/services/daily-contests server/services/scoring` и `npx tsc --noEmit`. Проверить на отдельной БД, что два запуска календаря сохраняют один конкурс с прежним ID/пулом. Внешние HTTP-вызовы не включать в обычные unit tests.
- [ ] **Step 7: Коммит.** `feat: publish and score real winter daily contests`.

### Task 3: Серверная история и прекращение будущих Replay

**Files:**
- Modify: `src/shared/daily-contests/types.ts`, `src/shared/daily-contests/index.ts` — `DailyContestView`.
- Modify: `server/entities/daily-contests/daily-contests.schema.ts`, `server/controllers/daily-contests/daily-contests.controller.ts`, `server/repositories/daily-contests/daily-contests.repository.ts` — фильтры и запрет записи.
- Modify: `server/services/showcase/showcase-runner.ts`, `server/services/community/community.service.ts` — остановка клонирования и исключение отменённых конкурсов из метрик и ленты.
- Create: `server/services/showcase/retire-open-replays.ts`, `prisma/retire-open-replays.ts`.
- Modify: `prisma/showcase-cli.mjs`, `package.json`, `docs/showcase/operations.md`.
- Test: `server/controllers/daily-contests/daily-contests.controller.test.ts`, `server/services/daily-contests/daily-contests.integration.test.ts`, `server/services/showcase/retire-open-replays.integration.test.ts`, `server/services/showcase/showcase-runner.integration.test.ts`.

**Interfaces:**
- Produces: `DailyContestView = 'current' | 'history'`.
- Каталог принимает `view?: DailyContestView` и прежние фильтры; нормализованный `view` обязателен для repository list.
- Produces: `retireOpenReplays(db: PrismaClient, input: { dryRun: boolean; now: Date }): Promise<{ candidates: number; cancelled: number; acquired: boolean }>`.
- Команда `npm run showcase:retire-open-replays -- --dry-run`; выполнение без флага применяет отмену под общим showcase lease. Dry-run не пишет lease или другие данные и возвращает `acquired: false`.

- [ ] **Step 1: Написать проверки каталога и запрета.** `history_contains_completed_live_and_legacy_replay` проверяет оба происхождения и точный total. `current_excludes_completed_and_replay` проверяет активный LIVE. `legacy_mode_replay_maps_to_history` проверяет совместимость. `incompatible_view_status_is_400`, `unfinished_replay_detail_is_404`, `authenticated_replay_save_is_409`, `unauthenticated_save_is_401` проверяют серверные контракты. Выполнить save также для искусственно OPEN Replay с будущим locksAt.

```ts
expect(history.items.map(row => row.id)).toEqual([completedLive.id, completedReplay.id])
expect(history.total).toBe(2)
expect(openReplaySave.status).toBe(409)
```

- [ ] **Step 2: Написать проверки данных и runner.** `tick_never_clones_replay_or_adds_replay_entries` запускает tick дважды. `retirement_is_idempotent_and_preserves_relations` сравнивает ID, записи entries/events и points до/после; меняются только OPEN/LOCKED Replay на CANCELLED. `dry_run_writes_nothing` сравнивает снимки таблиц. `retirement_and_tick_share_lease` проверяет недоступность одновременного выполнения; `cancelled_entries_do_not_count_as_activity` проверяет метрики. `cancelled_contest_events_are_hidden` исключает связанные события из публичной ленты, сохраняя события без конкурса.
- [ ] **Step 3: Подтвердить падение.** Запустить controller unit tests; затем новые integration tests с явно заданной отдельной `TEST_DATABASE_URL`. До реализации должны падать конкретные новые assertions, а не подключение к БД. Не использовать fallback на рабочие STORAGE-переменные.
- [ ] **Step 4: Реализовать представления и ограничения.** Нормализовать query в Zod/controller; `current` ограничить LIVE OPEN/LOCKED, `history` — COMPLETED обоих mode. Считать total тем же where. Сортировать current по locksAt asc, history по contestDate desc, вторым ключом — ID. Сохранить серверную проверку времени в атомарной записи; добавить запрет mode REPLAY внутри той же транзакции. Скрыть незавершённый Replay в публичных деталях.
- [ ] **Step 5: Исправить runner и добавить операцию отмены.** Удалить цикл создания будущих архивных копий; выборку автоучастий ограничить LIVE. Операция отменяет только OPEN/LOCKED Replay, сохраняет данные и использует `showcase:tick` lease. Dry-run выполняет только чтение и отчёт. Исключить отменённые конкурсы из метрик активности и публичной ленты; сохранить финальные исторические результаты и их рейтинги.
- [ ] **Step 6: Проверить и описать выпуск.** Повторить tests Step 3; на отдельной БД выполнить dry-run → отмену → повторную отмену → два tick. Сверить сохранность связей и отсутствие новых Replay. В operations.md описать команды, резервную копию, lease, повторный запуск и проверку результатов. Существующий seed history остаётся явной административной операцией.
- [ ] **Step 7: Коммит.** `feat: make replay a read-only contest history`.

### Task 4: Current games и History в интерфейсе

**Files:**
- Modify: `src/entities/showcase/api/showcase.api.ts`, `src/entities/showcase/model/use-showcase-data.ts` — контракт view и SWR keys.
- Create: `src/widgets/showcase/model/use-daily-contests-state.ts` — представление и сброс пагинации; существующий `useShowcaseState` для рейтингов не менять.
- Modify: `src/widgets/showcase/ui/showcase-primitives.tsx` — отдельный переключатель представления, прежний переключатель mode для рейтингов сохраняется.
- Modify: `src/widgets/showcase/ui/daily-contests-catalog.tsx`, `src/widgets/showcase/ui/showcase-overview.tsx`, `src/widgets/showcase/ui/daily-contest-card.tsx`, `src/widgets/showcase/ui/daily-contest-detail.tsx`, `src/widgets/showcase/ui/landing-showcase.tsx`.
- Modify: `src/views/daily-contests/daily-contests-view.tsx`, `src/app/(app)/contests/page.tsx`.
- Create: `src/widgets/showcase/model/contest-presentation.ts` — проверяемые подписи карточек.
- Create: `src/shared/daily-contests/entry-availability.ts` — единое правило доступности редактирования; export через `src/shared/daily-contests/index.ts`.
- Test: `src/widgets/showcase/model/contest-presentation.test.ts`.
- Modify: `src/features/daily-entry/model/use-daily-entry-editor.ts`, `src/features/daily-entry/model/__tests__/daily-entry-state.test.ts` — защита редактора от Replay через shared helper; feature не импортирует widgets.

**Interfaces:**
- Consumes: `DailyContestView`, query view и контракты Task 3.
- `useDailyContestsData(view: DailyContestView, limit?: number, offset?: number)` — обновить все вызовы, включая лендинг.
- `useDailyContestsState(initialView: DailyContestView = 'current')` возвращает `{ view, setView, offset, setOffset }`; setView сбрасывает offset.
- UI-состояние view независимо от существующего mode исторических рейтингов: переключение списка конкурсов не переводит Top managers в другой источник результатов.
- `canEditDailyContest(contest: DailyContestSummary, now: number): boolean` в `@/shared/daily-contests` возвращает true только для LIVE OPEN до корректного locksAt; неизвестное время клиента отключает сохранение до появления часов. Проверку используют виджет деталей и feature hook, включая повторную проверку внутри save.

- [ ] **Step 1: Написать проверки состояния.** `history_query_includes_both_origins` проверяет view=history без mode; `changing_view_resets_offset` проверяет offset=0; `replay_is_never_editable` проверяет даже OPEN Replay; `completed_card_opens_results` проверяет `View results`. Существующие проверки редактора дополнить условием запрета REPLAY, сохранив проверку истёкшего locksAt.

```ts
expect(canEditDailyContest(openReplay, beforeLock)).toBe(false)
expect(canEditDailyContest(openLive, beforeLock)).toBe(true)
expect(canEditDailyContest(openLive, atLock)).toBe(false)
```

- [ ] **Step 2: Подтвердить падение.** `npm test -- src/widgets/showcase/model/contest-presentation.test.ts src/features/daily-entry/model/__tests__/daily-entry-state.test.ts`; новые требования должны падать до изменения UI-модели.
- [ ] **Step 3: Обновить hooks и навигацию.** Использовать view в запросах, SWR keys и пагинации; канонический адрес `/contests?view=history`. Старый mode=REPLAY URL открыть как history. Убрать автоматическое переключение по пустому ответу и сохранить кеш при ошибке загрузки.
- [ ] **Step 4: Обновить отображение.** Кнопки `Current games` / `History`; название архивного списка `Contest history`; карточка завершённого конкурса `View results`; зимний slug отображается как `Winter Leagues`. Пустое текущее состояние: `No contests are currently available. Check back for upcoming games or explore contest history.` со ссылкой на историю. В деталях истории показать итоговые составы, очки, sourceDate при отличии дат; скрыть редактор для REPLAY. Убрать тексты `Play historical baseball games` и приглашения вступить в Replay на dashboard, лендинге и деталях.
- [ ] **Step 5: Проверить сценарии.** Повторить Step 2, затем `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. Зафиксировать посторонние существующие ошибки отдельно. Браузер: 360/768/1440 px, текущий зимний конкурс → сохранение состава → блокировка → итог в History → состав соперника → профиль; дополнительно пустой календарь, сбой источника, старый Replay URL и архив без собственного участия. Завершение реальных будущих игр проверять fixture-сценарием на тестовой базе, а не изменением времени рабочей базы.
- [ ] **Step 6: Коммит.** `feat: show winter contests and completed contest history`.

## Порядок выпуска и итоговая приёмка

На отдельной базе проверить тестовые сценарии календаря и полного игрового цикла, dry-run отмены и повторяемость tick. Получить небольшое актуальное расписание Winter Leagues из API и проверить публикацию только будущих игр с допустимым пулом. Если источник в этот день не даёт подходящих игр, сохранить честное пустое состояние и проверить цикл на сохранённых данных.

В рабочем окружении: резервная копия → выпуск кода с серверным запретом Replay → dry-run старых незавершённых Replay → применение отмены → `showcase:tick` → проверка API current/history и интерфейса. Существующий `SHOWCASE_ENABLED` управляет доступностью; новые cron и миграции не нужны. Проверить, что следующий плановый запуск не создаёт Replay и обрабатывает LIVE Winter Leagues. Не выполнять полное повторное наполнение 30 000 профилей: эта задача их не меняет.
