# Statistics queries

Every figure on the Progress screen (PRD section 7) can be reproduced from `review_log`,
`cards`, `card_state` and `decks` with the queries below. They are the documented
definition; `src/server/stats.ts` and `src/domain/stats.ts` compute the same numbers in
TypeScript. `tests/integration/stats-documented-queries.test.ts` extracts every `sql` block
from this file, runs it on the seeded history (`fixtures/stats-history.json`) and checks
the result equals `GET /api/v1/stats`. Keep each block self-contained and keep its
`-- name:` line: the test finds queries by that name.

## Rules shared by every query

- **Per profile.** Every query filters on `profile_id` (or `owner_profile_id`). No figure
  mixes profiles.
- **Undone rows never count:** `undone_at is null`.
- **Learning day.** A review belongs to the local date of `reviewed_at` in the profile's
  timezone, shifted back by the day start hour, so 06:30 with a day start of 7 counts for
  the previous day:
  `((reviewed_at at time zone tz) - make_interval(hours => day_start_hour))::date`.
- **First attempt only for counts.** Cards reviewed, Got it rate and the bars use rows with
  `is_first_attempt_today`. Time per card and days practised use every live row.
- **Time per card** is the median (`percentile_cont(0.5)`, the mean of the two middle values
  for an even count) of each duration capped at 120 s (`DURATION_CAP_SECONDS`).
- **Deleted decks.** Their reviews stay in the tiles and bars (history happened); Focus next
  and By deck list only live decks and live cards.
- **Mastery** is the share of all live cards, New included, whose `card_state.box` is 4 or 5
  (`MASTERED_MIN_BOX`). A card without a `card_state` row for the profile is New.

The constants 120 s, box 4, three cards per topic, three Focus next topics and four weeks
per month are written literally below; they mirror `src/shared/constants.ts`.

Parameters are positional (`$1`, `$2`, ...) and listed above each query. In psql 16 or
later, run a block with `\bind` and `\g`, for example
`\bind '<profile id>' 'Europe/London' 7 '2026-11-02' '2026-11-08' \g` after pasting the
query without its final semicolon.

## Windows

This week runs Monday to Sunday around the profile's current learning day; This month is
the last four weeks ending on this week's Sunday. The previous period is the same number of
days just before.

Parameters: `$1` now (timestamptz), `$2` timezone, `$3` day start hour, `$4` weeks (1 for
week, 4 for month).

```sql
-- name: windows
with t as (
  select ((($1::timestamptz) at time zone $2::text) - make_interval(hours => $3::int))::date as today
), w as (
  select today,
         today - (extract(isodow from today)::int - 1) - ($4::int - 1) * 7 as start,
         $4::int * 7 as days
  from t
)
select today::text          as today,
       start::text          as current_start,
       (start + days - 1)::text as current_end,
       (start - days)::text as previous_start,
       (start - 1)::text    as previous_end,
       days
from w;
```

## Tiles

Run once for the current window and once for the previous one. The change line on each
tile is the difference of the two results in plain words: counts and days as they are, Got
it rate in whole percentage points, time per card in whole seconds (both rounded before
subtracting). No change is shown when either side has no Got it rate or no median.

Parameters: `$1` profile id, `$2` timezone, `$3` day start hour, `$4` window start date,
`$5` window end date (inclusive).

```sql
-- name: tiles
with live as (
  select grade,
         duration_ms,
         is_first_attempt_today,
         ((reviewed_at at time zone $2::text) - make_interval(hours => $3::int))::date as day
  from review_log
  where profile_id = $1::uuid
    and undone_at is null
)
select
  (count(*) filter (where is_first_attempt_today))::int as cards_reviewed,
  (count(*) filter (where is_first_attempt_today and grade = 'got_it'))::float8
    / nullif(count(*) filter (where is_first_attempt_today), 0) as got_it_rate,
  percentile_cont(0.5) within group (
    order by (least(greatest(duration_ms, 0), 120000) / 1000.0)::float8
  ) as median_seconds,
  count(distinct day)::int as days_practised,
  ($5::date - $4::date + 1) as days_in_window
from live
where day between $4::date and $5::date;
```

