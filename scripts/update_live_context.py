from __future__ import annotations

import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'
DATA.mkdir(exist_ok=True)
NEWS_JSON=DATA/'live_news.json'
INJURY_CSV=DATA/'injury_mentions.csv'
STATUS_JSON=DATA/'live_source_status.json'

INJURY_TERMS=(
    'injury','injured','questionable','doubtful','out ','ruled out','hamstring','ankle','knee','shoulder','back ','concussion','groin','calf','quad','foot ','wrist','elbow','hip ','illness','limited practice','did not practice','dnp','ir ','injured reserve'
)

SOURCES=(
    'https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=100',
    'https://site.web.api.espn.com/apis/site/v2/sports/football/nfl/news?region=us&lang=en&contentorigin=espn&limit=100',
)

FIELDS=['captured_at','published','headline','description','url','image']


def get_json(url:str):
    req=Request(url,headers={
        'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36',
        'Accept':'application/json,text/plain,*/*',
        'Referer':'https://www.espn.com/fantasy/football/',
        'Origin':'https://www.espn.com',
    })
    with urlopen(req,timeout=15) as resp:return json.loads(resp.read().decode('utf-8'))


def fetch_news():
    errors=[]
    for url in SOURCES:
        try:
            data=get_json(url)
            if isinstance(data,dict):return data,url,None
        except Exception as exc:errors.append(f'{type(exc).__name__}: {exc}')
    return None,None,' | '.join(errors)


def load_existing_mentions():
    rows=[];seen=set()
    if INJURY_CSV.exists():
        with INJURY_CSV.open(newline='',encoding='utf-8') as f:
            for row in csv.DictReader(f):
                normalized={k:row.get(k,'') for k in FIELDS}
                key=(normalized.get('published',''),normalized.get('headline',''),normalized.get('url',''))
                if key not in seen:rows.append(normalized);seen.add(key)
    return rows,seen


def ensure_files(now:str):
    if not NEWS_JSON.exists():NEWS_JSON.write_text(json.dumps({'captured_at':now,'source_ok':False,'articles':[]},indent=2),encoding='utf-8')
    if not INJURY_CSV.exists():
        with INJURY_CSV.open('w',newline='',encoding='utf-8') as f:
            w=csv.DictWriter(f,fieldnames=FIELDS);w.writeheader()


def main():
    now=datetime.now(timezone.utc).isoformat();ensure_files(now)
    news,source,error=fetch_news()
    if news is None:
        STATUS_JSON.write_text(json.dumps({'checked_at':now,'source_ok':False,'source':None,'error':error},indent=2),encoding='utf-8')
        print('LIVE CONTEXT SOURCE UNAVAILABLE; preserving last verified data:',error)
        return

    articles=news.get('articles',[]) if isinstance(news,dict) else []
    compact=[];mentions=[]
    for a in articles:
        headline=str(a.get('headline') or '').strip();desc=str(a.get('description') or '').strip()
        links=a.get('links',{}) or {};url=(links.get('web',{}) or {}).get('href') or (links.get('mobile',{}) or {}).get('href') or ''
        published=str(a.get('published') or a.get('lastModified') or '')
        imgs=a.get('images') or [];image=''
        if imgs and isinstance(imgs[0],dict):image=str(imgs[0].get('url') or imgs[0].get('href') or '')
        item={'captured_at':now,'published':published,'headline':headline,'description':desc,'url':url,'image':image}
        compact.append(item)
        hay=(headline+' '+desc).casefold()
        if any(term in hay for term in INJURY_TERMS):mentions.append(item)
    NEWS_JSON.write_text(json.dumps({'captured_at':now,'source_ok':True,'source':source,'articles':compact},indent=2),encoding='utf-8')

    existing,seen=load_existing_mentions()
    for row in mentions:
        key=(row['published'],row['headline'],row['url'])
        if key not in seen:existing.append({k:row.get(k,'') for k in FIELDS});seen.add(key)
    existing=existing[-3000:]
    with INJURY_CSV.open('w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=FIELDS);w.writeheader();w.writerows(existing)
    STATUS_JSON.write_text(json.dumps({'checked_at':now,'source_ok':True,'source':source,'error':None,'article_count':len(compact),'article_image_count':sum(bool(x.get('image')) for x in compact),'injury_mention_count':len(existing)},indent=2),encoding='utf-8')
    print(f'LIVE CONTEXT PASS articles={len(compact)} images={sum(bool(x.get("image")) for x in compact)} injury_mentions={len(existing)}')

if __name__=='__main__':main()
