
const oldBind=bind,oldMigrate=migrate;

const VENUE_CATALOG=[
{id:'vegas-apex',name:'Las Vegas Fight Studio',city:'Las Vegas',country:'United States',capacity:1500,rent:25000},
{id:'vegas-arena',name:'Desert Strip Arena',city:'Las Vegas',country:'United States',capacity:19000,rent:340000},
{id:'nyc-garden',name:'Manhattan Grand Arena',city:'New York',country:'United States',capacity:20000,rent:450000},
{id:'miami',name:'Biscayne Arena',city:'Miami',country:'United States',capacity:12000,rent:185000},
{id:'la',name:'Pacific Forum',city:'Los Angeles',country:'United States',capacity:17000,rent:310000},
{id:'london',name:'Thames Arena',city:'London',country:'United Kingdom',capacity:20000,rent:370000},
{id:'manchester',name:'Northern Events Arena',city:'Manchester',country:'United Kingdom',capacity:13500,rent:190000},
{id:'paris',name:'Paris Combat Arena',city:'Paris',country:'France',capacity:16000,rent:275000},
{id:'berlin',name:'Berlin Sports Hall',city:'Berlin',country:'Germany',capacity:9000,rent:115000},
{id:'toronto',name:'Lakeshore Arena',city:'Toronto',country:'Canada',capacity:18000,rent:260000},
{id:'montreal',name:'Montreal Centre',city:'Montreal',country:'Canada',capacity:14000,rent:195000},
{id:'rio',name:'Rio Indoor Arena',city:'Rio de Janeiro',country:'Brazil',capacity:15000,rent:165000},
{id:'sao',name:'São Paulo Events Centre',city:'São Paulo',country:'Brazil',capacity:10500,rent:105000},
{id:'mexico',name:'Mexico City Arena',city:'Mexico City',country:'Mexico',capacity:16000,rent:165000},
{id:'tokyo',name:'Tokyo Dome Hall',city:'Tokyo',country:'Japan',capacity:24000,rent:390000},
{id:'osaka',name:'Osaka Combat Hall',city:'Osaka',country:'Japan',capacity:7500,rent:105000},
{id:'seoul',name:'Seoul Sports Arena',city:'Seoul',country:'South Korea',capacity:11000,rent:145000},
{id:'singapore',name:'Marina Bay Arena',city:'Singapore',country:'Singapore',capacity:12000,rent:250000},
{id:'bangkok',name:'Bangkok Fight Hall',city:'Bangkok',country:'Thailand',capacity:6500,rent:68000},
{id:'abu-dhabi',name:'Abu Dhabi Arena',city:'Abu Dhabi',country:'United Arab Emirates',capacity:18000,rent:310000},
{id:'dubai',name:'Dubai Events Arena',city:'Dubai',country:'United Arab Emirates',capacity:13500,rent:265000},
{id:'sydney',name:'Sydney Harbour Arena',city:'Sydney',country:'Australia',capacity:18500,rent:315000},
{id:'melbourne',name:'Melbourne Indoor Arena',city:'Melbourne',country:'Australia',capacity:14000,rent:210000},
{id:'auckland',name:'Auckland Events Arena',city:'Auckland',country:'New Zealand',capacity:11500,rent:145000},
{id:'wellington',name:'Wellington Civic Arena',city:'Wellington',country:'New Zealand',capacity:5000,rent:55000},
{id:'cape-town',name:'Cape Town Arena',city:'Cape Town',country:'South Africa',capacity:9500,rent:95000}
];
function venueFor(e){return VENUE_CATALOG.find(v=>v.id===e.venueId)||VENUE_CATALOG.find(v=>v.city===e.city&&v.country===e.country)||VENUE_CATALOG[1]}
function venueOptions(e){return VENUE_CATALOG.map(v=>'<option value="'+v.id+'" '+(e.venueId===v.id?'selected':'')+'>'+esc(v.name)+' — '+esc(v.city)+', '+esc(v.country)+' · '+v.capacity.toLocaleString()+' seats · '+money(v.rent)+' base rent</option>').join('')}
function eventPrices(e){
 const v=venueFor(e),factor=e.type==='PPV'?1.65:e.type==='Tournament'?1.35:e.type==='Regional'?.7:1;
 const rental=Math.round(v.rent*factor);
 const production=Math.round((30000+v.capacity*7)*factor);
 const staffing=Math.round(6000+v.capacity*3.5);
 const security=Math.round(3500+v.capacity*1.4);
 const insurance=Math.round(4500+v.capacity*.65);
 const logistics=Math.round(8000+v.capacity*1.25+(v.country==='United States'?0:20000));
 const marketing=Math.round((e.type==='PPV'?90000:e.type==='Regional'?12000:35000)+v.capacity*1.5);
 const bonuses=e.type==='PPV'?100000:e.type==='Regional'?20000:50000;
 const ticketPrice=e.type==='PPV'?115:e.type==='Regional'?35:v.capacity>20000?95:65;
 return {venueCost:rental,production,staffing,security,insurance,logistics,marketing,bonuses,ticketPrice,capacity:v.capacity};
}
function refreshEventPrices(e){
 const v=venueFor(e);e.venueId=v.id;e.venue=v.name;e.city=v.city;e.country=v.country;
 const p=eventPrices(e);Object.assign(e,p);
 return e;
}

const EVENT_SLOT_ORDER=['Main Event','Co-Main Event','Main Card','Preliminary','Early Prelims'];function sortEventBouts(e){if(e?.bouts)e.bouts.sort((a,b)=>EVENT_SLOT_ORDER.indexOf(a.slot||'Main Card')-EVENT_SLOT_ORDER.indexOf(b.slot||'Main Card'))}
function eventNormalize(e){sortEventBouts(e);e.date=e.date||eventDate(e);e.bouts=e.bouts||((e.aid&&e.bid)?[{aid:e.aid,bid:e.bid,slot:'Main Event',rounds:5}]:[]);e.id=e.id||('event-'+state.events.indexOf(e));e.type=e.type||'Fight Night';e.country=e.country||'United States';e.city=e.city||'Las Vegas';e.venue=e.venue||'Arena';e.capacity=e.capacity??10000;e.ticketPrice=e.ticketPrice??75;e.venueCost=e.venueCost??100000;e.production=e.production??125000;e.marketing=e.marketing??50000;e.bonuses=e.bonuses??50000;e.hype=e.hype||0;e.broadcast=e.broadcast||'Streaming';if(!e.venueId){const matched=VENUE_CATALOG.find(v=>v.capacity===Number(e.capacity));e.venueId=matched?.id||'vegas-arena'}if(!e.done&&e.costModelVersion!==2){refreshEventPrices(e);e.costModelVersion=2}return e}
function fighterAvailable(f,e){return f&&f.promotion===state.player&&f.status==='Professional'&&(!f.unavailableUntil||f.unavailableUntil<=eventDate(e))&&state.contracts.some(c=>c.id===f.id&&c.fights>0)&&!state.events.some(x=>x!==e&&!x.done&&eventNormalize(x).bouts.some(b=>b.aid===f.id||b.bid===f.id))}
function forecast(e){eventNormalize(e);const fs=e.bouts.flatMap(b=>[state.fighters.find(f=>f.id===b.aid),state.fighters.find(f=>f.id===b.bid)]).filter(Boolean);const pop=fs.reduce((n,f)=>n+f.popularity,0)/(fs.length||1);const local=fs.filter(f=>f.nationality===e.country).length;const hype=Math.min(100,Math.round(pop*.55+e.bouts.length*5+local*4+e.marketing/12000+e.hype+(e.type==='PPV'?10:0)));const attendance=Math.round(e.capacity*Math.min(.98,.25+hype/150));const revenue=attendance*e.ticketPrice+(e.type==='PPV'?220000:90000)+hype*(e.type==='PPV'?6500:2200)+20000+hype*1400;const purses=fs.reduce((n,f)=>{const c=state.contracts.find(x=>x.id===f.id);return n+(c?c.show+c.win*.5:0)},0);const costs=e.venueCost+e.production+(e.staffing||0)+(e.security||0)+(e.insurance||0)+(e.logistics||0)+e.marketing+e.bonuses+purses+(e.extraMarketing||0);return {hype,attendance,revenue,purses,costs,net:revenue-costs}}

