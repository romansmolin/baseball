# Регулярные турниры — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Регулярно пополнять Tournaments тремя сериями с настоящими матчами Winter Leagues, постоянными демоучастниками, корректными недельными составами и историей результатов.

**Architecture:** League и связанные недельные модели сохраняются. Новая привязка RecurringTournament хранит шаблон и замороженный набор матчей/игроков; отдельные сервисы отвечают за публикацию, участие, подсчёт и возобновляемую обработку. Общий репозиторий статистики переиспользует DailyGameSnapshot, а старые cron делегируют новые серии одному обработчику.

**Tech Stack:** Существующие Next.js 16, React 19, TypeScript, Prisma 7/PostgreSQL, Zod, SWR, Vitest, MLB Stats API; существующие демопрофили и DiceBear-аватары. Новых платных сервисов и зависимостей не требуется.

**Spec:** `docs/superpowers/specs/2026-11-02-recurring-tournaments-design.md` — утверждена 2026-11-02. Исполнитель читает и спецификацию, и этот план.

## Global Constraints

- Только бейсбол и существующий MLB Stats API; без платных провайдеров и скрейпинга.
- Понедельник — Weekly Sprint на одну неделю; среда — Diamond Cup на две недели; пятница — Winter Championship на четыре недели. Старт в 12:00 UTC.
- Начальный источник всех трёх серий — агрегированный Winter Leagues, slug `winter-leagues`.
- Горизонт — 14 календарных UTC-дней, включая сегодняшний; в обычном режиме публикуются только строго будущие старты.
- Периоды полуоткрытые `[startsAt, endsAt)`, неделя равна `7×24h`. Цена фиксируется: `4000+(externalPlayerId % 7)×1000`.
- Девять позиций P/C/1B/2B/3B/SS/LF/CF/RF; OF для трёх аутфилдеров; бюджет 80 000; необязательный капитан ×1.5.
- Новые серии: бесплатный вход, `entryFeeCredits=0`, `prizePoolCredits=0`; регистрация закрывается на startsAt. Поздний вход старых турниров сохраняется.
- Цель демоучастия — 400–900 профилей на турнир; показанные счётчики берутся из LeagueMember. Просроченное автоматическое вступление пропускается, а не переносится задним числом.
- Начальный импорт — последние 28 дней на исходных датах, только демоучастия и проверенные исторические данные.
- Старые турниры, реальные составы, аккаунты, платежи, приглашения и завершённые результаты сохраняются. Общий `prisma/seed.ts` не используется для выпуска.
- Для старых просроченных статусов в этот выпуск входит только диагностический read-only dry-run отчёт.
- Новые серии не создают Payment/CreditTransaction/Ledger; не добавляют H2H, плей-офф или очки в глобальный Managers-рейтинг.
- Английские продуктовые тексты, существующие стили, FSD и серверные слои проекта.
- Отсутствующие данные не превращаются в FINAL 0. Незнакомый явный slug не подставляет MLB.
- `RECURRING_TOURNAMENTS_ENABLED=false` по умолчанию; SHOWCASE_ENABLED дополнительно требуется для демовступлений. Отключение публикации не останавливает расчёт уже начатых соревнований.
- Миграции генерируются Prisma на отдельной TEST_DATABASE_URL; SQL миграций вручную не редактируется. Рабочая база используется только явными CLI-флагами после проверки dry-run и backup.

## Review Focus

1. **Запрос на границе недели:** конкурентные вступление/редактирование используют часы БД и не меняют закрытый состав даже при запоздавшем cron — задача 4.
2. **Потерянный lease:** прежний обработчик после захвата задания другим владельцем не может записать результаты или курсор — задача 8.
3. **Зимний сезон и трансфер:** декабрь–январь, повторный gamePk и историческая команда не меняют источник или неделю учёта — задачи 2, 5 и 9.
4. **Страница после фильтрации:** Mine, общие счётчики, сортировка и переход страницы относятся ко всему набору; публичный ответ не раскрывает будущие составы — задачи 7 и 10.
5. **Простой до старта:** обычный tick завершает просроченный план без новых участников; только отдельный исторический импорт имеет право создать ретроспективное демоучастие — задачи 6 и 9.

---

## Структура и общие контракты

Создать `server/services/recurring-tournaments/`: каждый файл ниже отвечает за одну операцию. Транзакционные записи разместить в `server/repositories/recurring-tournaments/`, публичные типы — в `src/shared/tournaments/recurring.ts` с экспортом через существующий index.ts. Общие снимки матчей — в `server/repositories/game-snapshots/`. Существующие сервисы адаптируются через явную проверку привязки RecurringTournament, а не по строке имени.

Контракты, которые создаёт задача 1 и используют последующие задачи:

```ts
type RecurringTemplateKey = 'weekly-sprint' | 'diamond-cup' | 'winter-championship'
interface RecurringWindow {
  templateKey: RecurringTemplateKey
  sourceSlug: 'winter-leagues'
  startsAt: Date
  endsAt: Date
  totalWeeks: 1 | 2 | 4
  configurationVersion: 1
}
interface RecurringGame extends DailyGame {
  originalStartUtc: string
  apiSeason: number
  week: number
}
interface RecurringSourceSnapshot {
  games: RecurringGame[]
  playerPool: DailyPlayer[]
  checkedAt: string
}
interface RecurringTournamentContext {
  leagueId: string
  publishedAt: Date
  window: RecurringWindow
  snapshot: RecurringSourceSnapshot
  demoTarget: number
  outcome: 'STANDARD' | 'VOID'
}
type RecurringLineupInput = Pick<SaveDailyEntryInput, 'players' | 'captainExternalPlayerId'>
```

DailyGame, DailyPlayer и SaveDailyEntryInput импортируются из существующего `@/shared/daily-contests`; это повторное использование формата игрока и девяти слотов, не бизнес-логики DailyEntry. Серверный RecurringWindow с Date не сериализуется напрямую в UI.

