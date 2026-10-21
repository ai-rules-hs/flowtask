/*
 * 화면 전환, 저장, 읽어 주기를 다룹니다.
 * 동화 문장은 stories.js, 그림은 art.js, 사진 자르기는 photo.js에 있어요.
 */
(function () {
  'use strict';
  const FT = window.FT;
  const $ = (id) => document.getElementById(id);

  const KEY_PROFILE = 'ft.profile.v1';
  const KEY_SHELF = 'ft.shelf.v1';
  const FROM_CHOICES = ['엄마 아빠', '엄마', '아빠', '할머니', '할아버지'];
  const SHELF_MAX = 30;

  // 다른 페이지 안에 끼워져 열리면 인쇄와 오프라인 설치를 쓸 수 없어요.
  const framed = (() => {
    try { return window.self !== window.top; } catch (e) { return true; }
  })();

  // 저장소는 사생활 보호 모드 등에서 막힐 수 있어서 늘 실패를 견디게 써요.
  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const newSeed = () => 1 + Math.floor(Math.random() * 2147483646);

  // 사진은 data URL로 저장하고, 화면에는 짧은 blob 주소로 넘겨서 그림을 가볍게 해요.
  function toObjectUrl(dataUrl) {
    try {
      const [head, b64] = dataUrl.split(',');
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return URL.createObjectURL(new Blob([bytes], { type: head.slice(5, head.indexOf(';')) }));
    } catch (e) {
      return dataUrl;
    }
  }

  const profile = Object.assign(
    { name: '', photo: null, animal: 'any', world: 'any', outfit: 'yellow', from: FT.DEFAULT_FROM },
    load(KEY_PROFILE, {})
  );
  let shelf = load(KEY_SHELF, []);
  if (!Array.isArray(shelf)) shelf = [];

  let photoUrl = null;
  let previewSeed = newSeed();
  const reader = { story: null, record: null, page: 0, speaking: false, savedId: null };

  function setPhoto(dataUrl) {
    if (photoUrl && photoUrl.startsWith('blob:')) URL.revokeObjectURL(photoUrl);
    profile.photo = dataUrl;
    photoUrl = dataUrl ? toObjectUrl(dataUrl) : null;
  }

  let warnedStorage = false;
  function saveProfile() {
    if (!save(KEY_PROFILE, profile) && !warnedStorage) {
      warnedStorage = true;
      save(KEY_PROFILE, Object.assign({}, profile, { photo: null }));
      toast('이 브라우저에는 사진을 저장할 수 없어서, 다음에 열면 다시 골라야 해요.');
    }
  }

  function recordFor(seed) {
    return { seed, name: profile.name, animal: profile.animal, world: profile.world, outfit: profile.outfit, from: profile.from };
  }

  function artCtx(story) {
    return { photo: photoUrl, outfit: FT.outfitById(story.meta.outfit), friend: story.meta.emoji };
  }

  function wordsHtml(p) {
    if (p.kind === 'cover') return `<h2 class="cover-title">${esc(p.title)}</h2><p class="cover-sub">${esc(p.sub)}</p>`;
    return `<p>${esc(p.text)}</p>`;
  }

  // ---------- 알림 ----------

  let toastTimer = 0;
  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2800);
  }

  // ---------- 만들기 화면 ----------

  function renderChips(el, items, selected, onPick) {
    el.innerHTML = items.map((it) => {
      const icon = it.icon === '?' ? '<span class="chip-icon any" aria-hidden="true">?</span>'
        : it.icon ? `<span class="chip-icon" aria-hidden="true">${it.icon}</span>` : '';
      return `<button type="button" class="chip" data-id="${esc(it.id)}" aria-pressed="${it.id === selected}">${icon}<span>${esc(it.label)}</span></button>`;
    }).join('');
    el.onclick = (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      el.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      onPick(btn.dataset.id);
    };
  }

  function renderSwatches() {
    const el = $('outfit-chips');
    el.innerHTML = FT.OUTFITS.map((o) =>
      `<button type="button" class="swatch" data-id="${o.id}" aria-pressed="${o.id === profile.outfit}" aria-label="${esc(o.label)}" style="background:${o.main}"></button>`
    ).join('');
    el.onclick = (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      el.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      profile.outfit = btn.dataset.id;
      changed();
    };
  }

  function renderFromChips() {
    renderChips($('from-chips'), FROM_CHOICES.map((v) => ({ id: v, label: v })), profile.from, (v) => {
      profile.from = v;
      $('from-name').value = v;
      changed();
    });
  }

  function syncFromChips() {
    $('from-chips').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === profile.from.trim())));
  }

  function renderThumb() {
    $('photo-thumb').innerHTML = photoUrl ? `<img src="${esc(photoUrl)}" alt="">` : '사진';
    $('photo-clear').hidden = !photoUrl;
  }

  function renderPreview() {
    const story = FT.makeStory(recordFor(previewSeed), previewSeed);
    const cover = story.pages[0];
    $('preview-art').innerHTML = FT.renderScene(cover.art, artCtx(story));
    $('preview-title').textContent = cover.title;
    $('preview-sub').textContent = cover.sub;
  }

  let previewTimer = 0;
  function changed(soon) {
    saveProfile();
    clearTimeout(previewTimer);
    if (soon) previewTimer = setTimeout(renderPreview, 150);
    else renderPreview();
  }

  function setupMake() {
    renderChips(
      $('animal-chips'),
      FT.ANIMALS.map((a) => ({ id: a.id, label: a.label, icon: a.emoji })).concat({ id: 'any', label: '아무나', icon: '?' }),
      profile.animal,
      (id) => { profile.animal = id; changed(); }
    );
    renderChips(
      $('world-chips'),
      FT.WORLDS.map((w) => ({ id: w.id, label: w.label, icon: w.icon })).concat({ id: 'any', label: '아무 데나', icon: '?' }),
      profile.world,
      (id) => { profile.world = id; changed(); }
    );
    renderSwatches();
    renderFromChips();

    const nameInput = $('baby-name');
    nameInput.value = profile.name;
    nameInput.addEventListener('input', () => { profile.name = nameInput.value; changed(true); });

    const fromInput = $('from-name');
    fromInput.value = profile.from;
    fromInput.addEventListener('input', () => { profile.from = fromInput.value; syncFromChips(); changed(true); });

    [nameInput, fromInput].forEach((input) => input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    }));

    // 사진
    const cropper = new FT.Cropper($('crop-canvas'), $('crop-zoom'));
    $('photo-input').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        await cropper.load(file);
        $('cropper').hidden = false;
        cropper.layout();
        $('cropper').scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (err) {
        toast('사진을 열지 못했어요. 다른 사진으로 해 볼까요?');
      }
    });
    $('crop-cancel').addEventListener('click', () => { $('cropper').hidden = true; });
    $('crop-done').addEventListener('click', () => {
      setPhoto(cropper.result());
      $('cropper').hidden = true;
      renderThumb();
      changed();
      toast('얼굴을 넣었어요!');
    });
    $('photo-clear').addEventListener('click', () => {
      setPhoto(null);
      renderThumb();
      changed();
    });
    window.addEventListener('resize', () => { if (!$('cropper').hidden) cropper.layout(); });

    $('make-form').addEventListener('submit', (e) => {
      e.preventDefault();
      openStory(recordFor(previewSeed), true);
      previewSeed = newSeed();
      renderPreview();
    });

    renderThumb();
    renderPreview();
    renderShelf();
  }

  // ---------- 책장 ----------

  function sameRecord(a, b) {
    return ['seed', 'name', 'animal', 'world', 'outfit', 'from'].every((k) => a[k] === b[k]);
  }

  function renderShelf() {
    $('shelf').hidden = shelf.length === 0;
    $('shelf-list').innerHTML = shelf.map((item) => {
      const story = FT.makeStory(item, item.seed);
      const date = new Date(item.at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
      return `<li class="shelf-item" data-id="${esc(item.id)}">` +
        `<button type="button" class="shelf-open" data-act="open"><span class="art">${FT.renderScene(story.pages[0].art, artCtx(story))}</span>` +
        `<span class="shelf-text"><strong>${esc(story.title)}</strong><small>${esc(date)}에 꽂음</small></span></button>` +
        '<button type="button" class="shelf-del" data-act="del">빼기</button></li>';
    }).join('');
  }

  $('shelf-list').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.closest('.shelf-item').dataset.id;
    const item = shelf.find((s) => s.id === id);
    if (!item) return;
    if (btn.dataset.act === 'open') {
      openStory(item, true);
    } else if (btn.classList.contains('armed')) {
      shelf = shelf.filter((s) => s.id !== id);
      save(KEY_SHELF, shelf);
      renderShelf();
      toast('책장에서 뺐어요.');
    } else {
      // 실수로 지우지 않게 한 번 더 눌러야 빠져요.
      btn.classList.add('armed');
      btn.textContent = '정말 뺄까요?';
      setTimeout(() => {
        btn.classList.remove('armed');
        btn.textContent = '빼기';
      }, 3500);
    }
  });

  function updateSaveButton() {
    const saved = Boolean(reader.savedId);
    $('btn-save').disabled = saved;
    $('btn-save').textContent = saved ? '책장에 있어요' : '책장에 꽂기';
  }

  function saveToShelf() {
    if (reader.savedId) return;
    const item = Object.assign({ id: 's' + Date.now().toString(36), at: Date.now() }, reader.record);
    shelf.unshift(item);
    if (shelf.length > SHELF_MAX) shelf.length = SHELF_MAX;
    if (!save(KEY_SHELF, shelf)) {
      shelf.shift();
      toast('저장 공간이 부족해서 책장에 꽂지 못했어요.');
      return;
    }
    reader.savedId = item.id;
    updateSaveButton();
    toast('책장에 꽂았어요. 만들기 화면 아래에서 다시 볼 수 있어요.');
  }

  // ---------- 읽기 화면 ----------

  function showReader(open) {
    $('screen-read').hidden = !open;
    $('screen-make').inert = open;
    document.body.classList.toggle('reading', open);
    if (open) {
      keepAwake(true);
    } else {
      stopSpeaking();
      keepAwake(false);
      renderShelf();
    }
  }

  function openStory(record, pushHistory) {
    reader.record = Object.assign({}, record);
    delete reader.record.id;
    delete reader.record.at;
    reader.story = FT.makeStory(reader.record, reader.record.seed);
    reader.page = 0;
    const saved = shelf.find((s) => sameRecord(s, reader.record));
    reader.savedId = saved ? saved.id : null;
    if (pushHistory && $('screen-read').hidden) {
      try { history.pushState({ ft: 'read' }, ''); } catch (e) { /* 기록을 못 남겨도 읽기는 돼요 */ }
    }
    showReader(true);
    renderPage(0);
  }

  function closeReader() {
    if (history.state && history.state.ft === 'read') history.back();
    else showReader(false);
  }

  window.addEventListener('popstate', () => {
    if (!$('screen-read').hidden) showReader(false);
  });

  function renderPage(dir) {
    const { story, page } = reader;
    const p = story.pages[page];
    const total = story.pages.length;
    $('page-art').innerHTML = FT.renderScene(p.art, artCtx(story));
    let html = wordsHtml(p);
    if (p.kind === 'end') {
      html += '<div class="the-end" aria-hidden="true"><span>끝</span></div>' +
        '<div class="end-actions"><button type="button" class="btn-soft" data-act="restart">처음부터 다시</button>' +
        '<button type="button" class="btn-soft" data-act="shuffle">다른 이야기</button></div>';
    }
    $('page-words').innerHTML = html;
    $('read-title').textContent = story.title;
    $('page-no').textContent = `${page + 1} / ${total}`;
    $('progress-bar').style.width = `${((page + 1) / total) * 100}%`;
    $('btn-prev').disabled = page === 0;
    $('btn-next').disabled = page === total - 1;
    const el = $('page');
    el.classList.remove('turn-next', 'turn-prev');
    if (dir) {
      void el.offsetWidth; // 같은 애니메이션을 다시 틀기 위해 한 번 그려요
      el.classList.add(dir > 0 ? 'turn-next' : 'turn-prev');
    }
    $('book').scrollTop = 0;
    updateSaveButton();
  }

  function go(delta) {
    const next = reader.page + delta;
    if (next < 0 || next >= reader.story.pages.length) return false;
    reader.page = next;
    renderPage(delta);
    if (reader.speaking) speakPage();
    return true;
  }

  function shuffle() {
    stopSpeaking();
    openStory(Object.assign({}, reader.record, { seed: newSeed() }), false);
    toast('새 이야기를 펼쳤어요.');
  }

  function printBook() {
    const { story } = reader;
    const ctx = artCtx(story);
    $('print-book').innerHTML = story.pages.map((p) =>
      `<section class="print-page"><div class="art">${FT.renderScene(p.art, ctx)}</div><div class="words">${wordsHtml(p)}</div></section>`
    ).join('');
    window.print();
  }

  function setupReader() {
    $('btn-back').addEventListener('click', closeReader);
    $('btn-prev').addEventListener('click', () => go(-1));
    $('btn-next').addEventListener('click', () => go(1));
    $('btn-shuffle').addEventListener('click', shuffle);
    $('btn-save').addEventListener('click', saveToShelf);
    $('btn-speak').addEventListener('click', toggleSpeak);
    if (framed || typeof window.print !== 'function') $('btn-print').hidden = true;
    else $('btn-print').addEventListener('click', printBook);
    if (!synth) $('btn-speak').hidden = true;

    $('page-words').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.act === 'restart') {
        stopSpeaking();
        reader.page = 0;
        renderPage(-1);
      } else if (btn.dataset.act === 'shuffle') {
        shuffle();
      }
    });

    // 그림의 왼쪽/오른쪽을 톡 누르면 넘어가요.
    $('page-art').addEventListener('click', (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      if (x < 0.35) go(-1);
      else if (x > 0.65) go(1);
    });

    // 옆으로 밀어서 넘기기
    let startX = null;
    let startY = null;
    const book = $('book');
    book.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      startX = t.clientX;
      startY = t.clientY;
    }, { passive: true });
    book.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      startX = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
    }, { passive: true });

    document.addEventListener('keydown', (e) => {
      if ($('screen-read').hidden) return;
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') closeReader();
    });
  }

  // ---------- 읽어 주기 (기기에 들어 있는 음성을 써요, 인터넷 필요 없음) ----------

  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  let voice = null;
  let speakToken = 0;

  function pickVoice() {
    if (!synth) return;
    const voices = synth.getVoices();
    voice = voices.find((v) => /^ko([-_]|$)/i.test(v.lang)) || null;
  }
  if (synth) {
    pickVoice();
    synth.onvoiceschanged = pickVoice;
  }

  function setSpeakUi() {
    const btn = $('btn-speak');
    btn.setAttribute('aria-pressed', String(reader.speaking));
    btn.setAttribute('aria-label', reader.speaking ? '읽어 주기 멈추기' : '읽어 주기');
  }

  function speakPage() {
    const token = ++speakToken;
    const p = reader.story.pages[reader.page];
    const text = p.kind === 'cover' ? `${p.title}. ${p.sub}.` : p.text;
    if (synth.speaking || synth.pending) synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    if (voice) u.voice = voice;
    u.rate = 0.92;
    u.pitch = 1.05;
    u.onend = () => {
      if (token !== speakToken || !reader.speaking) return;
      setTimeout(() => {
        if (token !== speakToken || !reader.speaking) return;
        if (!go(1)) stopSpeaking();
      }, 900);
    };
    synth.speak(u);
  }

  function toggleSpeak() {
    if (reader.speaking) {
      stopSpeaking();
      return;
    }
    if (!voice) pickVoice();
    reader.speaking = true;
    setSpeakUi();
    speakPage();
    if (!voice && synth.getVoices().length) toast('한국어 목소리가 없어서 기본 목소리로 읽어요.');
  }

  function stopSpeaking() {
    reader.speaking = false;
    speakToken++;
    if (synth) synth.cancel();
    setSpeakUi();
  }

  // 읽는 동안 화면이 꺼지지 않게 해요 (지원하는 브라우저에서만).
  let wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on && !wakeLock && 'wakeLock' in navigator && document.visibilityState === 'visible') {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } else if (!on && wakeLock) {
        await wakeLock.release();
        wakeLock = null;
      }
    } catch (e) {
      wakeLock = null;
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !$('screen-read').hidden) keepAwake(true);
  });

  // ---------- 앱 설치 / 오프라인 ----------

  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e;
    $('install-btn').hidden = false;
  });
  $('install-btn').addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    try { await installPrompt.userChoice; } catch (e) { /* 사용자가 닫았어요 */ }
    installPrompt = null;
    $('install-btn').hidden = true;
  });

  if (!framed && 'serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* 오프라인 기능 없이도 앱은 돌아가요 */ });
  }

  // ---------- 시작 ----------

  if (profile.photo) photoUrl = toObjectUrl(profile.photo);
  setupMake();
  setupReader();
})();
