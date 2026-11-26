(() => {
  // Demo conversations stay in memory unless the user enables tab storage.
  const historyKey = 'rizzora.preview.tab-conversations.v1';
  let keepHistory = false;
  const threads = new Map();
  let host;
  let activeId;
  let lastOpened;
  let pendingPhoto = null;
  let requestedActivity = null;
  let openPhoto;
  dialog.addEventListener('close', () => { if (!signedIn) pendingPhoto = null; });
  let historySearch = '';
  const clock = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' });
  const compactChat = matchMedia('(max-width: 760px)');
  const guestThreads = new Map();
  let disposeProfile = () => {};
  const byId = id => characters.find(c => c.id === id);
  const escape = value => { const node = document.createElement('span'); node.textContent = value; return node.innerHTML; };
  const replies = {
    chris: ['We can take it slowly. Would you like to talk about your day, or find a lighter place to start?', 'Then we should make a little room for that. What was the best part?', 'The song is still playing, and there is a spot on the sofa. What would you put on next?'],
    kim: ['Let’s leave the rush outside for a moment. Would a favorite song help, or would you rather talk?', 'I want to hear this one. What made you smile?', 'Rehearsal is over, but the encore is still in my head. What song has been following you around?'],
    julian: ['There is no need to fit the whole day into a sentence. Where would you like to begin?', 'A good moment deserves its own story. Tell me how it happened.', 'A few notes on the piano, a book left open. Would you choose a story or a song tonight?'],
    enzo: ['We can let the evening slow down. Would you like to tell me what has been on your mind?', 'That sounds like a moment to keep. What made it special for you?', 'There are lights all along the coast tonight. Would you rather take a walk or stay and watch them?'],
    hayes: ['We can stay here while the rain passes. Would you like quiet company, or a little conversation?', 'Let’s save that moment like a bookmark. What happened?', 'The last chapter can wait. Is there a story you wish you could read for the first time again?'],
  };
  function thread(id) {
    const store = signedIn ? threads : guestThreads;
    if (!store.has(id)) {
      const time = Date.now();
      const messages = [{ role: 'assistant', text: byId(id).greeting, time }];
      if (id === 'chris') {
        messages.push({ role: 'assistant', type: 'voice', text: 'Voice message', time,
          audio: 'assets/chat-media/chris-note.mp3', duration: 7,
          transcript: 'I kept a little quiet for you. Tell me how you actually feel, not the polite version.',
          peaks: [3, 3, 3, 3, 3, 3, 3, 10, 13, 3, 3, 6, 23, 19, 14, 6, 3, 3, 3, 11, 12, 11, 11, 11, 8, 7, 15, 8, 14, 17, 6, 3] });
        messages.push({ role: 'assistant', type: 'photo', text: 'Photo', time,
          src: 'assets/hero-stills-4x3-v1/01-chris-home.webp', alt: 'Chris at home', galleryIndex: 1 });
      }
      store.set(id, { messages, stamina: 100, unread: 0, draft: '', pending: false, timer: null });
    }
    return store.get(id);
  }
  function replyFor(id, text, count) {
    const activity = unlockedActivities().find(a => a.prompt === text);
    if (activity) return activity.reply(byId(id));
    const previous = thread(id).messages.at(-2);
    const continuing = previous?.role === 'assistant' && unlockedActivities().find(a=>a.reply(byId(id))===previous.text);
    if (continuing) return continuing.followUp(text);
    const starter = byId(id).conversationStarters.find(option => text.toLowerCase().includes(option.message.toLowerCase()));
    if (starter) return starter.reply;
    const theme = /tired|quiet|sad|stress|hard|lonely|累/i.test(text) ? 0 : /good|happy|smile|great|开心/i.test(text) ? 1 : /world|music|song|book|tell me|兴趣/i.test(text) ? 2 : count % 3;
    return replies[id][theme];
  }
  function visible(id) {
    return activeId === id && host && !host.hidden && (location.hash === `#chat/${id}` || location.hash === '#chat');
  }
  function nearLatest() {
    const log = host?.querySelector('#chat-log');
    return !log || log.scrollHeight - log.scrollTop - log.clientHeight < 48;
  }
  function roomIsRead(id) {
    return nearLatest() && visible(id) && !document.hidden && !(location.hash === '#chat' && compactChat.matches);
  }
  function recentThreads() {
    return [...threads.entries()].sort((a, b) => b[1].messages.at(-1).time - a[1].messages.at(-1).time);
  }
  function userHistory() {
    if (!signedIn) return [];
    return recentThreads().map(([id,state])=>({id, messages:state.messages.filter(m=>m.role==='user')})).filter(t=>t.messages.length);
  }
  function unlockedActivities() {
    const {level}=window.RizzoraCenter.progress(userHistory());
    return window.RizzoraCenter.activities.filter(a=>a.level<=level);
  }
  function openActivities(id, level) {
    const options=unlockedActivities().filter(a=>!level || a.level===level);
    const character=byId(id);
    showDialog(`<h2 id="dialog-title">Play with ${character.shortName}</h2><div class="dialog-stack">${options.map((a,i)=>`<button type="button" data-activity="${i}">${a.name}</button>`).join('')}</div>`);
    dialogContent.querySelectorAll('[data-activity]').forEach((b,i)=>b.onclick=()=>{
      closeDialog();
      const input=host.querySelector('#chat-message');
      input.value=thread(id).draft=options[i].prompt;
      updateComposer(id); input.focus();
    });
  }
  function recentConversations() {
    if (!signedIn) return [];
    return recentThreads()
      .filter(([, state]) => state.messages.some(message => message.role === 'user'))
      .map(([id, state]) => ({ id, message: state.messages.at(-1), unread: state.unread }));
  }
  function saveTab() {
    if (!keepHistory || !signedIn) return;
    const history = recentConversations().map(({ id }) => {
      const state = threads.get(id);
      const first = state.messages.findIndex(message => message.role === 'user');
      return { id, messages: state.messages.slice(first), unread: state.unread, stamina: state.stamina, draft: state.draft };
    });
    try {
      sessionStorage.setItem(historyKey, JSON.stringify({ history, account: {...window.RizzoraIP.demoBenefits(), profile: window.RizzoraCenter.snapshot()} }));
    } catch {
      keepInTab(false);
      const checkbox = document.querySelector('#keep-demo-chats');
      if (checkbox) checkbox.checked = false;
    }
  }
  function keepInTab(enabled) {
    keepHistory = Boolean(enabled && signedIn && !window.RizzoraAuthService);
    if (keepHistory) saveTab();
    else {
      try { sessionStorage.removeItem(historyKey); } catch { /* Storage is unavailable. */ }
    }
    return keepHistory;
  }
  function restoreTab() {
    if (window.RizzoraAuthService) return false;
    try {
      const snapshot = JSON.parse(sessionStorage.getItem(historyKey));
      if (!Array.isArray(snapshot?.history)) return false;
      const history = snapshot.history.filter(entry => byId(entry?.id) && Array.isArray(entry.messages)
        && entry.messages[0]?.role === 'user' && entry.messages.every(message => message
          && ['user', 'assistant'].includes(message.role) && typeof message.text === 'string' && Number.isFinite(message.time)));
      if (!history.length && !snapshot.account?.profile) return false;
      showSignedInAccount();
      window.RizzoraIP.restoreDemoBenefits(snapshot.account);
      for (const entry of history) {
        const state = thread(entry.id);
        for (const { role, time, text, newArrival } of entry.messages) state.messages.push({ role, time, text, newArrival: Boolean(newArrival) });
        state.unread = Math.max(0, Number(entry.unread) || 0);
        state.stamina = Math.max(0, Math.min(100, Number(entry.stamina) || 0));
        state.draft = typeof entry.draft === 'string' ? entry.draft : '';
        const last = state.messages.at(-1);
        if (last.role === 'user') {
          state.pending = true;
          scheduleReply(entry.id, state, last.text);
        }
      }
      keepHistory = true;
      refreshHistory();
      return true;
    } catch { return false; }
  }
  window.addEventListener('pagehide', saveTab);
  function historyPane() {
    return `<aside class="chat-history" aria-label="Conversation history">
      <header><h2>Messages</h2><a class="history-new" href="#discover" aria-label="Find a companion" title="Find a companion">+</a></header>
      <label class="history-search"><img src="assets/search.svg" alt=""><input type="search" aria-label="Search conversations" placeholder="Search companions…"></label>
      <nav class="history-threads" aria-label="Chat history"></nav>
      <a class="history-vip" href="#membership"><span aria-hidden="true">♕</span><span><strong>Rizzora VIP</strong><small>${window.RizzoraIP.isVIP() ? 'View membership' : 'Explore member benefits'}</small></span></a>
    </aside>`;
  }
  function refreshHistory() {
    updateUnreadCount([...threads.values()].reduce((total, t) => total + t.unread, 0));
    if (location.hash === '#discover') window.RizzoraIP?.renderRecentChats();
    const list = host?.querySelector('.history-threads');
    if (!list || host.hidden) return;
    const query = historySearch.trim().toLowerCase();
    const conversations = signedIn ? recentThreads() : characters.map(c => [c.id, thread(c.id)]);
    const rows = conversations.filter(([id]) => byId(id).name.toLowerCase().includes(query));
    const focusHref = list.contains(document.activeElement) && document.activeElement.getAttribute('href');
    list.innerHTML = rows.map(([id, t]) => {
      const c = byId(id), message = t.messages.at(-1);
      return `<a class="history-row" href="#chat/${id}" ${id === activeId ? 'aria-current="page"' : ''}>
        <img src="${c.image}" alt=""><span class="history-copy"><strong>${c.shortName}</strong><small>${message.role === 'user' ? 'You: ' : ''}${escape(message.text)}</small></span>
        <span class="history-meta">${signedIn ? `<time>${clock.format(message.time)}</time>` : ''}${t.unread ? `<b aria-label="${t.unread} unread messages">${t.unread}</b>` : ''}</span></a>`;
    }).join('') || `<p class="history-empty">${query ? 'No matching conversations.' : 'Your conversations will appear here.'}</p>`;
    if (focusHref) list.querySelector(`[href="${focusHref}"]`)?.focus({ preventScroll: true });
  }
  function bindHistory() {
    const input = host.querySelector('.history-search input');
    input.value = historySearch;
    input.addEventListener('input', () => { historySearch = input.value; refreshHistory(); });
    refreshHistory();
  }
  function clearUnread() {
    if (signedIn && activeId && roomIsRead(activeId) && thread(activeId).unread) {
      thread(activeId).unread = 0;
      refreshHistory();
    }
  }
  function updatePresence() {
    const status = host?.querySelector('.chat-presence');
    if (status) {
      status.textContent = navigator.onLine ? 'Online' : 'Offline';
      status.classList.toggle('is-offline', !navigator.onLine);
    }
  }
  function voiceMessage(message) {
    const note = document.createElement('div');
    note.className = 'voice-note';
    note.innerHTML = `<div class="voice-controls"><button class="voice-play" type="button" aria-label="Play voice message"></button><span class="voice-wave" aria-hidden="true"></span><span class="voice-duration"></span><button type="button" class="voice-transcribe" aria-label="Show transcript" title="Show transcript" aria-expanded="false">Aa</button></div><p class="voice-transcript" hidden></p><audio preload="none"></audio>`;
    const audio = note.querySelector('audio');
    audio.src = message.audio;
    const play = note.querySelector('.voice-play');
    const duration = note.querySelector('.voice-duration');
    const wave = note.querySelector('.voice-wave');
    message.peaks.forEach(height => {
      const bar = document.createElement('i');
      bar.style.height = height + 'px';
      wave.append(bar);
    });
    const clockTime = seconds => Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
    const update = () => {
      const total = Number.isFinite(audio.duration) ? audio.duration : message.duration;
      duration.textContent = clockTime(audio.currentTime) + ' / ' + clockTime(total);
      play.classList.toggle('playing', !audio.paused);
      play.setAttribute('aria-label', audio.paused ? 'Play voice message' : 'Pause voice message');
      Array.from(wave.children).forEach((bar, i) => bar.classList.toggle('played', i < wave.childElementCount * audio.currentTime / total));
    };
    play.addEventListener('click', async () => {
      if (!audio.paused) { audio.pause(); return; }
      try { await audio.play(); } catch { duration.textContent = 'Audio unavailable'; }
    });
    ['play', 'pause', 'timeupdate', 'loadedmetadata', 'ended'].forEach(event => audio.addEventListener(event, update));
    update();
    const toggle = note.querySelector('.voice-transcribe');
    const transcript = note.querySelector('.voice-transcript');
    transcript.textContent = message.transcript;
    toggle.addEventListener('click', () => {
      transcript.hidden = !transcript.hidden;
      toggle.setAttribute('aria-expanded', String(!transcript.hidden));
      toggle.title = transcript.hidden ? 'Show transcript' : 'Hide transcript';
      toggle.setAttribute('aria-label', toggle.title);
    });
    return note;
  }
  function renderMessages(id) {
    if (!visible(id)) return;
    const state = thread(id);
    const log = host.querySelector('#chat-log');
    const followLatest = nearLatest();
    // Append only new messages so assistive technology does not re-announce history.
    state.messages.slice(log.children.length).forEach(message => {
      const item = document.createElement('div');
      item.className = `chat-message chat-${message.role}`;
      item.dataset.role = message.role;
      const label = document.createElement('span');
      label.className = 'chat-speaker';
      label.textContent = message.role === 'user' ? 'You' : byId(id).shortName;
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble';
      if (message.type === 'voice') {
        bubble.append(voiceMessage(message));
      } else if (message.type === 'photo') {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'chat-photo';
        button.setAttribute('aria-label', 'Open photo: ' + message.alt);
        const picture = document.createElement('img');
        picture.src = message.src;
        picture.alt = message.alt;
        button.append(picture);
        button.addEventListener('click', () => openPhoto(message.galleryIndex, button));
        bubble.append(button);
      } else {
        const text = document.createElement('p');
        text.textContent = message.text;
        bubble.append(text);
      }
      const time = document.createElement('time');
      time.textContent = clock.format(message.time);
      time.dateTime = new Date(message.time).toISOString();
      if (message.newArrival) { time.className = 'chat-new-arrival'; time.setAttribute('aria-label', 'New message, ' + time.textContent); }
      bubble.append(time);
      item.append(label, bubble);
      log.append(item);
    });
    host.querySelector('#chat-status').textContent = state.pending ? `${byId(id).shortName} is replying…` : '';
    if (state.messages.some(message => message.role === 'user')) host.querySelector('.chat-starters').hidden = true;
    const play = host.querySelector('.chat-activities');
    play.hidden = !signedIn || !unlockedActivities().length;
    updateComposer(id);
    if (followLatest || state.pending) log.scrollTop = log.scrollHeight;
  }
  function updateComposer(id) {
    if (!visible(id)) return;
    const state = thread(id);
    host.querySelector('#chat-send').disabled = state.pending || !state.draft.trim();
    host.querySelector('#chat-send').textContent = state.pending ? 'Replying…' : 'Send';
  }
  function send(id) {
    const state = thread(id);
    const text = state.draft.trim().slice(0, 1000);
    if (!text || state.pending) return;
    if (!signedIn) {
      pendingChat = true;
      portalAuth.open({ character: byId(id).shortName });
      return;
    }
    state.stamina = Math.max(0, state.stamina - 5);
    const ring = host.querySelector('.stamina-ring');
    ring.style.setProperty('--remaining', state.stamina + '%');
    ring.setAttribute('aria-valuenow', state.stamina);
    ring.title = `Stamina: ${state.stamina}%`;
    state.messages.push({ role: 'user', text, time: Date.now() });
    refreshHistory();
    state.draft = ''; state.pending = true;
    host.querySelector('#chat-message').value = '';
    host.querySelectorAll('.chat-new-arrival').forEach(time => time.classList.remove('chat-new-arrival'));
    renderMessages(id);
    host.querySelector('#chat-message').focus({ preventScroll: true });
    saveTab();
    scheduleReply(id, state, text);
  }
  function scheduleReply(id, state, text) {
    state.timer = setTimeout(() => {
      const unread = !roomIsRead(id);
      if (unread) state.unread++;
      state.messages.push({ role: 'assistant', time: Date.now(), newArrival: unread, text: replyFor(id, text, state.messages.filter(m => m.role === 'user').length - 1) });
      state.pending = false; state.timer = null;
      saveTab();
      renderMessages(id);
      refreshHistory();
    }, 550);
  }
  function mountProfile(c) {
    const compact = matchMedia('(max-width: 1000px)');
    const slot = host.querySelector('.chat-profile-slot');
    const drawer = host.querySelector('.chat-profile-dialog');
    const trigger = host.querySelector('[data-show-chat-profile]');
    const scene = document.querySelector(`[data-hero-character="${c.id}"]`);
    const pictures = [{ src: c.image, label: 'Portrait' }];
    if (scene && scene.getAttribute('src') !== c.image) pictures.push({ src: scene.getAttribute('src'), label: 'His world' });
    pictures.push({ src: c.id === 'hayes' ? 'assets/hero-companions/hayes.jpg' : `assets/chat-gallery/${c.id}.webp`, label: 'VIP portrait', vip: true });
    const locked = picture => picture.vip && !window.RizzoraIP.isVIP();
    const story = scene?.dataset.story || (c.id === 'chris' ? 'The song you sent is still playing when you arrive. Chris moves his sweater off the sofa. “I saved you the good spot.”' : c.summary);
    const panel = document.createElement('aside');
    panel.id = 'chat-profile-panel';
    panel.className = 'chat-profile-panel';
    panel.setAttribute('aria-labelledby', 'chat-profile-title');
    panel.tabIndex = -1;
    const paths = {
      Birthday: '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 11h16"/>',
      Height: '<path d="m5 19 14-14M6 14l4 4m0-8 4 4m0-8 4 4"/>',
      'Zodiac Signs': '<path d="m12 3 3 6 6 1-4.5 4.5 1 6.5-5.5-3-5.5 3 1-6.5L3 10l6-1Z"/>',
      MBTI: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
      Nationality: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
      Occupation: '<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V3h8v4M3 12h18"/>',
      Hobbies: '<path d="M12 21 4 13C-2 5 7 0 12 7c5-7 14-2 8 6Z"/>',
      Personality: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    };
    const glyph = label => `<span class="chat-fact-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths[label] || paths.MBTI}</svg></span>`;
    const facts = [['Birthday',c.profile?.birthday?.replaceAll('/','-')], ['Height',c.profile?.height], ['Zodiac Signs',c.profile?.zodiac], ['MBTI',c.profile?.mbti], ['Nationality',c.nationality], ['Occupation',c.profession]];
    panel.innerHTML = `<div class="chat-profile-top"><button type="button" class="chat-profile-close" aria-label="Close profile">×</button></div>
      <div class="chat-profile-media"><img class="chat-profile-portrait" src="${c.image}" alt="${c.name}, a fictional AI companion">
      <button class="portrait-open" type="button" data-profile-zoom aria-label="Browse ${c.shortName}’s photos"></button></div>
      ${pictures.length > 1 ? `<div class="chat-profile-gallery" role="group" aria-label="Profile images"><button type="button" data-profile-step="-1" aria-label="Previous profile photo">‹</button>${pictures.map((picture, index) => `<button type="button" data-profile-image="${index}" aria-label="${picture.label}" aria-pressed="${index === 0}">${locked(picture) ? '<span class="lock-icon" aria-hidden="true"></span>' : `<img src="${picture.src}" alt="">`}</button>`).join('')}<button type="button" data-profile-step="1" aria-label="Next profile photo">›</button></div>` : ''}
      <div class="chat-profile-copy"><div class="chat-profile-identity"><h2 id="chat-profile-title">${c.name}</h2><button type="button" data-profile-details aria-controls="chat-profile-details" aria-expanded="true" aria-label="Collapse profile details"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M5 17c0-5 8-5 8 0m2-9h4m-4 4h4m-4 4h4"/></svg></button></div>
      <p class="chat-profile-session">Fictional AI companion</p>
      <div id="chat-profile-details"><p class="chat-profile-summary">${c.summary}</p>
      <dl class="chat-profile-facts">${facts.filter(([,value])=>value).map(([label,value])=>`<div>${glyph(label)}<dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>
      <section class="chat-profile-attribute">${glyph('Hobbies')}<div><h3>Hobbies</h3><p>${c.profile?.hobbies || c.interests.join(' · ')}</p></div></section>
      <section class="chat-profile-attribute">${glyph('Personality')}<div><h3>Personality</h3><div class="chat-profile-tags">${(c.profile?.traits || c.traits).map(trait=>`<span>${trait}</span>`).join('')}</div></div></section>
      <section><h3>A moment with ${c.shortName}</h3><p>${story}</p></section></div>

      <p class="chat-profile-note">A fictional AI character. Profile copy is a creative preview.</p></div>`;
    slot.append(panel);
    const sync = () => {
      if (compact.matches) {
        drawer.append(panel);
        trigger.setAttribute('aria-controls', 'chat-profile-drawer');
        trigger.setAttribute('aria-haspopup', 'dialog');
      } else {
        if (drawer.open) drawer.close();
        slot.append(panel);
        trigger.setAttribute('aria-controls', panel.id);
        trigger.removeAttribute('aria-haspopup');
      }
    };
    drawer.id = 'chat-profile-drawer';
    trigger.addEventListener('click', () => {
      if (compact.matches) { drawer.showModal(); panel.querySelector('.chat-profile-close').focus(); }
      else { panel.focus({ preventScroll: true }); panel.scrollTop = 0; }
    });
    panel.querySelector('.chat-profile-close').addEventListener('click', () => drawer.close());
    drawer.addEventListener('close', () => { if (trigger.isConnected && location.hash === `#chat/${c.id}`) trigger.focus({ preventScroll: true }); });
    drawer.addEventListener('click', event => {
      if (event.target !== drawer) return;
      const bounds = drawer.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) drawer.close();
    });
    let pictureIndex = 0;
    const portrait = panel.querySelector('.chat-profile-portrait');
    panel.querySelector('[data-profile-details]').addEventListener('click', event => {
      const button = event.currentTarget;
      const details = panel.querySelector('#chat-profile-details');
      details.hidden = !details.hidden;
      button.setAttribute('aria-expanded', String(!details.hidden));
      button.setAttribute('aria-label', `${details.hidden ? 'Expand' : 'Collapse'} profile details`);
    });
    const zoom = document.createElement('dialog');
    zoom.className = 'chat-portrait-zoom';
    zoom.setAttribute('aria-label', `${c.shortName} full portrait`);
    zoom.innerHTML = `<button type="button" class="viewer-close" aria-label="Close photo viewer">×</button>
      <div class="viewer-stage"><img alt=""><div class="gallery-lock" hidden><span class="lock-icon" aria-hidden="true"></span><strong>VIP portrait</strong><a class="button button-primary" href="#membership">Unlock with VIP</a></div></div>
      <div class="viewer-controls"><button type="button" data-step="-1" aria-label="Previous photo">‹</button><span aria-live="polite"></span><button type="button" data-step="1" aria-label="Next photo">›</button></div>`;
    host.append(zoom);
    const preview = zoom.querySelector('img');
    let returnTo;
    const select = index => {
      pictureIndex = (index + pictures.length) % pictures.length;
      const photo = pictures[pictureIndex];
      const isLocked = locked(photo);
      preview.hidden = isLocked;
      if (isLocked) preview.removeAttribute('src');
      else { preview.src = photo.src; preview.alt = c.shortName + ' · ' + photo.label; }
      zoom.querySelector('.gallery-lock').hidden = !isLocked;
      zoom.querySelector('.viewer-controls span').textContent = photo.label + ' · ' + (pictureIndex + 1) + ' / ' + pictures.length;
      portrait.src = isLocked ? c.image : photo.src;
      portrait.classList.toggle('locked-preview', isLocked);
      panel.querySelectorAll('[data-profile-image]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.profileImage) === pictureIndex)));
    };
    openPhoto = (index, opener) => {
      if (!signedIn) {
        pendingPhoto = { id: c.id, index };
        portalAuth.open({});
        return;
      }
      returnTo = opener;
      select(index);
      if (!zoom.open) zoom.showModal();
    };
    panel.querySelector('[data-profile-zoom]').addEventListener('click', event => openPhoto(pictureIndex, event.currentTarget));
    panel.querySelectorAll('[data-profile-image]').forEach(button => button.addEventListener('click', () => openPhoto(Number(button.dataset.profileImage), button)));
    panel.querySelectorAll('[data-profile-step]').forEach(button => button.addEventListener('click', () => openPhoto(pictureIndex + Number(button.dataset.profileStep), button)));
    zoom.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => select(pictureIndex + Number(button.dataset.step))));
    zoom.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        select(pictureIndex + (event.key === 'ArrowLeft' ? -1 : 1));
      }
    });
    zoom.querySelector('.gallery-lock a').addEventListener('click', () => window.RizzoraIP.rememberUpgradePhoto(c.id, pictureIndex));
    zoom.querySelector('.viewer-close').addEventListener('click', () => zoom.close());
    zoom.addEventListener('close', () => { if (returnTo?.isConnected) returnTo.focus({preventScroll:true}); });
    compact.addEventListener('change', sync);
    sync();
    if (signedIn && pendingPhoto?.id === c.id) {
      const { index } = pendingPhoto;
      pendingPhoto = null;
      openPhoto(index, compact.matches ? trigger : panel.querySelector('[data-profile-zoom]'));
    }
    disposeProfile = () => { if (zoom.open) zoom.close(); compact.removeEventListener('change', sync); if (drawer.open) drawer.close(); disposeProfile = () => {}; };
  }
  async function showStarters(character, state, group, input) {
    if (state.messages.some(message => message.role === 'user')) return;
    // The integration provides getConversationStarters(characterId) -> Promise<string[]>.
    // With no provider installed, the static preview uses its character samples.
    const provider = window.RizzoraChatService;
    let lines;
    try {
      state.starters ??= provider
        ? Promise.resolve(provider.getConversationStarters(character.id))
        : character.conversationStarters.map(starter => starter.message);
      lines = await state.starters;
    } catch {
      delete state.starters;
      return;
    }
    if (!Array.isArray(lines) || !group.isConnected || state.messages.some(message => message.role === 'user')) return;
    for (const line of lines) {
      if (typeof line !== 'string' || !line.trim() || line.length > input.maxLength) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.chatPrompt = '';
      button.textContent = line.trim();
      button.addEventListener('click', () => {
        state.draft = input.value = button.textContent;
        updateComposer(character.id);
        input.focus();
      });
      group.append(button);
      if (group.childElementCount === 2) break;
    }
    group.hidden = !group.childElementCount;
  }
  function render(container, id) {
    disposeProfile(); host = container; activeId = null;
    document.title = 'Messages | Rizzora';
    if (id && !byId(id)) {
      host.innerHTML = '<header class="ip-page-heading"><h1>Character not found.</h1></header><a class="text-link" href="#discover">Explore the characters</a>';
      return;
    }
    const inbox = signedIn && !id;
    if (!id) id = signedIn ? lastOpened || recentThreads()[0]?.[0] : characters[0].id;
    if (!id) {
      host.innerHTML = `<div class="chat-layout empty-chat">${historyPane()}<section class="empty-room"><div>
        <h1>No conversations yet</h1><p>Choose a companion and say hello.</p><a class="button button-primary" href="#discover">Explore the characters</a>
        </div></section></div>`;
      bindHistory(); return;
    }
    activeId = id;
    if (signedIn) lastOpened = id;
    const c = byId(id);
    selectedCharacter = c;
    document.title = `Chat with ${c.shortName} | Rizzora`;
    const state = thread(id);
    if (!state.unread) state.messages.forEach(message => { message.newArrival = false; });
    host.innerHTML = `<div class="chat-layout ${inbox ? 'show-inbox' : ''}">${historyPane()}<section class="chat-room" aria-label="Conversation with ${c.shortName}"><header class="chat-heading"><a class="chat-back" href="${signedIn ? '#chat' : '#discover'}" aria-label="${signedIn ? 'Back to conversations' : 'Discover companions'}">←</a><span class="avatar-wrap"><span class="stamina-ring" role="meter" aria-label="${c.shortName} stamina" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${state.stamina}" title="Stamina: ${state.stamina}%" style="--remaining:${state.stamina}%"><img src="${c.image}" alt=""></span><button class="avatar-profile" type="button" data-show-chat-profile aria-label="${c.shortName}’s profile"></button></span><div><h1 tabindex="-1">${c.shortName}</h1><p class="chat-presence"></p></div><button type="button" class="chat-activities" hidden>Activities</button></header><div class="chat-log" id="chat-log" role="log" aria-label="Messages with ${c.shortName}" aria-live="polite" aria-relevant="additions" tabindex="0"></div><div class="chat-starters" role="group" aria-label="Conversation starters" hidden></div><p class="chat-status" id="chat-status" role="status"></p><form id="chat-form" class="chat-composer"><label for="chat-message">Message ${c.shortName}</label><div class="chat-input-row"><textarea id="chat-message" rows="2" maxlength="1000" placeholder="Say something…"></textarea><button class="button button-primary" id="chat-send" type="submit">Send</button></div></form></section><div class="chat-profile-slot"></div><dialog class="chat-profile-dialog" aria-labelledby="chat-profile-title"></dialog></div>`;
    bindHistory();
    clearUnread();
    updatePresence();
    mountProfile(c);
    host.querySelector('#chat-log').addEventListener('scroll', clearUnread);
    host.querySelector('.chat-activities').onclick = () => openActivities(id);
    const input = host.querySelector('#chat-message');
    input.value = state.draft;
    input.addEventListener('input', () => { state.draft = input.value; updateComposer(id); });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) { event.preventDefault(); send(id); }
    });
    host.querySelector('#chat-form').addEventListener('submit', event => { event.preventDefault(); send(id); });
    showStarters(c, state, host.querySelector('.chat-starters'), input);
    renderMessages(id);
    if (requestedActivity?.id===id && signedIn) openActivities(id,requestedActivity.level);
    requestedActivity=null;
  }
  function resumeGuestDraft() {
    const draft = guestThreads.get(activeId)?.draft;
    guestThreads.clear();
    if (!draft && !pendingPhoto) return false;
    if (draft) thread(activeId).draft = draft;
    closeDialog();
    navigateTo('chat/' + activeId);
    return true;
  }
  window.addEventListener('online', updatePresence);
  window.addEventListener('offline', updatePresence);
  compactChat.addEventListener('change', clearUnread);
  document.addEventListener('visibilitychange', clearUnread);
  window.RizzoraChat = {
    queueActivity(id,level) { requestedActivity={id,level}; },
    recentConversations, userHistory, saveTab, keepInTab, restoreTab, keepsInTab: () => keepHistory,
    viewPhoto(index) { openPhoto(index, host.querySelector('[data-show-chat-profile]')); },
    render, resumeGuestDraft, leave() { host?.querySelectorAll('audio').forEach(audio => audio.pause()); if (!signedIn) pendingPhoto = null; activeId = null; host = null; disposeProfile(); }, clear() { requestedActivity=null; keepInTab(false); pendingPhoto = null; guestThreads.clear(); threads.forEach(state => clearTimeout(state.timer)); threads.clear(); activeId = lastOpened = null; historySearch = ''; } };
})();