Публичный `RecurringTournamentInfo`: templateKey, registrationClosesAt (ISO), outcome (`STANDARD|VOID`), scoringState (`PENDING|PARTIAL|FINAL`), sourceUpdatedAt (`string|null`). Он добавляется как необязательное поле `recurring` в TournamentRecord; старый ответ без привязки сохраняет существующую форму. Новые общие типы экспортируются явно.

Серверный `MutationPermit` объявляется в recurring.types.ts задачи1: `assertInTransaction(tx: Prisma.TransactionClient): Promise<void>`. Его реализация с проверкой lease появится в задаче8; ранние тесты передают явно обозначенный тестовый permit. Любая фоновая транзакция публикации/демо/подсчёта/исторического импорта обязана вызвать его, включая сохранение job cursor. Пользовательские join/edit защищаются своей транзакцией из задачи4 и не используют worker lease.

Перед задачей1: записать исходный git status и baseline результатов `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` в рабочий журнал. Существующие проблемы отмечать отдельно; не начинать их попутное исправление.

### Task 1: Привязка серии, ограничения БД и отменённый турнир

**Files:** Create `prisma/schema/recurring-tournament.prisma`, `src/shared/tournaments/recurring.ts`, `server/services/recurring-tournaments/recurring.types.ts`, `server/repositories/recurring-tournaments/recurring.repository.ts`, `server/services/recurring-tournaments/__tests__/test-db.ts`, `recurring-persistence.integration.test.ts` в том же каталоге тестов. Modify `prisma/schema/league.prisma`, `src/shared/tournaments/types.ts`, `src/shared/tournaments/index.ts`, `server/entities/tournaments/tournaments.schema.ts`, `server/services/tournaments/tournament-week.util.ts`.

**Interfaces:** `RecurringRepository(db).findByLeagueId(id): Promise<RecurringTournamentContext|null>`; `createIfMissing(input: {window; snapshot; demoTarget; scoringRuleId: string; mode: 'FUTURE'|'HISTORICAL'}, permit: MutationPermit): Promise<{context: RecurringTournamentContext; created: boolean}>`. Все типы window/snapshot — из общего блока выше. publishedAt берётся из реального League.createdAt, не из времени исторических игр. mode — внутренний аргумент, не доступный публичному клиенту; FUTURE при создании повторно проверяет startsAt по часам БД, чтобы длинная проверка API не опубликовала уже прошедший старт.

- [x] **Step 1 — тест.** `concurrent_publication_keeps_one_binding`: после двух параллельных createIfMissing одного input проверить `expect(results.filter(r => r.created)).toHaveLength(1)` и `expect(new Set(results.map(r => r.context.leagueId)).size).toBe(1)`. Дополнительные интеграционные случаи: откат транзакции не оставляет League без привязки; существующая League сохраняет ID, member, WeeklyLineup и платёжные связи. Test-db создаёт PrismaPg по отдельной TEST_DATABASE_URL и отвергает совпадение с любым рабочим URL через текущий database-url helper.
- [x] **Step 2 — RED.** `npx vitest run server/services/recurring-tournaments/__tests__/recurring-persistence.integration.test.ts` с заданной TEST_DATABASE_URL: падение из-за отсутствующего хранилища/модели, не успешный skip.
- [x] **Step 3 — реализация.** RecurringTournament: leagueId unique FK, templateKey, sourceSlug, startsAt, configurationVersion, games Json, playerPool Json, demoTarget, outcome (`STANDARD|VOID`), sourceCheckedAt, lastScoredAt nullable; unique(templateKey, sourceSlug, startsAt). Обратная optional связь в League называется recurringTournament, чтобы все последующие query могли использовать один relation filter. Create League и привязки одной транзакцией; при unique conflict повторно прочитать победившую запись. Дефолтный scoringRule фиксируется в League. Добавить LeagueStatus.CANCELLED для полностью void новых серий; в currentWeek он даёт 0. Обновить общий status union/Zod, сохранив остальные значения. Недоступная отменённая серия не участвует в payout.
- [x] **Step 4 — миграция и GREEN.** На отдельной базе: `DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate dev --name add_recurring_tournaments`, `npx prisma generate`, `npx prisma validate`, затем тест из Step 2 и `npx tsc --noEmit`. При отсутствии TEST_DATABASE_URL остановить миграцию; не использовать fallback приложения. Сгенерированные файлы клиента не коммитить.
- [x] **Step 5 — коммит.** `feat: add recurring tournament persistence`. Включить только перечисленные изменения и сгенерированную миграцию; другие незакоммиченные изменения текущей ветки не присоединять.

### Task 2: Winter Leagues в недельных данных и проверка источника

**Files:** Create `server/services/recurring-tournaments/recurring-source.service.ts`, `__tests__/recurring-source.test.ts`. Modify `src/shared/baseball/league.ts`, `server/shared/sport-leagues.const.ts`, `src/shared/team-builder/types.ts` (только если требуется согласовать каталог), `server/entities/baseball-league.schema.ts`, `server/services/scoring/weekly-scoring.service.ts`, `server/providers/mlb/mlb-leagues.config.ts`, `server/providers/mlb/__tests__/mlb-leagues.config.test.ts`, `server/entities/__tests__/baseball-league.schema.test.ts`.

**Interfaces:** `inspectRecurringSource(provider: ISportsProvider, window: RecurringWindow, options: {historical: boolean; checkpoint?: SourceCheckpoint; deadline?: number}): Promise<SourceInspection>`; `SourceInspection = {ok: true; snapshot: RecurringSourceSnapshot} | {ok: false; reason: 'SOURCE_UNAVAILABLE'|'EMPTY_WEEK'|'INVALID_POOL'} | {ok: false; reason: 'INCOMPLETE_BATCH'; checkpoint: SourceCheckpoint}`. SourceCheckpoint хранит windowKey, phase (`SCHEDULE|ROSTERS|BOX_SCORES|VERIFY`), offset, games, rostersBySeasonAndTeam, проверенные historicalGamePks и извлечённые historicalPlayers. Он не хранит полные box scores. Функция только читает источник, не публикует League. На безопасной границе при близком deadline возвращает INCOMPLETE_BATCH; неожиданный WorkDeadlineError пробрасывает.

