// Tabbed layout: ARIA tabs, keyboard support and hash routing.
// The URL hash selects a tab (#colors) or deep-links to an element inside one (#dl-bycat).
(() => {
  'use strict';

  const tabs = [...document.querySelectorAll('[role="tab"]')];
  if (!tabs.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const panelOf = (tab) => document.getElementById(tab.getAttribute('aria-controls'));

  function select(tab) {
    for (const t of tabs) {
      const on = t === tab;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panelOf(t).classList.toggle('active', on);
    }
  }

  // A hand-typed or truncated URL ("#%") makes decodeURIComponent throw; treat it as "no hash".
  function hashId() {
    try {
      return decodeURIComponent(location.hash.slice(1));
    } catch {
      return '';
    }
  }

  function route() {
    const id = hashId();
    const tab = tabs.find((t) => t.dataset.tab === id);
    if (tab) return select(tab);

    const target = id ? document.getElementById(id) : null;
    const panel = target?.closest('[role="tabpanel"]');
    const owner = tabs.find((t) => panelOf(t) === panel);
    if (!owner) return select(tabs[0]);

    select(owner);
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('keydown', (e) => {
      const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      const target = tabs[(next + tabs.length) % tabs.length];
      target.focus();
      select(target);
      history.replaceState(null, '', `#${target.dataset.tab}`);
    });
  });

  window.addEventListener('hashchange', route);
  route();
})();
