(() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fields = [
    ['name','Name',60], ['age','Age'], ['gender','Gender',60], ['birthday','Birthday'],
    ['region','Region',100], ['occupation','Occupation',100], ['bio','About you',400], ['orientation','Orientation',80]
  ];
  let profile = {};
  let identity = {};
  let selectedId = '';
  const kinds = {
    goal: ['Goal','#ffbf73'], person: ['Person','#89afff'], place: ['Place','#65d9b5'],
    habit: ['Habit','#b69cff'], schedule: ['Schedule','#ff8fab'], clue: ['Clue','#adc4d2']
  };
  // A topic is created only from a sent message. Companion interests can corroborate it.
  const patterns = [
    ['goal', /(?:\b(?:my goal is|i want to|i hope to|i plan to|i'm learning to)\s+|(?:我的目标是|我想学|我打算))([^.!?。！？,，;；]{2,60})/i],
    ['person', /\b(?:[Mm]y (?:friend|sister|brother|mother|father|partner|teacher)(?: [A-Z][a-z]+)?)/g],
    ['person', /(我的(?:朋友|家人|姐姐|妹妹|哥哥|弟弟|妈妈|爸爸))/],
    ['place', /\b(?:visited|visiting|went to|travelled to|traveled to|in|at) ((?:[A-Z][a-z]+)(?: [A-Z][a-z]+){0,2})\b/g],
    ['place', /\b(?:bookstore|park|café|cafe|library|beach|studio|coast|garden|station|museum)\b|书店|公园|咖啡馆|海边|图书馆/gi],
    ['habit', /(?:\bi (?:usually|always|often)\s+|我(?:经常|习惯))([^.!?,。！？，;；]{2,55})/i],
    ['schedule', /\b(?:tomorrow|tonight|this weekend|next week|on (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b|明天|今晚|周末|下周/gi],
    ['clue', /\b(?:photography|photo|camera|sunset|guitar|piano|music|book|song|dance|letter|ticket|recipe|mystery)\b|摄影|照片|日落|吉他|音乐|钢琴|舞蹈|线索/gi]
  ];
  const aliases = {photo:'photography',camera:'photography',摄影:'photography',照片:'photography',日落:'sunset',音乐:'music',钢琴:'piano',舞蹈:'dance'};
  function topics(c, messages) {
    const nodes = new Map();
    const traits = [...c.interests, ...(c.profile?.hobbies || '').split(' · ')];
    for (const message of messages) {
      const found = new Set();
      function add(kind, raw) {
        const label = raw.trim().replace(/[.,!?]+$/, '');
        const key = aliases[label.toLowerCase()] || label.toLowerCase();
        const id = kind + '/' + key;
        if (found.has(id) || !key) return;
        found.add(id);
        const attribute = traits.find(t => [key,key+'s'].includes(t.trim().toLowerCase()));
        const node = nodes.get(id) || {kind, label: key[0].toUpperCase()+key.slice(1), count:0, attribute};
        node.count++; node.quote = message.text; nodes.set(id,node);
      }
      for (const [kind, re] of patterns) {
        const matches = re.global ? message.text.matchAll(re) : [re.exec(message.text)];
        for (const match of matches) if (match) add(kind, match[1] || match[0]);
      }
      for (const trait of traits) {
        const word = trait.trim().toLowerCase();
        if (word && message.text.toLowerCase().split(/[^\p{L}]+/u).includes(word)) add('clue',word);
      }
    }
    return [...nodes.values()];
  }
  const activities = [
    {level:2, name:'This or that', prompt:"Let's play this or that.", followUp:text=>`“${text}” — I'd like to hear the story behind that choice. What draws you to it?`, reply:c=>`Your turn to choose: a whole afternoon of ${c.interests[0].toLowerCase()}, or a midnight conversation about ${c.interests[1].toLowerCase()}? Tell me why.`},
    {level:3, name:'Story swap', prompt:"Let's build a story together.", followUp:text=>`I tucked the line “${text}” into my pocket. Outside, someone knocked twice, then waited. Do we open the door?`, reply:c=>`I'll start. Just as I put away my ${c.id === 'chris' ? 'camera' : 'notebook'}, a folded letter slipped under the door. You get the next line. What was written on it?`}
  ];
  function progress(history) {
    const count = history.reduce((n, t) => n + t.messages.length, 0);
    const tasks = [
      {name:'Send your first message', xp:10, done:count >= 1},
      {name:'Send five messages', xp:20, done:count >= 5},
      {name:'Talk to two companions', xp:20, done:history.length >= 2},
      {name:'Send ten messages', xp:20, done:count >= 10}
    ];
    const score = tasks.reduce((sum,t)=>sum+(t.done?t.xp:0),0);
    return {tasks, score,level:score>=50?3:score>=10?2:1};
  }
  function name() { return profile.name || identity.name || 'Explorer'; }
  function avatar() {
    return profile.avatar ? `<img alt="" class="uc-avatar" src="${escape(profile.avatar)}">` : `<span class="uc-avatar uc-initial" aria-hidden="true">${escape(Array.from(name())[0])}</span>`;
  }
  function ageAt(birthday) {
    const today = new Date(), [year,month,day] = birthday.split('-').map(Number);
    return today.getFullYear()-year-Number(today.getMonth()+1<month || (today.getMonth()+1===month && today.getDate()<day));
  }
  function profileMarkup() {
    const age = profile.birthday ? ageAt(profile.birthday) : profile.age;
    const meta = [profile.occupation,profile.region,age ? 'Age '+age : ''].filter(Boolean);
    return `<section class="uc-identity">${avatar()}<div><h2>${escape(name())}</h2>${meta.length ? `<p>${escape(meta.join(' · '))}</p>` : ''}${identity.email ? `<p>${escape(identity.email)}</p>` : ''}
      ${profile.bio ? `<p class="uc-bio">${escape(profile.bio)}</p>` : ''}</div><button class="uc-edit" type="button">Edit profile</button></section>`;
  }
  function editProfile(redraw) {
    showDialog(`<h2 id="dialog-title">Edit profile</h2><form class="uc-editor"><label class="uc-upload">${avatar()}<span>Change photo<input name="picture" type="file" accept="image/jpeg,image/png,image/webp"></span></label>
      <div class="uc-fields">${fields.map(([key,title,max])=>`<label class="uc-field-${key}">${title}${key==='bio' ? '<textarea name="bio" rows="3" maxlength="400"></textarea>' :
        `<input name="${key}" type="${key==='birthday'?'date':key==='age'?'number':'text'}" ${max?`maxlength="${max}"`:''} ${key==='age'?'min="0" max="125"':''} ${key==='name'?'required':''}>`}</label>`).join('')}</div>
      <p role="status" class="uc-feedback"></p><button type="submit" class="button button-primary">Save changes</button></form>`,{focusSelector:'[name="name"]'});
    const form=dialogContent.querySelector('form'), controls=form.elements;
    for (const [key] of fields) controls[key].value = key==='name' ? name() : profile[key] || '';
    let photo = profile.avatar || '', revision = 0;
    const feedback=form.querySelector('[role=status]'), submit=form.querySelector('[type=submit]');
    function syncAge() {
      controls.age.readOnly=Boolean(controls.birthday.value);
      if (controls.age.readOnly) controls.age.value=ageAt(controls.birthday.value);
      controls.birthday.setCustomValidity(controls.age.readOnly && (+controls.age.value<0 || +controls.age.value>125) ? 'Check your date of birth.' : '');
    }
    syncAge(); controls.birthday.addEventListener('input',syncAge);
    controls.picture.addEventListener('change',async()=>{
      const current=++revision, file=controls.picture.files[0];
      if (!file) return;
      submit.disabled=true;
      try {
        if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size>8*1024*1024) throw Error();
        const bitmap=await createImageBitmap(file);
        const canvas=document.createElement('canvas'); canvas.width=canvas.height=160;
        const side=Math.min(bitmap.width,bitmap.height);
        canvas.getContext('2d').drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,160,160);bitmap.close();
        if(current!==revision)return;
        photo=canvas.toDataURL('image/jpeg',.85);
        const img=document.createElement('img');img.src=photo;img.alt='';img.className='uc-avatar';form.querySelector('.uc-avatar').replaceWith(img);
        feedback.textContent='';
      } catch { if(current===revision)feedback.textContent='Choose a JPG, PNG or WebP under 8 MB.'; }
      finally { if(current===revision)submit.disabled=false; }
    });
    form.addEventListener('submit',e=>{
      e.preventDefault();
      if(!controls.name.value.trim()){controls.name.focus();return;}
      profile=Object.fromEntries(fields.map(([key])=>[key,controls[key].value.trim()])); profile.avatar=photo;
      window.RizzoraChat.saveTab();
      const badge=document.querySelector('.account-avatar');
      if(badge)badge.textContent=Array.from(name())[0];
      closeDialog();redraw();document.querySelector('.uc-edit')?.focus();
    });
  }
  function drawProgress(box, history) {
    const {level,score,tasks}=progress(history);
    const next=level===1?10:50;
    const c=history[0]?.id || characters[0].id;
    box.innerHTML=`<div class="uc-eyeline"><span>Companion level</span><span>${score} XP</span></div><h2>Level ${level} <em>· ${['','Newcomer','Familiar face','Storyteller'][level]}</em></h2>
      <progress aria-label="Experience towards level ${Math.min(3,level+1)}" value="${Math.min(score,next)}" max="${next}"></progress>
      <p>${level===3?'Both chat activities are unlocked.':`${next-score} XP to unlock ${activities[level-1].name}.`}</p>
      <details><summary>Tasks &amp; rewards</summary><ul>${tasks.map(t=>`<li><span>${t.done?'✓ ':''}${t.name}</span><b>${t.done?'Earned · ':''}${t.xp} XP</b></li>`).join('')}</ul></details>
      <div class="uc-perks">${!history.length ? '<a href="#discover">Find a companion ↗</a>' : ''}${activities.map(a=>a.level<=level?`<a href="#chat/${c}" data-unlocked="${a.level}">${a.name} ↗</a>`:`<span>Lv. ${a.level} · ${a.name}</span>`).join('')}</div>`;
  }
  function drawGraph(box, history) {
    const maps=history.map(({id,messages})=>({c:characters.find(c=>c.id===id), nodes:topics(characters.find(c=>c.id===id),messages)})).filter(m=>m.nodes.length);
    box.hidden=!maps.length;
    if(!maps.length)return;
    const {c,nodes}=maps.find(m=>m.c.id===selectedId)||maps[0];selectedId=c.id;
    box.innerHTML=`<header><div><h2>Your constellation</h2><p>Explore the things you’ve talked about together.</p></div><label>Companion<select>${maps.map(m=>`<option value="${m.c.id}" ${m.c===c?'selected':''}>${m.c.shortName}</option>`).join('')}</select></label></header>
      <div class="uc-sky"></div><div class="uc-key">${Object.values(kinds).map(([label,color])=>`<span style="--tone:${color}">${label}</span>`).join('')}</div>
      <p class="uc-lines"><i></i>Chat event <i></i>Profile attribute</p><div class="uc-evidence" aria-live="polite"></div><div class="uc-pager"></div>`;
    box.querySelector('select').onchange=e=>{
      selectedId=e.target.value;
      drawGraph(box,history);
      box.querySelector('select').focus({preventScroll:true});
    };
    const sky=box.querySelector('.uc-sky'), evidence=box.querySelector('.uc-evidence'),pager=box.querySelector('.uc-pager');
    const positions=[[20,19],[50,13],[80,19],[80,76],[50,84],[20,76]];
    function page(start) {
      const slice=nodes.slice(start,start+6);
      const coords=slice.length===1?[[50,20]]:slice.length===2?[[28,21],[72,78]]:positions;
      const line=(x,y,ex,ey,attr)=>`<line x1="${x}" y1="${y}" x2="${ex}" y2="${ey}" class="${attr?'attr':''}"/>`;
      sky.innerHTML=`<svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none">${slice.map((n,i)=>line(29,49,...coords[i],false)+line(71,49,...coords[i],!!n.attribute)).join('')}</svg>
        <div class="uc-star uc-self" style="left:29%;top:49%">${avatar()}<b>You</b></div><div class="uc-star uc-self" style="left:71%;top:49%"><img class="uc-avatar" src="${c.image}" alt=""><b>${c.shortName}</b></div>
        ${slice.map((n,i)=>`<button class="uc-star uc-topic" type="button" style="left:${coords[i][0]}%;top:${coords[i][1]}%;--tone:${kinds[n.kind][1]}" aria-pressed="false" aria-label="${escape(kinds[n.kind][0]+': '+n.label)}"><i></i><b>${escape(n.label)}</b></button>`).join('')}`;
      const buttons=[...sky.querySelectorAll('button')];
      function select(i){
        buttons.forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));
        const n=slice[i];
        evidence.innerHTML=`<small>${kinds[n.kind][0]} · ${n.count} ${n.count===1?'mention':'mentions'}</small><h3>${escape(n.label)}</h3><p>“${escape(n.quote)}”</p>${n.attribute?`<p>From ${c.shortName}’s profile · ${escape(n.attribute)}</p>`:''}`;
      }
      buttons.forEach((b,i)=>b.onclick=()=>select(i));select(0);
      pager.innerHTML=nodes.length>6?`<button type="button" ${start===0?'disabled':''}>Previous</button><span>${start+1}–${start+slice.length} of ${nodes.length}</span><button type="button" ${start+6>=nodes.length?'disabled':''}>Next</button>`:'';
      if(pager.children.length){pager.firstElementChild.onclick=()=>{page(start-6);sky.querySelector('button').focus();};pager.lastElementChild.onclick=()=>{page(start+6);sky.querySelector('button').focus();};}
    }
    page(0);
  }
  window.RizzoraCenter={
    profileMarkup, progress, activities,
    mount(root,redraw){
      root.querySelector('.uc-edit').onclick=()=>editProfile(redraw);
      const history=window.RizzoraChat.userHistory();
      drawProgress(root.querySelector('.uc-level'),history);
      root.querySelectorAll('[data-unlocked]').forEach(link=>link.addEventListener('click',e=>{
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        window.RizzoraChat.queueActivity(history[0].id,Number(link.dataset.unlocked));
      }));
      drawGraph(root.querySelector('.uc-map'),history);
    },
    identify(user){identity={name:user.name||'',email:user.email||''};},
    snapshot(){return {...profile};},
    restore(saved){
      profile={};
      if(!saved)return;
      for(const [key] of fields)if(typeof saved[key]==='string')profile[key]=saved[key];
      const badge=document.querySelector('.account-avatar');
      if(badge)badge.textContent=Array.from(name())[0];
      if(/^data:image\/jpeg;base64,[\w+/=]+$/.test(saved.avatar||''))profile.avatar=saved.avatar;
    },
    reset(){profile={};identity={};selectedId='';}
  };
})();