- [x] **Step 1 — тест.** `winter_source_does_not_fall_back_to_mlb`: `expect(baseballLeagueEnum.safeParse('winter-leagues').success).toBe(true)`, `expect(baseballLeagueEnum.safeParse('unknown').success).toBe(false)`; spy getSchedule/getBoxScore ожидает `{league:'winter-leagues'}`, default без slug остаётся MLB. Окно 2026-12-30…2027-01-13 проверяет season 2025/2026/2027; одинаковый gamePk один, doubleheader с разными PK два. Ростер одной команды отсутствует — исключена лишь её игра; пустая неделя либо невозможные девять позиций дают отказ. Для historical=true команда игрока берётся из соответствующего box score, даже если актуальный roster уже другой.
- [x] **Step 2 — RED.** `npx vitest run server/services/recurring-tournaments/__tests__/recurring-source.test.ts server/entities/__tests__/baseball-league.schema.test.ts` — новые проверки падают до изменения маршрутизации/источника.
- [x] **Step 3 — реализация.** Добавить Winter Leagues в SupportedBaseballLeague/BASEBALL_LEAGUES, label `Winter Leagues`, shortName `Winter`, region `latin-america` как существующую техническую группу агрегированного источника. Дедуплицировать seasons, читать новые первыми, хранить apiSeason и historical team в snapshot. На каждой неделе нужен хотя бы один пригодный матч; при публикации исключить отменённые игры. Проверить canPublishPool и фиксированные цены. Для исторической части читать завершённые box scores; для будущей — командные ростеры. Явная неизвестная лига больше не получает undefined→MLB в двух местах weekly scoring.
- [x] **Step 4 — GREEN.** Команда Step 2 плюс `npx vitest run server/providers/mlb/__tests__` и `npx tsc --noEmit`. В fixtures зимний и MLB провайдеры имеют разные gamePk: тест проверяет отсутствие случайного обращения к MLB. Дополнительный тест: INCOMPLETE_BATCH сохраняет уже прочитанные ростеры/исторические metadata, продолжение не читает их заново и даёт тот же итоговый snapshot.
- [x] **Step 5 — коммит.** `feat: support winter leagues in weekly tournaments`.

### Task 3: Календарь трёх серий и безопасная публикация

**Files:** Create `server/services/recurring-tournaments/recurring-calendar.ts`, `recurring-publisher.service.ts`, `__tests__/recurring-calendar.test.ts`, `__tests__/recurring-publisher.integration.test.ts`; Modify `server/repositories/recurring-tournaments/recurring.repository.ts` при необходимости.

**Interfaces:** `planRecurringStarts(now: Date, horizonDays=14): RecurringWindow[]`; `planRecurringHistory(now: Date, days=28): RecurringWindow[]`; `publishRecurringTournaments(db, provider, options: PublishRecurringOptions): Promise<{created: number; existing: number; skipped: {window: RecurringWindow; reason: string}[]; checkpoint?: SourceCheckpoint}>`. PublishRecurringOptions — `{now: Date; dryRun: true; deadline?: number; checkpoint?: SourceCheckpoint}` либо `{now: Date; dryRun: false; permit: MutationPermit; deadline?: number; checkpoint?: SourceCheckpoint}`. Исторический план содержит только старты `[00:00 UTC сегодня−28 дней, now)`; сам не пишет данные. INCOMPLETE_BATCH возвращает checkpoint для продолжения того же окна и не считается отказом источника.

- [x] **Step 1 — тест.** `calendar_publishes_exactly_six_starts_in_fourteen_days`: для `const windows=planRecurringStarts(new Date('2026-11-02T10:00:00Z'))` проверить `expect(windows.map(w=>w.startsAt.getUTCDate())).toEqual([2,4,6,9,11,13])` и `expect(windows.map(w=>w.totalWeeks)).toEqual([1,2,4,1,2,4])`; все старты в12:00Z, 16 ноября не входит. Для now=12:00Z и позже старт 2 ноября отсутствует. Утро перед DST и переход декабря в январь не меняют UTC-день/число недель. Dry-run создаёт 0 строк; недоступная четвёртая неделя пропускает Championship, не блокируя Sprint. Повторный запуск сохраняет name, game snapshot, playerPool, ID и связи.
- [x] **Step 2 — RED.** `npx vitest run server/services/recurring-tournaments/__tests__/recurring-calendar.test.ts server/services/recurring-tournaments/__tests__/recurring-publisher.integration.test.ts`.
- [x] **Step 3 — реализация.** Список шаблонов является единственным источником weekday/duration. Имена: `<series> · Winter Leagues · <en-US date with year>`. Только проверенный SourceInspection.ok передаётся createIfMissing с mode=FUTURE. demoTarget стабильно вычисляется как `400 + uint32Hash(templateKey+sourceSlug+startsAtISO) % 501` и сохраняется. League PUBLIC/AUTO, нулевые entry/prize, фиксированные startsAt/endsAt. Уже опубликованный снимок не дополняется новыми играми. Отдельный тест затягивает проверку источника за startsAt и ожидает пропуск публикации.
- [x] **Step 4 — GREEN.** Повторить Step 2 с TEST_DATABASE_URL, добавить проверку двух одновременных публикаций. Ошибка одного окна сохраняет пропуски и позволяет обработать остальные.
- [x] **Step 5 — коммит.** `feat: publish three recurring tournament series`.

### Task 4: Атомарное вступление и черновики будущих недель

**Files:** Create `server/services/recurring-tournaments/recurring-entry.service.ts`, `server/repositories/recurring-tournaments/recurring-entry.repository.ts`, `__tests__/recurring-entry.integration.test.ts`. Modify `server/services/tournaments/joins/tournaments-joins.service.ts`, `server/services/me/me.service.ts`, `server/repositories/weekly-lineup/weekly-lineup.repository.ts`, `server/repositories/weekly-lineup/weekly-lineup.repository.interface.ts` только через явно выделенную ветку recurring.