function fighterBioHTML(id){
 const f=state.fighters.find(x=>x.id===Number(id));if(!f)return '<p class="muted">Select a fighter to view their profile.</p>';
 const c=state.contracts.find(x=>x.id===f.id);
 const record=f.status==='Amateur'?(f.amateurWins||0)+'-'+(f.amateurLosses||0)+' amateur':(f.wins||0)+'-'+(f.losses||0)+' professional';
 const items=[['Nationality',f.nationality||'Unknown'],['Gender',f.gender||'Male'],['Division',f.division],['Fighting style',FIGHTING_STYLES[ensureFightingStyle(f)].label],['Age',f.age],['Record',record],['Promotion',f.promotion],['Ability',f.skill],['Potential',f.potential],['Popularity',f.popularity],['Recent form',f.form??'Not available'],['Career damage',f.careerDamage||0],['Heavy TKO losses',f.heavyLosses||0],['Development range',potentialRange(f)],['Last potential change',f.potentialHistory?.length?(f.potentialHistory[f.potentialHistory.length-1].change>=0?'+':'')+f.potentialHistory[f.potentialHistory.length-1].change:'No fight history'],['Contract fights remaining',c?c.fights:'No active contract'],['Medical availability',f.unavailableUntil?'Available after '+shortDate(f.unavailableUntil):'Available']];
 const gym=ensureFighterGym(f),loyalty=Math.max(0,Math.min(100,Math.round(Number(f.gymLoyalty)||0)));
 const gymPanel='<h3 style="margin:18px 0 10px">Gym</h3><div class="event-fields"><div class="feed"><span class="muted">Gym</span><strong>'+esc(gym.name)+'</strong></div><div class="feed"><span class="muted">Gym Loyalty</span><div style="min-width:140px;width:55%;text-align:right"><strong>'+loyalty+'/100</strong><div role="meter" aria-label="Gym Loyalty" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+loyalty+'" style="height:8px;border-radius:6px;background:var(--line);margin-top:7px;overflow:hidden"><div style="width:'+loyalty+'%;height:100%;background:var(--accent);border-radius:6px"></div></div></div></div></div>';
 const availableDivisions=divisionSteps(f),divisionIndex=availableDivisions.indexOf(f.division);
 const canChangeDivision=f.promotion===state.player&&!state.events.some(e=>!e.done&&((e.bouts||[]).some(b=>b.aid===f.id||b.bid===f.id)||e.aid===f.id||e.bid===f.id));
 const divisionControl=canChangeDivision?'<div class="row" style="margin:10px 0"><label>Change division <select data-change-division="'+f.id+'"><option value="">Choose adjacent division</option>'+[availableDivisions[divisionIndex-1],availableDivisions[divisionIndex+1]].filter(Boolean).map(d=>'<option value="'+esc(d)+'">'+esc(d)+'</option>').join('')+'</select></label></div>':'';
 const attributes=ensureFighterAttributes(f);
 const bar=value=>'<div style="height:6px;border-radius:5px;background:var(--line);margin-top:6px;overflow:hidden"><div style="width:'+value+'%;height:100%;background:var(--accent)"></div></div>';
 const attributePanel='<h3 style="margin:18px 0 10px">Fighter Attributes</h3><div class="fighter-attribute-groups">'+attributeGroups(f).map(g=>'<details class="panel fighter-attribute-group" style="margin-bottom:10px;padding:14px"><summary style="cursor:pointer;list-style:none"><strong>'+esc(g.label)+'</strong><strong style="float:right;margin-right:10px">'+g.rating+'</strong>'+bar(g.rating)+'</summary><div class="event-fields" style="margin-top:12px">'+(g.disciplines?g.disciplines.map(d=>'<details style="padding:10px;border:1px solid var(--line);border-radius:8px;margin-bottom:8px"><summary style="cursor:pointer"><strong>'+esc(d.label)+'</strong> <span class="muted">('+Math.round(d.weight*100)+'% of Grappling)</span><strong style="float:right">'+d.rating+'</strong>'+bar(d.rating)+'</summary><div class="event-fields" style="margin-top:10px">'+d.skills.map(([key,label])=>'<div class="feed"><span class="muted">'+esc(label)+'</span><div><strong>'+attributes[key]+'</strong>'+bar(attributes[key])+'</div></div>').join('')+'</div></details>').join(''):g.skills.map(([key,label])=>'<div class="feed"><span class="muted">'+esc(label)+'</span><div><strong>'+attributes[key]+'</strong>'+bar(attributes[key])+'</div></div>').join(''))+'</div></details>').join('')+'</div>';
 const hiddenPanel=showHiddenAttributes()?'<h3 style="margin:18px 0 10px">Hidden Attributes · Testing</h3>'+HIDDEN_TENDENCY_GROUPS.map(([group,entries])=>'<details class="panel" style="margin-bottom:10px"><summary>'+esc(group)+'</summary><div class="event-fields">'+entries.map(([key,label])=>'<div class="feed"><span class="muted">'+esc(label)+'</span><div><strong>'+ensureFighterTendencies(f)[key]+'</strong>'+bar(ensureFighterTendencies(f)[key])+'</div></div>').join('')+'</div></details>').join(''):'';
 return '<h3 style="margin:0 0 10px">'+esc(f.name)+'</h3><div class="event-fields">'+items.map(([label,value])=>'<div class="feed"><span class="muted">'+esc(label)+'</span><div><strong>'+esc(String(value))+'</strong></div></div>').join('')+'</div>'+gymPanel+divisionControl+attributePanel+hiddenPanel;
}
function showFighterBio(id,target){const el=document.getElementById(target);if(el)el.innerHTML=fighterBioHTML(id)}
document.addEventListener('change',event=>{const control=event.target.closest('[data-change-division]');if(!control||!control.value)return;if(!changeFighterDivision(control.dataset.changeDivision,control.value))alert('Division change unavailable. Only adjacent divisions are allowed, and the fighter cannot be booked.');});


