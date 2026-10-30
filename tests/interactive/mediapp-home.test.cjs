const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require(process.env.JSDOM_MODULE||'jsdom');
const root=__dirname+'/../../app/src/main/assets/';
function fixture(){
 const dom=new JSDOM('<main class="patient-shell patient-home-focus"><header class="mobile-top"><div class="brand-mini"><strong>MEDIapp</strong></div><button id="openNotifications"></button><button id="logout"></button><button id="headerMedi"></button></header><div id="content"><section class="daily-checkin-card">Check-in</section><div class="home-asl-line"><a href="https://example.invalid">ASL esempio</a></div><section class="local-health-news"><h2>Notizia dimostrativa</h2></section><section class="home-territory">Servizi</section><div id="mediModal"></div><div id="checkinModal"></div></div></main>',{runScripts:'outside-only'}),w=dom.window,actions=[];
 Object.assign(w,{state:{profile:{full_name:'Anna Esempio'},selectedCareDoctor:'doctor'},esc:s=>String(s||'').replace(/</g,'&lt;'),uiIcon:()=>'<svg viewBox="0 0 24 24"></svg>',patientView:()=>actions.push(w.state.tab)});
 w.eval(fs.readFileSync(root+'home-simple.js','utf8'));return {dom,w,actions};
}
test('MEDIapp home has three high-level actions and preserves archives, news, ASL and Medi',()=>{
 const {dom,w,actions}=fixture();const medi=w.document.getElementById('mediModal');
 w.organizeSimpleHome({centerName:'Centro dimostrativo',unreadCount:3,therapy:'Farmaco alle 20:00'});
 assert.equal(w.document.querySelectorAll('.mediapp-primary>button').length,3);
 assert.equal(w.document.querySelector('.daily-checkin-card'),null);
 assert.match(w.document.querySelector('.mediapp-primary').textContent,/Comunicazioni/);
 assert.match(w.document.querySelector('.mediapp-primary').textContent,/Farmaco alle 20:00/);
 assert.equal(w.document.querySelector('.mediapp-count').textContent,'3');
 assert.equal(w.document.getElementById('mediModal'),medi);
 for(const label of ['Diario vaccinazioni','Il mio diario','Questionari del medico','Referti e documenti'])assert.match(w.document.querySelector('.mediapp-secondary').textContent,new RegExp(label));
 assert.match(w.document.querySelector('.mediapp-info').textContent,/ASL esempio/);
 assert.match(w.document.querySelector('.mediapp-info').textContent,/Notizia dimostrativa/);
 w.document.querySelector('.mediapp-primary [data-go="chat"]').click();assert.equal(w.state.selectedChatPeer,'doctor');assert.deepEqual(actions,['chat']);
 w.organizeSimpleHome();assert.equal(w.document.querySelectorAll('.mediapp-primary').length,1);dom.window.close();
});
test('native release increments the build, preserves Firebase/package and does not auto-start triage',()=>{
 const live=fs.readFileSync(root+'live.js','utf8'),gradle=fs.readFileSync(__dirname+'/../../app/build.gradle','utf8');
 assert.match(gradle,/versionCode 85/);assert.match(gradle,/com.ciromaiello.meditaly/);
 assert.doesNotMatch(live,/if\(state.homeVoicePending\)void startPatientWelcome/);
 assert.match(live,/Sono Medi, il tuo assistente sanitario\./);
 assert.doesNotMatch(live,/data-accept="false">Rifiuta<\/button>/);
 const config=JSON.parse(fs.readFileSync(__dirname+'/../../app/google-services.json','utf8'));
 assert.equal(config.project_info.project_id,'meditaly-e3c9b');
});