**Interfaces:** `joinRecurringTournament(db, {userId, leagueId, teamId}): Promise<JoinTournamentResult>`; `saveRecurringLineup(db, {userId, teamId, input: RecurringLineupInput}): Promise<void>`. Внешние контроллеры сохраняют свои auth-проверки и текущие успешные DTO. Ошибки: 401 unauthenticated, 403 чужая команда, 400 недопустимый состав, 409 закрытая регистрация/нет будущей недели/повторное участие.

- [ ] **Step 1 — тест.** `edit_updates_only_unlocked_weeks`: при вступлении в двухнедельный Cup `expect(lineups).toHaveLength(2)` и `expect(lineups.every(l=>l.slots.length===9)).toBe(true)`; после правки в первой неделе `expect(afterWeek1).toEqual(beforeWeek1)` и `expect(afterWeek2.slots).toEqual(expectedCanonicalSlots)`. Границы lockedAt равны startsAt+7d×(week−1). Перед стартом обновляются обе недели. Чужой teamId, дубликат игрока, неправильная позиция, цена из клиента, бюджет >80 000 и капитан вне состава отвергаются. Две попытки вступить оставляют одно членство; кредитные записи не появляются.
- [ ] **Step 2 — RED.** `npx vitest run server/services/recurring-tournaments/__tests__/recurring-entry.integration.test.ts`. Добавить детерминированный boundary-тест: одна транзакция держит блокировку, вторая ждёт; после пропуска startsAt либо weekly lockedAt ожидается 409 для закрытой операции или обновление только следующей недели. Использовать короткую управляемую границу и часы PostgreSQL, не зависеть от клиентского now.
- [ ] **Step 3 — реализация.** В короткой транзакции блокировать League/привязку и команду в одном порядке, читать `clock_timestamp()` после получения блокировок; повторно проверять время непосредственно перед условными записями. Join записывает membership и все будущие snapshots атомарно. При изменении канонизировать игроков по snapshot.playerPool, обновлять живую команду и только строки `lockedAt > databaseNow`. Никаких сетевых запросов внутри транзакции. Legacy join/lineup ветка работает по прежним правилам; legacy snapshot cron позже исключает recurring (задача 8).
- [ ] **Step 4 — GREEN.** Тест Step 2, включая поздний IN_SEASON join старого турнира. Проверить, что простой cron не создаёт возможности менять закрытые недели, а исходные metadata/цены берутся с сервера.
- [ ] **Step 5 — коммит.** `feat: lock recurring tournament entries and weekly lineups`.

### Task 5: Общие снимки игр, расчёт очков и завершение

**Files:** Create `server/repositories/game-snapshots/game-snapshots.repository.ts`, `server/services/recurring-tournaments/recurring-scoring.service.ts`, `recurring-lifecycle.ts`, `__tests__/recurring-scoring.test.ts`, `__tests__/recurring-scoring.integration.test.ts`. Modify `server/repositories/weekly-score-cache/weekly-score-cache.repository.interface.ts`, `server/services/scoring/weekly-scoring.service.interface.ts` для optional outcome/exclusions в breakdown без изменения legacy смысла.

**Interfaces:** `GameSnapshotsRepository(db).findMany(gamePks: number[])` и `save(snapshot: {gamePk; leagueSlug; status; boxScore: ProviderBoxScore|null; complete: boolean; observedAt: Date}): Promise<void>` используют существующую DailyGameSnapshot. `refreshRecurringScores(db, provider, {leagueId, now, permit, deadline}): Promise<RecurringScoreSummary>`, где summary содержит entriesUpdated, weeksFinalized, pendingGames, excludedGames, outcome (`STANDARD|VOID`), timedOut. `MutationPermit.assertInTransaction(tx): Promise<void>` — контракт проверки права фоновой записи, реализуется в задаче 8; в изолированных тестах permit фиксированного владельца. Исторический импорт использует тот же контракт, а не отдельный scoring.

- [ ] **Step 1 — тест.** `missing_final_box_score_remains_partial`: после закрытия недели с FINAL/missing box проверить `expect(cache.state).toBe('PARTIAL')`, `expect(result.pendingGames).toBe(1)`; после повторного расчёта `expect(pointsAfter).toBe(pointsBefore)`, если источник не изменился. Остальные случаи: капитан ×1.5; dual batter/pitcher; два разных gamePk одного игрока; матч с переносом остаётся в исходной неделе, а вне её исходного диапазона не учитывается повторно. Пустой box score не стирает прежние очки. POSTPONED через 72h исключён, FINAL с missing stats через 72h всё ещё PARTIAL. Отменённая игра исключена сразу; полностью пустая неделя помечена VOID, полностью пустой турнир — CANCELLED без победителя. Равные очки дают места1,1,3.
- [ ] **Step 2 — RED.** `npx vitest run server/services/recurring-tournaments/__tests__/recurring-scoring.test.ts`. Интеграционный fixture с двумя сериями и 900 участниками каждой ожидает один upstream fetch на уникальный stale gamePk за проход и 0 обращений для свежего shared snapshot, а не 1 800 повторов.
- [ ] **Step 3 — реализация.** Обрабатывать замороженные RecurringGame и общий кэш; будущий box score не запрашивать, активные данные обновлять не чаще 15 минут. Начислять только по WeeklyLineup, использовать scoreGameForPlayer и CAPTAIN_MULTIPLIER. Сохранять breakdown с `outcome?: 'VOID'`, исключениями `{gamePk, reason}` и полнотой. Отсутствующий ожидаемый snapshot участника — ошибка обработки/PARTIAL, не notJoinedYet FINAL 0. Писать результаты пакетами с permit и курсором; не выдавать FINAL до конца недели и полноты всех принятых игр. IN_SEASON после endsAt остаётся Results pending; COMPLETED — после финализации всех недель. VOID-турнир получает metadata.outcome=VOID и League.CANCELLED. Обновлять lastScoredAt только после подтверждённых записей.
- [ ] **Step 4 — GREEN.** Команда Step 2, интеграционный тест и `npx vitest run server/services/daily-contests/daily-scoring-rules.test.ts server/services/tournaments/__tests__/tournaments.service.test.ts`. В интеграции snapshots и финансовые таблицы сравниваются до/после; допускаются только вычисленные recurring scores и lifecycle.
- [ ] **Step 5 — коммит.** `feat: score recurring tournaments from shared baseball snapshots`.