function eventFighterCards(roster){
 return '<div class="event-fighter-browser"><div class="event-selected-profiles"><section class="notice"><strong>Fighter A</strong><div id="fighterBioA">Select a fighter above.</div></section><section class="notice"><strong>Fighter B</strong><div id="fighterBioB">Select a fighter above.</div></section></div><div class="row"><h3>Choose Fighters</h3><input id="eventFighterSearch" type="search" placeholder="Search fighters or divisions" aria-label="Search available fighters"></div><p class="muted">Select Fighter A, then Fighter B from the list below. Their profiles appear in the boxes above.</p><div class="event-fields"><label>Gender<select id="eventFilterGender"><option value="">All genders</option><option value="Male">Male</option><option value="Female">Female</option></select></label><label>Weight class<select id="eventFilterDivision"><option value="">All divisions</option>'+Array.from(new Set(roster.map(f=>f.division))).sort().map(d=>'<option value="'+esc(d)+'">'+esc(d)+'</option>').join('')+'</select></label><label>Sort by<select id="eventFighterSort"><option value="name">Name (A–Z)</option><option value="ability">Ability (highest)</option><option value="potential">Potential (highest)</option><option value="popularity">Popularity (highest)</option><option value="ageAsc">Age (youngest)</option><option value="ageDesc">Age (oldest)</option><option value="wins">Wins (most)</option></select></label><button type="button" id="eventResetFilters">Reset filters</button></div><div class="muted" id="eventFighterCount" aria-live="polite"></div><input type="hidden" id="newFightA"><input type="hidden" id="newFightB"><div class="event-fighter-grid" id="eventFighterGrid">'+roster.map(f=>'<article class="event-fighter-card" data-fighter-card="'+f.id+'" data-gender="'+esc(f.gender||'Male')+'" data-division="'+esc(f.division)+'" data-name="'+esc(f.name.toLowerCase())+'" data-ability="'+Number(f.skill||0)+'" data-potential="'+Number(f.potential||0)+'" data-popularity="'+Number(f.popularity||0)+'" data-age="'+Number(f.age||0)+'" data-wins="'+Number(f.wins||0)+'" data-search="'+esc((f.name+' '+(f.gender||'Male')+' '+f.division+' '+f.nationality).toLowerCase())+'"><div class="row"><strong>'+esc(f.name)+'</strong><span class="pill">'+esc(f.division)+'</span></div><div class="muted">'+esc(f.nationality||'Unknown')+' · Age '+f.age+' · '+(f.wins||0)+'-'+(f.losses||0)+' PRO</div><div class="event-fighter-metrics"><span>Ability <strong>'+f.skill+'</strong></span><span>Potential <strong>'+f.potential+'</strong></span><span>Popularity <strong>'+f.popularity+'</strong></span></div><div class="muted">Form: '+esc(String(f.form??'N/A'))+' · '+(f.unavailableUntil?'Recovery until '+shortDate(f.unavailableUntil):'Medically available')+'</div><div class="actions"><button data-pick-fighter="'+f.id+'" data-side="A">Select A</button><button data-pick-fighter="'+f.id+'" data-side="B">Select B</button></div></article>').join('')+'</div></div>';
}
function bindFighterCards(){
 const filterFighters=()=>{
 const q=($('eventFighterSearch')?.value||'').trim().toLowerCase(),gender=$('eventFilterGender')?.value||'',division=$('eventFilterDivision')?.value||'',sort=$('eventFighterSort')?.value||'name';
 const grid=$('eventFighterGrid');if(!grid)return;
 const cards=Array.from(grid.querySelectorAll('[data-fighter-card]'));
 cards.forEach(card=>{card.hidden=!(card.dataset.search.includes(q)&&(!gender||card.dataset.gender===gender)&&(!division||card.dataset.division===division))});
 const numeric={ability:'ability',potential:'potential',popularity:'popularity',ageAsc:'age',ageDesc:'age',wins:'wins'};
 cards.sort((a,b)=>sort==='name'?a.dataset.name.localeCompare(b.dataset.name):sort==='ageAsc'?Number(a.dataset.age)-Number(b.dataset.age):Number(b.dataset[numeric[sort]])-Number(a.dataset[numeric[sort]])||a.dataset.name.localeCompare(b.dataset.name));
 cards.forEach(card=>grid.appendChild(card));
 if($('eventFighterCount'))$('eventFighterCount').textContent=cards.filter(card=>!card.hidden).length+' of '+cards.length+' fighters shown';
 };
 ['eventFighterSearch','eventFilterGender','eventFilterDivision','eventFighterSort'].forEach(id=>{if($(id))$(id).addEventListener(id==='eventFighterSearch'?'input':'change',filterFighters)});
 if($('eventResetFilters'))$('eventResetFilters').onclick=()=>{['eventFighterSearch','eventFilterGender','eventFilterDivision'].forEach(id=>{if($(id))$(id).value=''});$('eventFighterSort').value='name';filterFighters()};
 filterFighters();
 document.querySelectorAll('[data-pick-fighter]').forEach(b=>b.onclick=()=>{
 const id=b.dataset.pickFighter,side=b.dataset.side,other=side==='A'?'B':'A';
 if($('newFight'+other).value===id)return alert('Select two different fighters.');
 const f=state.fighters.find(x=>x.id===Number(id)),otherId=Number($('newFight'+other).value),opponent=state.fighters.find(x=>x.id===otherId);
 if(opponent&&!eligibleFightDivision(f,opponent))return alert('Fighters must be the same gender and within one weight division.');
 $('newFight'+side).value=id;showFighterBio(id,'fighterBio'+side);
 document.querySelectorAll('[data-pick-fighter]').forEach(x=>{const chosen=$('newFight'+x.dataset.side).value===x.dataset.pickFighter;x.classList.toggle('primary',chosen);x.setAttribute('aria-pressed',String(chosen))});
 });
}

