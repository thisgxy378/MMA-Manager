
const PURSE_BANDS=[
 {name:'UFC newcomer',min:10000,max:12000},
 {name:'Developing fighter',min:15000,max:35000},
 {name:'Established fighter',min:40000,max:100000},
 {name:'Ranked contender',min:100000,max:250000},
 {name:'Elite contender',min:250000,max:500000},
 {name:'Champion / superstar',min:500000,max:1000000}
];
function fighterTier(f){
 const p=f.popularity||0,s=f.skill||0,w=f.wins||0,l=f.losses||0;
 if(s>=91&&p>=85)return 5;
 if(s>=86&&p>=73)return 4;
 if(s>=79&&p>=62)return 3;
 if(s>=71&&p>=48&&w>=7)return 2;
 if(s>=60&&w>=3)return 1;
 return 0;
}
function fighterDemand(f){
 const tier=fighterTier(f),band=PURSE_BANDS[tier];
 const factor=Math.min(1,Math.max(0,((f.skill||50)-48)/48*.65+((f.popularity||30)-20)/80*.35));
 const target=Math.round((band.min+(band.max-band.min)*factor)/1000)*1000;
 return {tier,band,target:Math.max(band.min,target)};
}
function rivalTransfer(f){return f.promotion!==state.player&&Object.prototype.hasOwnProperty.call(PROMOS,f.promotion)}
function releaseFee(f){if(!rivalTransfer(f))return 0;const demand=fighterDemand(f).target;return Math.round(demand*(f.skill>=90?7:f.skill>=80?5:3)/1000)*1000}
let negotiatingId=null;let negotiationSession=null;
function negotiationClose(){const el=document.getElementById('negotiationOverlay');if(el)el.remove();negotiatingId=null;negotiationSession=null}
function negotiate(id){
 const f=state.fighters.find(x=>x.id===id);
 if(!f||(!f.scouted&&!REGION.includes(f.promotion)&&f.promotion!=='Free Agent')||f.promotion===state.player)return;
 negotiatingId=id;negotiationSession={round:1,maxRounds:3,counter:null,history:[],patience:3};
 const {band,target}=fighterDemand(f);const fee=releaseFee(f);
 const show=target,win=target,months=24,fights=4;
 const existing=document.getElementById('negotiationOverlay');if(existing)existing.remove();
 const overlay=document.createElement('div');overlay.id='negotiationOverlay';overlay.className='negotiation-overlay';overlay.setAttribute('role','presentation');
 overlay.innerHTML='<section class="negotiation-dialog" role="dialog" aria-modal="true" aria-labelledby="negotiationTitle"><div class="row"><div><h2 id="negotiationTitle">Contract negotiation</h2><p class="sub">'+esc(f.name)+' · '+esc(f.promotion)+' · '+esc(f.division)+'</p></div><button id="closeNegotiation" aria-label="Close negotiation">✕</button></div><div class="notice"><strong>'+esc(band.name)+'</strong><div>Illustrative UFC-inspired show purse band: '+money(band.min)+'–'+money(band.max)+' per fight.</div><div>Estimated fighter expectation: <strong>'+money(target)+'</strong> show purse (or comparable guarantee).</div>'+(fee?'<div>Rival contract release fee: <strong>'+money(fee)+'</strong> (paid on signing).</div>':'')+'</div><div class="negotiation-fields"><label>Contract structure<select id="offerStructure"><option value="showwin">Show purse + win bonus</option><option value="flat">Flat guaranteed purse</option></select></label><label id="showLabel">Show purse per fight ($)<input id="offerShow" type="number" min="1000" step="1000" value="'+show+'"></label><label id="winLabel">Win bonus ($)<input id="offerWin" type="number" min="0" step="1000" value="'+win+'"></label><label>Number of fights<input id="offerFights" type="number" min="1" max="8" value="'+fights+'"></label><label>Contract duration (months)<input id="offerMonths" type="number" min="6" max="48" value="'+months+'"></label><label>Signing bonus ($)<input id="offerBonus" type="number" min="0" step="1000" value="0"></label></div><div id="negotiationProgress" class="notice"></div><div id="negotiationHistory" class="small"></div><div id="offerPreview" class="negotiation-summary"></div><div id="counterActions" class="actions" style="display:none"><button class="primary" id="acceptCounter">Accept counteroffer</button><button id="reviseCounter">Revise my offer</button><button id="rejectCounter">Walk away</button></div><div class="row"><span class="muted small">Estimated acceptance is a gameplay probability, not a guarantee.</span><div class="actions"><button id="cancelOffer">Cancel</button><button class="primary" id="submitOffer">Submit offer</button></div></div><div id="offerResult" aria-live="polite"></div></section>';
 document.body.appendChild(overlay);
 overlay.addEventListener('click',e=>{if(e.target===overlay)negotiationClose()});
 document.getElementById('closeNegotiation').onclick=negotiationClose;
 document.getElementById('cancelOffer').onclick=negotiationClose;
 document.querySelectorAll('#negotiationOverlay input,#offerStructure').forEach(el=>el.addEventListener('input',updateNegotiationPreview));
 document.getElementById('offerStructure').onchange=()=>{const flat=document.getElementById('offerStructure').value==='flat';document.getElementById('winLabel').style.display=flat?'none':'';document.getElementById('showLabel').firstChild.textContent=flat?'Guaranteed purse per fight ($)':'Show purse per fight ($)';updateNegotiationPreview()};
 document.getElementById('submitOffer').onclick=submitNegotiation;
 document.getElementById('acceptCounter').onclick=acceptCounteroffer;
 document.getElementById('reviseCounter').onclick=reviseCounteroffer;
 document.getElementById('rejectCounter').onclick=()=>{recordNegotiation('WALKED AWAY');negotiationClose();render()};
 updateNegotiationPreview();renderNegotiationProgress();
 document.getElementById('offerShow').focus();
}
function readOffer(){
 const n=id=>Number(document.getElementById(id).value);
 const flat=document.getElementById('offerStructure').value==='flat';
 return {flat,show:n('offerShow'),win:flat?0:n('offerWin'),fights:n('offerFights'),months:n('offerMonths'),bonus:n('offerBonus')};
}
function offerAssessment(f,o){
 const demand=fighterDemand(f).target;
 const base=o.show+(o.flat?0:o.win*.42)+o.bonus/Math.max(1,o.fights);
 const expected=demand*(o.flat?1.35:1.38)*(rivalTransfer(f)?1.35:1);
 const ratio=base/expected;
 const reputation=(state.prestige-65)/150-(rivalTransfer(f)?Math.max(0,(PROMOS[f.promotion].prestige-state.prestige)/140):0);
 const odds=Math.max(.04,Math.min(.96,.45+(ratio-1)*1.15+reputation+(o.months>=18?.06:0)));
 return {odds,expected};
}
function offerValid(o){
 return Number.isFinite(o.show)&&o.show>=1000&&o.show<=10000000&&Number.isFinite(o.win)&&o.win>=0&&o.win<=10000000&&Number.isInteger(o.fights)&&o.fights>=1&&o.fights<=8&&Number.isInteger(o.months)&&o.months>=6&&o.months<=48&&Number.isFinite(o.bonus)&&o.bonus>=0&&o.bonus<=100000000;
}
function updateNegotiationPreview(){
 const f=state.fighters.find(x=>x.id===negotiatingId),el=document.getElementById('offerPreview');if(!f||!el)return;
 const o=readOffer();if(!offerValid(o)){el.innerHTML='<span class="bad">Enter valid contract values (1–8 fights, 6–48 months).</span>';return}
 const a=offerAssessment(f,o),fee=releaseFee(f),worst=o.fights*(o.show+o.win)+o.bonus+fee;
 const probability=Math.round(a.odds*100);
 el.innerHTML='<div class="feed">Guaranteed per fight <strong>'+money(o.show)+'</strong></div><div class="feed">Potential winner purse <strong>'+money(o.show+o.win)+'</strong></div><div class="feed">Maximum total contract commitment <strong>'+money(worst)+'</strong></div><div class="feed">Signing bonus payable now <strong>'+money(o.bonus)+'</strong></div><div class="feed">Rival release fee <strong>'+money(fee)+'</strong></div><div class="feed">Estimated acceptance probability <strong class="'+(probability>=60?'good':probability<30?'bad':'')+'">'+probability+'%</strong></div><div class="feed">Promotion available funds <strong>'+money(state.cash)+'</strong></div>';
}