### Task 6: Постоянные демоучастники и возобновляемые пакеты

**Files:** Create `server/services/recurring-tournaments/recurring-demo-plan.ts`, `recurring-demo.service.ts`, `server/repositories/recurring-tournaments/recurring-demo.repository.ts`, `__tests__/recurring-demo.test.ts`, `__tests__/recurring-demo.integration.test.ts`. Reuse `server/services/showcase/demo-simulation.ts` для выбора игроков, но не его нынешнюю генерацию имени команды из общего хвоста seed.

**Interfaces:** `planRecurringDemoEntries(context: RecurringTournamentContext, profiles: DemoIdentity[], seed: string, registrationStart: Date): ScheduledDemoEntry[]`; DemoIdentity={userId,demoKey,strategy}, ScheduledDemoEntry={userId,sourceKey,scheduledAt: Date,lineup: RecurringLineupInput,teamName}. Обычный вызов всегда передаёт context.publishedAt как registrationStart. `applyDueRecurringDemoEntries(db, {context, now, permit, deadline}): Promise<{inserted: number; skippedLate: number; done: boolean}>` читает/обновляет курсор ShowcaseJob `recurring:entries:<leagueId>`.

- [ ] **Step 1 — тест.** `demo_plan_is_reproducible`: `expect(planRecurringDemoEntries(context, profiles, seed, context.publishedAt)).toEqual(planRecurringDemoEntries(context, profiles, seed, context.publishedAt))`; demoTarget всегда400…900, с ограничением фактически доступной когорты. Девять уникальных допустимых игроков и бюджет соблюдены. Один профиль имеет разные команды в двух турнирах. Защищённые/реальные аккаунты не выбираются. Повторный пакет не создаёт сирот FantasyTeam, лишних слотов или членства.
- [ ] **Step 2 — RED.** `npx vitest run server/services/recurring-tournaments/__tests__/recurring-demo.test.ts server/services/recurring-tournaments/__tests__/recurring-demo.integration.test.ts`. Сымитировать простой до startsAt: count членств не увеличился, cursor окончен, skippedLate точен. Сбой после записи команды откатывает также membership, weekly drafts и cursor.
- [ ] **Step 3 — реализация.** Упорядочить допустимые DemoProfile по datasetSeed/ordinal, выбирать детерминированную ротацию по полному ключу турнира. Даты вступления находятся между публикацией и startsAt, не создаются раньше публикации. Пакет по 25 участников: атомарно membership+отдельная команда+9 слотов+1/2/4 недельных черновика+cursor, с permit и уникальностью membership. Не создавать fake auth, кредиты или платежи. При now>=startsAt пропустить остаток с причиной registration_closed и закрыть план. Счётчики брать только из записанных членств.
- [ ] **Step 4 — GREEN.** Повторить Step 2; два одновременных worker-пакета оставляют тот же итог. При выключенном SHOWCASE_ENABLED не появляются демовступления; реальные join не зависят от него.
- [ ] **Step 5 — коммит.** `feat: populate recurring tournaments with persistent demo teams`.

### Task 7: Публичные API, глобальная пагинация и контекст конструктора

**Files:** Create `server/services/recurring-tournaments/recurring-read.service.ts`, `server/controllers/tournaments/recurring.controller.ts`, `src/app/api/tournaments/[id]/player-pool/route.ts`, `server/services/recurring-tournaments/__tests__/recurring-api.test.ts`. Modify `server/repositories/tournaments/tournaments.repository.ts`, `server/repositories/tournaments/tournaments.repository.interface.ts`, `server/models/tournament/tournament.model.ts`, `server/services/tournaments/tournaments.service.ts`, `server/services/tournaments/tournaments.service.interface.ts`, `server/services/tournaments/tournaments.mapper.ts`, `server/entities/tournaments/tournaments.schema.ts`, `server/controllers/tournaments/tournaments.controller.ts`, `server/entities/me/create-team.schema.ts`, `server/services/me/me.service.ts`, `src/shared/team-builder/types.ts`, `src/shared/tournaments/types.ts`.

**Interfaces:** `GET /api/tournaments/[id]/player-pool` → `{tournamentId, leagueSlug, players: DailyPlayer[], salaryCap: 80000, registrationClosesAt: string}`. `createTeamSchema` и CreateTeamPayload получают optional tournamentId; при его наличии сервер использует именно snapshot pool. Join дополнительно всегда перепроверяет выбранную команду по своему турниру.

Каталог принимает optional `sort=recommended|startsSoonest|endsLatest|prize|memberCount` и `mine=true`; для mine требуется сессия, query.userId не принимается. Ответ сохраняет items/total/limit/offset и добавляет leagueCounts, посчитанные по status/visibility/mine без ограничения текущей страницы и выбранной лиги. UI запрашивает limit=20; API maximum=200 остаётся для совместимости. Новые recurring info и scoringState сериализуются явно. Rank в standings/progress допускает null до первого результата и при VOID, old ranked rows остаются числовыми. RecurringReadService предоставляет `getStandings(leagueId): Promise<TournamentStandingsResponse>` и `getProgress(userId, leagueId): Promise<UserTournamentProgress>`: только чтение сохранённых snapshot/cache, 1,1,3 и userId tie-breaker. UserTournamentWeeklyScore получает optional state (`PENDING|PARTIAL|FINAL|VOID`); будущие недели не выдают сыгранный результат.