function opt(values,value){return values.map(v=>'<option '+(v===value?'selected':'')+'>'+esc(v)+'</option>').join('')}
function events(){state.events.forEach(eventNormalize);if(state.eventScreen==='create')return '<section class="panel" style="max-width:780px;margin:auto"><div class="row"><h2>Create Event</h2><button id="backToEvents">Back to events</button></div><p class="sub">Set up your event, then manage the venue, fight card and finances on its own screen.</p><div class="stack"><label>Event name<input id="createName" value="'+esc(state.player)+' Fight Night"></label><label>Event date<input id="createDate" type="date" min="'+state.date+'" value="'+addDays(state.date,14)+'"></label><label>Event type<select id="createType">'+opt(['Fight Night','PPV','Tournament','Regional'],'Fight Night')+'</select></label><button class="primary" id="createEvent">Create event and continue</button></div></section>';const e=state.events.find(x=>String(x.id)===String(state.selectedEventId))||state.events.find(x=>!x.done)||state.events[0];const list=state.events.slice().sort((a,b)=>eventDate(a).localeCompare(eventDate(b))).map(x=>'<div class="feed"><strong>'+esc(x.name)+'</strong><div class="muted">'+shortDate(eventDate(x))+' · '+esc(x.city)+', '+esc(x.country)+' · '+x.bouts.length+' bouts</div><button data-select-event="'+esc(x.id)+'">Manage</button> '+(x.done?'Completed':eventDate(x)<=state.date?'EVENT DAY':'Scheduled')+'</div>').join('');if(state.eventScreen!=='edit')return '<section class="panel"><div class="row"><div><h2>Event Calendar</h2><p class="sub">Create an event or select an existing one to manage its card and finances.</p></div><button class="primary" id="openCreateEvent">+ Create event</button></div>'+(list||'<div class="empty">No events scheduled yet.</div>')+'</section>';let panel='<section class="panel"><h2>Select an Event</h2></section>';if(e){const f=forecast(e);const booked=new Set(e.bouts.flatMap(b=>[b.aid,b.bid]));const roster=state.fighters.filter(x=>fighterAvailable(x,e)&&!booked.has(x.id));const choices='<option value="">Select fighter</option>'+roster.map(x=>'<option value="'+x.id+'">'+esc(x.name)+' · '+esc(x.division)+'</option>').join('');const fields=[['Name','name','text'],['Date','date','date'],['Venue and location','venueId','venue-select']];panel='<section class="panel"><h2>'+esc(e.name)+'</h2><p class="sub">'+shortDate(eventDate(e))+' · '+esc(e.venue)+'</p>'+(!e.done?'<div class="event-fields">'+fields.map(([label,key,type])=>'<label>'+label+(type==='venue-select'?'<select data-event-field="venueId">'+venueOptions(e)+'</select>':'<input data-event-field="'+key+'" type="'+type+'" value="'+esc(e[key]??'')+'" '+(type==='number'?'min="0"':'')+'>')+'</label>').join('')+'<label>Event type<select data-event-field="type">'+opt(['Fight Night','PPV','Tournament','Regional'],e.type)+'</select></label><label>Broadcast<select data-event-field="broadcast">'+opt(['Streaming','TV / Streaming','PPV','Local TV'],e.broadcast)+'</select></label></div><div class="actions"><button class="primary" id="saveEventDetails">Save details</button><button id="marketEvent">Marketing campaign ($25,000)</button><button id="cancelEvent">Cancel event</button></div>':'')+'<h3 style="margin-top:18px">Fight Card</h3>'+e.bouts.map((b,i)=>{const a=state.fighters.find(x=>x.id===b.aid),c=state.fighters.find(x=>x.id===b.bid);return '<div class="feed"><strong>'+esc(b.slot)+' · '+esc(a?.name||'Unknown')+' vs '+esc(c?.name||'Unknown')+'</strong><div class="muted">'+b.rounds+' rounds'+(b.title?' · Title fight':'')+'</div>'+(b.result?'<span class="good">'+esc(b.result)+'</span>':'')+(!e.done?'<button data-fighter-bio="'+a?.id+'">'+esc(a?.name||'Fighter A')+' bio</button> <button data-fighter-bio="'+c?.id+'">'+esc(c?.name||'Fighter B')+' bio</button> <button data-remove-fight="'+i+'">Remove</button>':'')+'</div>'}).join('')+'<div id="bookedFighterBio" class="notice" style="margin:12px 0">Select a booked fighter’s bio to view their profile.</div>'+(!e.done?'<div class="event-fields"><label>Card position<select id="newFightSlot">'+opt(EVENT_SLOT_ORDER,'Main Card')+'</select></label><label>Rounds<select id="newFightRounds"><option>3</option><option>5</option></select></label><label><input id="newFightTitle" type="checkbox"> Championship</label></div>'+eventFighterCards(roster)+'<button class="primary" id="addFight">Add bout</button>':'')+'<h3 style="margin-top:20px">Financial Projection</h3><div class="feed">Hype: '+f.hype+'/100 · Attendance: '+f.attendance.toLocaleString()+' / '+e.capacity.toLocaleString()+'</div><div class="feed">Projected revenue: '+money(f.revenue)+'</div><div class="feed">Projected fighter purses: '+money(f.purses)+'</div><div class="feed">Projected total costs: '+money(f.costs)+'</div><div class="feed"><strong>Projected profit: '+money(f.net)+'</strong></div>'+(!e.done&&eventDate(e)<=state.date?'<div class="notice">Event day — time advancement paused.</div>'+(!e.started?'<button class="primary" id="runEvent">Start event</button>':'<div class="notice">Event in progress · Fight '+(e.bouts.length-e.nextFightIndex)+' of '+e.bouts.length+'</div><div class="feed"><strong>'+esc(state.fighters.find(x=>x.id===e.bouts[e.nextFightIndex]?.aid)?.name||'Fighter A')+' vs '+esc(state.fighters.find(x=>x.id===e.bouts[e.nextFightIndex]?.bid)?.name||'Fighter B')+'</strong></div><label>Choose simulation for this fight <select id="simulationMode"><option value="instant">Instant sim</option><option value="commentary">Commentary</option><option value="3d" disabled>3D simulation (coming later)</option></select></label><button class="primary" id="runEvent">Simulate this fight</button>')+'':'')+(e.done?'<h3>Results and Awards</h3>'+(e.simulationMode==='commentary'?commentaryReport(e):'')+'<div class="feed">'+esc((e.results||[e.result]).join(' | '))+'</div><div class="feed">Fight of the Night: '+esc(e.awards?.fight||'N/A')+'</div><div class="feed">Performances: '+esc((e.awards?.performances||[]).join(', '))+'</div><div class="feed">Net: '+money(e.actualProfit||0)+'</div>':'')+'</section>'}return '<div class="row" style="margin-bottom:16px"><button id="backToEvents">← Event calendar</button><button id="openCreateEvent">+ Create another event</button></div>'+panel}
function commentaryReport(e){return '<div class="stack">'+(e.bouts||[]).map(b=>'<details class="panel"><summary>Round commentary</summary>'+(b.commentary||[]).map(line=>'<div class="feed">'+esc(line)+'</div>').join('')+'</details>').join('')+'</div>'}
function eventSelected(){return state.events.find(x=>String(x.id)===String(state.selectedEventId))||state.events.find(x=>!x.done)||state.events[0]}
function bindEventManager(){if($('openCreateEvent'))$('openCreateEvent').onclick=()=>{state.eventScreen='create';save();render()};if($('backToEvents'))$('backToEvents').onclick=()=>{state.eventScreen='list';save();render()};document.querySelectorAll('[data-select-event]').forEach(b=>b.onclick=()=>{state.selectedEventId=b.dataset.selectEvent;state.eventScreen='edit';save();render()});if($('createEvent'))$('createEvent').onclick=()=>{const date=$('createDate').value,name=$('createName').value.trim().slice(0,60);if(!name||date<=state.date)return alert('Choose a name and future date.');if(state.events.some(e=>!e.done&&eventDate(e)===date))return alert('Another event is scheduled that day.');const e=eventNormalize({id:'event-'+Date.now(),name,date,type:$('createType').value,done:false,bouts:[]});state.events.push(e);state.selectedEventId=e.id;state.eventScreen='edit';save();render()};if(state.eventScreen!=='edit')return;const e=eventSelected();if(!e)return;bindFighterCards();
 for(const [select,target] of [['newFightA','fighterBioA'],['newFightB','fighterBioB']]){const el=$(select);if(el)el.addEventListener('change',()=>showFighterBio(el.value,target))}
 document.querySelectorAll('[data-fighter-bio]').forEach(b=>b.addEventListener('click',()=>{const el=document.getElementById('bookedFighterBio');if(el){el.innerHTML=fighterBioHTML(b.dataset.fighterBio);el.scrollIntoView({block:'nearest',behavior:'smooth'})}}));if($('saveEventDetails'))$('saveEventDetails').onclick=()=>{const values={};for(const el of document.querySelectorAll('[data-event-field]')){let v=el.value;if(['capacity','ticketPrice','venueCost','production','marketing','bonuses'].includes(el.dataset.eventField)){v=Number(v);if(!Number.isFinite(v)||v<0||v>100000000)return alert('Invalid financial or venue value.')}values[el.dataset.eventField]=v}if(!values.name.trim()||values.date<state.date)return alert('Invalid name or date.');if(state.events.some(x=>x!==e&&!x.done&&eventDate(x)===values.date))return alert('Date already occupied.');if(e.bouts.some(b=>[b.aid,b.bid].some(id=>{const f=state.fighters.find(x=>x.id===id);return f?.unavailableUntil&&f.unavailableUntil>values.date})))return alert('Booked fighter medically unavailable on that date.');Object.assign(e,values);refreshEventPrices(e);save();render()};if($('newFightSlot'))$('newFightSlot').onchange=()=>{if($('newFightRounds'))$('newFightRounds').value=$('newFightSlot').value==='Main Event'?'5':'3'};if($('addFight'))$('addFight').onclick=()=>{const a=state.fighters.find(x=>x.id===Number($('newFightA').value)),b=state.fighters.find(x=>x.id===Number($('newFightB').value));if(!a||!b||a===b)return alert('Select two different fighters.');if(!fighterAvailable(a,e)||!fighterAvailable(b,e)||!eligibleFightDivision(a,b))return alert('Fighters must be eligible professionals of the same gender within one weight division.');if(e.bouts.some(x=>[x.aid,x.bid].some(id=>id===a.id||id===b.id)))return alert('Fighter already on card.');const slot=$('newFightSlot').value;if(['Main Event','Co-Main Event'].includes(slot)&&e.bouts.some(x=>x.slot===slot))return alert('Card position already filled.');const title=$('newFightTitle').checked;if(title&&a.division!==b.division)return alert('Title fights require fighters in the same division.');e.bouts.push({aid:a.id,bid:b.id,slot,rounds:(title||slot==='Main Event')?5:Number($('newFightRounds').value),title});sortEventBouts(e);save();render()};document.querySelectorAll('[data-remove-fight]').forEach(b=>b.onclick=()=>{e.bouts.splice(Number(b.dataset.removeFight),1);save();render()});if($('marketEvent'))$('marketEvent').onclick=()=>{if(state.cash<25000)return alert('Insufficient funds.');state.cash-=25000;e.hype=Math.min(40,e.hype+6);e.extraMarketing=(e.extraMarketing||0)+25000;save();render()};if($('cancelEvent'))$('cancelEvent').onclick=()=>{if(!confirm('Cancel this event?'))return;state.events=state.events.filter(x=>x!==e);state.selectedEventId=null;save();render()};if($('runEvent'))$('runEvent').onclick=()=>{const mode=$('simulationMode')?.value||'instant';if(mode==='commentary')startLiveCommentary();else runEvent(mode)}}