`got_it_rate` and `median_seconds` are null for a window with no reviews. Days practised
shows as "`days_practised` of `days_in_window`".

## How often you practise

One bar per day (week, step 1) or per Monday-aligned week (month, step 7) of the current
window, zero bars included. `current` marks the bar holding today.

Parameters: `$1` profile id, `$2` timezone, `$3` day start hour, `$4` window start date,
`$5` window end date, `$6` step in days (1 or 7), `$7` today (learning day).

```sql
-- name: bars
with first_attempts as (
  select ((reviewed_at at time zone $2::text) - make_interval(hours => $3::int))::date as day
  from review_log
  where profile_id = $1::uuid
    and undone_at is null
    and is_first_attempt_today
), bars as (
  select $4::date + i * $6::int as start
  from generate_series(0, ($5::date - $4::date) / $6::int) as i
)
select b.start::text as start,
       (select count(*)::int
          from first_attempts f
         where f.day >= b.start
           and f.day < b.start + $6::int
           and f.day <= $5::date) as cards_reviewed,
       ($7::date >= b.start and $7::date < b.start + $6::int) as current
from bars b
order by b.start;
```

## Focus next

The three topics with the lowest mastery among topics with at least three live cards in
the profile's live decks. Ties go to more lapses, then topic name. A topic is a deck and
topic name pair.

Parameters: `$1` profile id.

```sql
-- name: focus_next
select c.deck_id,
       d.name as deck_name,
       c.topic,
       count(*)::int as cards,
       (count(*) filter (where s.box >= 4))::float8 / count(*) as mastery,
       coalesce(sum(s.lapses), 0)::int as lapses
from cards c
join decks d on d.id = c.deck_id
left join card_state s on s.card_id = c.id and s.profile_id = $1::uuid
where d.owner_profile_id = $1::uuid
  and d.deleted_at is null
  and c.deleted_at is null
group by c.deck_id, d.name, c.topic
having count(*) >= 3
order by mastery, lapses desc, c.topic, c.deck_id
limit 3;
```

## By deck

Live decks of the profile, lowest mastery first, decks without cards last, then by name.
Mastered is the box 4 and 5 count; mastery is that count over all live cards. Median time
uses the current window (so it follows the range switch); last practised is the deck's
latest live review at any time, reviews of since-deleted cards included.

Parameters: `$1` profile id, `$2` timezone, `$3` day start hour, `$4` current window start
date, `$5` current window end date.

```sql
-- name: by_deck
with deck_cards as (
  select d.id as deck_id,
         d.name,
         d.color,
         count(c.id)::int as cards,
         (count(*) filter (where s.box >= 4))::int as mastered
  from decks d
  left join cards c on c.deck_id = d.id and c.deleted_at is null
  left join card_state s on s.card_id = c.id and s.profile_id = $1::uuid
  where d.owner_profile_id = $1::uuid
    and d.deleted_at is null
  group by d.id, d.name, d.color
), deck_reviews as (
  select c.deck_id,
         r.duration_ms,
         r.reviewed_at,
         ((r.reviewed_at at time zone $2::text) - make_interval(hours => $3::int))::date as day
  from review_log r
  join cards c on c.id = r.card_id
  where r.profile_id = $1::uuid
    and r.undone_at is null
)
select dc.deck_id,
       dc.name,
       dc.color,
       dc.cards,
       dc.mastered,
       dc.mastered::float8 / nullif(dc.cards, 0) as mastery,
       (select percentile_cont(0.5) within group (
                 order by (least(greatest(dr.duration_ms, 0), 120000) / 1000.0)::float8)
          from deck_reviews dr
         where dr.deck_id = dc.deck_id
           and dr.day between $4::date and $5::date) as median_seconds,
       (select max(dr.reviewed_at)
          from deck_reviews dr
         where dr.deck_id = dc.deck_id) as last_practised_at
from deck_cards dc
order by mastery asc nulls last, dc.name;
```

## Empty state

The Progress empty state shows until the profile has any live review, deleted decks
included.

Parameters: `$1` profile id.

```sql
-- name: has_reviews
select exists (
  select 1 from review_log where profile_id = $1::uuid and undone_at is null
) as has_reviews;
```
