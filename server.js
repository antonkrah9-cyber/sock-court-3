const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const J=JSON.stringify,rooms={},shuffle=a=>[...a].sort(()=>Math.random()-.5),rnd=a=>a[Math.random()*a.length|0],find=(R,id)=>R.players.find(p=>p.id==id);
const ROLES=['judge','pros','def','witness','journalist','victim','bailiff'],str=(v,n)=>String(v||'').trim().replace(/[<>]/g,'').slice(0,n);
const PRO=['Крошки на месте|Крошки от торта нашли ровно там, где стоял обвиняемый.','Свидетель с кухни|Свидетель клянётся, что слышал хруст глубокой ночью.','Липкие пальцы|Отпечатки пальцев сладкие и подозрительно знакомые.','Выдал смех|Обвиняемый хихикал при слове «десерт».','Алиби позже|Алиби появилось только после допроса.','Запись с камеры|Камера в коридоре показывает тень подозрительной формы.','Чат против него|В чате он написал «ничего не знаю» слишком быстро.','Чужие тапки|Тапки обвиняемого нашли рядом с местом событий.','Запах вины|Свидетели отметили странный запах уверенности.','Нервный глоток|Он выпил воды ровно перед допросом.','Тайный список|У него нашли список «что можно взять без спроса».','Лёгкий холодильник|Холодильник стал легче ровно на одну порцию.','Версия плывёт|Его рассказ каждый раз звучит по-новому.','Блеск в глазах|Глаза блестели, когда заговорили про это.','Старый рецидив|В прошлом году его уже замечали у холодильника.','Подозрительный зевок|Он зевнул ровно в момент оглашения обвинения.','Забытая обёртка|Обёртка с его инициалами нашлась в кармане.','Громкое молчание|На прямой вопрос он молчал целых три секунды.','Слишком чистая тарелка|Тарелка вымыта до блеска, будто что-то скрывают.','Показания кота|Кот отказался смотреть обвиняемому в глаза.'];
const DEF=['Я был в другом месте|Ровно в это время я стоял в очереди за хлебом.','Это сквозняк|Сквозняк виноват во всём, он в доме давно.','Клевета соседа|У соседа на меня зуб со времён шашлыков.','Справка от бабушки|Бабушка подтвердит: я хороший человек.','Отпечатки подбросили|Любой мог обнять меня за руку.','Я спал|Свидетели храпа подтвердят мой сон.','Правая рука не знала|Правая рука не в курсе, что делала левая.','Видео размытое|На записи пятно, может, это просто тень.','Кот не свидетель|Кот давно лжёт в других делах.','Это была диета|Я проверял, не пуст ли холодильник, из заботы.','Аллергия|Я такое не ем, у меня аллергия на обвинения.','Пятно кетчупа|Это был не торт, а кетчуп, и он не мой.','Слишком очевидно|Будь я виноват, я бы лучше спрятался.','Алиби от соседа|Сосед видел меня у окна целых десять минут.','Я исправился|Я каялся в прошлом году, значит, всё в порядке.','Сложный период|У меня непростое время, и вообще настроение.','Подставили!|Меня подставил тот, кто громче всех кричит.','Свидетель врёт|Он путает числа, дни недели и своего кота.','Совпадение|Совпадения случаются, а вот суды лишь иногда.','Я просто спросил|Я только спросил, где торт, а виноватым оказался сам.'];
const CRIMES=['Съел последний кусок пиццы','Не вернул зарядку','Прочитал сообщение и не ответил','Пересолил общий ужин','Забыл про день рождения','Рассказал спойлер к сериалу','Занял чужое место в машине','Выпил чужой кофе','Опоздал на сорок минут','Взял чужой наушник','Включил музыку в три часа ночи','Рассказал секрет в чате'];
const POOL={pros:PRO.map((s,i)=>{const[t,d]=s.split('|');return{id:'p'+i,t,d}}),def:DEF.map((s,i)=>{const[t,d]=s.split('|');return{id:'d'+i,t,d}})};
const all=(R,m)=>R.players.forEach(p=>p.on&&p.ws.readyState==1&&p.ws.send(J(m)));
const rl=(p,k,ms)=>{if(Date.now()-(p[k]||0)<ms)return true;p[k]=Date.now()},fined=p=>(p.pen||0)>Date.now();
const cands=R=>R.players.filter(q=>q.id!=R.roles.judge&&q.id!=R.roles.pros);
function send(R){for(const p of R.players)if(p.on&&p.ws.readyState==1)p.ws.send(J({t:'s',s:{code:R.code,host:R.host,phase:R.phase,round:R.round,
 players:R.players.map(q=>({id:q.id,name:q.name,hero:q.hero,on:q.on,pen:Math.max(0,(q.pen||0)-Date.now())})),roles:R.roles,case:R.case,lamp:R.lamp,proj:R.proj,log:R.log,news:R.news,opts:R.opts,ready:R.ready,
 ms:R.lamp=='none'?0:Math.max(0,(R.lampEnd||0)-Date.now()),sopts:R.roles.judge==p.id?R.sopts:null,hasOpts:!!R.sopts,sentence:R.sentence,verdict:R.verdict,
 wrote:R.wrote.length,iWrote:R.wrote.includes(p.id),left:R.cases.length,
 prepMs:R.phase=='prep'?Math.max(0,R.prepEnd-Date.now()):0,charge:R.phase=='prep'?null:R.charge,acc:R.phase=='prep'?null:R.accused,picked:Object.keys(R.picks),hasCharge:!!R.charge,
 hand:R.hands[p.id]||[],pcard:R.pcard,me:p.id}}))}
