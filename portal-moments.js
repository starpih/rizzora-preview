(() => {
  const christmas = 'assets/chris-christmas.webp';
  const deck = 'assets/chris-on-deck.webp';
  const windowSeat = 'assets/discover-scenes/chris.webp';
  const room = 'assets/chat-gallery/chris.webp';
  const home = 'assets/hero-stills-4x3-v1/01-chris-home.webp';
  const cards = [
    ['R','Sweet line',deck,'The wind is perfect today. There’s room on deck if you want it.'],
    ['SSR','Live video',home,'Stay for a little while. I’ll put another record on.','assets/hero-chris-v1.mp4'],
    ['SSR','Private photo',christmas,'You spotted the ribbon before I could hide it.'],
    ['SSR','Voice note',windowSeat,'I saved a little something for the ride home.','assets/hero-companions/chris.mp3'],
    ['SSR','Private photo',deck,'The harbor looks different when you’re here.'],
    ['SSR','Private photo',room,'This was the last frame on the roll.'],
    ['SR','Voice note',home,'Here, put your headphones on.','assets/chat-media/chris-note.mp3'],
    ['SR','Private photo',windowSeat,'Just past that window is my favorite corner of town.'],
    ['SR','Sweet line',deck,'Give me a second. I want to remember this light.'],
    ['SR','Private photo',christmas,'Do you think anyone would notice one missing cookie?'],
    ['SR','Sweet line',room,'The kettle just clicked. How do you take yours?'],
    ['R','Sweet line',home,'I left the lamp on for you.'],
    ['R','Sweet line',christmas,'You can pick the first present.'],
    ['R','Sweet line',deck,'Just us and the gulls out here.'],
    ['R','Sweet line',room,'Take the window seat. I know you like the view.'],
    ['R','Sweet line',windowSeat,'Let’s take the long way home.']
  ];
  const rates = {SSR:1000, SR:200, R:50};
  const repeats = {SSR:100, SR:30, R:10};
  const empty = () => ({owned:[], hearts:0, pity:0, free:'', gift:'', touchDay:'', touches:0});
  let state = empty();
  function restore(saved) {
    state = empty();
    if (!saved || typeof saved !== 'object') return;
    if (Array.isArray(saved.owned)) state.owned = [...new Set(saved.owned.filter(i=>Number.isInteger(i) && cards[i]))];
    for (const key of ['hearts','pity','touches']) if (Number.isSafeInteger(saved[key]) && saved[key]>=0) state[key]=saved[key];
    for (const key of ['free','gift','touchDay']) if (typeof saved[key]==='string') state[key]=saved[key];
  }
  const stamp = () => new Date().toLocaleDateString('en-CA');
  const fmt = value => value.toLocaleString('en-US');
  const count = () => state.owned.length;
  const free = () => state.free !== stamp();
  const balance = () => window.RizzoraIP.demoBenefits().sampleCredits;
  function save() {
    window.RizzoraChat.saveTab();
    if (!signedIn) {
      try { sessionStorage.setItem('rizzora.guest-moments',JSON.stringify(state)); } catch { /* In-memory play remains available. */ }
    }
  }
  function reset() {
    state=empty();
    try { sessionStorage.removeItem('rizzora.guest-moments'); } catch { /* Storage is optional. */ }
  }
  try { restore(JSON.parse(sessionStorage.getItem('rizzora.guest-moments'))); } catch { /* Start with an empty collection. */ }
  const btn = (action,label,cls='') => `<button type="button" data-do="${action}" class="${cls}">${label}</button>`;
  const row = (action,icon,title,detail,tag='›') => `<button type="button" class="moment-row" data-do="${action}"><span class="moment-glyph" aria-hidden="true">${icon}</span><span><b>${title}</b><small>${detail}</small></span><span class="row-tail">${tag}</span></button>`;
  const soon = (icon,title,text) => `<div class="moment-row future"><span class="moment-glyph">${icon}</span><span><b>${title}</b><small>${text}</small></span><small>Soon</small></div>`;
  function open(character,games,activities,startActivity) {
    function page(title,body,actions,kind='',back=null) {
      const head = `<header class="moment-bar"><span class="moment-wordmark"><img alt="" src="assets/logo.svg">RIZZORA</span><span class="moment-balance" aria-label="Stamina balance">⚡ ${fmt(balance())}</span></header>`;
      showDialog(`<section class="moments ${kind}">${kind==='scene'?'':head}<div class="moment-body">${back?btn('back','‹','moment-back'):''}<h2 tabindex="-1" id="dialog-title">${title}</h2>${body}</div></section>`,{focusSelector:'#dialog-title'});
      const root=dialogContent.querySelector('.moments');
      if(back) { actions.back=back; root.querySelector('.moment-back').setAttribute('aria-label','Back'); }
      root.onclick=event=>{
        const button=event.target.closest('[data-do]');
        if(button && root.contains(button)) actions[button.dataset.do]?.();
      };
      return root;
    }
    function lobby() {
      const todayTouches=state.touchDay===stamp()?state.touches:0;
      const legacy = [row('quiz','≈','Same wavelength','Guess '+character.shortName+'’s picks in three rounds.'),row('story','✧','Between the lines','A branching story with '+character.shortName+'.','VIP'),...activities.map((activity,i)=>row('activity'+i,'✦',activity.name,'Companion level '+activity.level))].join('');
      const actions = {scene:scene, draw:drawPage, collection:()=>collection(lobby),quiz:games.quiz,story:games.story};
      activities.forEach((activity,i)=>actions['activity'+i]=()=>startActivity(activity));
      page('Play',`<div class="moment-lobby"><div class="moment-feature"><div><small>NEW · CHRISTMAS</small><h3>Christmas with Chris</h3><p>Tap his hat, hold his cheek, or see what’s inside your present.</p></div>${btn('scene','Play','feature-cta')}</div>
        <div><h3 class="moment-label">Games</h3>${row('draw','▱','Moments · Card draw','Chris’s limited set is live.',free()?'Free draw':'Draw')}${soon('?','Truth or Dare','He asks, you answer. Then it’s your turn.')}${soon('♡','Date Stories','Your choices decide how the night ends.')}</div>
        <div><h3 class="moment-label">My play</h3>${row('collection','♥','Chris’s Moments collection',count()+' of 16 collected')}${row('scene','✦','Christmas with Chris',(todayTouches?todayTouches+' touches today':'No touches yet today')+' · Today’s present: '+(state.gift===stamp()?'opened':'ready'))}</div>
        <div><h3 class="moment-label">With ${character.shortName}</h3>${legacy}</div></div>`,actions,'lobby');
    }
    function drawPage(message='') {
      page('Chris’s Moments',`<p class="moment-intro">Sweet lines, voice notes, private photos, and live videos from Chris.</p><div class="moment-byline"><img src="assets/chris.png" alt=""> Featuring Chris Jones · 16 moments</div>
        <div class="moment-deck" aria-hidden="true"><i></i><i></i><i></i><i><b>R</b></i></div>
        <p class="moment-caption"><strong>${free()?'1 free draw':'Free draw used'}</strong> ${free()?'available today':'· Come back tomorrow'}</p><p class="moment-hint">SSR guaranteed within ${Math.max(1,50-state.pity)} draws</p>
        ${btn('one','Draw ×1 · '+(free()?'Free':'⚡ 1,000'),'moment-gold')}${btn('ten','Draw ×10 · ⚡ 9,000','moment-secondary')}
        ${message?`<p role="status" class="moment-notice">${message}</p>`:''}<div class="moment-links">${btn('collection','My collection ('+count()+'/16) ›')}<details><summary>Odds &amp; rules</summary><p>Your first card is On Deck. After that, each draw has a 2% SSR, 18% SR, or 80% R chance. Your 50th draw without an SSR guarantees one. Duplicates give 100, 30, or 10 hearts by rarity. One single draw is free per local calendar day.</p></details></div>`,{one:()=>draw(1),ten:()=>draw(10),collection:()=>collection(drawPage)},'draw',lobby);
    }
    function takeCard() {
      let id=0;
      if(count()) {
        const roll=Math.random();
        const tier=state.pity>=49 || roll<.02?'SSR':roll<.20?'SR':'R';
        const pool=cards.map((card,i)=>card[0]===tier?i:-1).filter(i=>i>=0);
        id=pool[Math.floor(Math.random()*pool.length)];
      }
      const fresh=!state.owned.includes(id), rarity=cards[id][0];
      if(fresh) state.owned.push(id); else state.hearts+=repeats[rarity];
      state.pity=rarity==='SSR'?0:state.pity+1;
      return {id,status:fresh?'New':'+'+repeats[rarity]+' ♥'};
    }
    function draw(n) {
      if(n===1 && free()) state.free=stamp();
      else if (!window.RizzoraIP.spendPlayStamina(n===1?1000:9000)) {
        drawPage('This draw needs '+(n===1?'1,000':'9,000')+' Stamina. Your balance is '+fmt(balance())+'.'); return;
      }
      const draws=Array.from({length:n},takeCard);
      save();
      function reveal(i) { showCard(draws[i],i+1<n?'Next card ('+(i+1)+'/'+n+')':'Done',i+1<n?()=>reveal(i+1):drawPage); }
      reveal(0);
    }
    let revealBackground;
    function showCard(entry,label,done,full=false) {
      const previous=dialogContent.querySelector('.moments');
      if (previous && !previous.classList.contains('result')) {
        revealBackground=previous.cloneNode(true);
        revealBackground.classList.add('reveal-background');
        revealBackground.inert=true;
        revealBackground.setAttribute('aria-hidden','true');
        revealBackground.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
      }
      const [rarity,type,img,line,media]=cards[entry.id];
      const player=media?(type==='Live video'?`<video controls playsinline poster="${img}" src="${media}"></video>`:`<audio controls src="${media}"></audio>`):'';
      const overlay=page(rarity+' · '+type,`<button type="button" data-do="flip" class="moment-reveal ${full?'full':''}" aria-label="${full?'Show card text':'View full photo'}"><img src="${img}" alt="Chris"><span class="card-tier">${rarity}</span><span class="card-status">${entry.status}</span><span class="card-line">“${line}”<small>— Chris</small></span></button>${player}<p class="moment-hint">${full?'Tap to show the card text':'Tap the card to see the full photo'}</p>${btn('done',label,'moment-gold')}`,{flip:()=>showCard(entry,label,done,!full),done},'result');
      if(revealBackground) overlay.prepend(revealBackground);
    }
    function collection(back,notice='') {
      const actions={};
      const tiles=cards.map(([tier,,img],i)=>{
        const owned=state.owned.includes(i), price=rates[tier];
        actions['card'+i]=()=>{
          if(owned) return showCard({id:i,status:'Collected'},'Back to collection',()=>collection(back));
          if(state.hearts<price) return collection(back,'This '+tier+' moment costs '+fmt(price)+' hearts. You have '+fmt(state.hearts)+'.');
          page('Exchange hearts?',`<p>Use ${fmt(price)} hearts to unlock this ${tier} moment?</p>${btn('exchange','Unlock · ♥ '+fmt(price),'moment-gold')}`,{exchange:()=>{state.hearts-=price;state.owned.push(i);save();showCard({id:i,status:'New'},'Back to collection',()=>collection(back));}},'draw',()=>collection(back));
        };
        return `<button type="button" data-do="card${i}" aria-label="Moment ${i+1}, ${tier}, ${owned?'collected':'locked, '+price+' hearts'}" class="moment-tile ${owned?'owned':''}"><span class="card-tier tier-${tier}">${tier}</span>${owned?`<img src="${img}" alt=""><small>— Chris</small>`:`<b>?</b><small>♥ ${fmt(price)}</small>`}</button>`;
      }).join('');
      page('My collection',`<p class="moment-intro">${count()} of 16 moments collected<br><strong>♥ ${fmt(state.hearts)}</strong> heart points · Tap a locked card to exchange</p>${notice?`<p role="status" class="moment-notice">${notice}</p>`:''}<div class="moment-grid">${tiles}</div>`,actions,'collection',back);
    }
    let sound=false;
    const zones=[
      ['Hat',32,4,42,12,'Hey, it took me three tries to get that hat straight.'],
      ['Face',36,17,30,15,'Your hands are cold. Come a little closer.'],
      ['Mouth',44,25,14,5,'Did you catch me sneaking a cookie?'],
      ['Body',30,34,41,28,'Soft, isn’t it? My favorite Christmas sweater.'],
      ['Left arm',8,37,19,24,'There’s room for you right here.'],
      ['Right arm',74,37,19,24,'Come sit by the tree with me.'],
      ['Left hand',20,65,23,12,'Here, take my hand.'],
      ['Right hand',60,65,22,12,'Can you help me untie the ribbon?'],
      ['Gift',25,78,47,20,'A little something for you. You found 20 hearts!']
    ];
    function scene() {
      const label=([name])=>name==='Gift'?'Gift · daily':name==='Face'?'Face · hold':name;
      const hint='Tap his hat, face, hands or arm · Hold his cheek';
      const root=page('Christmas with Chris',`<div class="moment-photo"><img src="${christmas}" alt="Chris in a Santa hat, sitting beside the tree with a wrapped present."><div class="moment-zones">${zones.map((z,i)=>`<button type="button" data-zone="${i}" aria-label="${label(z)}" style="left:${z[1]}%;top:${z[2]}%;width:${z[3]}%;height:${z[4]}%"><span>${label(z)}</span></button>`).join('')}</div></div>
        <div class="scene-tools"><button type="button" data-do="guide" aria-label="Show interaction guide" aria-pressed="false">⊞</button><button type="button" data-do="sound" aria-label="Sound" aria-pressed="${sound}"><img src="assets/${sound?'volume':'volume-off'}.svg" alt=""></button></div>
        <p class="scene-response" role="status">${hint}</p>`,{
        guide:()=>{const b=root.querySelector('[data-do=guide]');const on=root.classList.toggle('guide');b.setAttribute('aria-pressed',on);b.setAttribute('aria-label',on?'Hide interaction guide':'Show interaction guide');},
        sound:()=>{const b=root.querySelector('[data-do=sound]');sound=!sound;b.setAttribute('aria-pressed',sound);b.firstElementChild.src='assets/'+(sound?'volume':'volume-off')+'.svg';if(sound) chime();}
      },'scene',lobby);
      function chime() {
        const Ctx=window.AudioContext||window.webkitAudioContext;
        if(!Ctx) return;
        const ctx=new Ctx(), tone=ctx.createOscillator(), gain=ctx.createGain();
        tone.type='sine';tone.frequency.value=660;gain.gain.setValueAtTime(.07,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.35);
        tone.connect(gain);gain.connect(ctx.destination);tone.start();tone.stop(ctx.currentTime+.36);tone.onended=()=>ctx.close();
      }
      function touch(i,held=false) {
        if(!root.isConnected || !dialog.open) return;
        if(state.touchDay!==stamp()) {state.touchDay=stamp();state.touches=0;}
        state.touches++;
        const [name,,,,,line]=zones[i];
        let text=held?'Stay just like that. Your hand is warm now.':line;
        if(name==='Gift') {
          if(state.gift===stamp()) text='You already opened today’s present. I’ll wrap another tomorrow.';
          else {state.gift=stamp();state.hearts+=20;}
        }
        root.querySelector('.scene-response').textContent=text;
        if(sound) chime();
        save();
      }
      root.querySelectorAll('[data-zone]').forEach(button=>{
        const i=Number(button.dataset.zone);
        let timer,held=false;
        const stop=()=>clearTimeout(timer);
        function start() {
          stop(); held=false;
          if(i===1) timer=setTimeout(()=>{held=true;touch(i,true);},550);
        }
        button.onpointerdown=start;
        button.onpointerup=button.onpointercancel=button.onpointerleave=button.onblur=stop;
        button.onkeydown=e=>{if(!e.repeat && e.key===' ') start();};
        button.onkeyup=stop;
        button.onclick=()=>{stop();if(!held)touch(i);held=false;};
      });
    }
    lobby();
  }
  window.RizzoraMoments={open,restore,reset,snapshot:()=>({...state,owned:[...state.owned]})};
})();
