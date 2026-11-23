/* Mechanic 1.4.1 — organic relationships, incidents and public reactions.
   All rolls are stable per career date and incident; no private scouting data is published. */
function narrativeWorld(){if(!state.narrativeWorld)state.narrativeWorld={incidents:[],lastPair:{},lastPromotion:{}};return state.narrativeWorld}
function narrativeRoll(key){return socialHash('narrative|'+key)}
function narrativePairs(){
 const fighters=state.fighters.filter(f=>f.status!=='Retired'&&f.status!=='Amateur'&&f.promotion!=='Free Agent');
 if(fighters.length<2)return null;
 const a=fighters[Math.floor(narrativeRoll('a|'+state.date)*fighters.length)];
 const peers=fighters.filter(f=>f.id!==a.id&&((f.gym&&a.gym&&(f.gym.name||f.gym)===(a.gym.name||a.gym))||f.promotion===a.promotion));
 if(!peers.length)return null;
 const b=peers[Math.floor(narrativeRoll('b|'+state.date+'|'+a.id)*peers.length)];
 return [a,b];
}
function narrativeIncidentTick(){
 if(!state||narrativeRoll('chance|'+state.date)>.025)return;
 const pair=narrativePairs();if(!pair)return;
 const [a,b]=pair,world=narrativeWorld(),key=fighterPairKey(a,b);
 if(world.lastPair[key]&&addDays(world.lastPair[key],100)>state.date)return;
 const roll=narrativeRoll('kind|'+state.date+'|'+key);
 const kind=roll<.22?'Gym disagreement':roll<.42?'Training partnership':roll<.59?'Public callout':roll<.73?'Reconciliation':roll<.86?'Sparring rumour':roll<.94?'Gym falling-out':'Misreported allegation';
 if(kind==='Reconciliation'&&fighterRelationship(a,b)>=55&&fighterRelationship(b,a)>=55)return;
 world.lastPair[key]=state.date;
 const incident={id:'organic-'+state.date+'-'+key,date:state.date,type:kind,aId:a.id,bId:b.id,truth:roll,public:false};
 world.incidents.unshift(incident);world.incidents=world.incidents.slice(0,120);
 const negative=['Gym disagreement','Gym falling-out','Public callout','Sparring rumour','Misreported allegation'].includes(kind);
 const magnitude=kind==='Gym falling-out'?8:kind==='Reconciliation'?6:kind==='Training partnership'?3:4;
 changeFighterRelationship(a,b,negative?-magnitude:magnitude,kind,false);
 if(narrativeRoll('reciprocal|'+incident.id)>.22)changeFighterRelationship(b,a,negative?-Math.ceil(magnitude*.7):Math.ceil(magnitude*.7),kind,false);
 const publicity=kind==='Public callout'||(Number(a.popularity||0)+Number(b.popularity||0)>140&&narrativeRoll('press|'+incident.id)>.72);
 if(!publicity)return;
 incident.public=true;
 if(kind==='Public callout'){
   const challenge=narrativeRoll('serious|'+incident.id)>.36;
   incident.serious=challenge;
   socialPost('Fighter',a.name+' calls out '+b.name,challenge?'I want that matchup. Let us see if we can make it happen.':'That matchup would get people talking. Fans know what they want.',{key:incident.id,promotion:a.promotion});
   if(typeof increaseRivalry==='function'&&narrativeRoll('rivalry|'+incident.id)>.45)increaseRivalry(a,b,3,'Public challenge');
 }else{
   const title=kind==='Sparring rumour'?'Unverified sparring rumours involving '+a.name+' and '+b.name:kind==='Misreported allegation'?'Disputed allegation involving '+a.name+' and '+b.name:a.name+' and '+b.name+' attract attention following gym tensions';
   const body=kind==='Sparring rumour'?'Unverified gym accounts are circulating. No reliable details have been established.':kind==='Misreported allegation'?'A circulating allegation has not been independently verified. The report may be inaccurate.':'Reports suggest a disagreement between the fighters. Neither side has provided a complete account.';
   socialPost('News',title,body,{key:incident.id,promotion:a.promotion});
 }
 if(kind==='Misreported allegation'&&typeof narrativeCorrectionQueue==='function')narrativeCorrectionQueue(incident,a,b);
 if(a.promotion===state.player||b.promotion===state.player){
   if(narrativeRoll('enquiry|'+incident.id)>.55&&typeof mediaCreateOrganicEnquiry==='function')mediaCreateOrganicEnquiry(incident,a,b);
 }
}
function narrativeFailedNegotiation(f,reason){
 if(!state||!f||!reason)return;
 const world=narrativeWorld(),key='negotiation|'+state.date+'|'+f.id;
 if(world.lastPromotion[key])return;
 world.lastPromotion[key]=true;
 const fame=Number(f.popularity||50),frustration=reason==='lowball'?0.13:0;
 if(narrativeRoll(key)>.025+fame/2500+frustration)return;
 socialPost('Fighter',f.name+' comments on contract discussions','Talks have not worked out so far. I am focused on finding the right opportunity.',{key,promotion:f.promotion});
}

function narrativeCorrectionQueue(incident,a,b){
 const world=narrativeWorld();
 world.corrections=world.corrections||[];
 world.corrections.push({incidentId:incident.id,aId:a.id,bId:b.id,due:addDays(state.date,2+Math.floor(narrativeRoll('correction-delay-'+incident.id)*4)),done:false});
}
function narrativeFollowupTick(){
 const world=narrativeWorld();
 for(const item of world.corrections||[]){
  if(item.done||state.date<item.due)continue;
  item.done=true;
  const a=state.fighters.find(f=>f.id===item.aId),b=state.fighters.find(f=>f.id===item.bId);
  if(!a||!b)continue;
  const accurate=narrativeRoll('correction-truth-'+item.incidentId)>.22;
  socialPost('News',accurate?'Correction issued concerning '+a.name+' and '+b.name:'Reporting remains disputed concerning '+a.name+' and '+b.name,accurate?'The original allegation was inaccurate. Updated reporting has corrected the account.':'Journalists have been unable to substantiate the allegation. The parties dispute the claims.',{key:'correction-'+item.incidentId,promotion:a.promotion});
  if(accurate){changeFighterRelationship(a,b,3,'Correction of inaccurate report',false);changeFighterRelationship(b,a,2,'Correction of inaccurate report',false)}
 }
 world.corrections=(world.corrections||[]).filter(x=>!x.done||addDays(x.due,30)>state.date).slice(-100);
}
