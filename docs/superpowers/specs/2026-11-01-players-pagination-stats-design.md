# Players pagination and real statistics

## Intent

Make the Players directory useful for scouting by limiting each page to ten players, showing real MLB season statistics and player photos when supplied. The current fantasy-only placeholders must not appear as if they were official player data.

## Goals

- Add server-backed pagination with a maximum of ten players per page.
- Keep league, search, position, availability and sort controls coherent across pages.
- Fetch official seasonal batting and pitching statistics for the visible players in batches.
- Show a compact, role-appropriate stat line in each row and all available season stats in the player detail drawer.
- Render the provider photo URL when available and fall back to initials when it is absent or fails to load.
- Remove zero-valued fantasy projections, salary and ownership from Players until a real source or scoring definition exists.

## Non-goals

- No invented projections, ownership, salary, injury or transfer data.
- No career, game-log or historical season selector in this change.
- No changes to contest scoring or other baseball providers.

## Approaches

1. **Paginate the current client slice.** Simple, but misses players beyond the initial provider response and makes filtering/sorting incomplete. Rejected.
2. **Server-backed ten-player pages with batched season stats.** Apply search and supported filters before slicing, hydrate stats for the resulting page in one batch, and keep the full stat line in the drawer. Chosen because pagination remains correct and provider calls do not grow to one request per player.
3. **Show every stat column directly in each row.** Complete at a glance, but too wide for the existing responsive directory. Rejected in favor of a compact row and complete detail view.

## Design

- The existing Players API accepts `limit` and `offset`; cap requests at ten and pass offset through the SWR key so page changes fetch and cache the correct slice.
- Search, league, position, and availability are applied before pagination. Reset to the first page when any filter or sort changes.
- Sort by supported player fields/statistics on the server before slicing; remove controls backed only by zero placeholders.
- Enrich only the current page with MLB season stats in a single batched people/stats request, using the configured default season. Return typed batting and pitching stat objects; missing or unavailable stats remain absent, never fabricated as zero.
- Batter rows show AVG, HR and RBI; pitcher rows show ERA, W and SO. The detail drawer displays every available batting or pitching field for that player and labels the configured season.
- Use existing MLB photo URLs; if loading fails or the URL is absent, show the existing initials treatment.
- Update pagination controls and result counts to use the filtered total; show a clear empty state and disable navigation at the ends.

## Acceptance criteria

- No request or response page contains more than ten players.
- Moving between pages does not repeat or skip players; changing filters returns to page one.
- A player with provider stats displays real values in the row and all available fields in the drawer.
- A player without stats displays an explicit unavailable state, not zero statistics.
- Available player photos render, with initials fallback on missing/broken image URLs.
- No placeholder projection, fantasy salary or ownership zeros remain in the Players directory.