- [ ] **Step 1 — тест.** `catalog_paginates_after_global_filtering`: fixture из75 турниров, `expect(page2.total).toBe(75)`, `expect(page2.items).toHaveLength(20)`, `expect(page1.items.some(a=>page2.items.some(b=>b.id===a.id))).toBe(false)`; рекомендованный порядок применён до LIMIT. Mine+league+status работают на всём наборе. total и leagueCounts не равны длине текущей страницы по ошибке. Чужие userId в query игнорируются/отвергаются; mine без сессии401. Публичные payload не содержат email/passwordHash/auth/будущие WeeklyLineup; GET ничего не записывает и не вызывает legacy warm/prepare. Создание команды с tournamentId канонизирует поддельные price/name/team и отклоняет игрока вне пула.
- [ ] **Step 2 — RED.** `npx vitest run server/services/recurring-tournaments/__tests__/recurring-api.test.ts server/services/tournaments/__tests__/tournaments.service.test.ts`.
- [ ] **Step 3 — реализация.** В repository использовать параметризованный запрос выбора ID с CASE приоритета статуса и стабильным id tie-breaker, затем загрузить DTO в том же порядке; filters/counts используют один построитель предикатов. Не выгружать все League для сортировки в UI. Для новых серий effective status/registrationClosesAt вычисляются независимо от задержанного lifecycle cron; past endsAt с незавершённым расчётом отображает Results pending. TournamentsService.getTournamentStandings и MeService.getMyTournamentProgress делегируют recurring-чтение RecurringReadService; getMyTournaments возвращает ту же metadata. Важная существующая особенность: legacy MeService делает warmProviderCache/prepareMemberWeeks на GET — эта ветка не должна выполняться для recurring. Привязка optional, старые турниры остаются совместимыми. Пользовательские team/lineup операции только из сессии; recurring-ветка не доверяет metadata/ценам клиента.
- [ ] **Step 4 — GREEN.** Команда Step 2 и `npx tsc --noEmit`; отдельный контрактный тест сверяет Zod/status union с CANCELLED и nullable rank. Публичный player-pool не выдаёт сами составы участников.
- [ ] **Step 5 — коммит.** `feat: expose recurring tournament catalog and lineup context`.

### Task 8: Обработчик с fencing, cron и обновление открытого сайта

**Files:** Create `server/services/recurring-tournaments/recurring-lease.ts`, `recurring-runner.ts`, `server/services/showcase/showcase-refresh.ts`, `src/app/api/internal/cron/recurring-tournaments/route.ts`, `server/services/recurring-tournaments/__tests__/recurring-runner.integration.test.ts`, `recurring-cron.test.ts`. Modify `src/app/api/me/showcase/refresh/route.ts`, `src/app/api/internal/cron/refresh-tournament-status/route.ts`, `refresh-scoring/route.ts`, `snapshot-weekly-lineups/route.ts`, `settle-tournaments/route.ts`, `server/services/weekly-lineup/weekly-lineup-snapshot.service.ts`, `vercel.json`.

**Interfaces:** `tickRecurringTournaments(db, {now=new Date(), budgetMs=20000}={}): Promise<RecurringRunSummary>`, summary={publicationEnabled,acquired,published,inserted,scored,skippedLate,timedOut,errors}. `withRecurringLease(db, work: (permit: MutationPermit)=>Promise<T>): Promise<{acquired:false}|{acquired:true;result:T}>`. `refreshShowcase(db): Promise<{daily; recurring}>` — внутренний coordinator без входного пользовательского времени.

- [ ] **Step 1 — тест.** `expired_worker_cannot_commit_after_new_owner`: после захвата задания владельцемB `await expect(writeBatchWithPermitA()).rejects.toThrow('Lease lost')`, `expect(cursorAfter).toEqual(cursorBeforeA)`; данныеB остаются. Cron без корректного Bearer CRON_SECRET →401 и 0 записей; cross-origin refresh→403; public body.now не меняет часы. Два tick не исполняют одно задание. Таймбюджет сохраняет курсор и даёт следующему турниру продвижение. Свежие данные не обращаются к провайдеру раньше15 минут. Старые cron обходят recurring, legacy-набор обслуживается как прежде.
- [ ] **Step 2 — RED.** `npx vitest run server/services/recurring-tournaments/__tests__/recurring-runner.integration.test.ts server/services/recurring-tournaments/__tests__/recurring-cron.test.ts` с тестовой PostgreSQL; отдельно смоделировать отключённый флаг при существующем начатом турнире: публикации/демовступлений 0, подсчёт продолжается.
- [ ] **Step 3 — реализация.** Lease в ShowcaseJob `recurring:tournaments`, token+expiresAt, срок 55s при tick не более20s; каждый mutating batch блокирует строку задания и проверяет token/expiry через часы БД в той же транзакции. После потери permit прерывать обработку. Publication и scoring используют обязательный permit из задач1/3/5. Внешний fetch ограничить оставшимся deadline и не держать DB lock на сети. Сохранять phase/windowKey/leagueId/offset, SourceCheckpoint и round-robin следующий leagueId; до публикации источника уже может потребоваться несколько tick. Не начинать всегда с первого окна/турнира. Refresh последовательно выделяет daily≤20s и recurring≤20s в общем45s, снаружи maxDuration=60. Новому cron дать ежедневный запуск `30 4 * * *`, auth и тот же runner. Автоматические демовступления требуют обоих флагов. Обычные legacy cron/ручной backfill исключают привязанные серии на уровне запроса; один runner владеет их snapshots/scores/lifecycle.
- [ ] **Step 4 — GREEN.** Команда Step 2 плюс `npx vitest run server/services/showcase` и targeted тесты legacy cron. На локальном next dev проверять ручной route/CLI: vercel.json сам по себе cron локально не запускает.
- [ ] **Step 5 — коммит.** `feat: schedule resumable recurring tournament updates`.

### Task 9: Историческое наполнение и безопасные CLI