function trial(R){const n=R.players.length,seq=R.opts.assign=='random'?shuffle(R.players):R.players.map((_,i)=>R.players[(R.round+i)%n]);R.roles={};
 ROLES.filter(r=>({witness:R.opts.wit,journalist:R.opts.jour,bailiff:R.opts.bail})[r]!==0).forEach((r,i)=>{if(i<n)R.roles[r]=seq[i].id});
 Object.assign(R,{case:R.cases.pop(),lamp:'none',proj:null,photo:null,log:[],news:[],verdict:null,sopts:null,sentence:null,lampEnd:0,charge:null,accused:null,picks:{},pcard:null,phase:'prep',prepEnd:Date.now()+45000});
 R.players.forEach(p=>p.pen=0);R.hands={[R.roles.pros]:shuffle(POOL.pros).slice(0,10),[R.roles.def]:shuffle(POOL.def).slice(0,10)};
 all(R,{t:'ev',photo:null});clearTimeout(R.tm);R.tm=setTimeout(()=>{finishPrep(R)},45000)}
function finishPrep(R){if(R.phase!='prep')return;clearTimeout(R.tm);
 if(!R.charge)R.charge={who:rnd(cands(R)).id,text:rnd(CRIMES)};
 for(const k of['pros','def']){const id=R.roles[k];if(!R.picks[id])R.picks[id]=R.hands[id].slice(0,5).map(c=>c.id)}
 for(const id in R.picks)R.hands[id]=R.hands[id].filter(c=>R.picks[id].includes(c.id));
 R.accused=R.charge.who;R.phase='charge';send(R);R.tm=setTimeout(()=>{if(R.phase=='charge'){R.phase='trial';send(R)}},4000)}
