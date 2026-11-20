/* A small, local vector icon family. No icon CDN or runtime dependencies. */
(() => {
  const paths = {
    crown: '<path d="m3 7 4 4 5-7 5 7 4-4-2 12H5L3 7Z"/><path d="M6 15h12"/>',
    home: '<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',
    box: '<path d="m3 7 9-4 9 4-9 4-9-4Zm0 0v11l9 4 9-4V7M12 11v11M7 5l10 4"/>',
    trade: '<path d="M3 8h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4"/>',
    world: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>',
    trophy: '<path d="M7 3h10v6a5 5 0 0 1-10 0V3ZM12 14v6M7 21h10M7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4"/>',
    book: '<path d="M12 5C8 2 4 3 3 4v16c3-2 6-1 9 1 3-2 6-3 9-1V4c-3-2-6-1-9 1Zm0 0v16"/>',
    save: '<path d="M4 3h13l3 3v15H4V3ZM8 3v6h8V3M8 21v-7h8v7"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3M12 17h.01"/>',
    settings: '<path d="m10 3-1 3-3 1-3 3 2 2-1 4 3 1 2 4h4l1-3 3-1 3-3-2-2 1-4-3-1-2-4h-4Z"/><circle cx="12" cy="12" r="3"/>',
    volume: '<path d="m11 4-5 4H3v8h3l5 4V4ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    muted: '<path d="m11 4-5 4H3v8h3l5 4V4ZM16 9l6 6m0-6-6 6"/>',
    music: '<path d="M9 17V5l11-2v12M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="17" cy="16" rx="3" ry="3"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    u: '<path d="M12 20V4m-6 6 6-6 6 6"/>',
    d: '<path d="M12 4v16m-6-6 6 6 6-6"/>',
    l: '<path d="M20 12H4m6-6-6 6 6 6"/>',
    r: '<path d="M4 12h16m-6-6 6 6-6 6"/>'
  };
  const icon = key => `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[key] || paths.crown}</svg>`;
  document.querySelectorAll('.kingdom-brand').forEach(el => el.insertAdjacentHTML('afterbegin', icon('crown')));
  const tabs = { home: 'home', boxes: 'box', trade: 'trade', world: 'world', hall: 'trophy', coll: 'book' };
  document.querySelectorAll('.x-tabs [data-tab]').forEach(el => { el.querySelector('span').innerHTML = icon(tabs[el.dataset.tab]); });
  document.querySelectorAll('.x-arw[data-k]').forEach(el => { el.innerHTML = icon(el.dataset.k); });
  document.querySelector('.x-top').append(document.getElementById('mochi'));
  const controls = { save:'save', help:'help', gear:'settings', mute:'volume', amute:'volume', music:'music' };
  function refreshControls() {
    for (const [id, key] of Object.entries(controls)) {
      const el = document.getElementById(id); if (!el) continue;
      const actual = (id === 'mute' || id === 'amute') && el.getAttribute('aria-pressed') === 'true' ? 'muted' : key;
      if (el.dataset.icon !== actual || !el.querySelector('svg')) { el.dataset.icon = actual; el.innerHTML = icon(actual); }
    }
  }
  refreshControls();
  const observer = new MutationObserver(refreshControls);
  for (const id of Object.keys(controls)) { const el = document.getElementById(id); if (el) observer.observe(el, { childList:true, attributes:true, attributeFilter:['aria-pressed'] }); }
  const go = document.getElementById('go');
  function refreshGo() {
    if (go.querySelector('svg')) return;
    go.innerHTML = `<span>${go.textContent.includes('Continue') ? 'Continue your adventure' : 'Enter the kingdom'}</span>${icon('arrow')}`;
  }
  refreshGo(); new MutationObserver(refreshGo).observe(go, { childList:true });
})();
