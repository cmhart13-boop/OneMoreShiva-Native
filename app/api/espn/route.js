export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=20;
const BASE="https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl";

export async function GET(request){
  const {searchParams}=new URL(request.url),action=searchParams.get("action")||"news";
  if(action==="news"){
    const player=(searchParams.get("player")||"").trim();
    const r=await fetch("https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=100",{cache:"no-store"});
    if(!r.ok)return Response.json({error:"ESPN news unavailable."},{status:502});
    const d=await r.json(),terms=player?[player.toLowerCase(),player.split(/\s+/).at(-1).toLowerCase()]:[];
    const articles=(d.articles||[])
      .filter((a)=>{if(!terms.length)return true;const t=`${a.headline||""} ${a.description||""}`.toLowerCase();return terms.some((term)=>term&&t.includes(term));})
      .slice(0,10)
      .map((a)=>({
        headline:String(a.headline||""),
        description:String(a.description||""),
        published:String(a.published||a.lastModified||""),
        url:a?.links?.web?.href||a?.links?.mobile?.href||"",
        image:a?.images?.[0]?.url||""
      }));
    return Response.json({articles,source:"ESPN NFL news feed"});
  }
  if(action==="scoreboard"){
    const r=await fetch("https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",{cache:"no-store"});
    if(!r.ok)return Response.json({error:"ESPN scoreboard unavailable."},{status:502});
    return Response.json(await r.json());
  }
  return Response.json({error:"Unknown action."},{status:400});
}

export async function POST(request){
  const body=await request.json(),leagueId=String(body.leagueId||"").trim(),season=Number(body.season||2026),swid=String(body.swid||"").trim(),espnS2=String(body.espnS2||"").trim();
  if(!leagueId)return Response.json({error:"League ID is required."},{status:400});
  const url=`${BASE}/seasons/${season}/segments/0/leagues/${encodeURIComponent(leagueId)}?view=mSettings&view=mTeam&view=mRoster&view=mStatus`;
  const headers={Accept:"application/json","User-Agent":"Mozilla/5.0 (One More Shiva; verified fantasy client)"},cookies=[];
  if(swid)cookies.push(`SWID=${swid}`);if(espnS2)cookies.push(`espn_s2=${espnS2}`);if(cookies.length)headers.Cookie=cookies.join("; ");
  const r=await fetch(url,{headers,cache:"no-store"});
  if(!r.ok)return Response.json({error:`ESPN returned ${r.status}. Check league ID, season, and private-league credentials.`},{status:502});
  const d=await r.json();
  if(!Array.isArray(d.teams)||!d.teams.length)return Response.json({error:"ESPN returned no teams for this league."},{status:502});
  const teams=d.teams.map((t)=>({id:t.id,name:`${t.location||""} ${t.nickname||""}`.trim()||t.name||`Team ${t.id}`,wins:t?.record?.overall?.wins??null,losses:t?.record?.overall?.losses??null,roster:(t?.roster?.entries||[]).map((e)=>({player:e?.playerPoolEntry?.player?.fullName||"",lineupSlotId:e?.lineupSlotId,injuryStatus:e?.playerPoolEntry?.player?.injuryStatus||null}))}));
  return Response.json({league:{id:d.id,season:d.seasonId,name:d?.settings?.name||"ESPN League",scoringPeriod:d?.status?.currentScoringPeriod??null,teams}});
}
