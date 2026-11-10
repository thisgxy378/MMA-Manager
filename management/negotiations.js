
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
let negotiatingId=null;
function negotiationClose(){const el=document.getElementById('negotiationOverlay');if(el)el.remove();negotiatingId=null}
function negotiate(id){
 const f=state.fighters.find(x=>x.id===id);
 if(!f||!f.scouted||f.promotion===state.player)return;
 negotiatingId=id;
 const {band,target}=fighterDemand(f);
 const show=target,win=target,months=24,fights=4;
 const existing=document.getElementById('negotiationOverlay');if(existing)existing.remove();
 const overlay=document.createElement('div');overlay.id='negotiationOverlay';overlay.className='negotiation-overlay';overlay.setAttribute('role','presentation');
 overlay.innerHTML='<section class="negotiation-dialog" role="dialog" aria-modal="true" aria-labelledby="negotiationTitle"><div class="row"><div><h2 id="negotiationTitle">Contract negotiation</h2><p class="sub">'+esc(f.name)+' · '+esc(f.promotion)+' · '+esc(f.division)+'</p></div><button id="closeNegotiation" aria-label="Close negotiation">✕</button></div><div class="notice"><strong>'+esc(band.name)+'</strong><div>Illustrative UFC-inspired show purse band: '+money(band.min)+'–'+money(band.max)+' per fight.</div><div>Estimated fighter expectation: <strong>'+money(target)+'</strong> show purse (or comparable guarantee).</div></div><div class="negotiation-fields"><label>Contract structure<select id="offerStructure"><option value="showwin">Show purse + win bonus</option><option value="flat">Flat guaranteed purse</option></select></label><label id="showLabel">Show purse per fight ($)<input id="offerShow" type="number" min="1000" step="1000" value="'+show+'"></label><label id="winLabel">Win bonus ($)<input id="offerWin" type="number" min="0" step="1000" value="'+win+'"></label><label>Number of fights<input id="offerFights" type="number" min="1" max="8" value="'+fights+'"></label><label>Contract duration (months)<input id="offerMonths" type="number" min="6" max="48" value="'+months+'"></label><label>Signing bonus ($)<input id="offerBonus" type="number" min="0" step="1000" value="0"></label></div><div id="offerPreview" class="negotiation-summary"></div><div class="row"><span class="muted small">Estimated acceptance is a gameplay probability, not a guarantee.</span><div class="actions"><button id="cancelOffer">Cancel</button><button class="primary" id="submitOffer">Submit offer</button></div></div><div id="offerResult" aria-live="polite"></div></section>';
 document.body.appendChild(overlay);
 overlay.addEventListener('click',e=>{if(e.target===overlay)negotiationClose()});
 document.getElementById('closeNegotiation').onclick=negotiationClose;
 document.getElementById('cancelOffer').onclick=negotiationClose;
 document.querySelectorAll('#negotiationOverlay input,#offerStructure').forEach(el=>el.addEventListener('input',updateNegotiationPreview));
 document.getElementById('offerStructure').onchange=()=>{const flat=document.getElementById('offerStructure').value==='flat';document.getElementById('winLabel').style.display=flat?'none':'';document.getElementById('showLabel').firstChild.textContent=flat?'Guaranteed purse per fight ($)':'Show purse per fight ($)';updateNegotiationPreview()};
 document.getElementById('submitOffer').onclick=submitNegotiation;
 updateNegotiationPreview();
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
 const expected=demand*(o.flat?1.35:1.38);
 const ratio=base/expected;
 const reputation=(state.prestige-65)/150;
 const odds=Math.max(.04,Math.min(.96,.45+(ratio-1)*1.15+reputation+(o.months>=18?.06:0)));
 return {odds,expected};
}
function offerValid(o){
 return Number.isFinite(o.show)&&o.show>=1000&&o.show<=10000000&&Number.isFinite(o.win)&&o.win>=0&&o.win<=10000000&&Number.isInteger(o.fights)&&o.fights>=1&&o.fights<=8&&Number.isInteger(o.months)&&o.months>=6&&o.months<=48&&Number.isFinite(o.bonus)&&o.bonus>=0&&o.bonus<=100000000;
}
function updateNegotiationPreview(){
 const f=state.fighters.find(x=>x.id===negotiatingId),el=document.getElementById('offerPreview');if(!f||!el)return;
 const o=readOffer();if(!offerValid(o)){el.innerHTML='<span class="bad">Enter valid contract values (1–8 fights, 6–48 months).</span>';return}
 const a=offerAssessment(f,o),worst=o.fights*(o.show+o.win)+o.bonus;
 const probability=Math.round(a.odds*100);
 el.innerHTML='<div class="feed">Guaranteed per fight <strong>'+money(o.show)+'</strong></div><div class="feed">Potential winner purse <strong>'+money(o.show+o.win)+'</strong></div><div class="feed">Maximum total contract commitment <strong>'+money(worst)+'</strong></div><div class="feed">Signing bonus payable now <strong>'+money(o.bonus)+'</strong></div><div class="feed">Estimated acceptance probability <strong class="'+(probability>=60?'good':probability<30?'bad':'')+'">'+probability+'%</strong></div><div class="feed">Promotion available funds <strong>'+money(state.cash)+'</strong></div>';
}
function submitNegotiation(){
 const f=state.fighters.find(x=>x.id===negotiatingId);if(!f||f.promotion===state.player)return negotiationClose();
 const o=readOffer();if(!offerValid(o))return alert('Please enter valid contract terms.');
 if(state.cash<o.bonus+o.show)return alert('Insufficient funds to cover the signing bonus and first guaranteed purse.');
 const a=offerAssessment(f,o),accepted=Math.random()<a.odds,current=f.promotion;
 const detail=f.name+': '+money(o.show)+' '+(o.flat?'guaranteed':'show')+' / '+money(o.win)+' win, '+o.fights+' fights, '+o.months+' months, '+money(o.bonus)+' signing bonus — '+(accepted?'ACCEPTED':'DECLINED');
 state.offers.push(detail);
 if(accepted){
  state.cash-=o.bonus;
  if(f.status==='Amateur'){f.status='Professional';log(f.name+' turns professional after an amateur record of '+f.amateurWins+'-'+f.amateurLosses+'.')}
  f.promotion=state.player;
  state.contracts=state.contracts.filter(c=>c.id!==f.id);
  state.contracts.push({id:f.id,show:o.show,win:o.win,structure:o.flat?'flat':'showwin',signing:o.bonus,fights:o.fights,weeks:Math.round(o.months*52/12),start:now(),origin:current});
  log(state.player+' signs '+f.name+' from '+current+': '+o.fights+'-fight '+(o.flat?'guaranteed':'show/win')+' agreement.');
 }else log(f.name+' rejects '+state.player+"'s contract offer.");
 save();negotiationClose();render();
 const box=document.createElement('div');box.className='negotiation-overlay';box.id='negotiationOverlay';
 box.innerHTML='<section class="negotiation-dialog" role="dialog" aria-modal="true"><h2 class="'+(accepted?'good':'bad')+'">'+(accepted?'Offer accepted':'Offer declined')+'</h2><p>'+esc(f.name)+(accepted?' has signed with '+esc(state.player)+'.':' has declined the proposed contract. You can revise your offer and try again.')+'</p><p class="muted">'+esc(detail)+'</p><button class="primary" id="closeResult">Continue</button></section>';
 document.body.appendChild(box);document.getElementById('closeResult').onclick=negotiationClose;
}
