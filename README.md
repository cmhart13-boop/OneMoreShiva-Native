# One More Shiva

One More Shiva is a mobile-first fantasy-football intelligence layer for ESPN full-PPR leagues. It is designed to work **with** ESPN rather than replace the league host.

## Product system

The experience is organized around four permanent mobile destinations:

- **Home / Shiva Says** — decision-first fantasy hub, readable evidence cards and Shiva Blast context
- **Draft** — live snake board, roster/queue, room-reading Shiva Moments and draft intelligence
- **Guide** — strategy, PPR board, clickable player profiles, research and league-size builds
- **Coach** — Start/Sit, Waivers, Trades, Lineup Check, Player Watch, Analyst Tracker and ESPN League Sync

## Shiva decision principles

**Raise the floor. Keep the ceiling.**

Shiva prioritizes repeatable weekly scoring and bust avoidance without giving up legitimate week-winning upside. Recommendations expose a **Why?** layer rather than hiding behind fake confidence percentages.

## Production architecture

```text
app.py
  -> app_core.py
      -> shiva_product.py      # unified in-season / decision experience
      -> shiva_live.py         # ESPN league + live-source adapter
      -> shiva_coach.py        # historical evidence + draft moments
      -> shiva_draft_guide.py
      -> shiva_draft_iq.py
      -> current_rankings.csv
      -> player_weekly_master_2014_2025.csv.gz
      -> data/
          -> live_news.json
          -> injury_mentions.csv
          -> live_source_status.json
```

There is one production execution path. The app does not execute a legacy app, does not use a runtime source patch, and does not read its primary datasets from the Draft-Coach repository.

## ESPN league sync

The Coach > League screen accepts an ESPN league ID and season. Public leagues can work without credentials; private leagues may require `SWID` and `espn_s2`. Those credentials stay in the Streamlit session and are not written to the repository.

Once connected, Shiva can use the synced roster/free-agent pool for roster-aware coaching, waiver targets and automatic lineup checks such as the Thursday FLEX warning.

## Live context

`.github/workflows/shiva-live-context.yml` runs the verified-source collector every six hours. The collector preserves the last verified snapshot if ESPN is unavailable instead of replacing it with empty or fabricated data.

## Analyst Tracker

Analyst Tracker accepts weekly ranking snapshots with columns:

`analyst, player, rank, season, week` (optional `position`)

It grades ranking accuracy against the verified weekly Full-PPR dataset using mean absolute rank error. Lower is better.

## Verification rule

Historical facts and current-season/live context remain separate. Copying a dataset into the repository does not make it verified. New fantasy data must pass the project's validation workflow before it is treated as authoritative.

## Audit contract

`scripts/audit_product.py` validates architecture, data availability, product promises and known regression classes. The completed build was also exercised through Streamlit's runtime test harness on Home, Coach, Guide and Draft before cleanup, and again after cleanup.

## Streamlit

Deploy with `app.py`.

To enable OpenAI-backed Ask Shiva analysis, configure `OPENAI_API_KEY` in Streamlit Secrets. Historical calculations and the transparent decision engines do not require an OpenAI key.