function fightFinishMethod(winner,loser){
 const a=ensureFighterAttributes(winner),b=ensureFighterAttributes(loser);
 const koAttack=a.punchPower*.42+a.kickPower*.28+a.accuracy*.2+a.aggression*.1;
 const koDefense=b.chin*.55+b.blocking*.25+b.headMovement*.2;
 const subAttack=a.submissions*.5+a.groundControl*.22+a.takedowns*.18+a.fightIQ*.1;
 const subDefense=b.submissionDefense*.5+b.groundEscapes*.3+b.takedownDefense*.2;
 const ko=Math.max(8,Math.min(58,27+(koAttack-koDefense)*.65));
 const sub=Math.max(5,Math.min(48,19+(subAttack-subDefense)*.6));
 const roll=Math.random()*100;
 return roll<ko?'TKO':roll<ko+sub?'Submission':'Decision';
}

/* Versioned competition rules. Numerical judging thresholds are simulator calibration, not ABC points. */
const MMA_RULE_PROFILES={
 ABC_2025:{id:'ABC_2025',scoring:'rounds',groundedHeadKnees:false,groundedHeadKicks:false,groundedHeadStomps:false,verticalElbows:true,roundSeconds:300,restSeconds:60},
 ONE_GLOBAL:{id:'ONE_GLOBAL',scoring:'whole_bout',groundedHeadKnees:true,groundedHeadKicks:false,groundedHeadStomps:false,verticalElbows:true,roundSeconds:300,restSeconds:60},
 RIZIN:{id:'RIZIN',scoring:'whole_bout',groundedHeadKnees:true,groundedHeadKicks:true,groundedHeadStomps:true,verticalElbows:true,roundSeconds:300,restSeconds:60}
};
function mmaRulesForPromotion(promotion){
 const name=String(promotion||'').toUpperCase();
 return name.includes('ONE')?MMA_RULE_PROFILES.ONE_GLOBAL:name.includes('RIZIN')?MMA_RULE_PROFILES.RIZIN:MMA_RULE_PROFILES.ABC_2025;
}
function mmaIsGrounded(contacts){
 return (contacts||[]).some(c=>c.touchingCanvas&&!['leftHand','rightHand','leftFoot','rightFoot'].includes(c.bodyPart));
}
function mmaMoveLegal(move,defenderContacts,rules){
 const grounded=mmaIsGrounded(defenderContacts);
 if(move==='12_6_elbow')return !!rules.verticalElbows;
 if(!grounded)return true;
 if(move==='head_knee')return !!rules.groundedHeadKnees;
 if(move==='head_kick'||move==='soccer_kick')return !!rules.groundedHeadKicks;
 if(move==='head_stomp')return !!rules.groundedHeadStomps;
 return true;
}
function mmaJudgeRound(x,y,judgeBias=0){
 // Impact and damaging offensive grappling first; aggression/control are tie-breakers only.
 const primary=f=>f.impact+f.submissionThreat*1.6+f.effectiveGrappling*.8;
 const diff=primary(x)-primary(y)+judgeBias;
 let side=Math.abs(diff)>1?Math.sign(diff):0;
 if(!side)side=Math.sign(x.aggression-y.aggression);
 if(!side)side=Math.sign(x.areaControl-y.areaControl);
 if(!side)return [10,10];
 const win=side>0?x:y,lose=side>0?y:x;
 const severe=win.impact>=24&&win.impact>=lose.impact*2.5&&win.dominance>=22;
 const overwhelming=win.impact>=50&&win.impact>=lose.impact*5&&win.dominance>=65;
 const loserScore=overwhelming?7:severe?8:9;
 return side>0?[10,loserScore]:[loserScore,10];
}
function mmaResolveScorecards(cards){
 const votes=cards.map(c=>c.a>c.b?'A':c.b>c.a?'B':'DRAW');
 const a=votes.filter(x=>x==='A').length,b=votes.filter(x=>x==='B').length,d=3-a-b;
 if(a===3)return {winner:'A',method:'Unanimous Decision'};
 if(b===3)return {winner:'B',method:'Unanimous Decision'};
 if(a===2&&b===1)return {winner:'A',method:'Split Decision'};
 if(b===2&&a===1)return {winner:'B',method:'Split Decision'};
 if(a===2&&d===1)return {winner:'A',method:'Majority Decision'};
 if(b===2&&d===1)return {winner:'B',method:'Majority Decision'};
 if(d===3)return {winner:null,method:'Unanimous Draw'};
 if(d===2)return {winner:null,method:'Majority Draw'};
 if(a===1&&b===1&&d===1)return {winner:null,method:'Split Draw'};
 return {winner:null,method:'Draw'};
}

