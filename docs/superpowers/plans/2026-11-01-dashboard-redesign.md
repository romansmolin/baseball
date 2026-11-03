# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать выбранную главную «Следующий конкурс».

**Architecture:** Widget выбирает один текущий конкурс через чистую функцию и существующие entity hooks. Отдельные небольшие UI-компоненты отвечают за hero, личный блок и трёх лидеров. Dashboard композирует компактный onboarding и showcase без повторных метрик.

**Tech Stack:** Существующие Next.js, React, TypeScript, SWR, Tailwind и Vitest; без новых зависимостей.

**Spec:** `docs/superpowers/specs/2026-11-01-dashboard-redesign-design.md`

## Global Constraints

- Только реальные данные из существующих API; английские тексты.
- Без изменения БД, cron или scoring.
- Сохраняем FSD, legacy dashboard и доступ ко всем разделам навигации.
- Незавершённый onboarding — сверху, completed onboarding скрывается.
- Основная ширина 1440 px; поддержка 360 px без горизонтального переполнения.

## Review Focus

1. Deadline равен now: просмотр вместо редактирования — задача 1.
2. Исторический или отменённый конкурс не попадает в hero — задача 1.
3. Ошибка собственного entry не выглядит как отсутствие entry — задачи 1–2.
4. Ошибка обновления не стирает сохранённые данные; ошибка без данных не выглядит как offseason — задача 2.
5. Мобильное меню, длинные имена и раскрытый onboarding остаются доступными — задача 2.

---

### Task 1: Выбор featured конкурса

**Files:**
- Create: `src/widgets/showcase/model/featured-contest.ts`
- Test: `src/widgets/showcase/model/featured-contest.test.ts`
- Modify: `src/entities/showcase/model/use-showcase-data.ts`
- Modify: `server/repositories/daily-contests/daily-contests.repository.ts`
- Modify: `server/controllers/daily-contests/daily-contests.controller.ts`
- Modify: `src/entities/showcase/api/showcase.api.ts`
- Create: `src/app/api/daily-contests/featured/route.ts`
- Test: `server/repositories/daily-contests/featured-contest.repository.test.ts`

**Interfaces:**
- `selectFeaturedContest(contests: readonly DailyContestSummary[], now: number): DailyContestSummary | null`
- `getFeaturedContestAction(contest: DailyContestSummary, hasEntry: boolean | null, now: number): { href: string; label: string; editable: boolean }`
- `useDailyEntryData(id: string | null)` skips the request when no featured contest exists.
- `DailyContestsRepository.featured(): Promise<DailyContestSummary | null>` and `useFeaturedDailyContestData()` query all current contests at the database boundary, avoiding catalogue pagination.

- [x] Тесты: ближайший открытый; открытый важнее locked; последний locked; исключение Replay/completed/cancelled; точная граница locksAt; невалидное время; сохранённый и неизвестный entry.
- [x] `npm test -- src/widgets/showcase/model/featured-contest.test.ts`: RED до создания модуля, GREEN после реализации.
- [x] Реализовать функции без мутации исходного списка и conditional entry hook.
- [x] После независимого review добавить RED→GREEN repository tests для глобального запроса OPEN/latest LOCKED, пустого результата и ошибки БД.

### Task 2: Главная и навигация

**Files:**
- Create: `src/widgets/showcase/ui/featured-contest.tsx`
- Create: `src/widgets/showcase/ui/dashboard-community.tsx`
- Modify: `src/widgets/showcase/ui/showcase-overview.tsx`
- Modify: `src/widgets/dashboard/ui/onboarding-checklist.tsx`
- Modify: `src/widgets/dashboard/ui/dashboard-header.tsx`
- Modify: `src/views/dashboard/dashboard-view.tsx`

**Interfaces:**
- Hero consumes task 1's contest/action and own entry from entity hooks.
- Community consumes `useManagersData({ mode: 'LIVE', period: 'season', limit: 3, offset: 0 })`.
- Compact onboarding consumes existing `useOnboardingData()` and native details/summary.

- [x] Собрать hero и состояния loading/error/empty/stale без фиктивных значений.
- [x] Добавить Your corner и три реальных ranked manager; пустые данные не заменять нулями.
- [x] Заменить композицию dashboard, оставить legacy при выключенной витрине.
- [x] Свернуть onboarding, расширить область и сгруппировать навигацию.
- [x] Проверить `npx tsc --noEmit`, targeted `npx eslint`, `npm test`; отметить существующие ошибки.
- [x] Независимая проверка изменённых файлов и исправление существенных замечаний.

## Execution notes

Реализация inline на текущей ветке `codex/daily-baseball-showcase`: она содержит необходимые изменения предыдущих задач. Не переносить или коммитить посторонние незавершённые изменения. Пользователь уже выбрал макет и разрешил реализацию; повторный запрос согласования не требуется.

## Verification results

- `npx tsc --noEmit` и ESLint изменённых файлов: PASS.
- `npm test`: 177 passed, 15 integration tests skipped (нет TEST_DATABASE_URL).
- Независимый review: исправлены якорь мобильного More и длинное имя в onboarding; замечание по пагинации исправлено серверным featured-запросом с RED→GREEN тестами.
- `npx next build --webpack`: PASS. Turbopack остановлен после зависания на компиляции без вывода ошибки.
- Browser QA 360/768/1440 не подтверждён: browser connector вернул `browser.user is unavailable`.
