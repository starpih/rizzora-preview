(() => {
  const main = document.querySelector("#main");
  const extra = document.createElement("div");
  extra.id = "ip-view";
  extra.className = "ip-view section-wrap";
  extra.hidden = true;
  main.append(extra);
  let cycle = "monthly";
  let checkoutDestination = null;
  let checkoutState = "review";
  let upgradePhoto = null;
  let upgradeGame = null;
  let membership = null;
  let accountOrigin = "#home";
  let sampleCredits = 0;
  const cycles = {
    monthly: { label: "Monthly", period: "1 month", first: "$9.95", regular: "$19.90", unit: "month", trialDays: 7 },
    quarterly: { label: "Quarterly", period: "3 months", first: "$24.95", regular: "$49.90", unit: "quarter" },
    yearly: { label: "Yearly", period: "12 months", first: "$89.95", regular: "$179.90", unit: "year" }
  };
  const staminaPacks = {
    coffee: { name: "A Cup of Coffee", price: "$0.99", base: 150, bonus: 0 },
    dessert: { name: "A Sweet Dessert", price: "$14.90", base: 24000, bonus: 3000 },
    lunch: { name: "A Hearty Lunch", price: "$19.90", base: 36000, bonus: 8000 },
    movie: { name: "A Movie Ticket", price: "$29.90", base: 60000, bonus: 12000 },
    dinner: { name: "A Romantic Dinner", price: "$9.99", base: 1500, bonus: 700 }
  };
  let selectedPack = "lunch";
  let completedPack = null;
  const formatStamina = value => value.toLocaleString("en-US");
  const cycleKey = "rizzora.preview.billing-cycle";
  try {
    const savedCycle = sessionStorage.getItem(cycleKey);
    if (Object.hasOwn(cycles, savedCycle)) cycle = savedCycle;
  } catch { /* The selection still works in memory. */ }
  const storageKey = "rizzora.ip.favorites";
  const favorites = new Set();
  try {
    const storedFavorites = sessionStorage.getItem(storageKey);
    const saved = JSON.parse(storedFavorites || "[]");
    if (Array.isArray(saved)) saved.forEach((id) => { if (characters.some((c) => c.id === id)) favorites.add(id); });
    const choices = JSON.parse(sessionStorage.getItem("rizzora.spark.discovery.v1") || "[]");
    if (storedFavorites === null && Array.isArray(choices)) choices.forEach((choice) => { if (choice?.decision === "like" && characters.some((c) => c.id === choice.id)) favorites.add(choice.id); });
  } catch { /* Private browsing may disable session storage. */ }
  const image = (name) => `<img class="icon" src="assets/${name}.svg" alt="">`;
  const byId = (id) => characters.find((c) => c.id === id);
  const deck = document.querySelector(".spark-deck");
  const deckStage = deck.querySelector(".deck-stage");
  const deckQuotes = {
    chris: "One frame left. Let’s save it for the sunset.",
    kim: "Count me in? I want to try that last eight-count again.",
    enzo: "Here, taste this. Do you think it needs more basil?",
    julian: "Pull up a chair. I’m still working out the last chord.",
    hayes: "Hear the rain? This is my favorite seat in the shop."
  };
  const mobileCaption = deck.querySelector(".deck-mobile-caption");
  let deckIndex = 0;
  function positionDeck() {
    const slides = [...deckStage.children];
    const count = slides.length;
    slides.forEach((slide, index) => {
      const distance = (index - deckIndex + count) % count;
      slide.dataset.offset = distance > count / 2 ? distance - count : distance;
      slide.inert = index !== deckIndex;
    });
    const active = slides[deckIndex];
    const quote = deckQuotes[active.dataset.id];
    mobileCaption.querySelector("strong").textContent = active.dataset.name;
    mobileCaption.querySelector("span").textContent = quote;
    deck.querySelector(".deck-status").textContent = `${active.dataset.name}, ${deckIndex + 1} of ${count}. ${quote}`;
  }
  function stepDeck(direction) {
    const count = deckStage.children.length;
    deckIndex = (deckIndex + direction + count) % count;
    positionDeck();
  }
  deck.querySelector(".deck-prev").addEventListener("click", () => stepDeck(-1));
  deck.querySelector(".deck-next").addEventListener("click", () => stepDeck(1));
  deck.addEventListener("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const onCard = deckStage.contains(event.target);
    stepDeck(event.key === "ArrowLeft" ? -1 : 1);
    if (onCard) deckStage.children[deckIndex].focus();
  });
  const heading = (eyebrow, title, detail = "") => `<header class="ip-page-heading"><p class="eyebrow">${eyebrow}</p><h1 tabindex="-1">${title}</h1>${detail ? `<p>${detail}</p>` : ""}</header>`;
  const benefits = `<ul class="ip-benefits">
    <li>${image("message")}Text &amp; photo messages</li>
    <li>${image("mic")}Voice notes &amp; calls</li>
    <li>${image("heart")}60,000 Stamina per month</li>
  </ul>`;
  function recommendations() {
    const liked = characters.filter((c) => favorites.has(c.id));
    const traits = new Set(liked.flatMap((c) => c.traits));
    const pool = characters.filter((c) => !favorites.has(c.id));
    const ranked = [...pool].sort((a, b) => b.traits.filter((t) => traits.has(t)).length - a.traits.filter((t) => traits.has(t)).length);
    const lineup = [...ranked, ...liked].slice(0, 5);
    const orderChanged = lineup.some((c, index) => deckStage.children[index]?.dataset.id !== c.id);
    if (orderChanged) deckIndex = 0;
    deckStage.innerHTML = lineup.map(c => {
      return `<a class="deck-card" data-id="${c.id}" data-name="${c.name}" href="#chat/${c.id}" aria-label="Meet ${c.name}" aria-describedby="deck-quote-${c.id}">
        <img src="assets/discover-scenes/${c.id}.webp" width="1280" height="720" alt="" decoding="async">
        <span class="deck-caption"><strong>${c.name}</strong><span id="deck-quote-${c.id}">${deckQuotes[c.id]}</span></span>
      </a>`;
    }).join("");
    positionDeck();
    renderRecentChats();
  }
  function renderRecentChats() {
    const conversations = window.RizzoraChat.recentConversations();
    const unreadChats = conversations.filter(chat => chat.unread > 0);
    const recent = unreadChats[0] || conversations[0];
    const pill = document.querySelector("#recent-conversation");
    const stack = pill.parentElement;
    stack.hidden = !recent;
    stack.dataset.layers = Math.max(0, Math.min(2, unreadChats.length - 1));
    if (!recent) {
      pill.removeAttribute("href");
      pill.removeAttribute("aria-label");
      pill.querySelector(".recent-message").textContent = "";
      pill.querySelector(".recent-unread").textContent = "";
      return;
    }
    const c = byId(recent.id);
    const words = recent.message.text.trim().split(/\s+/);
    const preview = words.slice(0, 5).join(" ") + (words.length > 5 ? "…" : "");
    pill.href = "#chat/" + c.id;
    pill.querySelector("img").src = c.image;
    pill.querySelector(".recent-message").textContent = preview;
    const badge = pill.querySelector(".recent-unread");
    badge.hidden = !recent.unread;
    badge.textContent = recent.unread > 99 ? "99+" : String(recent.unread);
    const unreadLabel = recent.unread ? `, ${recent.unread} unread` : "";
    const others = unreadChats.length - 1;
    const stackLabel = others > 0 ? ` · ${others} other unread conversation${others > 1 ? "s" : ""}` : "";
    pill.setAttribute("aria-label", `Continue chat with ${c.shortName}${unreadLabel}. ${preview}${stackLabel}`);
    pill.title = `Continue chat with ${c.shortName}${stackLabel}`;
  }
  function membershipPage() {
    extra.innerHTML = `<div class="vip-page">
      <header class="vip-intro">
        <div class="vip-intro-copy">
          <div class="vip-signature"><img src="assets/membership/crown.svg" alt="">Rizzora VIP</div>
          <h1 tabindex="-1">Stay a little<br><em>longer.</em></h1>
          <p>Hear the smile in his voice. Share one more photo before you say goodnight.</p>
        </div>
      </header>
      <form id="plan-form" aria-labelledby="plans-title">
        <header class="plan-heading"><h2 id="plans-title">Choose your plan</h2>
          <p>Save 50% on your first paid billing period. All prices in USD.</p></header>
        <div class="vip-options">${Object.entries(cycles).map(([id, plan]) => `
          <article class="ip-plan ${id === "quarterly" ? "vip-featured" : ""}">
            <div class="vip-plan-top"><h3>${plan.label}</h3>${id === "quarterly" ? '<span class="vip-pick">Our pick</span>' : ""}</div>
            <p class="vip-amount">${plan.first}</p>
            <p class="vip-period">First ${plan.unit}${plan.trialDays ? ` after a ${plan.trialDays}-day free trial` : ""}</p>
            <p class="vip-renewal">Then ${plan.regular} per ${plan.unit}.</p>
            <button class="button plan-buy" type="submit" name="cycle" value="${id}">Choose ${plan.label.toLowerCase()}${image("arrow")}</button>
          </article>`).join("")}
        </div>
        <p class="plan-terms">Plans renew automatically. Cancel anytime. No payment is taken here.</p>
      </form>
      <details class="vip-details"><summary>How Stamina and the free trial work</summary>
        <p>Every plan includes 60,000 Stamina each month. Chats, photos and voice interactions use Stamina. Your monthly allowance resets each month. One-time Stamina packs are valid for 31 days.</p>
        <p>On the monthly plan, the first ${cycles.monthly.trialDays} days are free. Trial Stamina expires at the end of the trial. With a live subscription, your card issuer may briefly show a temporary authorization hold.</p>
      </details>
      <form id="topup-form">
        <fieldset class="ip-plans"><legend tabindex="-1" id="topup-title">Stamina Supplement</legend>
          <p class="topup-copy">Pick a little treat to keep the conversation going. Each one-time pack lasts 31 days.</p>
          <div class="topup-options">${Object.entries(staminaPacks).map(([id, pack]) => `
            <label class="topup-card">
              <input type="radio" name="pack" value="${id}" ${selectedPack === id ? "checked" : ""}>
              <img src="assets/membership/${id}.webp" alt="" width="76" height="76">
              <strong class="topup-name">${pack.name}</strong>
              <span class="topup-quantity">${formatStamina(pack.base)} <small>Stamina</small></span>
              ${pack.bonus ? `<span class="topup-bonus">+ ${formatStamina(pack.bonus)} <small>bonus</small></span>` : ""}
              <span class="topup-price">${pack.price} · one time</span>
            </label>`).join("")}</div>
        </fieldset>
        <div class="vip-review"><p>One-time purchase · No subscription required</p>
          <button class="button button-primary" type="submit">Review pack · <span data-pack-price>${staminaPacks[selectedPack].price}</span>${image("arrow")}</button></div>
        <p class="vip-demo">Illustrative prices · No payment will be taken.</p>
      </form>
      <section class="vip-reasons" aria-labelledby="reasons-title">
        <h2 id="reasons-title">What comes with membership?</h2>
        <div class="reason-grid">
          <article>${image("heart")}<h3>More time together</h3><p>Every plan includes 60,000 Stamina each month. Use it for a quick morning hello or a long conversation after dark.</p></article>
          <article>${image("shield")}<h3>Clear from the start</h3><p>See your first price and renewal rate before you choose. You can cancel your subscription at any time.</p></article>
          <article>${image("mic")}<h3>Hear it in his voice</h3><p>Play a voice note or open a members-only photo. There’s more than one way to get to know him.</p></article>
        </div>
      </section>
    </div>`;
  }
  function beginCheckout(destination) {
    if (signedIn) {
      navigateTo(destination);
      return;
    }
    checkoutDestination = destination;
    showLogin();
  }

  const paymentMethods = `<fieldset class="payment-methods"><legend>Choose a payment method</legend>
    <label><input type="radio" name="method" value="card" checked required>Card</label>
    <label><input type="radio" name="method" value="wallet" required>Digital wallet</label>
  </fieldset>`;
  let packMethod = "";
  function checkout() {
    if (!signedIn) {
      extra.innerHTML = `${heading("RIZZORA VIP", "A little closer.", "Sign in to continue with your selected plan.")}<button class="button button-primary" type="button" data-checkout-login>Log in & continue${image("arrow")}</button><a class="ip-back" href="#membership">Change plan</a>`;
      return;
    }
    if (checkoutState !== "review") {
      const labels = { success: ["VIP is active.", `Confirmed with your ${membership?.method || "card"}. No payment was made.`], failed: ["Payment declined.", "Simulated payment failure. Your membership has not changed."], cancelled: ["Payment cancelled.", "No payment was made. Your membership has not changed."] };
      const [title, detail] = labels[checkoutState];
      const gameLink = upgradeGame ? `<a class="text-link" href="#chat/${upgradeGame}">Back to game</a>` : "";
      const photoLink = upgradePhoto ? `<a class="text-link" href="#chat/${upgradePhoto.id}">${checkoutState === "success" ? "View unlocked photo" : "Back to photo"}</a>` : "";
      extra.innerHTML = `${heading("PAYMENT PREVIEW", title, detail)}<div class="ip-actions">${checkoutState === "success" ? '<a class="button button-primary" href="#account">My account</a>' : '<button class="button button-primary" type="button" data-payment-retry>Try again</button>'}${photoLink}${gameLink}<a class="text-link" href="#membership">Membership plans${image("arrow")}</a></div>`;
      return;
    }
    const plan = cycles[cycle];
    extra.innerHTML = `${heading("CHECKOUT · PREVIEW", "Your VIP membership.")}<div class="ip-membership-layout"><section><h2>Rizzora VIP · ${cycles[cycle].label}</h2>${benefits}</section><form id="payment-form">${paymentMethods}<dl class="ip-order"><div><dt>Billing period</dt><dd>${cycles[cycle].period}</dd></div><div><dt>Starting price (USD)</dt><dd>${plan.trialDays ? `$0 for ${plan.trialDays} days` : `${plan.first} for the first ${plan.unit}`}</dd></div>${plan.trialDays ? `<div><dt>After the trial</dt><dd>${plan.first} for the first ${plan.unit}</dd></div>` : ""}<div><dt>Renews at</dt><dd>${plan.regular} per ${plan.unit}</dd></div><div><dt>Included allowance</dt><dd>60,000 Stamina / month</dd></div></dl><p class="ip-disclosure">Simulation only. No card or billing information is collected.</p><label class="ip-consent"><input type="checkbox" id="payment-consent" required>I understand this is a payment preview with no charge.</label><div class="ip-actions"><button class="button button-primary" type="submit">Simulate payment${image("arrow")}</button><button class="text-link" type="button" data-payment-fail>Simulate failure</button><button class="text-link" type="button" data-payment-cancel>Cancel</button></div></form></div>`;
  }
  function packCheckout(id) {
    const pack = staminaPacks[id];
    selectedPack = id;
    const back = '<a class="text-link" href="#membership/stamina">Back to Stamina packs</a>';
    if (!signedIn) {
      extra.innerHTML = `${heading("STAMINA SUPPLEMENT", pack.name, "Log in to continue with your one-time pack.")}<div class="ip-actions"><button class="button button-primary" type="button" data-checkout-login>Log in &amp; continue${image("arrow")}</button>${back}</div>`;
      return;
    }
    const total = formatStamina(pack.base + pack.bonus);
    if (completedPack === id) {
      extra.innerHTML = `${heading("STAMINA SUPPLEMENT", "Your Stamina is ready.", `${total} Stamina added with your ${packMethod}. No payment was made.`)}<p>Extra Stamina balance: ${formatStamina(sampleCredits)}</p><div class="ip-actions"><a class="button button-primary" href="#account">My account</a>${back}</div>`;
      return;
    }
    extra.innerHTML = `${heading("ONE-TIME PURCHASE", "Your Stamina pack.")}<div class="ip-membership-layout"><section class="topup-summary"><img src="assets/membership/${id}.webp" alt=""><h2>${pack.name}</h2><p>Valid for 31 days · No automatic renewal</p></section>
      <form id="pack-payment-form">${paymentMethods}<dl class="ip-order"><div><dt>Stamina</dt><dd>${formatStamina(pack.base)}</dd></div><div><dt>Bonus</dt><dd>+ ${formatStamina(pack.bonus)}</dd></div><div><dt>Total Stamina</dt><dd>${total}</dd></div><div><dt>One-time price (USD)</dt><dd>${pack.price}</dd></div></dl>
      <label class="ip-consent"><input type="checkbox" required>I understand no payment will be taken.</label>
      <div class="ip-actions"><button class="button button-primary" type="submit">Simulate top-up</button>${back}</div></form></div>`;
  }
  function account() {
    const header = `<div class="center-title"><a class="icon-button center-back" aria-label="Back" id="account-back">${image("arrow")}</a><h1 tabindex="-1">User Center</h1></div>`;
    extra.innerHTML = `<div class="personal-center">${header}${signedIn ? `
      ${window.RizzoraCenter.profileMarkup()}
      <section class="uc-level"></section>
      <section class="center-section"><h2>Membership</h2>
        <div class="center-membership"><strong>${membership ? `Rizzora VIP · ${cycles[membership.cycle].label}` : "Free Plan"}</strong>
          <a class="button button-primary" href="#membership">${membership ? "View plan" : "Become Premium"}${image("arrow")}</a></div>
      </section>
      <section class="uc-map" hidden></section>
      <div class="center-menu">
        <button type="button" data-center-supplement>Stamina Supplement${image("chevron")}</button>
        <button type="button" data-center-install>Install app${image("chevron")}</button>
        <button type="button" data-signout>Log out${image("chevron")}</button>
      </div>
      ${window.RizzoraAuthService ? "" : `<label class="keep-chats"><input id="keep-demo-chats" type="checkbox" ${window.RizzoraChat.keepsInTab() ? "checked" : ""}> Keep my profile and conversations in this tab after a refresh</label>`}
      ` : `
      <p>Log in to view your account and membership.</p><button type="button" class="button button-primary" data-open="login">Log in</button>`}</div>`;
    if (signedIn) window.RizzoraCenter.mount(extra, account);
    extra.querySelector("#keep-demo-chats")?.addEventListener("change", event => {
      event.target.checked = window.RizzoraChat.keepInTab(event.target.checked);
    });
    extra.querySelector("#account-back").setAttribute("href", accountOrigin);
  }

  function stopMedia() { document.querySelectorAll("#ip-view video").forEach((v) => v.pause()); }
  function route({ initialLoad = false } = {}) {
    // A history/navigation change cancels the old dialog's intended destination.
    if (dialog.open) {
      pendingChat = false; checkoutDestination = null; returnFocus = null;
      portalAuth.close(); closeDialog();
    }
    stopMedia();
    stopFeaturedPreview();
    window.RizzoraChat?.leave();
    let hash = location.hash.slice(1);
    const oldProfile = /^(?:character\/|story-|moments-)([^/]+)$/.exec(hash);
    if (oldProfile) {
      hash = `chat/${oldProfile[1]}`;
      history.replaceState(history.state, "", "#" + hash);
    }
    const returnPhoto = upgradePhoto && hash === "chat/" + upgradePhoto.id ? upgradePhoto : null;
    const returnGame = upgradeGame && hash === "chat/"+upgradeGame ? upgradeGame : null;
    if (hash !== "membership" && hash !== "checkout") { upgradePhoto = null; upgradeGame = null; }
    const onMembership = hash === "membership" || hash === "membership/stamina";
    const packId = hash.startsWith("stamina-checkout/") ? hash.slice("stamina-checkout/".length) : "";
    const onPackCheckout = Object.hasOwn(staminaPacks, packId);
    const isChat = hash === "chat" || hash.startsWith("chat/");
    const isHome = !isChat && !onMembership && !onPackCheckout && !["discover", "membership", "checkout", "account"].includes(hash);
    document.querySelector("#home-view").hidden = !isHome;
    document.querySelector("#discover-view").hidden = hash !== "discover";
    extra.hidden = isHome || hash === "discover";
    document.body.dataset.view = isHome ? "home" : hash === "discover" ? "discover" : isChat ? "chat" : "ip";
    document.querySelectorAll("[data-nav]").forEach((a) => { if (a.dataset.nav === (isHome ? "home" : isChat ? "chat" : onMembership || onPackCheckout ? "membership" : hash)) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    if (isChat) window.RizzoraChat.render(extra, hash.split("/")[1]);
    else if (onPackCheckout) { packCheckout(packId); document.title = "Stamina Pack | Rizzora"; }
    else if (onMembership) { membershipPage(); document.title = "VIP Membership | Rizzora"; }
    else if (hash === "checkout") { checkout(); document.title = "Checkout Preview | Rizzora"; }
    else if (hash === "account") { account(); document.title = "User Center | Rizzora"; }
    else if (hash === "discover") { recommendations(); document.title = "Discover Characters | Rizzora"; }
    else document.title = "Rizzora | Characters. Stories. Connection.";
    closeMenu();
    const draftInput = hash.startsWith("chat/") ? extra.querySelector("#chat-message") : null;
    let focusTarget = isHome ? document.querySelector(".hero h1") : hash === "discover" ? document.querySelector("#discover-title") : extra.querySelector("h1");
    if (hash === "membership/stamina") focusTarget = extra.querySelector("#topup-title");
    if (draftInput?.value) focusTarget = draftInput;
    if (!dialog.open && focusTarget && !initialLoad) {
      if (focusTarget !== draftInput) focusTarget.setAttribute("tabindex", "-1");
      focusTarget.focus({ preventScroll: true });
    }
    if (isHome && hash && hash !== "home") document.getElementById(hash)?.scrollIntoView();
    else if (hash === "membership/stamina") focusTarget.scrollIntoView({ block: "start" });
    else window.scrollTo({ top: 0, behavior: "instant" });
    if (returnGame) window.RizzoraChat.playStory(returnGame);
    if (returnPhoto) window.RizzoraChat.viewPhoto(returnPhoto.index);
    window.RizzoraHero?.sync();
  }
  window.RizzoraIP = {
    route, renderRecentChats,
    demoBenefits() { return { membership, sampleCredits, moments: window.RizzoraMoments.snapshot() }; },
    spendPlayStamina(amount) {
      if (!signedIn || !Number.isSafeInteger(amount) || amount <= 0 || sampleCredits < amount) return false;
      sampleCredits -= amount;
      return true;
    },
    restoreDemoBenefits(account) {
      window.RizzoraMoments.restore(account?.moments);
      window.RizzoraCenter.restore(account?.profile);
      const plan = account?.membership;
      if (plan && Object.hasOwn(cycles, plan.cycle)) membership = { cycle: plan.cycle, renewal: Boolean(plan.renewal) };
      if (Number.isSafeInteger(account?.sampleCredits) && account.sampleCredits >= 0) sampleCredits = account.sampleCredits;
    },
    rememberGame(id) { upgradeGame = id; },
    rememberUpgradePhoto(id, index) { upgradePhoto = { id, index }; },
    openAccount() {
      if (!["#account", "#checkout"].includes(location.hash)) accountOrigin = location.hash || "#home";
      navigateTo("account");
    },
    afterLogin() {
      if (!checkoutDestination) return false;
      const next = checkoutDestination;
      checkoutDestination = null;
      pendingChat = false;
      closeDialog();
      navigateTo(next);
      return true;
    },
    isVIP() { return signedIn && Boolean(membership); },
  };
  dialog.addEventListener("close", () => { if (!signedIn) checkoutDestination = null; });
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button, a");
    if (!button) return;
    if (button.hasAttribute("data-checkout-login")) beginCheckout(location.hash.slice(1));
    if (button.hasAttribute("data-payment-retry")) { checkoutState = "review"; checkout(); }
    if (button.hasAttribute("data-payment-fail")) { checkoutState = "failed"; checkout(); }
    if (button.hasAttribute("data-payment-cancel")) { checkoutState = "cancelled"; checkout(); }
    if (button.hasAttribute("data-center-install")) {
      showDialog('<h2 id="dialog-title">Install app</h2><p>App installation is unavailable in this preview. You can keep using Rizzora in your browser.</p>');
    }
    if (button.hasAttribute("data-center-supplement") && signedIn) {
      showDialog(`<h2 id="dialog-title">Stamina Supplement</h2><p>Choose a one-time pack to add Stamina.</p>
        <p role="status" data-credit-balance>Extra credits: ${sampleCredits}</p>
        <a class="button button-primary" href="#membership/stamina">Browse Stamina packs</a>`);
    }
    if (button.hasAttribute("data-signout")) {
      membership = null; sampleCredits = 0; completedPack = null; checkoutDestination = null;
      window.RizzoraMoments.reset();
      window.RizzoraCenter.reset();
      window.RizzoraChat?.clear();
      if (location.hash === "#account") { account(); extra.querySelector("h1").focus(); }
    }
  });
  document.addEventListener("change", event => {
    if (event.target.matches('#topup-form input[name="pack"]')) {
      selectedPack = event.target.value;
      extra.querySelector("[data-pack-price]").textContent = staminaPacks[selectedPack].price;
    }
  });
  document.addEventListener("submit", (event) => {
    if (event.target.id === "topup-form") {
      event.preventDefault();
      selectedPack = new FormData(event.target).get("pack");
      if (!Object.hasOwn(staminaPacks, selectedPack)) return;
      completedPack = null;
      beginCheckout("stamina-checkout/" + selectedPack);
    }
    if (event.target.id === "pack-payment-form") {
      event.preventDefault();
      if (!signedIn || completedPack === selectedPack || !event.target.checkValidity()) return;
      packMethod = new FormData(event.target).get("method");
      const pack = staminaPacks[selectedPack];
      sampleCredits += pack.base + pack.bonus;
      completedPack = selectedPack;
      if (window.RizzoraChat.keepsInTab()) window.RizzoraChat.keepInTab(true);
      packCheckout(selectedPack);
      extra.querySelector("h1").focus();
    }
    if (event.target.id === "plan-form") {
      event.preventDefault();
      const choice = event.submitter?.value;
      if (!Object.hasOwn(cycles, choice)) return;
      cycle = choice;
      try { sessionStorage.setItem(cycleKey, cycle); } catch { /* Keep the selection in memory. */ }
      checkoutState = "review";
      beginCheckout("checkout");
    }
    if (event.target.id === "payment-form") {
      event.preventDefault();
      if (!signedIn || checkoutState !== "review" || !event.target.checkValidity()) return;
      membership = { cycle, renewal: true, method: new FormData(event.target).get("method") };
      checkoutState = "success";
      checkout();
      extra.querySelector("h1").focus();
    }
  });
  window.RizzoraChat.restoreTab();
  recommendations();
  route({ initialLoad: true });
})();