function simulateFightRounds(a,b,scheduledRounds){
 const fighters=[a,b],attrs=new Map(fighters.map(f=>[f.id,ensureFighterAttributes(f)])),tendencies=new Map(fighters.map(f=>[f.id,ensureFighterTendencies(f)]));
 const tendency=(f,key)=>tendencies.get(f.id)[key];
 const val=(f,key,fallback=65)=>Number(attrs.get(f.id)?.[key])||fallback;
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
 const scores={[a.id]:0,[b.id]:0},damage={[a.id]:0,[b.id]:0},stamina={[a.id]:100,[b.id]:100};
 const rounds=[],actionEvents=[],maxRounds=clamp(Number(scheduledRounds)||3,1,5);
 const rules=mmaRulesForPromotion(a.promotion||b.promotion),judges=[{a:0,b:0},{a:0,b:0},{a:0,b:0}];
 let seq=0,position='standing',top=null;
 const emit=(round,clock,actor,target,phase,type,outcome,text,importance=.5,extra={})=>{
  actionEvents.push({id:++seq,round,clock,actor:actor?.id||null,target:target?.id||null,phase,type,outcome,text,importance,position,...extra});
 };
 const other=f=>f===a?b:a;
 for(let round=1;round<=maxRounds;round++){
  position='standing';top=null;
  const impact={[a.id]:0,[b.id]:0},control={[a.id]:0,[b.id]:0},strikes={[a.id]:0,[b.id]:0},submissionThreat={[a.id]:0,[b.id]:0},dominance={[a.id]:0,[b.id]:0};
  emit(round,300,null,null,'round','start','', 'Round '+round+' begins.',.9);
  let finish=null,clock=300;
  for(let beat=0;beat<28;beat++){
   clock=Math.max(8,300-Math.round((beat+1)*290/29));
   const initiative=f=>val(f,'pace')*.18+val(f,'fightIQ')*.12+tendency(f,'pressure')*.12+stamina[f.id]*.18+Math.random()*50;
   const actor=initiative(a)>=initiative(b)?a:b,target=other(actor);
   const tired=1-stamina[actor.id]/180;
   const spend=n=>{stamina[actor.id]=clamp(stamina[actor.id]-n*tired,4,100)};
   if(position==='ground'){
    const defender=other(top);
    if(Math.random()<clamp(.1+(val(defender,'groundEscapes')-val(top,'groundControl'))/240,.05,.4)){
     emit(round,clock,defender,top,'ground','escape','success',defender.name+' scrambles back to the feet.',.65);
     position='standing';top=null;continue;
    }
    if(Math.random()<Math.max(.12,.4-tendency(top,'groundAndPound')/300)){
     control[top.id]+=4;dominance[top.id]+=4;
     emit(round,clock,top,defender,'ground','transition','success',top.name+' improves position and maintains top control.',.6);
    }else if(Math.random()<clamp(.04+tendency(top,'submissionHunting')/450+(val(top,'submissions')-val(defender,'submissionDefense'))/280,.03,.34)){
     spend(3);control[top.id]+=3;submissionThreat[top.id]+=5;
     emit(round,clock,top,defender,'submission','attempt','threat',top.name+' locks up a submission attempt. '+defender.name+' fights to defend.',.85);
     const success=Math.random()<clamp(.035+(val(top,'submissions')-val(defender,'submissionDefense'))/230+(100-stamina[defender.id])/650,.008,.23);
     if(success){
      emit(round,clock-2,top,defender,'finish','submission','tap',defender.name+' taps! '+top.name+' wins by submission.',1);
      finish={winner:top,loser:defender,method:'Submission'};break;
     }
     emit(round,clock-3,defender,top,'submission','defense','success',defender.name+' escapes the submission danger.',.65);
    }else{
     const hit=Math.random()<clamp(.45+(val(top,'groundControl')-val(defender,'blocking'))/240,.25,.8);
     spend(2);
     if(hit){const d=clamp(1+val(top,'punchPower')/42+Math.random()*2,1,6);damage[defender.id]+=d;impact[top.id]+=d;strikes[top.id]++;
      emit(round,clock,top,defender,'ground','ground_strike','landed',top.name+' lands short ground strikes from top position.',.62);
     }else emit(round,clock,top,defender,'ground','ground_strike','blocked',defender.name+' covers up and blocks the ground strikes.',.35);
    }
   }else if(position==='clinch'){
    if(Math.random()<Math.max(.12,.48-tendency(actor,'clinchPreference')/230)){emit(round,clock,actor,target,'clinch','break','success',actor.name+' breaks free of the clinch.',.4);position='standing';continue}
    spend(3);
    const success=Math.random()<clamp(.28+(val(actor,'takedowns')-val(target,'takedownDefense'))/180,.08,.65);
    if(success){position='ground';top=actor;control[actor.id]+=6;dominance[actor.id]+=3;emit(round,clock,actor,target,'wrestling','takedown','success',actor.name+' completes a takedown and settles into top control.',.83)}
    else{control[actor.id]+=1;emit(round,clock,actor,target,'clinch','knee','landed',actor.name+' presses '+target.name+' against the fence and lands a knee.',.49)}
   }else{
    if(Math.random()<clamp(.025+tendency(actor,'takedownDrive')/500+tendency(actor,'clinchPreference')/1200,.04,.28)){
     position='clinch';emit(round,clock,actor,target,'clinch','entry','success',actor.name+' closes distance and initiates a clinch.',.5);continue;
    }
    const kickChance=tendency(actor,'kicking')/140;const technique=Math.random()<kickChance?(['low kick','body kick'][Math.floor(Math.random()*2)]):(['jab','cross','hook','uppercut'][Math.floor(Math.random()*4)]);
    const accuracy=clamp(.37+(val(actor,'accuracy')-val(target,'headMovement'))/240+(stamina[actor.id]-stamina[target.id])/480,.18,.78);
    const landed=Math.random()<accuracy;spend(technique.includes('kick')?4:2.5);
    if(landed){
     const power=technique.includes('kick')?val(actor,'kickPower'):val(actor,'punchPower');
     const d=clamp(1+power/35+Math.random()*3,1,8);
     damage[target.id]+=d;impact[actor.id]+=d;strikes[actor.id]++;
     emit(round,clock,actor,target,'striking',technique,'landed',actor.name+' lands a '+technique+' on '+target.name+'.',d>5?.72:.49);
     if(d>5&&Math.random()<.22)emit(round,clock-1,target,actor,'reaction','stagger','success',target.name+' is briefly shaken by the shot.',.83);
    }else emit(round,clock,actor,target,'striking',technique,'defended',actor.name+' throws a '+technique+', but '+target.name+' defends.',.32);
   }
   const hurt=other(actor);
   if(damage[hurt.id]>18&&Math.random()<clamp((damage[hurt.id]-18)/650*tendency(other(hurt),'finishingInstinct')/55+(100-stamina[hurt.id])/1400,.001,.13)){
    const attacker=other(hurt);
    emit(round,clock-2,attacker,hurt,'striking','knockdown','success',attacker.name+' lands a powerful follow-up! '+hurt.name+' goes down!',.98);
    emit(round,clock-4,attacker,hurt,'finish','TKO','stoppage','The referee steps in! '+attacker.name+' wins by TKO.',1);
    finish={winner:attacker,loser:hurt,method:'TKO'};break;
   }
  }
  const ledger=f=>({impact:impact[f.id],submissionThreat:submissionThreat[f.id],effectiveGrappling:submissionThreat[f.id],dominance:dominance[f.id],aggression:strikes[f.id]+submissionThreat[f.id],areaControl:control[f.id]});
  const x=ledger(a),y=ledger(b),roundCards=[mmaJudgeRound(x,y,-.65),mmaJudgeRound(x,y,0),mmaJudgeRound(x,y,.65)];
  roundCards.forEach((card,i)=>{judges[i].a+=card[0];judges[i].b+=card[1]});
  const leader=roundCards.filter(c=>c[0]>c[1]).length>=2?a:b;
  scores[a.id]=judges[0].a;scores[b.id]=judges[0].b;
  rounds.push({round,winner:leader.name,score:roundCards[0].join('-'),judgeScores:roundCards,damage:{...damage},stamina:{...stamina},strikes:{...strikes},control:{...control},effectLedger:{[a.id]:x,[b.id]:y}});
  if(finish)return {...finish,finishRound:round,rounds,scores,damage,stamina,actionEvents};
  emit(round,0,null,null,'round','end','', 'The horn sounds to end round '+round+'.',.9);
 }
 const cards=judges.map(j=>({a:j.a,b:j.b})),decision=mmaResolveScorecards(cards);
 // Existing career result processing requires a winner; tied cards are settled by
 // simulated commission tie-break pending full draw-aware career bookkeeping.
 const winner=decision.winner==='A'?a:decision.winner==='B'?b:(damage[a.id]<=damage[b.id]?a:b);
 const method=decision.winner?decision.method:'Decision';
 emit(maxRounds,0,null,null,'decision','result','', 'The judges announce '+(decision.winner?decision.method:'a drawn scorecard')+'. '+winner.name+' is recorded as the winner.',1);
 return {winner,loser:other(winner),method,officialDecision:decision.method,judgeCards:cards,finishRound:maxRounds,rounds,scores,damage,stamina,actionEvents,rulesetId:rules.id};
}

