import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
let cache = null;

function csv(line) {
  const out=[]; let value=""; let quoted=false;
  for (let i=0;i<line.length;i+=1) {
    const ch=line[i];
    if (ch==='"') { if (quoted && line[i+1]==='"') { value+='"'; i+=1; } else quoted=!quoted; }
    else if (ch==="," && !quoted) { out.push(value); value=""; }
    else value+=ch;
  }
  out.push(value); return out;
}
const n=(v)=>{const x=Number(v); return Number.isFinite(x)?x:null;};

async function loadPlayers(){
  if(cache) return cache;
  const raw=await fs.readFile(path.join(process.cwd(),"current_rankings.csv"),"utf8");
  const lines=raw.split(/\r?\n/).filter(Boolean); const headers=csv(lines.shift());
  cache=lines.map((line)=>{
    const values=csv(line); const row=Object.fromEntries(headers.map((h,i)=>[h,values[i]??""]));
    return {name:row.player_name,team:row.team,bye:n(row.bye),pos:row.position,positionRank:n(row.position_rank),adp:n(row.consensus_adp)??n(row.adp),overallRank:n(row.overall_rank)};
  }).filter((p)=>p.name&&p.pos);
  return cache;
}

export async function GET(request){
  const {searchParams}=new URL(request.url); const pos=(searchParams.get("pos")||"ALL").toUpperCase(); const q=(searchParams.get("q")||"").trim().toLowerCase();
  const players=await loadPlayers();
  return Response.json({players:players.filter((p)=>(pos==="ALL"||p.pos===pos)&&(!q||p.name.toLowerCase().includes(q)||p.team.toLowerCase().includes(q))).slice(0,300),source:"current_rankings.csv"});
}
