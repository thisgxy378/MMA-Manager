/* Mechanic 1.4.1: persistent world incidents and private training injuries.
   This module intentionally does not expose private medical information to the social feed. */
function incidentWorld(){if(!state.incidentWorld||typeof state.incidentWorld!=='object')state.incidentWorld={history:[],lastIncident:{}};return state.incidentWorld}
function incidentRandom(seed){return typeof socialHash==='function'?socialHash(seed):0.5}
function incidentMedical(f){return f.trainingInjury&&f.trainingInjury.until>state.date?f.trainingInjury:null}
function incidentWorldTick(){
 if(!state||!Array.isArray(state.fighters))return;
 const world=incidentWorld(),active=state.fighters.filter(f=>f.status!=='Retired'&&f.status!=='Amateur'&&f.promotion!=='Free Agent');
 for(const f of active){if(f.trainingInjury&&f.trainingInjury.until<=state.date){if(f.unavailableUntil===f.trainingInjury.until)f.unavailableUntil=null;f.trainingInjury=null}}
 // Daily world-scale incidence is intentionally low and bounded.
 if(incidentRandom('incident-day-'+state.date)>.035||!active.length)return;
 const f=active[Math.floor(incidentRandom('injured-'+state.date)*active.length)];
 if(!f||incidentMedical(f)||world.lastIncident[f.id]&&addDays(world.lastIncident[f.id],70)>state.date)return;
 const severe=incidentRandom('severity-'+state.date)>.90;
 const duration=severe?45+Math.floor(incidentRandom('recovery-'+state.date)*65):4+Math.floor(incidentRandom('recovery-'+state.date)*12);
 const type=['hand','shoulder','knee','rib'][Math.floor(incidentRandom('type-'+state.date)*4)];
 const until=addDays(state.date,duration),privateInfo=incidentRandom('privacy-'+state.date)>.27;
 const concealed=!severe&&privateInfo&&incidentRandom('conceal-'+state.date)>.84;
 const sameGym=active.filter(x=>x.id!==f.id&&x.promotion===f.promotion&&x.gym&&f.gym&&(x.gym.name||x.gym)===(f.gym.name||f.gym));
 const involved=sameGym.length&&incidentRandom('partner-'+state.date)>.77?sameGym[Math.floor(incidentRandom('partnerpick-'+state.date)*sameGym.length)]:null;
 f.trainingInjury={type,severity:severe?'Serious':'Minor',since:state.date,until,private:privateInfo,concealed,partnerId:involved?.id||null};
 world.lastIncident[f.id]=state.date;
 const incident={id:'training-'+state.date+'-'+f.id,date:state.date,fighterId:f.id,partnerId:involved?.id||null,type:'Training injury',severity:f.trainingInjury.severity,public:!privateInfo};
 world.history.unshift(incident);world.history=world.history.slice(0,150);
 if(!privateInfo&&typeof mediaQuestionForIncident==='function')mediaQuestionForIncident(incident,f);
 if(!privateInfo&&typeof mediaRegisterIncident==='function')mediaRegisterIncident(incident,f);
 // Training partners can interpret the same incident differently.
 if(involved&&typeof changeFighterRelationship==='function'){
   const seed='training-reaction-'+incident.id;
   const reaction=incidentRandom(seed);
   if(reaction>.72){
     changeFighterRelationship(f,involved,severe?-12:-5,'Training incident',false);
     if(incidentRandom(seed+'-reverse')>.55)changeFighterRelationship(involved,f,-3,'Training incident',false);
   }else if(reaction<.18){
     changeFighterRelationship(f,involved,2,'Support after training injury',false);
     changeFighterRelationship(involved,f,2,'Support after training injury',false);
   }
 }
 if(severe){f.unavailableUntil=(!f.unavailableUntil||f.unavailableUntil<until)?until:f.unavailableUntil;
   const affected=(state.events||[]).filter(e=>!e.done&&eventDate(e)>=state.date&&eventDate(e)<until&&(e.bouts||[]).some(b=>b.aid===f.id||b.bid===f.id));
   for(const e of affected){
     e.injuryWithdrawals=e.injuryWithdrawals||[];
     if(!e.injuryWithdrawals.some(x=>x.fighterId===f.id))e.injuryWithdrawals.push({fighterId:f.id,date:state.date,until,resolved:false});
     if(typeof socialPost==='function'&&incidentRandom('volunteer-'+incident.id+'-'+e.id)>.58){
       const bout=(e.bouts||[]).find(b=>b.aid===f.id||b.bid===f.id);
       const remaining=state.fighters.find(x=>x.id===(bout?.aid===f.id?bout?.bid:bout?.aid));
       const candidates=active.filter(x=>x.id!==f.id&&x.id!==remaining?.id&&x.promotion===f.promotion&&x.division===remaining?.division&&x.gender===remaining?.gender&&!x.unavailableUntil&&!x.trainingInjury&&!(e.bouts||[]).some(b=>b.aid===x.id||b.bid===x.id));
       if(candidates.length){const volunteer=candidates[Math.floor(incidentRandom('volunteer-choice-'+incident.id)*candidates.length)];
         const statements=['I am training and ready if the promotion needs someone to step in.','If there is an opening, I would consider the opportunity.','I have been preparing. Give me the call and we can talk.'];
         const statement=statements[Math.floor(incidentRandom('volunteer-tone-'+incident.id)*statements.length)];
         socialPost('Fighter',volunteer.name+' discusses short-notice opportunity',statement,{key:'volunteer-'+incident.id+'-'+volunteer.id,promotion:volunteer.promotion});
       }
     }
     if(f.promotion===state.player)sendInboxMessage({key:'injury-withdrawal-'+e.id+'-'+f.id,sender:'Medical Team',type:'Action Required',subject:'Fight withdrawal: '+f.name,body:f.name+' is medically unavailable until approximately '+until+'. The scheduled bout on '+eventDate(e)+' requires a replacement, rescheduling, or cancellation. Open Events to resolve the booking.'});
   }
 }
 // Only known or leaked details can enter public news. Concealment does not override medical restrictions.
 const leaked=privateInfo&&incidentRandom('leak-'+state.date)>.92;
 if(!privateInfo||leaked){
   const headline=leaked?'Training camp injury rumours emerge concerning '+f.name:f.name+' reportedly injured during training';
   const body=leaked?'Unconfirmed reports suggest '+f.name+' may be dealing with an injury. The extent has not been verified.':f.name+' has reportedly suffered a '+(severe?'significant':'minor')+' training injury.'+(involved?' '+involved.name+' was reportedly involved in the session.':'');
   if(typeof socialPost==='function')socialPost('News',headline,body,{key:'incident-'+incident.id,promotion:f.promotion});
 }
 if(severe&&f.promotion===state.player&&!concealed&&!(state.events||[]).some(e=>!e.done&&(e.bouts||[]).some(b=>b.aid===f.id||b.bid===f.id))){
   sendInboxMessage({key:'injury-update-'+incident.id,sender:'Medical Team',type:'Information',subject:'Training injury: '+f.name,body:f.name+' is medically unavailable until approximately '+until+'. No scheduled fight requires action.'});
 }
}