function buildFightActionStream(a,b,fight){
 const events=[],pick=xs=>xs[Math.floor(Math.random()*xs.length)],attrs=f=>ensureFighterAttributes(f);
 let id=0;
 const add=(round,clock,actor,target,phase,type,outcome,text,importance=.45,position='standing')=>events.push({id:++id,round,clock,actor:actor?.id||null,target:target?.id||null,phase,type,outcome,importance,position,text});
 for(const r of fight.rounds){
  const win=r.winner===a.name?a:b,lose=win===a?b:a,finished=!fight.method.includes('Decision')&&fight.finishRound===r.round;
  const beats=finished?7:10;
  let phase='standing',position='standing',control=null;
  add(r.round,300,null,null,'round','start','', 'Round '+r.round+' begins. The fighters meet in the centre.',.9);
  for(let i=0;i<beats;i++){
   const clock=Math.max(finished?25:8,Math.round(286-i*(finished?32:27)+Math.random()*9));
   const actor=Math.random()<.64?win:lose,target=actor===a?b:a,att=attrs(actor),def=attrs(target);
   if(phase==='ground'){
    const escape=Math.random()*100<Math.max(20,def.groundEscapes*.55);
    if(escape){add(r.round,clock,target,actor,'ground','standup','success',target.name+' creates space and works back to the feet.',.6);phase='standing';position='standing';control=null;continue}
    if(Math.random()<.22){position=pick(['half guard','side control','mount']);add(r.round,clock,control||actor,target,'ground','transition','success',(control||actor).name+' advances into '+position+'.',.67,position);continue}
    const top=control||actor,bot=top===a?b:a;
    if(Math.random()*100<attrs(top).submissions*.23){add(r.round,clock,top,bot,'ground','submission_attempt','defended',top.name+' threatens a choke, but '+bot.name+' fights the hands and stays safe.',.79,position)}
    else add(r.round,clock,top,bot,'ground','ground_strike','landed',pick([top.name+' lands short punches from '+position+'.',top.name+' creates room and drops an elbow from the top.']),.58,position);
    continue;
   }
   if(phase==='clinch'){
    if(Math.random()<.35){add(r.round,clock,actor,target,'clinch','break','success',actor.name+' turns off the fence and the fighters separate.',.4);phase='standing';continue}
    const success=Math.random()*100<(att.takedowns*.53+att.wrestling*.2-def.takedownDefense*.34);
    if(success){phase='ground';control=actor;position=pick(['closed guard','half guard']);add(r.round,clock,actor,target,'wrestling','takedown','success',actor.name+' changes levels and finishes the takedown into '+position+'.',.78,position)}
    else add(r.round,clock,actor,target,'clinch','knee','landed',actor.name+' digs a knee into the body as they battle for position against the fence.',.48);
    continue;
   }
   const wrestling=Math.random()*100<((Number(att.takedowns)||60)*.12+(Number(att.clinch)||60)*.07);
   if(wrestling){phase='clinch';add(r.round,clock,actor,target,'clinch','entry','success',actor.name+' closes the distance and ties up '+target.name+' against the fence.',.53);continue}
   if(Math.random()<.13){add(r.round,clock,actor,target,'movement','reset','',pick([actor.name+' circles outside, looking for an opening.', 'Both fighters feint at range before resetting.']),.24);continue}
   const technique=pick(['jab','right hand','left hook','low kick','body kick','two-punch combination','uppercut']);
   const landed=Math.random()*100<Math.max(25,Math.min(82,40+att.accuracy*.3-def.headMovement*.22));
   const heavy=landed&&Math.random()*100<Math.max(7,att.punchPower*.17);
   const result=landed?(heavy?'heavy':'clean'):'defended';
   const text=landed?pick([actor.name+' lands a '+technique+' as '+target.name+' steps into range.',actor.name+' finds the target with a '+technique+'.']):pick([actor.name+' throws a '+technique+', but '+target.name+' moves clear.',target.name+' reads the '+technique+' and blocks it.']);
   add(r.round,clock,actor,target,'striking',technique,result,text,heavy?.76:landed?.48:.3);
   if(heavy&&Math.random()<.28)add(r.round,clock-2,actor,target,'reaction','stagger','success',target.name+' is briefly shaken and backs away as '+actor.name+' advances.',.84);
  }
  if(finished){
   const clock=Math.round(25+Math.random()*65);
   if(fight.method==='Submission'){
    add(r.round,clock+18,win,lose,'wrestling','takedown','success',win.name+' forces the action to the mat and establishes top control.',.86,'ground');
    add(r.round,clock+9,win,lose,'submission','setup','success',win.name+' isolates the neck and begins tightening a choke.',.93,'ground');
    add(r.round,clock,win,lose,'finish','submission','tap',lose.name+' tries to free the grip, but there is no escape. The tap comes! '+win.name+' wins by submission.',1,'ground');
   }else{
    add(r.round,clock+12,win,lose,'striking','power shot','heavy',win.name+' connects with a huge shot! '+lose.name+' stumbles backwards.',.94);
    add(r.round,clock+5,win,lose,'striking','followup','knockdown',win.name+' surges forward with follow-up punches as '+lose.name+' drops to the canvas!',.97);
    add(r.round,clock,win,lose,'finish','TKO','stoppage','The referee waves it off! '+win.name+' wins by TKO!',1);
   }
  }else add(r.round,0,null,null,'round','end','', 'The horn sounds to end round '+r.round+'.',.9);
 }
 if(fight.method.includes('Decision'))add(fight.finishRound,0,null,null,'decision','result','', 'The judges have their decision: '+fight.winner.name+' defeats '+fight.loser.name+'.',1);
 return events;
}

