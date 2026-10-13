// Run only in an isolated test client with a linked, active SYNTHETIC session.
// Obtain credentials via that client's authenticated Supabase SDK, never paste
// permanent Cloudflare keys here. This probes TURN data relay, not audio/video
// or Android push, and never returns/logs ICE credentials, SDP or IP addresses.
async function probeMeditalyRelay(testClient) {
 const {data,error}=await testClient.functions.invoke('voice-call',{body:{action:'config'}});
 if(error||!data?.iceServers?.length)throw new Error('Authenticated TURN credential request failed');
 const peers=[new RTCPeerConnection({iceServers:data.iceServers,iceTransportPolicy:'relay'}),new RTCPeerConnection({iceServers:data.iceServers,iceTransportPolicy:'relay'})];
 const pending=[[],[]];
 let timer;
 try {
  for(let i=0;i<2;i++)peers[i].onicecandidate=event=>{
   if(!event.candidate)return;
   const other=1-i;
   if(peers[other].remoteDescription)peers[other].addIceCandidate(event.candidate).catch(()=>{});
   else pending[other].push(event.candidate);
  };
  const received=new Promise(resolve=>{peers[1].ondatachannel=event=>{event.channel.onmessage=message=>{if(message.data==='meditaly-synthetic-relay-probe')resolve();};};});
  const channel=peers[0].createDataChannel('synthetic-relay-probe');
  const opened=new Promise(resolve=>{channel.onopen=resolve;});
  await peers[0].setLocalDescription(await peers[0].createOffer());
  await peers[1].setRemoteDescription(peers[0].localDescription);
  for(const candidate of pending[1].splice(0))await peers[1].addIceCandidate(candidate);
  await peers[1].setLocalDescription(await peers[1].createAnswer());
  await peers[0].setRemoteDescription(peers[1].localDescription);
  for(const candidate of pending[0].splice(0))await peers[0].addIceCandidate(candidate);
  await Promise.race([opened.then(()=>{channel.send('meditaly-synthetic-relay-probe');return received;}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('TURN relay probe timeout')),25000);})]);
  const stats=await peers[0].getStats();
  const transport=[...stats.values()].find(row=>row.type==='transport'&&row.selectedCandidatePairId);
  const pair=transport&&stats.get(transport.selectedCandidatePairId);
  const local=pair&&stats.get(pair.localCandidateId),remote=pair&&stats.get(pair.remoteCandidateId);
  if(local?.candidateType!=='relay'||remote?.candidateType!=='relay')throw new Error('Relay candidate pair not confirmed');
  return {relay:true,syntheticDataReceived:true};
 } finally {clearTimeout(timer);for(const peer of peers){peer.onicecandidate=null;peer.close();}}
}
