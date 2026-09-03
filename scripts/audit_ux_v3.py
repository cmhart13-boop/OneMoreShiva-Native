from pathlib import Path
import ast,json

root=Path(__file__).resolve().parents[1]
app=(root/'app_core.py').read_text(encoding='utf-8')
home=(root/'shiva_home_v2.py').read_text(encoding='utf-8')
prod=(root/'shiva_product.py').read_text(encoding='utf-8')
guide=(root/'shiva_draft_guide.py').read_text(encoding='utf-8')
collector=(root/'scripts'/'update_live_context.py').read_text(encoding='utf-8')
for p in [root/'app_core.py',root/'shiva_home_v2.py',root/'shiva_product.py',root/'shiva_draft_guide.py',root/'scripts'/'update_live_context.py']:
    ast.parse(p.read_text(encoding='utf-8'))
checks={
'home_v2_wired':'render_home_v2(players,load_weekly,weekly_name_col,espn_ppr)' in app,
'startup_only_splash':'not st.query_params.get("page")' in app and '_splash_time.sleep(1.15)' in app,
'no_data_pill_markup':'data-status' not in app.split('def app_header():',1)[1].split('def bottom_nav',1)[0],
'same_session_nav':'primary_nav_' in app and 'st.rerun()' in app.split('def bottom_nav',1)[1].split('def screen_head',1)[0],
'one_trophy_mark':app.count('SHIVA_MARK =')==1 and 'THE SHIVA' in app,
'readable_app_css':'SHIVA MOBILE UX V3' in app and 'font-size:31px' in app,
'home_news_images':'news-thumb' in home and 'target="_blank"' in home,
'home_war_room':'Your War Room' in home,
'home_verified_edge':'rate15' in home and 'boom25' in home,
'guide_v3':'GUIDE UX V3' in guide and 'border-color:#d2ae57' in guide,
'coach_v3':'COACH UX V3' in prod and 'font-size:31px' in prod,
'collector_images':"'image':image" in collector,
}
failed=[k for k,v in checks.items() if not v]
for k,v in checks.items():print(('PASS' if v else 'FAIL'),k)
if failed:raise SystemExit('UX AUDIT FAIL: '+', '.join(failed))

news_path=root/'data'/'live_news.json'
if news_path.exists():
    try:
        data=json.loads(news_path.read_text(encoding='utf-8')); arts=data.get('articles') or []
        print('NEWS SNAPSHOT',len(arts),'articles',sum(bool(a.get('image')) for a in arts),'with images')
    except Exception as e:print('NEWS SNAPSHOT parse warning',e)
print('SHIVA UX V3 AUDIT PASS')
