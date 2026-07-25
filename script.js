/* =========================================================
   VIVISION Level 1
   Scroll reveals on the page, and the audit overlay.
   Answers are held in memory only. Nothing is persisted.
   ========================================================= */
(function () {
  'use strict';

  /* Point this at a real endpoint before launch. Opened from file://
     a relative path has no host to resolve against, so the request will
     fail locally and the retry screen shows. That is expected. */
  const AUDIT_ENDPOINT = '/api/audit';

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =======================================================
     SCROLL REVEAL
     Beat 4 (proof) carries no [data-rise], so it never animates.
     ======================================================= */
  (function reveal() {
    const items = $$('[data-rise]');
    if (!items.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('seen'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('seen');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    items.forEach(el => io.observe(el));

    /* Anything already at or above the fold shows immediately, so a deep
       link or a restored scroll position never lands on blank space. */
    const sweep = () => $$('[data-rise]:not(.seen)').forEach(el => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.95) {
        el.classList.add('seen');
        io.unobserve(el);
      }
    });
    sweep();
    window.addEventListener('load', sweep);
    window.addEventListener('scroll', sweep, { passive: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) sweep(); });
  })();

  /* =======================================================
     REDUCED MOTION AND THE FLOW DIAGRAM
     The dots in the diagram are SMIL, which a CSS media query
     cannot stop. Pause the whole timeline instead.
     ======================================================= */
  (function stillDiagram() {
    $$('.flowsvg').forEach(svg => {
      if (reduced && typeof svg.pauseAnimations === 'function') svg.pauseAnimations();
    });
  })();

  /* =======================================================
     AUDIT OVERLAY
     ======================================================= */
  const dialog = $('#audit');
  if (!dialog) return;

  const stage   = $('[data-stage]', dialog);
  const steps   = $$('.qs[data-kind]', dialog);
  const screens = $$('.qs', dialog);
  const fill    = $('[data-fill]', dialog);
  const track   = $('.audit__track', dialog);
  const counter = $('[data-step-count]', dialog);
  const backBtn = $('[data-back]', dialog);
  const nextBtn = $('[data-next]', dialog);
  const form    = $('[data-form]', dialog);
  const slider  = $('#hours', dialog);
  const out     = $('[data-out]', dialog);

  const sectorEl = $('#sector', dialog);
  let index = 0;
  let finished = false;
  let sending = false;

  const blank = () => ({
    size: null, sector: null, timeSinks: [], adminHours: 8,
    breaks: null, aiUse: null, tools: [], wishGone: '',
    name: '', business: '', email: '', otherText: {}
  });
  let answers = blank();

  const pad = n => String(n).padStart(2, '0');

  /* ---------- open / reset / close ---------- */
  function reset() {
    finished = false;
    index = 0;
    answers = blank();
    $$('.opt', dialog).forEach(o => {
      o.classList.remove('is-on');
      if (o.hasAttribute('aria-pressed')) o.setAttribute('aria-pressed', 'false');
    });
    if (slider) { slider.value = 8; syncSlider(); }
    if (form) form.reset();
    const wish = $('#wish', dialog);
    if (wish) wish.value = '';
    $$('.field', dialog).forEach(f => f.classList.remove('is-bad'));
    $$('.field__e', dialog).forEach(e => { e.hidden = true; });
    $$('[data-max-note]', dialog).forEach(n => { n.hidden = true; });
    $$('.otherbox', dialog).forEach(b => { b.classList.remove('on'); const i = $('input', b); if (i) i.value = ''; });
    if (sectorEl) sectorEl.value = '';
  }

  function open() {
    if (finished) reset();
    document.body.classList.add('lock');
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    show(index);
  }

  function close() {
    document.body.classList.remove('lock');
    if (dialog.open && typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  document.addEventListener('click', e => {
    if (e.target.closest('[data-audit]')) { e.preventDefault(); open(); return; }
    if (e.target.closest('[data-close]')) close();
  });
  dialog.addEventListener('close', () => document.body.classList.remove('lock'));

  /* ---------- rendering ---------- */
  function paint(el) {
    if (reduced) return;
    el.classList.remove('anim');
    void el.offsetWidth;
    el.classList.add('anim');
  }

  function show(i) {
    index = i;
    screens.forEach(s => { s.hidden = true; s.classList.remove('anim'); });

    const step = steps[i];
    step.hidden = false;
    paint(step);

    counter.textContent = pad(i + 1) + ' / ' + pad(steps.length);
    fill.style.width = Math.round(((i + 1) / steps.length) * 100) + '%';
    track.setAttribute('aria-valuenow', String(i + 1));

    backBtn.hidden = i === 0;
    const kind = step.dataset.kind;
    /* Single choice advances itself, unless the visitor picked "Other" and
       still has a box to fill. The form has its own submit button. */
    const waitingOnOther = !!$('.otherbox.on', step);
    nextBtn.hidden = (kind === 'single' && !waitingOnOther) || kind === 'form';

    const h = $('.qs__h', step);
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    const sc = $('.audit__scroll', dialog);
    if (sc) sc.scrollTop = 0;
  }

  function showEnd(name) {
    screens.forEach(s => { s.hidden = true; s.classList.remove('anim'); });
    const el = $('.qs[data-q="' + name + '"]', dialog);
    el.hidden = false;
    paint(el);

    fill.style.width = '100%';
    counter.textContent = name === 'done' ? 'Sent' : 'Not sent';
    backBtn.hidden = true;
    nextBtn.hidden = true;

    const h = $('.qs__h', el);
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  }

  function next() {
    const step = steps[index];
    const kind = step.dataset.kind;

    if (kind === 'text') answers.wishGone = ($('#wish', dialog).value || '').trim();

    if (kind === 'select') {
      const sel = $('#sector', dialog);
      if (!sel.value) { markField(sel, true); sel.focus(); return; }
      markField(sel, false);
      answers.sector = sel.value;
    }

    /* Whatever was typed into a revealed "Other" box travels with the answer. */
    const box = $('.otherbox.on', step);
    if (box) {
      const typed = ($('input', box).value || '').trim();
      if (typed) answers.otherText[step.dataset.q] = typed;
    }

    if (index < steps.length - 1) show(index + 1);
  }

  backBtn.addEventListener('click', () => { if (index > 0) show(index - 1); });
  nextBtn.addEventListener('click', next);

  /* ---------- answering ---------- */
  stage.addEventListener('click', e => {
    const opt = e.target.closest('.opt');
    if (!opt) return;

    const step = opt.closest('.qs');
    const key  = step.dataset.q;
    const kind = step.dataset.kind;

    if (kind === 'single') {
      $$('.opt', step).forEach(o => o.classList.remove('is-on'));
      opt.classList.add('is-on');
      answers[key] = opt.dataset.val;
      const isOther = opt.hasAttribute('data-other');
      toggleOther(step, isOther);
      if (isOther) { nextBtn.hidden = false; $('input', $('.otherbox', step)).focus(); return; }
      window.setTimeout(next, reduced ? 0 : 200);
      return;
    }

    if (kind === 'multi') {
      const on   = opt.getAttribute('aria-pressed') === 'true';
      const max  = parseInt(step.dataset.max || '0', 10);
      const note = $('[data-max-note]', step);

      if (!on && max && answers[key].length >= max) {
        if (note) note.hidden = false;
        return;
      }
      opt.setAttribute('aria-pressed', String(!on));
      answers[key] = on
        ? answers[key].filter(v => v !== opt.dataset.val)
        : answers[key].concat(opt.dataset.val);
      if (note) note.hidden = true;
      if (opt.hasAttribute('data-other')) toggleOther(step, !on);
    }
  });

  /* Show or hide the write-in box that belongs to an "Other" option. */
  function toggleOther(step, on) {
    const box = $('.otherbox', step);
    if (!box) return;
    box.classList.toggle('on', !!on);
    if (!on) { const i = $('input', box); if (i) i.value = ''; }
  }

  /* ---------- slider ---------- */
  function syncSlider() {
    const v = parseInt(slider.value, 10);
    answers.adminHours = v;
    out.textContent = v === 20 ? '20+ hours' : v === 1 ? '1 hour' : v + ' hours';
  }
  if (slider) { slider.addEventListener('input', syncSlider); syncSlider(); }

  const sector = $('#sector', dialog);
  if (sector) sector.addEventListener('change', () => {
    markField(sector, false);
    toggleOther(sector.closest('.qs'), sector.value === 'Other');
  });

  /* ---------- final step ---------- */
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function markField(input, bad) {
    input.closest('.field').classList.toggle('is-bad', bad);
    const err = $('[data-err-for="' + input.id + '"]', dialog);
    if (err) err.hidden = !bad;
    input.setAttribute('aria-invalid', String(bad));
  }

  function validate() {
    const f = $('#fname', dialog), b = $('#biz', dialog), m = $('#email', dialog), p = $('#privacy', dialog);
    const checks = [
      [f, f.value.trim().length > 0],
      [b, b.value.trim().length > 0],
      [m, EMAIL.test(m.value.trim())],
      [p, p.checked]
    ];
    let first = null;
    checks.forEach(([el, ok]) => { markField(el, !ok); if (!ok && !first) first = el; });
    if (first) { first.focus(); return false; }

    answers.name = f.value.trim();
    answers.business  = b.value.trim();
    answers.email     = m.value.trim();
    return true;
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (validate()) send();
  });

  const retry = $('[data-retry]', dialog);
  if (retry) retry.addEventListener('click', send);

  async function send() {
    if (sending) return;
    sending = true;

    const btns = [$('[data-submit]', dialog), retry].filter(Boolean);
    btns.forEach(b => { b.disabled = true; b.dataset.label = b.textContent; b.textContent = 'Sending'; });

    const payload = {
      submittedAt: new Date().toISOString(),
      answers: {
        size: answers.size,
        sector: answers.sector,
        timeSinks: answers.timeSinks,
        adminHours: answers.adminHours,
        breaks: answers.breaks,
        aiUse: answers.aiUse,
        tools: answers.tools,
        wishGone: answers.wishGone,
        otherText: answers.otherText,
        name: answers.name,
        business: answers.business,
        email: answers.email
      }
    };

    try {
      const res = await fetch(AUDIT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Request failed: ' + res.status);
      finished = true;
      showEnd('done');
    } catch (err) {
      showEnd('failed');
    } finally {
      sending = false;
      btns.forEach(b => { b.disabled = false; if (b.dataset.label) b.textContent = b.dataset.label; });
    }
  }

})();
