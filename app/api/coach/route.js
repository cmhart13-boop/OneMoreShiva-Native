import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import zlib from "node:zlib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
let rankingsCache=null;

function csv(line){const out=[];let value="",quoted=false;for(let i=0;i<line.length;i+=1){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"'){value+='"';i+=1;}else quoted=!quoted;}else if(ch===","&&!quoted){out.push(value);value="";}else value+=ch;}out.push(value);return out;}
const key=(v)=>String(v||"").toLowerCase().replace(/[^a-z0-9]/g,"");
const num=(v)=>{if(v===null||v===undefined||v==="")return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const avg=(a)=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
function quantile(a,q){if(!a.length)return null;const s=[...a].sort((x,y)=>x-y),p=(s.length-1)*q,b=Math.floor(p),r=p-b;return s[b+1]===undefined?s[b]:s[b]+r*(s[b+1]-s[b]);}
function ppr(row){const direct=num(row.fantasy_points_ppr);if(direct!==null)return direct;const scoring={passing_yards:.04,passing_tds:4,interceptions:-2,rushing_yards:.1,rushing_tds:6,receptions:1,receiving_yards:.1,receiving_tds:6,fumbles_lost:-2,passing_two_point_conversions:2,rushing_two_point_conversions:2,receiving_two_point_conversions:2};let total=0,used=false;for(const [field,w] of Object.entries(scoring)){const v=num(row[field]);if(v!==null){total+=v*w;used=true;}}return used?Math.round(total*100)/100:num(row.fantasy_points);}
function score(e){let s=0;if(e.floor!==null)s+=e.floor*1.35;if(e.ppg!==null)s+=e.ppg;if(e.ceiling!==null)s+=e.ceiling*.35;if(e.rate15!==null)s+=(e.rate15/10)*.9;if(e.bust10!==null)s+=(-e.bust10/12);if(e.rank!==null)s+=(Math.max(0,220-e.rank)/22)*.8;return s;}

async function rankings(){if(rankingsCache)return rankingsCache;const raw=await fsp.readFile(path.join(process.cwd(),"current_rankings.csv"),"utf8");const lines=raw.split(/\r?\n/).filter(Boolean),headers=csv(lines.shift());rankingsCache=new Map();for(const line of lines){const values=csv(line),r=Object.fromEntries(headers.map((h,i)=>[h,values[i]??""]));rankingsCache.set(key(r.player_name),{name:r.player_name,team:r.team,pos:r.position,rank:num(r.overall_rank),adp:num(r.consensus_adp)??num(r.adp)});}return rankingsCache;}
async function weekly(targets){const rows=new Map([...targets].map((k)=>[k,[]]));const stream=fs.createReadStream(path.join(process.cwd(),"player_weekly_master_2014_2025.csv.gz")).pipe(zlib.createGunzip());const rl=readline.createInterface({input:stream,crlfDelay:Infinity});let headers=null;for await(const line of rl){if(!headers){headers=csv(line);continue;}const values=csv(line),r=Object.fromEntries(headers.map((h,i)=>[h,values[i]??""]));const k=key(r.player_display_name||r.player_name||r.name);if(!targets.has(k))continue;const wk=num(r.week),season=num(r.season),points=ppr(r);if(wk===null||wk<1||wk>18||season===null||points===null)continue;rows.get(k).push({season,week:wk,points});}return rows;}

export async function GET(request){const {searchParams}=new URL(request.url);const names=(searchParams.get("players")||"").split("|").map((n)=>n.trim()).filter(Boolean).slice(0,8);if(!names.length)return Response.json({error:"Provide at least one player."},{status:400});const ranks=await rankings(),targets=new Set(names.map(key)),weeks=await weekly(targets);const evidence=names.map((requested)=>{const k=key(requested),current=ranks.get(k)||{name:requested,pos:"",team:"",rank:null,adp:null},rows=weeks.get(k)||[],latest=rows.length?Math.max(...rows.map((r)=>r.season)):null,pts=(latest===null?rows:rows.filter((r)=>r.season===latest)).map((r)=>r.points);return {...current,games:pts.length,season:latest,ppg:avg(pts),floor:quantile(pts,.25),ceiling:quantile(pts,.90),rate15:pts.length?pts.filter((v)=>v>=15).length/pts.length*100:null,boom25:pts.length?pts.filter((v)=>v>=25).length/pts.length*100:null,bust10:pts.length?pts.filter((v)=>v<10).length/pts.length*100:null,recent:pts.length?avg(pts.slice(-4)):null};});const ranked=evidence.map((e)=>({...e,evidenceScore:score(e)})).sort((a,b)=>b.evidenceScore-a.evidenceScore);return Response.json({evidence,recommendation:ranked[0]?.name||null,source:"player_weekly_master_2014_2025.csv.gz + current_rankings.csv",scoring:"ESPN full PPR"});}
