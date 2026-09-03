import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import zlib from "node:zlib";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=30;

let edgeCache=null;

function csv(line){const out=[];let value="",quoted=false;for(let i=0;i<line.length;i+=1){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"'){value+='"';i+=1;}else quoted=!quoted;}else if(ch===","&&!quoted){out.push(value);value="";}else value+=ch;}out.push(value);return out;}
const key=(v)=>String(v||"").toLowerCase().replace(/[^a-z0-9]/g,"");
const num=(v)=>{if(v===null||v===undefined||v==="")return null;const n=Number(v);return Number.isFinite(n)?n:null;};
function ppr(row){const direct=num(row.fantasy_points_ppr);if(direct!==null)return direct;const scoring={passing_yards:.04,passing_tds:4,interceptions:-2,rushing_yards:.1,rushing_tds:6,receptions:1,receiving_yards:.1,receiving_tds:6,fumbles_lost:-2,passing_two_point_conversions:2,rushing_two_point_conversions:2,receiving_two_point_conversions:2};let total=0,used=false;for(const [field,w] of Object.entries(scoring)){const v=num(row[field]);if(v!==null){total+=v*w;used=true;}}return used?Math.round(total*100)/100:num(row.fantasy_points);}

async function currentPlayers(){
  const raw=await fsp.readFile(path.join(process.cwd(),"current_rankings.csv"),"utf8");
  const lines=raw.split(/\r?\n/).filter(Boolean),headers=csv(lines.shift()),players=new Map();
  for(const line of lines){const values=csv(line),r=Object.fromEntries(headers.map((h,i)=>[h,values[i]??""]));if(!r.player_name||!["QB","RB","WR","TE"].includes(r.position))continue;players.set(key(r.player_name),{name:r.player_name,pos:r.position,team:r.team,rank:num(r.overall_rank),adp:num(r.consensus_adp)??num(r.adp)});}
  return players;
}

async function buildEdge(){
  const players=await currentPlayers(),weekly=new Map();
  const stream=fs.createReadStream(path.join(process.cwd(),"player_weekly_master_2014_2025.csv.gz")).pipe(zlib.createGunzip());
  const rl=readline.createInterface({input:stream,crlfDelay:Infinity});
  let headers=null;
  for await(const line of rl){
    if(!headers){headers=csv(line);continue;}
    const values=csv(line),r=Object.fromEntries(headers.map((h,i)=>[h,values[i]??""]));
    if(num(r.season)!==2025)continue;
    const week=num(r.week);if(week===null||week<1||week>18)continue;
    const k=key(r.player_display_name||r.player_name||r.name),player=players.get(k);if(!player)continue;
    const points=ppr(r);if(points===null)continue;
    if(!weekly.has(k))weekly.set(k,[]);weekly.get(k).push(points);
  }
  const rows=[];
  for(const [k,points] of weekly){
    if(points.length<8)continue;
    const player=players.get(k),ppg=points.reduce((s,v)=>s+v,0)/points.length,rate15=points.filter((v)=>v>=15).length/points.length*100,boom25=points.filter((v)=>v>=25).length/points.length*100;
    rows.push({...player,games:points.length,ppg,rate15,boom25});
  }
  const floor=[...rows].sort((a,b)=>b.rate15-a.rate15||b.ppg-a.ppg).slice(0,3);
  const ceiling=[...rows].sort((a,b)=>b.boom25-a.boom25||b.ppg-a.ppg).slice(0,3);
  return {floor,ceiling,season:2025,source:"player_weekly_master_2014_2025.csv.gz",scoring:"ESPN full PPR",method:"Minimum 8 games. Floor: 15+ week rate, PPG tiebreaker. Ceiling: 25+ week rate, PPG tiebreaker."};
}

export async function GET(){
  try{if(!edgeCache)edgeCache=buildEdge();return Response.json(await edgeCache);}
  catch(error){edgeCache=null;return Response.json({error:"Verified Shiva Edge evidence is unavailable.",detail:error instanceof Error?error.message:String(error)},{status:500});}
}