**Files:** Create `server/services/recurring-tournaments/recurring-history.service.ts`, `recurring-diagnostics.service.ts`, `prisma/publish-recurring-tournaments.ts`, `prisma/seed-recurring-tournaments.ts`, `prisma/tick-recurring-tournaments.ts`, `prisma/inspect-tournaments.ts`, `__tests__/recurring-history.integration.test.ts`, `__tests__/recurring-cli.test.ts`. Modify `prisma/showcase-cli.mjs`, `package.json`.

**Interfaces:** `seedRecurringHistory(db, provider, {now, days:28, seed, dryRun, resumeRunId?}): Promise<RecurringHistorySummary>`; `inspectLegacyTournaments(db, now): Promise<{overdueInSeason; overduePlayoffs; futureDrafting; total}>` — read-only. Summary содержит runId, created/existing/entriesAdded, verifiedWeeks, pendingWeeks, skippedSource, timedOut. Manifest хранит фиксированный asOf и окна импорта в ignored `.showcase-data/` с правами0600; resumeRunId продолжает именно этот план, не сдвигает даты.

- [ ] **Step 1 — тест.** `history_resume_preserves_entries_and_source_dates`: `expect(idsAfterResume).toEqual(idsAfterRepeat)`, `expect(financialRowsAfter).toEqual(financialRowsBefore)`; импорт28 дней выбирает исходные старты, сохраняет team/position из исторического box score и не использует будущие результаты для текущей недели. Сбой в середине и resume сохраняют уже рассчитанные snapshots; два запуска не дублируют команды. Historical path добавляет только разрешённые DemoProfile, обычный tick этого делать после startsAt не может. Если у уже существующего исторического окна есть реальные участники, импорт пропускает его с reason REAL_PARTICIPANTS, не добавляя им задним числом соперников. Старые38 League и финансовые записи неизменны. Dry-run и диагностика не создают даже job-row/manifest в БД; отсутствие --production не позволяет работать с application URL.
- [ ] **Step 2 — RED.** `npx vitest run server/services/recurring-tournaments/__tests__/recurring-history.integration.test.ts server/services/recurring-tournaments/__tests__/recurring-cli.test.ts`.
- [ ] **Step 3 — реализация.** Исторический импорт использует planRecurringHistory, inspectRecurringSource(historical=true), тот же idempotent repository.createIfMissing с mode=HISTORICAL и permit, shared snapshots/scoring и lease с продлением между ограниченными пакетами. Будущий publisher по-прежнему не принимает прошлые старты. Только исторический service передаёт registrationStart=startsAt−14d в чистый demo planner и записывает фактическое импортное происхождение, сохраняя реальные createdAt. Для завершённых недель брать исторические участники/команды из box scores; future drafts строить только по опубликованному пулу. Не выдавать неизвестные stats за ноль и не объявлять текущую неделю завершённой. Команды: `tournaments:publish`, `tournaments:seed-history -- --days 28 --seed recurring-v1`, `tournaments:tick`, `tournaments:inspect`. Запись только с --apply, --dry-run имеет приоритет; application URL требует --production и существующий createShowcaseCliDb. `tournaments:tick` без --apply даёт план/диагностику, а не пишет. Результат CLI включает выбранные даты, полноту, причины пропуска и resumeRunId; секреты не печатаются.
- [ ] **Step 4 — GREEN.** Команда Step 2. На отдельной PostgreSQL выполнить один небольшой проверенный исторический старт дважды, затем полный28-дневный диапазон; сравнить ID/counts/финансы. При ошибке реального источника сохранить отчёт и продолжить после восстановления, не подменять fixture-данными выпуск.
- [ ] **Step 5 — коммит.** `feat: add resumable recurring tournament bootstrap commands`.

### Task 10: Каталог, конструктор и недельные результаты в UI

**Files:** Create `src/entities/tournaments/api/fetch-tournament-player-pool.ts`, `src/entities/tournaments/model/use-tournament-player-pool.ts`, `src/widgets/tournaments/ui/tournaments-pagination.tsx`, `src/widgets/tournaments/model/tournament-state.ts`, `src/widgets/tournaments/model/tournament-state.test.ts`. Modify `src/entities/tournaments/api/types.ts`, `map-tournaments.ts`, `fetch-tournaments.ts`, `src/entities/tournaments/index.ts`, `src/widgets/tournaments/model/use-tournaments-state.ts`, `tournament-filters.ts`, `tournament.type.ts`, `tournament-display.ts`, `src/widgets/tournaments/ui/tournament-card.tsx`, `tournament-detail-panel.tsx`, `standings-table.tsx`, `tournaments-toolbar.tsx`, `src/views/tournaments/tournaments-view.tsx`, `src/features/tournament-join/model/tournament-input.type.ts`, `use-tournament-join.ts`, `src/features/tournament-join/ui/tournament-join-dialog.tsx`, `src/widgets/tournament-progress/ui/user-tournament-progress.tsx`, `src/widgets/team-builder/model/use-team-builder-state.ts`, `src/views/team-builder/team-builder-view.tsx`, `src/shared/team-builder/types.ts`, `src/entities/team-builder/api/user/create-team.ts`.

**Interfaces:** entity hook `useTournamentPlayerPool(tournamentId?:string)` отдаёт DTO задачи7. Builder принимает optional tournamentId из URL/props и сохраняет его при createTeam; при редактировании связанной команды контекст определяется сервером по membership. Public/domain DTO используются через entities, UI не вызывает провайдер или Prisma. `TournamentListSelection={leagueSlug:string|null;status:StatusFilter;sort:SortKey;mine:boolean;offset:number}`; `changeTournamentListSelection(state, change:Partial<TournamentListSelection>): TournamentListSelection` сбрасывает offset при смене фильтра/сортировки, но сохраняет явный переход страницы. `canJoinTournamentAt(tournament: Pick<TournamentRecord,'status'|'recurring'>, now: Date): boolean` учитывает registrationClosesAt новых серий, сохраняя legacy статусы допуска. Mine передаётся на сервер, limit=20.