let liveCommentaryTimer=null;
function startLiveCommentary(){
 const e=eventSelected();if(!e||!e.started||e.done)return;
 const b=e.bouts[e.nextFightIndex];if(!b)return;
 const a=state.fighters.find(f=>f.id===b.aid),c=state.fighters.find(f=>f.id===b.bid);if(!a||!c)return;
 const fight=simulateFightRounds(a,c,b.rounds);
 const actions=fight.actionEvents||buildFightActionStream(a,c,fight);fight.actionEvents=actions;
 const lines=actions.filter(x=>x.importance>=.28).map(x=>({round:x.round,clock:x.clock,text:x.text,importance:x.importance}));
 const overlay=document.createElement('div');overlay.id='liveCommentaryOverlay';
 overlay.style.cssText='position:fixed;inset:0;z-index:10000;background:#090e17;overflow:auto;padding:24px;box-sizing:border-box;color:#f0f4fa';
 overlay.innerHTML='<div style="max-width:850px;margin:auto"><h2>Live Fight Commentary</h2><h3>'+esc(a.name)+' vs '+esc(c.name)+'</h3><div class="row"><strong id="liveRound">Pre-fight</strong><span id="liveProgress">0 / '+lines.length+'</span></div><div id="liveFeed" aria-live="polite" style="background:#151d29;border:1px solid #334155;border-radius:12px;padding:18px;min-height:260px;max-height:55vh;overflow:auto;margin:16px 0"></div><div class="actions"><button id="livePause">Pause</button><label>Playback speed <select id="liveSpeed"><option value="2500">Slow</option><option value="1400" selected>Normal</option><option value="550">Fast</option></select></label><button id="liveNext">Next moment</button><button id="liveSkip">Skip to result</button><button class="primary" id="liveFinish" disabled>Continue event</button></div><p class="muted">Fight outcomes are finalized only when you continue. The event remains paused while you watch.</p></div>';
 document.body.appendChild(overlay);
 let index=0,paused=false;
 const feed=overlay.querySelector('#liveFeed'),pause=overlay.querySelector('#livePause'),finish=overlay.querySelector('#liveFinish');
 const clear=()=>{if(liveCommentaryTimer){clearTimeout(liveCommentaryTimer);liveCommentaryTimer=null}};
 const step=()=>{if(index>=lines.length){clear();finish.disabled=false;pause.disabled=true;overlay.querySelector('#liveNext').disabled=true;overlay.querySelector('#liveSkip').disabled=true;return}
 const line=lines[index++],item=document.createElement('div');item.className='feed';item.textContent=line.text;feed.appendChild(item);feed.scrollTop=feed.scrollHeight;overlay.querySelector('#liveRound').textContent='Round '+line.round+' · '+Math.floor(line.clock/60)+':'+String(line.clock%60).padStart(2,'0')+' remaining';overlay.querySelector('#liveProgress').textContent=index+' / '+lines.length;if(index===lines.length){step();return}};
 const schedule=()=>{clear();if(!paused&&index<lines.length)liveCommentaryTimer=setTimeout(()=>{step();schedule()},Number(overlay.querySelector('#liveSpeed').value))};
 pause.onclick=()=>{paused=!paused;pause.textContent=paused?'Resume':'Pause';schedule()};
 overlay.querySelector('#liveSpeed').onchange=schedule;
 overlay.querySelector('#liveNext').onclick=()=>{step();schedule()};
 overlay.querySelector('#liveSkip').onclick=()=>{while(index<lines.length)step()};
 finish.onclick=()=>{clear();overlay.remove();runEvent('commentary',fight)};
 step();schedule();
}
function runEvent(mode='instant',preparedFight=null){
 const e=eventSelected();
 if(!e||e.done||eventDate(e)>state.date)return;
 if(!e.started){if(!e.bouts.length)return alert('Add at least one fight before starting the event.');e.started=true;e.nextFightIndex=e.bouts.length-1;e.results=[];e.pursesPaid=0;e.finishers=[];e.bestFightScore=-1;save();render();return}
 if(!['instant','commentary'].includes(mode))return alert('3D simulation is not available yet.');
 const b=e.bouts[e.nextFightIndex];if(!b)return;
 const a=state.fighters.find(f=>f.id===b.aid),c=state.fighters.find(f=>f.id===b.bid);if(!a||!c)return alert('Missing fighter in card.');const fight=preparedFight||simulateFightRounds(a,c,b.rounds);const w=fight.winner,l=fight.loser,method=fight.method;const damage=Math.min(100,fight.damage[l.id]);const winDamage=Math.min(100,fight.damage[w.id]);b.roundResults=fight.rounds;b.actionEvents=mode==='commentary'?(fight.actionEvents||buildFightActionStream(a,c,fight)):[];b.scorecards=fight.judgeCards||fight.scores;b.rulesetId=fight.rulesetId||mmaRulesForPromotion(a.promotion).id;b.finishRound=fight.finishRound;b.simulationMode=mode;b.commentary=b.actionEvents.length?b.actionEvents.map(x=>'R'+x.round+' '+Math.floor(x.clock/60)+':'+String(x.clock%60).padStart(2,'0')+' '+x.text):[];recordRankingResult(w,l,method,false);w.wins++;l.losses++;const winGrowth=updateFighterDevelopment(w,true,method,winDamage,l),lossGrowth=updateFighterDevelopment(l,false,method,damage,w);b.damage=damage;b.potentialChanges={[w.id]:winGrowth,[l.id]:lossGrowth};w.popularity=Math.min(99,w.popularity+rand(2,6));b.result=w.name+' defeats '+l.name+' by '+method+' (round '+fight.finishRound+(method.includes('Decision')?', '+fight.scores[w.id]+'-'+fight.scores[l.id]:'')+'; damage '+damage+'/100; potential '+(winGrowth>=0?'+':'')+winGrowth+' / '+lossGrowth+')';e.results.push(b.result);const score=a.skill+c.skill+rand(0,35);if(score>(e.bestFightScore??-1)){e.bestFightScore=score;e.bestFight=a.name+' vs '+c.name}if(method!=='Decision'){e.finishers=e.finishers||[];e.finishers.push(w.name)}for(const f of [a,c]){const contract=state.contracts.find(x=>x.id===f.id);if(contract){e.pursesPaid=(e.pursesPaid||0)+contract.show+(f===w?contract.win:0);contract.fights=Math.max(0,contract.fights-1)}f.unavailableUntil=addDays(state.date,method.includes('Decision')?21:35)}
 e.nextFightIndex--;
 if(e.nextFightIndex<0){
 const p=forecast(e);
 e.result=e.results[0];e.awards={fight:e.bestFight||'N/A',performances:e.finishers.slice(0,2)};
 e.actualProfit=p.revenue-e.pursesPaid-e.venueCost-e.production-(e.staffing||0)-(e.security||0)-(e.insurance||0)-(e.logistics||0)-e.marketing-e.bonuses-(e.extraMarketing||0);
 e.done=true;state.cash+=e.actualProfit;log(e.name+' completed: '+e.results.length+' bouts, net '+money(e.actualProfit)+'.');
 }
 save();render();
}
function migrateEvents(){if(state){state.events.forEach(eventNormalize)}}
migrateEvents();save();const baseBind=bind;bind=function(){baseBind();if(tab==='Events')bindEventManager()};