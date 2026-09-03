from __future__ import annotations

import ast
import gzip
from pathlib import Path

import pandas as pd

ROOT=Path(__file__).resolve().parents[1]


def read(path):return (ROOT/path).read_text(encoding='utf-8')


def audit_architecture():
    required=['app.py','app_core.py','shiva_home_v2.py','shiva_product.py','shiva_live.py','shiva_coach.py','shiva_draft_guide.py','shiva_draft_iq.py','current_rankings.csv','player_weekly_master_2014_2025.csv.gz']
    missing=[x for x in required if not (ROOT/x).exists()]
    assert not missing, f'missing required files: {missing}'
    for x in ['app.py','app_core.py','shiva_home_v2.py','shiva_product.py','shiva_live.py','shiva_coach.py','shiva_draft_guide.py','shiva_draft_iq.py']:
        ast.parse(read(x),filename=x)
    app=read('app.py');core=read('app_core.py');home=read('shiva_home_v2.py');product=read('shiva_product.py');live=read('shiva_live.py')
    assert 'app_core.py' in app and 'app_legacy' not in app
    assert 'sitecustomize' not in app
    assert 'Draft-Coach' not in core
    assert '_home_shiva_blast()' not in core
    assert 'render_full_product(players,load_weekly,weekly_for_player,espn_ppr,weekly_name_col)' in core
    assert 'render_home_v2(players,load_weekly,weekly_name_col,espn_ppr)' in core
    assert 'primary_nav_' in core and 'st.rerun()' in core, 'primary navigation is not same-session'
    assert 'not st.query_params.get("page")' in core, 'startup splash may replay during page navigation'
    assert '.brand-badge::after,.hero-card::after{content:none' in core
    assert 'Shiva Blast' in home and 'news-thumb' in home
    for label in ['Start/Sit','Waivers','Trades','Lineup','Watch','Analysts','League']:
        assert label in product, f'missing product module {label}'
    assert 'LeagueAuth' in live and 'fetch_player_pool' in live and 'fetch_league' in live
    assert 'espn_s2' in live and 'SWID' in live
    assert 'password' in product
    print('AUDIT 1 ARCHITECTURE PASS')


def audit_data():
    ranks=pd.read_csv(ROOT/'current_rankings.csv')
    assert len(ranks)>50, 'rankings unexpectedly small'
    name_col=next((c for c in ('name','player','player_name','player_display_name') if c in ranks.columns),None)
    assert name_col, f'rankings missing recognizable player name column: {list(ranks.columns)}'
    with gzip.open(ROOT/'player_weekly_master_2014_2025.csv.gz','rt',encoding='utf-8') as f:
        header=f.readline().strip().split(',')
    assert any(c in header for c in ('player_display_name','player_name','name'))
    assert 'season' in header and 'week' in header
    assert (ROOT/'data'/'live_news.json').exists(), 'live news snapshot absent'
    assert (ROOT/'data'/'injury_mentions.csv').exists(), 'persistent injury mention log absent'
    print('AUDIT 1 DATA PASS')


def audit_product_contract():
    core=read('app_core.py');home=read('shiva_home_v2.py');product=read('shiva_product.py');guide=read('shiva_draft_guide.py');coach=read('shiva_coach.py')
    checks={
        'Shiva Says':('SHIVA SAYS' in product.upper()) and ('Shiva Says' in home or 'SHIVA SAYS' in home.upper()),
        'floor ceiling':'floor' in product and 'ceiling' in product and 'rate15' in product and 'rate15' in home and 'boom25' in home,
        'start sit':'render_start_sit' in product,
        'waiver helper':'render_waivers' in product,
        'trade analyzer':'render_trade' in product,
        'Thursday FLEX':'Thursday' in product and 'FLEX' in product,
        'player watch':'player_news' in product and 'injury_mentions.csv' in product,
        'analyst tracker':'render_analysts' in product and 'mean_rank_error' in product,
        'league sync':'Connect ESPN league' in product,
        'why layer':'Why?' in product or 'Why this call?' in product,
        'draft room reading':'render_draft_moment' in core and 'managers between your picks' in coach,
        'clickable guide':'guide-player-link' in guide and 'profile_href' in guide,
        'single identity':'SHIVA_MARK' in core and 'THE SHIVA' in core and core.count('SHIVA_MARK =')==1,
        'startup-only splash':'not st.query_params.get("page")' in core,
        'seamless nav':'primary_nav_' in core and 'st.rerun()' in core,
        'news thumbnails':'news-thumb' in home and 'target="_blank"' in home,
    }
    bad=[k for k,v in checks.items() if not v]
    assert not bad, f'product contract missing: {bad}'
    print('AUDIT 1 PRODUCT CONTRACT PASS')


def second_audit():
    all_py='\n'.join(read(str(p.relative_to(ROOT))) for p in ROOT.glob('*.py'))
    core=read('app_core.py');home=read('shiva_home_v2.py')
    assert 'NameError' not in core
    assert '_home_shiva_blast()' not in core
    assert 'app_legacy.py' not in read('app.py')
    assert 'Draft-Coach/main' not in all_py
    assert 'render_season_hub(players,load_weekly,weekly_for_player,espn_ppr,weekly_name_col)' not in core
    assert core.count('SHIVA_MARK =')==1
    assert 'content:\'🏆\'' not in core and 'content:"🏆"' not in core
    assert '"Coach":season_coach' in core
    assert 'data-status' not in core.split('def app_header():',1)[1].split('def bottom_nav',1)[0]
    assert 'Your War Room' in home and 'Shiva Blast' in home
    print('AUDIT 2 REGRESSION PASS')


if __name__=='__main__':
    audit_architecture();audit_data();audit_product_contract();second_audit()
    print('SHIVA DOUBLE AUDIT PASSED')