- [ ] **Step 1 — тест.** `filter_change_resets_offset`: `expect(changeTournamentListSelection(state,{mine:true}).offset).toBe(0)` для state с mine=false/offset40; такие же проверки лиги/status/sort. Запрошенная страница не фильтруется повторно клиентом; ошибка refetch сохраняет последний успешный список. `registration_is_closed_at_the_boundary`: `expect(canJoinTournamentAt(tournament,new Date(tournament.recurring.registrationClosesAt))).toBe(false)` для recurring fixture. У недельного Sprint после старта edit недоступен; у Cup видна следующая неделя. Pending/VOID rank рендерится как dash, не придуманное место. Null photo fallback сохраняется.
- [ ] **Step 2 — RED.** `npx vitest run src/widgets/tournaments/model/tournament-state.test.ts`.
- [ ] **Step 3 — реализация.** На карточках новые имена, даты, Free entry, длительность, реальные count и points. Для новых нулевых призовых фондов показывать standings/fantasy points, а не пустое денежное обещание; legacy платные карточки сохраняют прежние тексты. Для recurring скрыть колонки H2H wins/losses, показать PARTIAL/Results pending/Cancelled и время актуальности. Builder с tournamentId загружает замороженный пул вместо текущего изменчивого списка по команде, фиксирует лигу и возвращает к нужному турниру после сохранения; связанная команда другого турнира не переносится. Не менять dashboard-композицию или Daily contests.
- [ ] **Step 4 — GREEN и браузер.** Команда Step 2, `npx tsc --noEmit`, targeted ESLint. На360/768/1440px: каталог→фильтр→вторая страница→новая команда→бесплатное вступление→изменение будущей недели→итоги. Проверить пустое расписание, 409 на границе, unavailable source и последнее сохранённое состояние. При недоступном browser tool зафиксировать непроверенные сценарии, не заявлять браузерную проверку выполненной.
- [ ] **Step 5 — коммит.** `feat: integrate recurring tournaments into catalog and team builder`.

### Task 11: Полный прогон, инструкция эксплуатации и выпуск

**Files:** Create `docs/showcase/recurring-tournaments.md`; Modify `docs/showcase/operations.md`, `.env.example` если он отслеживается проектом; обновить чекбоксы этого плана фактическими результатами.

**Interfaces:** Использует команды задач8/9 и публичный цикл задачи10. Новых бизнес-контрактов не создаёт.

- [ ] **Step 1 — baseline и изолированная база.** Сверить итог с baseline, записанным перед задачей1. На отдельной PostgreSQL применить миграции и подготовить когорту30000 только штатным безопасным showcase importer. Для чистой disposable базы допустим начальный seed до тестовых сценариев; никакого destructive db:seed на application URL.
- [ ] **Step 2 — полный сценарий.** На TEST_DATABASE_URL: publish dry-run→apply→повтор; seed-history28days dry-run→apply/resume→повтор; tick с обоими флагами→два параллельных tick→disable publication→продолжение score. Проверить сохранность старых связей, реальных member IDs и финансовых таблиц. Зафиксировать actual турниры/участия/positive scores/partial/void; полное наличие всех12 исторических стартов не гарантируется при недостаточных данных источника.
- [ ] **Step 3 — эксплуатация.** В runbook записать env flags, daily cron04:30UTC, authenticated refresh60s и sports freshness15min, локальный ручной запуск, CLI-флаги, причины пропуска, resumeRunId, резервное копирование и повторный запуск. Диагностика старых статусов read-only. Отключение флага прекращает новую публикацию/демовступления, продолжая расчёт и доступ существующих реальных участников. Описать, как отличить последний успешный run от последней попытки.
- [ ] **Step 4 — итоговая проверка.** `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. Повторить только проверки, требуемые новыми изменениями/ошибками. Зафиксировать существующие ошибки отдельно от новых и приложить метрики API при900 участниках. Независимая итоговая проверка всего набора изменений выполняется после завершения задач, с учётом уже существующего dirty worktree.
- [ ] **Step 5 — рабочий выпуск.** Сначала read-only inspect и `--production --dry-run`, затем резервная копия с проверкой читаемости. Применить сгенерированные миграции через `prisma migrate deploy` с нужным application URL, выполнить publish/history --production --apply, сверить ключи/счётчики и включить RECURRING_TOURNAMENTS_ENABLED; SHOWCASE_ENABLED управляет демоучастиями отдельно. При отсутствии источника или несоответствии отчётов остановить наполнение на этом месте с конкретной причиной. Новые серии становятся доступны после фактической проверки записей, а не только HTTP200 cron.
- [ ] **Step 6 — коммит.** `docs: document recurring tournament operations and verification`. Фактические результаты и оставшиеся ограничения указать в итоговом сообщении; не заявлять рабочий выпуск выполненным по результатам одной тестовой базы.

## Порядок исполнения и контроль плана

Задачи1→11 последовательно в текущей сессии: контракты источника, снимков, регистрации и worker permit связаны. Каждая задача проходит RED→GREEN и отдельный коммит; в Task11 проверки/документация опираются на уже работающие задачи, искусственный RED для текста не нужен. Новые инфраструктурные, UI- и интеграционные тесты пишутся для инвариантов, а не для копирования реализации.

Перечисленные изменения существующих файлов в задачах предполагают уже имеющееся состояние текущей ветки, включая предыдущие работы по Daily contests. Перед коммитом проверять staged diff; не коммитить все изменения через git add . и не откатывать неизвестные правки. Если модифицируемый файл уже содержит чужую правку, включать только относящийся к задаче hunk.

Самопроверка плана: календарь/источник→2–3; данные→1; составы/приватность→4/7; очки/переносы/void→5; демо и восстановление→6/9; fencing/cron/выключение→8; каталог/конструктор→7/10; bootstrap/QA/выпуск→9/11. Каждый пункт Review Focus имеет конкретный тест в названной задаче.