const chk=R=>{if(R.charge&&R.picks[R.roles.pros]&&R.picks[R.roles.def])finishPrep(R)};
function go(R){R.cases=shuffle(R.pending);R.round=0;trial(R)}
const H={
 opts(R,p,m){if(R.host!=p.id||R.phase!='lobby')return;const o=m.o||{},c=R.opts,pk=(k,a)=>{if(a.includes(o[k]))c[k]=o[k]};if(+o.max>=3)c.max=Math.max(R.players.length,Math.min(9,+o.max|0));pk('theme',['plain','royal','space']);pk('mode',['classic','compose','live']);pk('assign',['circle','random']);['wit','jour','bail'].forEach(k=>{if(k in o)c[k]=o[k]?1:0});if([0,30,60].includes(+o.speech))c.speech=+o.speech},
 ready(R,p){if(R.phase!='lobby'||R.host==p.id)return;const i=R.ready.indexOf(p.id);if(i<0)R.ready.push(p.id);else R.ready.splice(i,1)},
 face(R,p,m){const im=typeof m.img=='string'&&m.img.startsWith('data:image/')&&m.img.length<60000?m.img:null;if(!rl(p,'lf',800)){p.face=im;all(R,{t:'face',id:p.id,img:im})}},
 hero(R,p,m){const i=+m.i;if(i>=0&&i<7&&!R.players.some(q=>q!=p&&q.hero==i))p.hero=i},
 begin(R,p){if(R.host==p.id&&R.phase=='lobby'&&R.players.length>=3&&R.players.every(q=>q.id==R.host||R.ready.includes(q.id))){R.phase='write';R.pending=[];R.sents=[];R.wrote=[]}},
 case(R,p,m){const t=str(m.text,220);if(R.phase!='write'||R.wrote.includes(p.id)||t.length<3)return;R.pending.push(t);{const sn=str(m.sent,100);if(sn.length>=3)R.sents.push(sn)}R.wrote.push(p.id);if(R.wrote.length>=R.players.length)go(R)},
 startnow(R,p){if(R.host==p.id&&R.phase=='write'&&R.pending.length)go(R)},
 charge(R,p,m){if(R.phase!='prep'||R.roles.pros!=p.id||R.charge)return;const t=str(m.text,70),w=cands(R).find(q=>q.id==m.who);if(t.length<3||!w)return;R.charge={who:w.id,text:t};chk(R)},
 pick5(R,p,m){if(R.phase!='prep'||![R.roles.pros,R.roles.def].includes(p.id)||R.picks[p.id])return;const h=R.hands[p.id].map(c=>c.id),ids=[...new Set(Array.isArray(m.ids)?m.ids:[])];if(ids.length!=5||!ids.every(i=>h.includes(i)))return;R.picks[p.id]=ids;chk(R)},
 skip(R,p){if(R.host==p.id&&R.phase=='prep')finishPrep(R)},
 lamp(R,p,m){if(R.phase=='trial'&&R.roles.judge==p.id&&['pros','def','witness','none'].includes(m.v)){R.lamp=m.v;R.lampEnd=Date.now()+R.opts.speech*1000}},
 play(R,p,m){if(R.phase!='trial'||R.pcard||fined(p))return;const side=R.roles.pros==p.id?'pros':R.roles.def==p.id?'def':null;if(!side||R.lamp!=side)return;
  const h=R.hands[p.id]||[],i=h.findIndex(c=>c.id==m.id);if(i<0)return;const c=h.splice(i,1)[0];R.pcard={...c,side,by:p.id};
  R.proj={id:Date.now(),side,what:c.t,when:'',where:'',who:'',card:c.d,lies:0};R.photo=null;all(R,{t:'ev',id:R.proj.id,photo:null})},
 rule(R,p,m){if(R.phase!='trial'||!R.pcard||R.roles.judge!=p.id)return;const c=R.pcard;R.pcard=null;R.log.push({side:c.side,text:c.t+(m.ok?' ✓':' ✗')});all(R,{t:'fx',kind:m.ok?'yes':'no'})},
 say(R,p,m){const t=str(m.text,40);if(t&&!fined(p)&&!rl(p,'ls',700))all(R,{t:'say',by:p.id,text:t})},
 stmt(R,p,m){if(R.phase!='trial'||R.lamp=='none'||R.roles[R.lamp]!=p.id||fined(p))return;
  const ph=typeof m.photo=='string'&&m.photo.startsWith('data:image/')&&m.photo.length<500000?m.photo:null;
  R.proj={id:Date.now(),side:R.lamp,when:str(m.when,80),where:str(m.where,80),what:str(m.what,200),who:str(m.who,80),lies:0};
  R.photo=ph;R.log.push({side:R.lamp,text:[R.proj.when,R.proj.where,R.proj.what].filter(Boolean).join(' · ')});all(R,{t:'ev',id:R.proj.id,photo:ph})},
 lie(R,p){if(R.phase=='trial'&&R.proj&&!fined(p)&&!rl(p,'ll',2000)){R.proj.lies++;all(R,{t:'lie',by:p.id})}},
 obj(R,p){if(R.phase=='trial'&&(R.roles.pros==p.id||R.roles.def==p.id||R.accused==p.id)&&!fined(p)&&!rl(p,'lo',3000))all(R,{t:'obj',by:p.id})},
 news(R,p,m){const t=str(m.text,100),im=typeof m.img=='string'&&m.img.startsWith('data:image/')&&m.img.length<400000?m.img:null;
  if(R.phase!='trial'||R.roles.journalist!=p.id||fined(p)||(!t&&!im)||R.news.length>=3)return;R.news.push(t||'Рисунок');R.log.push({side:'news',text:t||'Рисунок'});
  if(im){R.proj={id:Date.now(),side:'news',what:t,when:'',where:'',who:'',lies:0};R.photo=im;all(R,{t:'ev',id:R.proj.id,photo:im})}all(R,{t:'news',text:t||'Новый рисунок'})},
 hush(R,p){if(R.phase=='trial'&&(R.roles.judge==p.id||R.roles.bailiff==p.id)&&!rl(p,'lh',4000))all(R,{t:'hush'})},
 fine(R,p,m){const q=find(R,m.to);if(R.phase=='trial'&&R.roles.judge==p.id&&q&&q!=p){q.pen=Date.now()+30000;all(R,{t:'fine',to:q.id})}},
 paper(R,p,m){if(R.phase=='trial'&&R.roles.judge!=p.id&&find(R,m.to)&&m.to!=p.id&&!fined(p)&&!rl(p,'lp',2500))all(R,{t:'paper',by:p.id,to:m.to})},
 pet(R,p){if(!rl(p,'lt',1000))all(R,{t:'pet',by:p.id})},
 pick(R,p,m){const o=R.sopts,s=o&&o[+m.i];if(R.phase=='verdict'&&R.roles.judge==p.id&&s){R.sentence=s;R.sents.splice(R.sents.indexOf(s),1);R.sopts=null}},
 verdict(R,p,m){if(R.phase=='trial'&&R.roles.judge==p.id){R.verdict={guilty:!!m.g};R.phase='verdict';R.lamp='none';R.sopts=m.g&&R.sents.length?shuffle(R.sents).slice(0,3):null}},
 clear(R,p){if(R.host==p.id){R.proj=null;R.photo=null;all(R,{t:'ev',photo:null})}},
 next(R,p){if(R.host!=p.id||!['prep','charge','trial','verdict'].includes(R.phase))return;clearTimeout(R.tm);R.round++;if(R.cases.length)trial(R);else R.phase='end'},
 again(R,p){if(R.host==p.id&&R.phase=='end'){R.phase='lobby';R.roles={};R.proj=null;R.ready=[]}}
};
const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});fs.createReadStream(path.join(__dirname,'public','index.html')).pipe(r)});
new WebSocketServer({server:srv,maxPayload:1e6}).on('connection',ws=>{let R,me;const bad=e=>ws.send(J({t:'err',e}));
 ws.on('message',raw=>{let m;try{m=JSON.parse(raw)}catch{return}
  if(m.t=='join'){const code=String(m.room||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5),id=str(m.id,40);if(!id||!code)return;
   let r=rooms[code];if(!r){if(!m.create)return bad('Комната не найдена. Попроси друга прислать ссылку заново');
    r=rooms[code]={code,players:[],host:id,phase:'lobby',round:0,roles:{},pending:[],cases:[],wrote:[],lamp:'none',log:[],news:[],sents:[],lampEnd:0,ready:[],picks:{},hands:{},pcard:null,
     opts:{max:9,theme:'plain',mode:'classic',assign:'circle',wit:1,jour:1,bail:1,speech:60}}}
   let p=find(r,id);
   if(p){p.ws=ws;p.on=true}else{if(r.phase!='lobby')return bad('Игра уже идёт');if(r.players.length>=r.opts.max)return bad('Комната заполнена');
    if(!r.players.length)r.host=id;
    p={id,ws,on:true,name:str(m.name,14)||'Игрок',hero:[0,1,2,3,4,5,6].find(i=>!r.players.some(q=>q.hero==i))};r.players.push(p)}
   R=r;me=p;send(R);R.players.forEach(q=>q.face&&ws.send(J({t:'face',id:q.id,img:q.face})));if(R.proj&&R.photo)ws.send(J({t:'ev',id:R.proj.id,photo:R.photo}));return}
  if(R&&H[m.t]){H[m.t](R,me,m);send(R)}});
 ws.on('close',()=>{if(!R||me.ws!==ws)return;me.on=false;
  if(R.phase=='lobby')R.players=R.players.filter(p=>p!=me);
  if(R.host==me.id){const h=R.players.find(p=>p.on);if(h)R.host=h.id}
  if(!R.players.some(p=>p.on)){const c=R;setTimeout(()=>{if(!c.players.some(p=>p.on)){clearTimeout(c.tm);delete rooms[c.code]}},6e5)}send(R)})});
srv.listen(process.env.PORT||3000,()=>console.log('http://localhost:'+(process.env.PORT||3000)));
