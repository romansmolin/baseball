// Every weight behind the game estimate and the player outlook lives here, so
// the formulas can be tuned (and explained to users) in one place.

// ---- Game estimate (probabilities are for the home team) ----
export const HOME_FIELD = 0.04
// Share of a team's strength taken from its last 10 games instead of its season record.
export const LAST_TEN_WEIGHT = 0.2
// Win-probability change per run of ERA difference between the two starters, capped.
export const STARTER_ERA_WEIGHT = 0.02
export const STARTER_ADJUSTMENT_CAP = 0.08
// A starter with fewer innings than this is treated as unknown.
export const KNOWN_STARTER_MIN_INNINGS = 30
// Stand-in ERA when only one starter is known.
export const LEAGUE_AVERAGE_ERA = 4.2
export const MIN_PROBABILITY = 0.05
export const MAX_PROBABILITY = 0.95
// A pick this clear (distance from 50%) earns high confidence when both starters are known.
export const HIGH_CONFIDENCE_EDGE = 0.15

// ---- Player outlook (scores are 0-100) ----
// How many recent games count as "form".
export const FORM_WINDOW_GAMES = 14
// Hitters: OPS .500 scores 0 and 1.000 scores 100.
export const OPS_FLOOR = 0.5
export const OPS_SCORE_RANGE = 0.5
// Pitchers: ERA 5.5 scores 0 and 2.0 scores 100.
export const ERA_FLOOR = 5.5
export const ERA_SCORE_RANGE = 3.5
// Pitchers' form is their last few outings, since they pitch every fifth day.
export const PITCHER_FORM_STARTS = 5
export const FORM_MIN_GAMES = 5
export const PITCHER_FORM_MIN_INNINGS = 10
export const FORM_EFFECT_CAP = 20
// How much recent form moves the score relative to the season line.
export const FORM_BLEND = 0.3
// How much a platoon split vs the opposing starter's hand moves the score.
export const PLATOON_BLEND = 0.5
export const PLATOON_MIN_PLATE_APPEARANCES = 30
// Score points per point of (expected - actual) wOBA, capped.
export const XWOBA_SCORE_WEIGHT = 150
export const XWOBA_EFFECT_CAP = 10
export const LEAGUE_AVERAGE_WOBA = 0.315
// Ballpark conditions, in score points for hitters.
export const WEATHER_EFFECT = 2
export const HOT_TEMPERATURE_F = 80
export const COLD_TEMPERATURE_F = 50
// Sample sizes for confidence.
export const BATTER_LOW_PLATE_APPEARANCES = 100
export const BATTER_HIGH_PLATE_APPEARANCES = 300
export const PITCHER_LOW_INNINGS = 30
export const PITCHER_HIGH_INNINGS = 100

// ---- Points projections ----
// Fewer plate appearances / innings than this and the projection is flagged low confidence.
export const PROJECTION_LOW_PLATE_APPEARANCES = 50
export const PROJECTION_LOW_INNINGS = 20
// A starter takes the mound about every fifth game when no start is announced.
export const ROTATION_GAMES_PER_START = 5
// A pitcher counts as a starter when at least this share of his games were starts.
export const STARTER_MIN_START_SHARE = 0.5