function roundMoney(v){return Math.max(0,Math.round(v/1000)*1000)}
function negotiationPriority(f){const n=f.id%4;return ['Higher guaranteed pay','Shorter contract','Signing bonus','Win bonus'][n]}
function recordNegotiation(status){const f=state.fighters.find(x=>x.id===negotiatingId);if(!f||!negotiationSession)return;const line=f.name+': '+status+' after '+negotiationSession.round+' negotiation round(s)';state.offers.push(line);save()}
function renderNegotiationProgress(){
 const n=negotiationSession;if(!n)return;
 const p=document.getElementById('negotiationProgress'),h=document.getElementById('negotiationHistory');
 if(p)p.innerHTML='<strong>Negotiation round '+n.round+' of '+n.maxRounds+'</strong><div>Fighter priority: '+esc(negotiationPriority(state.fighters.find(f=>f.id===negotiatingId)))+'</div>';
 if(h)h.innerHTML=n.history.map(x=>'<div class="feed">'+esc(x)+'</div>').join('');
}
function counterOffer(f,o){
 const n=negotiationSession,priority=negotiationPriority(f),d=fighterDemand(f).target;
 const target=o.flat?d*1.35:d*1.38;
 const current=o.show+(o.flat?0:o.win*.42)+o.bonus/Math.max(1,o.fights);
 const gap=Math.max(0,target-current);
 const bump=Math.max(1000,roundMoney(gap*(n.round===1?.8:.55)));
 const c={...o};
 if(priority==='Shorter contract'){c.months=Math.max(6,Math.min(o.months,Math.round(o.months*.75)));c.show=roundMoney(Math.max(o.show+1000,o.show+bump*.65))}
 else if(priority==='Signing bonus'){c.bonus=roundMoney(o.bonus+Math.max(2000,gap*Math.max(1,o.fights)*.45));c.show=roundMoney(Math.max(o.show,d*.85))}
 else if(priority==='Win bonus'&&!o.flat){c.win=roundMoney(Math.max(o.win+1000,o.win+bump*1.7));c.show=roundMoney(Math.max(o.show,d*.9))}
 else{c.show=roundMoney(Math.max(o.show+1000,o.show+bump));if(!o.flat)c.win=roundMoney(Math.max(o.win,o.show*.65))}
 c.show=Math.min(10000000,c.show);c.win=Math.min(10000000,c.win);c.bonus=Math.min(100000000,c.bonus);
 return c;
}
function offerText(o){return money(o.show)+(o.flat?' guaranteed':' show / '+money(o.win)+' win')+', '+o.fights+' fights, '+o.months+' months, '+money(o.bonus)+' signing bonus'}
function setOfferFields(o){document.getElementById('offerStructure').value=o.flat?'flat':'showwin';for(const [k,id] of [['show','offerShow'],['win','offerWin'],['fights','offerFights'],['months','offerMonths'],['bonus','offerBonus']])document.getElementById(id).value=o[k];document.getElementById('winLabel').style.display=o.flat?'none':'';document.getElementById('showLabel').firstChild.textContent=o.flat?'Guaranteed purse per fight ($)':'Show purse per fight ($)';updateNegotiationPreview()}
function signNegotiatedContract(f,o){
 if(state.cash<o.bonus+o.show+releaseFee(f))return alert('Insufficient funds for the signing bonus and first purse.');
 const origin=f.promotion,fee=releaseFee(f);state.cash-=o.bonus+fee;
 if(f.status==='Amateur'){f.status='Professional';log(f.name+' turns professional after an amateur record of '+f.amateurWins+'-'+f.amateurLosses+'.')}
 f.promotion=state.player;f.scouted=Math.max(2,Number(f.scouted)||0);state.contracts=state.contracts.filter(c=>c.id!==f.id);
 state.contracts.push({id:f.id,show:o.show,win:o.win,structure:o.flat?'flat':'showwin',signing:o.bonus,fights:o.fights,weeks:Math.round(o.months*52/12),start:now(),origin});
 log(state.player+' signs '+f.name+' from '+origin+': '+offerText(o)+(fee?' · '+money(fee)+' release fee paid':''));
 const summary=f.name+': '+offerText(o)+' — ACCEPTED in round '+negotiationSession.round;
 state.offers.push(summary);save();negotiationClose();render();
 const box=document.createElement('div');box.className='negotiation-overlay';box.id='negotiationOverlay';
 box.innerHTML='<section class="negotiation-dialog" role="dialog" aria-modal="true"><h2 class="good">Contract agreed</h2><p>'+esc(f.name)+' has signed with '+esc(state.player)+'.</p><p>'+esc(offerText(o))+'</p><button class="primary" id="closeResult">Continue</button></section>';
 document.body.appendChild(box);document.getElementById('closeResult').onclick=negotiationClose;
}
function submitNegotiation(){
 const n=negotiationSession,f=state.fighters.find(x=>x.id===negotiatingId);if(!n||!f||f.promotion===state.player)return negotiationClose();
 const o=readOffer();if(!offerValid(o))return alert('Enter valid contract terms.');
 if(state.cash<o.bonus+o.show+releaseFee(f))return alert('Insufficient funds to cover the signing bonus and first purse.');
 n.history.push('Round '+n.round+' · Promotion offers: '+offerText(o));
 const assessment=offerAssessment(f,o),r=Math.random();
 if(r<assessment.odds){return signNegotiatedContract(f,o)}
 if(n.round>=n.maxRounds||r>assessment.odds+.72&&assessment.odds<.16){
  n.history.push('Fighter walks away: terms too far apart.');
  recordNegotiation('NEGOTIATIONS BROKE DOWN');log(f.name+' ends contract talks with '+state.player+'.');save();
  document.getElementById('offerResult').innerHTML='<div class="negotiation-result bad">Negotiations have broken down. Close this window to try again later.</div>';
  document.getElementById('submitOffer').disabled=true;renderNegotiationProgress();return;
 }
 n.counter=counterOffer(f,o);n.history.push('Fighter counters: '+offerText(n.counter));
 document.getElementById('offerResult').innerHTML='<div class="negotiation-result"><strong>Counteroffer received</strong><div>'+esc(offerText(n.counter))+'</div><div class="muted">You can accept these terms or make another offer.</div></div>';
 document.getElementById('submitOffer').disabled=true;document.getElementById('counterActions').style.display='flex';renderNegotiationProgress();
}
function acceptCounteroffer(){
 const n=negotiationSession,f=state.fighters.find(x=>x.id===negotiatingId);if(!n||!f||!n.counter)return;
 if(!offerValid(n.counter))return alert('Counteroffer is invalid.');
 signNegotiatedContract(f,n.counter);
}
function reviseCounteroffer(){
 const n=negotiationSession;if(!n||!n.counter)return;
 const counter=n.counter;n.history.push('Promotion chooses to revise the counteroffer.');n.counter=null;n.round++;
 setOfferFields(counter);document.getElementById('counterActions').style.display='none';document.getElementById('offerResult').innerHTML='';
 document.getElementById('submitOffer').disabled=false;renderNegotiationProgress();
}
