/* Import/export tools for the MMA Manager fighter database. Admin-only edit surface. */
let crPending=null,crError='',crMode='add';
const crLimits={fileBytes:12*1024*1024,roster:15000,techniques:200000};
function crKey(x){return String(x??'').normalize('NFKC').trim().toLocaleLowerCase()}
function crColumn(row,...names){
 const wanted=names.map(x=>x.toLowerCase().replace(/[\s_-]/g,''));
 for(const [k,v] of Object.entries(row||{}))if(wanted.includes(k.toLowerCase().replace(/[\s_-]/g,'')))return v;
 return undefined;
}
function crInt(x,field,min=0,max=100){
 if(x===undefined||x===null||String(x).trim()==='')throw Error(field+' is required');
 const n=Number(x);if(!Number.isInteger(n)||n<min||n>max)throw Error(field+' must be an integer between '+min+' and '+max);return n;
}
function crBoolean(x,defaultValue=false){
 if(x===undefined||x===null||String(x).trim()==='')return defaultValue;
 if(typeof x==='boolean')return x;
 if(['true','yes','1','y'].includes(crKey(x)))return true;
 if(['false','no','0','n'].includes(crKey(x)))return false;
 throw Error('Invalid boolean value: '+String(x).slice(0,50));
}
function crDownload(filename,content,type){
 const url=URL.createObjectURL(new Blob([content],{type:type||'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function crCsvCell(v){
 const str=String(v??'');const safe=/^[\s]*[=+@]|^[\t\r]/.test(str)?"'"+str:str;
 return /[",\r\n]/.test(safe)?'"'+safe.replace(/"/g,'""')+'"':safe;
}
function crMakeCsv(headers,rows){return '\uFEFF'+headers.map(crCsvCell).join(',')+'\r\n'+rows.map(row=>row.map(crCsvCell).join(',')).join('\r\n')+'\r\n'}
const crRosterHeaders=['name','gender','division','promotion','nationality','age','wins','losses','draws','skill','potential','popularity','fightingStyle','realFighter'];
const crTechniqueHeaders=['fighter','gender','promotion','category','technique','proficiency','preference','provisional','confidence','source notes'];

/* One-row-per-fighter master CSV. All column names are derived from actual simulator keys. */
function crMasterSlug(value){return String(value).normalize('NFKD').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'')}
function crMasterSchema(){
 const base=['fighterId','name','gender','division','promotion','nationality','age','height','weight','reach','wins','losses','draws','skill','potential','popularity','fightingStyle','realFighter'];
 const attrs=[...new Set(FIGHTER_ATTRIBUTES.map(([key])=>key))].map(key=>({key,column:'attr.'+key}));
 const personality=[...new Set([...Object.values(PERSONALITY_FACTORS).flatMap(parts=>parts.map(([key])=>key)),'financialMotivation'])].map(key=>({key,column:'personality.'+key}));
 const tendencies=[...new Set(HIDDEN_TENDENCY_GROUPS.flatMap(([,parts])=>parts.map(([key])=>key)))].map(key=>({key,column:'tendency.'+key}));
 const tech=Object.entries(TECHNIQUE_GROUPS).flatMap(([group,names])=>names.map(name=>({name,group,proficiency:'tech.'+crMasterSlug(group)+'.'+crMasterSlug(name)+'.proficiency',preference:'tech.'+crMasterSlug(group)+'.'+crMasterSlug(name)+'.preference'})));
 const headers=[...base,...attrs.map(x=>x.column),...personality.map(x=>x.column),...tendencies.map(x=>x.column),...tech.flatMap(x=>[x.proficiency,x.preference])];
 if(new Set(headers).size!==headers.length)throw Error('Master CSV field collision; check game technique names.');
 return {base,attrs,personality,tendencies,tech,headers};
}
function crMasterData(f,sch){
 const attrs=ensureFighterAttributes(f),ps=f.hiddenPersonalityFactors||(ensureFighterPersonality(f),f.hiddenPersonalityFactors);
 const t=ensureFighterTendencies(f),p=ensureTechniqueProfile(f);
 const base={fighterId:f.id,name:f.name,gender:f.gender||'Male',division:f.division,promotion:f.promotion,nationality:f.nationality||'',age:f.age,
  height:f.height??'',weight:f.weight??'',reach:f.reach??'',wins:f.wins??0,losses:f.losses??0,draws:f.draws??0,skill:syncFighterAbility(f),
  potential:f.potential,popularity:f.popularity,fightingStyle:f.fightingStyle||'',realFighter:f.realFighter?'true':'false'};
 const values={...base};
 for(const item of sch.attrs)values[item.column]=attrs[item.key]??'';
 for(const item of sch.personality)values[item.column]=ps[item.key]??'';
 for(const item of sch.tendencies)values[item.column]=t[item.key]??'';
 for(const item of sch.tech){
  values[item.proficiency]=p[item.name]?.proficiency??'';
  values[item.preference]=p[item.name]?.preference??'';
 }return values;
}
function crMasterExport(template=false){
 if(!state)return;
 const sch=crMasterSchema();
 if(template){
  const blank=Object.fromEntries(sch.headers.map(h=>[h,'']));
  Object.assign(blank,{name:'Example Fighter',gender:'Male',division:'Lightweight',promotion:'UFC',nationality:'New Zealand',age:25,skill:70,potential:80,popularity:35,fightingStyle:'boxer',realFighter:'false'});
  blank['attr.punchSpeed']=78;blank['personality.workEthic']=85;blank['tendency.pressure']=70;
  const jab=sch.tech.find(x=>x.name==='Jab');if(jab){blank[jab.proficiency]=80;blank[jab.preference]=90}
  crDownload('mma-manager-master-template.csv',crMakeCsv(sch.headers,[sch.headers.map(h=>blank[h])]));
 }else{
  const rows=state.fighters.map(f=>{const values=crMasterData(f,sch);return sch.headers.map(h=>values[h])});
  crDownload('mma-manager-master-roster.csv',crMakeCsv(sch.headers,rows));
 }
}
function crMasterPresent(row,key){const v=row[key];return v!==undefined&&v!==null&&String(v).trim()!==''}
function crMasterNumber(row,key,context,max=100){
 if(!crMasterPresent(row,key))return undefined;
 return crInt(row[key],context+' '+key,0,max);
}
function crParseMaster(rows){
 if(!Array.isArray(rows)||!rows.length)throw Error('The master CSV has no fighters.');
 if(rows.length>crLimits.roster)throw Error('Master CSV exceeds the 15,000 fighter limit.');
 const sch=crMasterSchema(),valid=new Set(sch.headers),errors=[],known=new Map(),ids=new Map(),keys=new Set();
 for(const f of state.fighters){
  ids.set(String(f.id),f);
  const k=crKey(f.name)+'|'+crKey(f.gender||'Male');
  if(!known.has(k))known.set(k,[]);known.get(k).push(f);
 }
 const ops=[],counts={newFighters:0,existing:0,attributes:0,personality:0,tendencies:0,techniques:0,roster:0,records:0},example=rows[0];
 for(const col of Object.keys(example))if(!valid.has(col))errors.push('Unknown master CSV column "'+col+'". Download a new template to check spelling.');
 if(!Object.prototype.hasOwnProperty.call(example,'name'))errors.push('Missing required column "name".');
 if(errors.length)throw Error(errors.slice(0,5).join('; '));
 for(let i=0;i<rows.length;i++){
  const row=rows[i],ctx='Row '+(i+2);
  if(!row||typeof row!=='object'||Array.isArray(row)){errors.push(ctx+': invalid fighter');continue}
  const name=String(row.name||'').trim(),gender=String(row.gender||'').trim();
  if(!name){errors.push(ctx+': fighter name required');continue}
  const id=crMasterPresent(row,'fighterId')?String(row.fighterId).trim():null;
  let match=null;
  if(id){
   match=ids.get(id);
   if(!match){errors.push(ctx+': fighterId '+id+' not found in this career; clear fighterId to add a new fighter');continue}
   if(crKey(match.name)!==crKey(name)){errors.push(ctx+': name differs from fighterId '+id+'; renaming existing fighters is not supported');continue}
  }else{
   const options=known.get(crKey(name)+'|'+crKey(gender||'Male'))||[];
   if(options.length>1){errors.push(ctx+': multiple fighters share this name/gender; supply fighterId');continue}
   match=options[0]||null;
  }
  const duplicate=match?'id:'+match.id:'name:'+crKey(name)+'|'+crKey(gender);
  if(keys.has(duplicate)){errors.push(ctx+': duplicate fighter '+name);continue}
  keys.add(duplicate);
  if(match){
   for(const key of ['gender','division','promotion','realFighter']){
    if(!crMasterPresent(row,key))continue;
    const existing=key==='realFighter'?(match.realFighter?'true':'false'):String(match[key]??(key==='gender'?'Male':''));
    if(crKey(row[key])!==crKey(existing)){errors.push(ctx+': '+key+' is read-only for existing fighters; use game controls for division/promotion changes');}
   }
  }else{
   if(!['Male','Female'].includes(gender)){errors.push(ctx+': gender must be Male or Female');continue}
   if(!DIVISIONS_BY_GENDER[gender]?.includes(row.division)){errors.push(ctx+': unsupported division '+row.division);continue}
   if(![...Object.keys(PROMOS),...REGION,'Free Agent'].includes(row.promotion)){errors.push(ctx+': unsupported promotion '+row.promotion);continue}
  }
  const safe={},attr={},personality={},tendencies={},technique={};let records={};
  try{
   for(const key of ['age','height','weight','reach','potential','popularity']){
    const value=crMasterNumber(row,key,ctx,key==='age'?120:key==='height'||key==='weight'||key==='reach'?400:100);
    if(value!==undefined)safe[key]=value;
   }
   for(const key of ['wins','losses','draws']){const val=crMasterNumber(row,key,ctx,999);if(val!==undefined)records[key]=val}
   if(crMasterPresent(row,'nationality'))safe.nationality=String(row.nationality).trim().slice(0,100);
   if(crMasterPresent(row,'fightingStyle')){
    const style=String(row.fightingStyle).trim();
    if(!Object.hasOwn(FIGHTING_STYLES,style))throw Error(ctx+': unknown fightingStyle '+style);
    safe.fightingStyle=style;
   }
   const skill=crMasterNumber(row,'skill',ctx);
   if(!match&&skill!==undefined)safe.skill=skill;
   for(const item of sch.attrs){const val=crMasterNumber(row,item.column,ctx);if(val!==undefined)attr[item.key]=val}
   for(const item of sch.personality){const val=crMasterNumber(row,item.column,ctx);if(val!==undefined)personality[item.key]=val}
   for(const item of sch.tendencies){const val=crMasterNumber(row,item.column,ctx);if(val!==undefined)tendencies[item.key]=val}
   for(const item of sch.tech){
    const prof=crMasterNumber(row,item.proficiency,ctx),pref=crMasterNumber(row,item.preference,ctx);
    if(prof!==undefined||pref!==undefined)technique[item.name]={...(prof!==undefined?{proficiency:prof}:{}),...(pref!==undefined?{preference:pref}:{})};
   }
   if(!match&&crMasterPresent(row,'realFighter'))safe.realFighter=crBoolean(row.realFighter);
   if(match&&skill!==undefined&&Object.keys(attr).length===0&&skill!==Number(match.skill))throw Error(ctx+': overall skill is calculated from attributes. Edit attr.* columns instead.');
  }catch(e){errors.push(e.message);continue}
  if(match){
   const oldAttrs=ensureFighterAttributes(match),oldPersonality=(ensureFighterPersonality(match),match.hiddenPersonalityFactors),oldTendencies=ensureFighterTendencies(match),oldTech=ensureTechniqueProfile(match);
   for(const [key,value] of Object.entries(safe))if(String(match[key]??'')===String(value))delete safe[key];
   for(const [key,value] of Object.entries(records))if(Number(match[key])===value)delete records[key];
   for(const [key,value] of Object.entries(attr))if(Number(oldAttrs[key])===value)delete attr[key];
   for(const [key,value] of Object.entries(personality))if(Number(oldPersonality[key])===value)delete personality[key];
   for(const [key,value] of Object.entries(tendencies))if(Number(oldTendencies[key])===value)delete tendencies[key];
   for(const [key,value] of Object.entries(technique)){
    for(const [k,v] of Object.entries(value))if(Number(oldTech[key]?.[k])===v)delete value[k];
    if(!Object.keys(value).length)delete technique[key];
   }
   counts.existing++;
  }else counts.newFighters++;
  counts.roster+=Object.keys(safe).length;counts.records+=Object.keys(records).length;
  counts.attributes+=Object.keys(attr).length;counts.personality+=Object.keys(personality).length;
  counts.tendencies+=Object.keys(tendencies).length;counts.techniques+=Object.values(technique).reduce((a,v)=>a+Object.keys(v).length,0);
  ops.push({fighterId:match?.id??null,name,gender,row,safe,records,attr,personality,tendencies,technique});
 }
 if(errors.length)throw Error(errors.slice(0,8).join('; ')+(errors.length>8?' (and '+(errors.length-8)+' more)':''));
 if(!ops.length)throw Error('No fighter rows found in master CSV.');
 return {kind:'master',ops,total:rows.length,counts};
}
function crApplyMaster(p){
 const map=new Map(state.fighters.map(f=>[f.id,f])),changed=new Set();let added=0,updated=0,recordCount=0;
 for(const op of p.ops){
  let f=op.fighterId?map.get(op.fighterId):null;
  if(!f){
   const data={name:op.name,gender:op.gender,division:op.row.division,promotion:op.row.promotion,...op.safe,...op.records};
   crApplyRoster({add:[data],existing:[]});
   f=state.fighters[state.fighters.length-1];map.set(f.id,f);added++;
  }else{
   if(Object.keys(op.safe).length||Object.keys(op.attr).length||Object.keys(op.personality).length||Object.keys(op.tendencies).length||Object.keys(op.technique).length||crMasterUpdateRecords&&Object.keys(op.records).length)updated++;
   Object.assign(f,op.safe);
  }
  if(crMasterUpdateRecords&&op.fighterId&&Object.keys(op.records).length){
   Object.assign(f,op.records);f.rosterImportOrigin='Imported';f.recordUnverified=true;recordCount+=Object.keys(op.records).length;
  }
  if(Object.keys(op.attr).length){
   Object.assign(ensureFighterAttributes(f),op.attr);
   f.researchAttributeVersion=REAL_RESEARCH_PROFILE_VERSION;
   syncFighterAbility(f);
  }
  if(Object.keys(op.personality).length){
   ensureFighterPersonality(f);Object.assign(f.hiddenPersonalityFactors,op.personality);ensureFighterPersonality(f);
  }
  if(Object.keys(op.tendencies).length){
   Object.assign(ensureFighterTendencies(f),op.tendencies);
   f.fightBehaviourProfileVersion=REAL_RESEARCH_PROFILE_VERSION;
  }
  if(Object.keys(op.technique).length){
   const profile=ensureTechniqueProfile(f);
   for(const [key,delta] of Object.entries(op.technique)){
    profile[key]={...profile[key],...delta,basis:'Manual CSV edit',confidence:'',sourceNotes:''};
   }
  }
  if(!op.fighterId||Object.keys(op.safe).length||Object.keys(op.records).length||Object.keys(op.attr).length||Object.keys(op.personality).length||Object.keys(op.tendencies).length||Object.keys(op.technique).length)changed.add(f.id);
 }
 return {added,updated,recordCount,changed:changed.size};
}
let crMasterUpdateRecords=false;

function crTemplate(kind){
 if(kind==='master')return crMasterExport(true);
 if(kind==='technique')crDownload('mma-manager-technique-template.csv',crMakeCsv(crTechniqueHeaders,[['Example Fighter','Male','UFC','Boxing','Jab',82,94,'true','Low','Illustrative only']]));
 else crDownload('mma-manager-roster-template.csv',crMakeCsv(crRosterHeaders,[['Example Fighter','Male','Lightweight','UFC','New Zealand',26,5,1,0,65,78,30,'boxer','true']]));
}
function crExport(kind){
 if(!state)return;
 if(kind==='master')return crMasterExport(false);
 if(kind==='technique'){
 const rows=[];
 for(const f of state.fighters){
  const profile=ensureTechniqueProfile(f);
  for(const [category,names] of Object.entries(TECHNIQUE_GROUPS))for(const name of names){
   const v=profile[name]||{};
   rows.push([f.name,f.gender||'Male',f.promotion,category,name,v.proficiency??'',v.preference??'',v.basis==='Imported'?'false':'true',v.confidence||'',v.sourceNotes||'']);
  }
 }
 crDownload('mma-manager-all-techniques.csv',crMakeCsv(crTechniqueHeaders,rows));return;
 }
 crDownload('mma-manager-current-roster.csv',crMakeCsv(crRosterHeaders,state.fighters.map(f=>crRosterHeaders.map(h=>f[h]??''))));
}
function crResolveFighter(row,index){
 const name=String(crColumn(row,'fighter','name')??'').trim();
 if(!name)return {error:'Missing fighter name'};
 const gender=crColumn(row,'gender'),promo=crColumn(row,'promotion');
 let candidates=index.get(crKey(name))||[];
 if(gender!==undefined&&String(gender).trim())candidates=candidates.filter(f=>crKey(f.gender||'Male')===crKey(gender));
 if(candidates.length>1&&promo!==undefined&&String(promo).trim())candidates=candidates.filter(f=>crKey(f.promotion)===crKey(promo));
 if(!candidates.length)return {missing:name};
 if(candidates.length>1)return {error:'Ambiguous fighter '+name+': specify gender and promotion'};
 return {fighter:candidates[0]};
}
function crParseTechnique(rows){
 if(!Array.isArray(rows)||!rows.length)throw Error('Technique file contains no rows.');
 if(rows.length>crLimits.techniques)throw Error('Too many technique rows (limit '+crLimits.techniques+').');
 const index=new Map();for(const f of state.fighters){const key=crKey(f.name);if(!index.has(key))index.set(key,[]);index.get(key).push(f)}
 const known=new Map();
 for(const [group,names] of Object.entries(TECHNIQUE_GROUPS))for(const name of names)known.set(crKey(name),{group,name});
 const ops=[],skipped=new Set(),duplicates=new Set(),errors=[],fighters=new Set();
 rows.forEach((row,i)=>{
  const rowLabel='Row '+(i+2);
  if(!row||typeof row!=='object'||Array.isArray(row)){errors.push(rowLabel+': invalid object');return}
  const name=String(crColumn(row,'technique')??'').trim();
  const technique=known.get(crKey(name));
  if(!technique){errors.push(rowLabel+': unknown technique '+name);return}
  const group=crColumn(row,'category');if(group&&crKey(group)!==crKey(technique.group)){errors.push(rowLabel+': category does not match '+name);return}
  let prof,pref,provisional;
  try{
   prof=crInt(crColumn(row,'proficiency'),rowLabel+' proficiency');
   pref=crInt(crColumn(row,'preference'),rowLabel+' preference');
   provisional=crBoolean(crColumn(row,'provisional'),true);
  }catch(e){errors.push(e.message);return}
  const matched=crResolveFighter(row,index);
  if(matched.error){errors.push(rowLabel+': '+matched.error);return}
  if(matched.missing){skipped.add(matched.missing);return}
  const key=matched.fighter.id+'|'+technique.name;
  if(duplicates.has(key)){errors.push(rowLabel+': duplicate rating for '+matched.fighter.name+' / '+name);return}
  duplicates.add(key);fighters.add(matched.fighter.id);
  ops.push({fighterId:matched.fighter.id,technique:technique.name,proficiency:prof,preference:pref,
   basis:provisional?'Imported provisional':'Imported',confidence:String(crColumn(row,'confidence')??'').slice(0,80),
   sourceNotes:String(crColumn(row,'source notes','sourceNotes')??'').slice(0,400)});
 });
 if(errors.length)throw Error(errors.slice(0,8).join('; ')+(errors.length>8?' (and '+(errors.length-8)+' more)':''));
 if(!ops.length)throw Error('No technique ratings match fighters in this career.');
 return {kind:'technique',ops,total:rows.length,matchedFighters:fighters.size,skipped:[...skipped]};
}
function crValidateProfile(profile,rowLabel){
 if(profile===undefined||profile===null||profile==='')return null;
 if(!profile||typeof profile!=='object'||Array.isArray(profile))throw Error(rowLabel+': techniqueProfile must be a JSON object.');
 const known=new Set(Object.values(TECHNIQUE_GROUPS).flat());
 const out={};
 for(const [name,v] of Object.entries(profile)){
  if(!known.has(name))throw Error(rowLabel+': unknown technique '+name);
  if(!v||typeof v!=='object'||Array.isArray(v))throw Error(rowLabel+': invalid profile for '+name);
  out[name]={proficiency:crInt(v.proficiency,rowLabel+' '+name+' proficiency'),preference:crInt(v.preference,rowLabel+' '+name+' preference'),
   basis:String(v.basis||'Imported').slice(0,80),confidence:String(v.confidence||'').slice(0,80),sourceNotes:String(v.sourceNotes||'').slice(0,400)};
 }return out;
}
function crParseRoster(rows,filename){
 const parsed=prepareRosterImport(JSON.stringify(rows),'roster.json');
 if(parsed.length>crLimits.roster)throw Error('Roster exceeds '+crLimits.roster+' fighters.');
 const errors=[],existing=[],add=[],allowedPromos=new Set([...Object.keys(PROMOS),...REGION,'Free Agent']);
 const index=new Map();for(const f of state.fighters){const key=crKey(f.name)+'|'+crKey(f.gender||'Male');if(!index.has(key))index.set(key,[]);index.get(key).push(f)}
 parsed.forEach((f,i)=>{
  const label='Row '+(i+2);
  if(!DIVISIONS_BY_GENDER[f.gender]?.includes(f.division))errors.push(label+': invalid '+f.gender+' division '+f.division);
  if(!allowedPromos.has(f.promotion))errors.push(label+': unsupported promotion '+f.promotion);
  for(const field of ['skill','potential','popularity'])if(f[field]!==undefined&&f[field]!=='')try{f[field]=crInt(f[field],label+' '+field)}catch(e){errors.push(e.message)}
  for(const field of ['wins','losses','draws','age'])if(f[field]!==undefined&&f[field]!=='')try{f[field]=crInt(f[field],label+' '+field,0,300)}catch(e){errors.push(e.message)}
  try{if(f.realFighter!==undefined)f.realFighter=crBoolean(f.realFighter)}catch(e){errors.push(label+': '+e.message)}
  try{if(f.techniqueProfile!==undefined)f.techniqueProfile=crValidateProfile(f.techniqueProfile,label)}catch(e){errors.push(e.message)}
  const matches=index.get(crKey(f.name)+'|'+crKey(f.gender))||[];
  if(matches.length>1)errors.push(label+': ambiguous existing fighter '+f.name);
  else if(matches.length)existing.push({fighterId:matches[0].id,row:f});
  else add.push(f);
 });
 if(errors.length)throw Error(errors.slice(0,8).join('; ')+(errors.length>8?' (and '+(errors.length-8)+' more)':''));
 return {kind:'roster',add,existing,total:parsed.length};
}
function crPrepare(raw,filename){
 if(!/\.(csv|json)$/i.test(filename))throw Error('Choose a .csv or .json file.');
 const parsed=/\.csv$/i.test(filename)?parseRosterCSV(raw):JSON.parse(raw);
 if(parsed?.format==='MMA-Manager-Career')throw Error('This is a career save. Use Import career in the top toolbar instead.');
 const rows=Array.isArray(parsed)?parsed:Array.isArray(parsed?.fighters)?parsed.fighters:Array.isArray(parsed?.techniques)?parsed.techniques:null;
 if(!rows||!rows.length)throw Error('File must contain a nonempty fighter or technique list.');
 const sample=rows[0]||{},isMaster=Object.keys(sample).some(k=>k==='fighterId'||/^(attr|personality|tendency|tech)\./.test(k)),isTechnique=crColumn(sample,'technique')!==undefined;
 const preview=isMaster?crParseMaster(rows):isTechnique?crParseTechnique(rows):crParseRoster(rows,filename);
 return {...preview,filename};
}
function careerRosterPanelHTML(){
 if(!state)return '';
 const p=crPending;
 const details=p?(p.kind==='roster'
  ?'<strong>'+p.total+' fighter rows:</strong> '+p.add.length+' new, '+p.existing.length+' already present. '+(crMode==='add'?'Existing fighters will not be changed.':'Existing fighters will receive only biographical, potential, popularity and technique updates.')
  :'<strong>'+p.ops.length+' technique ratings</strong> across '+p.matchedFighters+' fighters.'+(p.skipped.length?'<p style="color:var(--accent)">Skipped '+p.skipped.length+' unknown fighters: '+p.skipped.slice(0,8).map(esc).join(', ')+(p.skipped.length>8?'…':'')+'</p>':''))
  :'';
 return '<section class="panel" style="max-width:850px;margin-top:16px"><h2>Import & export fighter database</h2>'+
 '<p class="muted">Use one master CSV to manage roster information, combat attributes, personality factors, fighter tendencies and all 65 technique proficiency/preference pairs. Older simple roster and technique CSV files remain supported.</p>'+
 '<div class="row" style="flex-wrap:wrap"><button id="crChoose">Choose CSV / JSON</button><input type="file" id="crFile" accept=".csv,.json,text/csv,application/json" hidden>'+
 '<button id="crTemplateMaster">Master CSV template</button><button id="crTemplateRoster">Roster CSV template</button><button id="crTemplateTechnique">Technique CSV template</button></div>'+
 '<div class="row" style="flex-wrap:wrap;margin-top:10px"><button class="primary" id="crExportMaster">Export complete master CSV</button><button id="crExportRoster">Export roster CSV</button><button id="crExportTechnique">Export technique CSV</button></div><p class="muted">Master CSV uses one fighter per row. Edit in Excel, save as CSV UTF-8, then import it. Empty rating cells preserve existing values.</p>'+
 (p?'<div class="notice" style="margin-top:16px"><strong>Import preview: '+esc(p.filename)+'</strong><p>'+details+'</p>'+
 (p.kind==='roster'?'<label>Existing fighters <select id="crMode"><option value="add"'+(crMode==='add'?' selected':'')+'>Skip existing (add only)</option><option value="update"'+(crMode==='update'?' selected':'')+'>Update existing profiles safely</option></select></label><p class="muted">Existing fighter IDs, records, contracts, promotions, weight classes and active bookings stay unchanged.</p>':'<p class="muted">Only matched fighters will change; absent fighters are listed as skipped.</p>')+
 '<div class="row" style="margin-top:12px"><button class="primary" id="crApply">Confirm import</button><button id="crCancel">Cancel</button></div></div>':'')+
 (crError?'<p class="notice" style="color:var(--bad);margin-top:12px">'+esc(crError)+'</p>':'')+
 '<p class="muted" style="margin-top:12px">A full career backup is downloaded before importing. Use Import career to restore it if needed. Imports are local to this save and do not change the GitHub master roster.</p></section>';
}
function crApplyRoster(p){
 let countAdd=0,countUpdated=0;let nextId=Math.max(0,...state.fighters.map(x=>Number(x.id)||0))+1;
 for(const row of p.add){
  const id=nextId++,real=row.realFighter===undefined?REAL_FIGHTERS.some(x=>crKey(x[0])===crKey(row.name)):row.realFighter;
  const skill=Number(row.skill)||60,amateur=row.promotion==='Streetbeefs';
  const f={id,name:row.name,gender:row.gender,promotion:row.promotion,division:row.division,
   nationality:row.nationality||'Unknown',age:row.age??25,wins:amateur?0:row.wins??0,losses:amateur?0:row.losses??0,draws:row.draws??0,
   amateurWins:amateur?row.wins??0:0,amateurLosses:amateur?row.losses??0:0,noContests:0,
   height:row.height??undefined,weight:row.weight??undefined,reach:row.reach??undefined,
   status:amateur?'Amateur':'Professional',skill,potential:row.potential??Math.min(99,skill+8),popularity:row.popularity??30,
   fightingStyle:row.fightingStyle||'balanced',form:0,scouted:row.promotion===state.player?2:0,
   salary:Math.round(skill*2400),contract:24,realFighter:real,recordUnverified:row.recordUnverified===undefined?true:crBoolean(row.recordUnverified,true),realRecordVersion:1,
   rosterImportOrigin:'Imported'};
  if(row.techniqueProfile)f.techniqueProfile=row.techniqueProfile;
  state.fighters.push(f);
  ensureFightingStyle(f);ensureFighterAttributes(f);ensureFighterTendencies(f);ensureFighterPersonality(f);ensurePersonalityStates(f);ensureFighterGym(f);
  if(typeof ensureTechniqueProfile==='function')ensureTechniqueProfile(f);
  if(f.promotion===state.player){
   const pay=Math.max(8000,Math.round(f.salary/4/1000)*1000);
   state.contracts.push({id:f.id,show:pay,win:pay,signing:0,fights:4,weeks:104,start:now(),origin:'Roster import'});
  }
  countAdd++;
 }
 if(crMode==='update')for(const {fighterId,row} of p.existing){
  const f=state.fighters.find(x=>x.id===fighterId);if(!f)throw Error('Fighter no longer found: '+row.name);
  for(const k of ['nationality','age','height','weight','reach','fightingStyle','potential','popularity'])if(row[k]!==undefined&&row[k]!=='')f[k]=row[k];
  if(row.techniqueProfile){const original=ensureTechniqueProfile(f);for(const [k,v] of Object.entries(row.techniqueProfile))original[k]=v}
  countUpdated++;
 }
 return {added:countAdd,updated:countUpdated};
}
function crApplyTechnique(p){
 let affected=0;const touched=new Set();
 for(const r of p.ops){
  const f=state.fighters.find(x=>x.id===r.fighterId);if(!f)throw Error('Fighter disappeared during import.');
  ensureTechniqueProfile(f)[r.technique]={proficiency:r.proficiency,preference:r.preference,basis:r.basis,confidence:r.confidence,sourceNotes:r.sourceNotes};
  touched.add(f.id);
 }
 affected=touched.size;return {ratings:p.ops.length,affected,skipped:p.skipped.length};
}
function crRunImport(){
 const p=crPending;if(!p)return;
 const summary=p.kind==='roster'?p.add.length+' new and '+(crMode==='update'?p.existing.length:0)+' existing fighter profiles':' '+p.ops.length+' technique ratings for '+p.matchedFighters+' fighters';
 if(!confirm('Apply '+summary+' to this career? A full backup will be downloaded first.'))return;
 const snapshot=JSON.stringify(state),before=state;
 try{
  crDownload('MMA-Manager-BACKUP-before-import-'+state.date+'.json',JSON.stringify({format:'MMA-Manager-Career',version:1,career:state},null,2),'application/json');
  state=JSON.parse(snapshot);
  const stats=p.kind==='roster'?crApplyRoster(p):crApplyTechnique(p);
  save();
  if(localStorage.getItem('mma_gm_management_v01')!==JSON.stringify(state))throw Error('Local save failed (possibly browser storage full). The current career was restored.');
  crPending=null;crError='';render();
  alert('Import successful: '+(p.kind==='roster'?stats.added+' added, '+stats.updated+' profiles updated.':stats.ratings+' ratings across '+stats.affected+' fighters.'+(stats.skipped?' '+stats.skipped+' names skipped.':'')));
 }catch(err){
  state=before;crError='Import failed; changes rolled back: '+String(err.message||err);
  try{localStorage.setItem('mma_gm_management_v01',snapshot)}catch(e){}
  render();
 }
}
function careerRosterBind(){
 const choose=document.getElementById('crChoose'),file=document.getElementById('crFile');
 if(choose&&file)choose.onclick=()=>file.click();
 if(file)file.onchange=async e=>{
  const item=e.target.files?.[0];if(!item)return;
  try{
   if(item.size>crLimits.fileBytes)throw Error('File exceeds 12 MB. Split into smaller batches.');
   crPending=crPrepare(await item.text(),item.name);crError='';
  }catch(err){crPending=null;crError=String(err.message||err)}
  render();
 };
 const mode=document.getElementById('crMode');if(mode)mode.onchange=()=>{crMode=mode.value;render()};
 const recordToggle=document.getElementById('crMasterRecords');if(recordToggle)recordToggle.onchange=()=>{crMasterUpdateRecords=recordToggle.checked;render()};
 const map={crTemplateMaster:()=>crTemplate('master'),crExportMaster:()=>crExport('master'),crTemplateRoster:()=>crTemplate('roster'),crTemplateTechnique:()=>crTemplate('technique'),
 crExportRoster:()=>crExport('roster'),crExportTechnique:()=>crExport('technique'),
 crApply:crRunImport,crCancel:()=>{crPending=null;crError='';render()}};
 for(const [id,fn] of Object.entries(map)){const el=document.getElementById(id);if(el)el.onclick=fn}
}
