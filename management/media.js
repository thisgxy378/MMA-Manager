/* Mechanic 1.4.1: optional, deadline-based media enquiries. */
function mediaWorld(){if(!state.mediaWorld||typeof state.mediaWorld!=='object')state.mediaWorld={enquiries:[],stories:[]};return state.mediaWorld}
function mediaRegisterIncident(incident,f){
 if(!incident.public||incident.severity!=='Serious')return;
 const world=mediaWorld();
 if(world.stories.some(x=>x.incidentId===incident.id))return;
 if(incidentRandom('followup-roll-'+incident.id)>.18)return;
 world.stories.unshift({incidentId:incident.id,fighterId:f.id,followUpDate:addDays(state.date,3+Math.floor(incidentRandom('followup-delay-'+incident.id)*5)),followedUp:false});
 world.stories=world.stories.slice(0,100);
}
function mediaQuestionForIncident(incident,f){
 if(!state||f.promotion!==state.player||!incident.public||incident.severity!=='Serious')return;
 const world=mediaWorld(),key='media-'+incident.id;
 if(world.enquiries.some(q=>q.id===key))return;
 const deadline=addDays(state.date,2);
 const question={id:key,incidentId:incident.id,fighterId:f.id,created:state.date,deadline,status:'Pending',answer:null};
 world.enquiries.unshift(question);world.enquiries=world.enquiries.slice(0,100);
 sendInboxMessage({key,sender:'MMA Press',type:'Media Enquiry',subject:'Press enquiry: '+f.name+' training injury',body:'Journalists are requesting comment on reports that '+f.name+' was injured during training. You may respond before '+deadline+' or leave the enquiry unanswered. Your response may influence how the story develops.',mediaEnquiryId:key,actions:[{id:'media-support',label:'Support the fighter'},{id:'media-cautious',label:'Provide a cautious statement'},{id:'media-decline',label:'Decline to comment'}]});
}
function mediaAnswer(id,action){
 const q=mediaWorld().enquiries.find(x=>x.id===id);
 if(!q||q.status!=='Pending'||state.date>q.deadline)return false;
 const f=state.fighters.find(x=>x.id===q.fighterId);
 q.answer=action;q.status='Answered';q.resolved=state.date;
 if(f&&typeof changeFighterTrust==='function'){
   // Contextual hidden relationship impact; no numeric modifiers in the UI.
   const variation=incidentRandom('media-outcome-'+q.id);
   if(action==='media-support')changeFighterTrust(f,variation>.14?2:-1,variation>.14?3:-1,'Public support during injury');
   if(action==='media-cautious'&&variation>.75)changeFighterTrust(f,0,-1,'Cautious media statement');
 }
 const m=ensureInbox().find(x=>x.mediaEnquiryId===id);
 if(m){m.status='Answered';m.response=action==='media-support'?'You publicly expressed support for the fighter.':action==='media-cautious'?'You provided a cautious statement.':'You declined to comment.';m.actions=[];m.read=true}
 if(action!=='media-decline'&&f){
   const headline=q.organic?(action==='media-support'?'Promotion backs '+f.name+' amid reports':'Promotion addresses reports involving '+f.name):action==='media-support'?'Promotion backs '+f.name+' following injury reports':'Promotion comments on '+f.name+' injury reports';
   const body=q.organic?(action==='media-support'?'The promotion publicly expressed support for its fighter.':'The promotion offered a limited statement without confirming unverified claims.'):action==='media-support'?'The promotion expressed support for the fighter and emphasised recovery.':'The promotion acknowledged the reports without disclosing private medical details.';
   socialPost('News',headline,body,{key:'media-answer-'+id,promotion:state.player});
 }
 return true;
}
function mediaWorldTick(){
 if(!state)return;
 const world=mediaWorld();
 // Rare follow-up coverage, only for stories already publicly reported.
 for(const story of world.stories){
   if(story.followedUp||state.date<story.followUpDate)continue;
   story.followedUp=true;
   const f=state.fighters.find(x=>x.id===story.fighterId);
   if(!f)continue;
   const known=state.incidentWorld?.history?.find(x=>x.id===story.incidentId);
   if(!known||!known.public)continue;
   const clarified=incidentRandom('media-clarify-'+story.incidentId)>.38;
   socialPost('News',clarified?'Update on '+f.name+' training injury':'Questions remain over '+f.name+' training incident',clarified?'Further reporting suggests the incident was an accidental part of training. The fighter continues recovery.':'The circumstances of the training incident remain unclear. No additional verified details have emerged.',{key:'incident-followup-'+story.incidentId,promotion:f.promotion});
 }

 for(const q of mediaWorld().enquiries){
   if(q.status!=='Pending'||state.date<=q.deadline)continue;
   q.status='Expired';q.answer='No comment';q.resolved=state.date;
   const m=ensureInbox().find(x=>x.mediaEnquiryId===q.id);
   if(m){m.status='Expired';m.response='Deadline passed. No comment was issued.';m.actions=[]}
 }
}
const originalMediaInboxReply=respondInboxMessage;
respondInboxMessage=function(id,action){
 if(action&&action.startsWith('media-')){
   const m=ensureInbox().find(x=>x.id===id);
   if(!m||!m.mediaEnquiryId)return;
   if(!mediaAnswer(m.mediaEnquiryId,action)){alert('This media enquiry is no longer active.');return}
   save();render();return;
 }
 return originalMediaInboxReply(id,action);
};

function mediaCreateOrganicEnquiry(incident,a,b){
 const world=mediaWorld(),id='media-'+incident.id;
 if(world.enquiries.some(q=>q.id===id))return;
 const relevant=a.promotion===state.player?a:b;
 const days=incident.type==='Public callout'?1:3,deadline=addDays(state.date,days);
 world.enquiries.unshift({id,incidentId:incident.id,fighterId:relevant.id,created:state.date,deadline,status:'Pending',answer:null,organic:true});
 sendInboxMessage({key:id,sender:'MMA Press',type:'Media Enquiry',subject:'Media enquiry: '+a.name+' and '+b.name,body:'A journalist has requested your promotion’s comment about reports concerning '+a.name+' and '+b.name+'. Response deadline: '+deadline+'. You are not required to respond.',mediaEnquiryId:id,actions:[{id:'media-support',label:'Support the fighter'},{id:'media-cautious',label:'Provide a cautious statement'},{id:'media-decline',label:'Decline to comment'}]});
}
