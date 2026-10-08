// Tabbed layout: ARIA tabs, keyboard support and hash routing.
// The URL hash selects a tab (#colors) or deep-links to an element inside one (#dl-bycat).
(function () {
  'use strict';

  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  if (!tabs.length) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function panelOf(tab) {
    return document.getElementById(tab.getAttribute('aria-controls'));
  }

  function tabForPanel(panel) {
    return tabs.filter(function (t) { return panelOf(t) === panel; })[0];
  }

  function select(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panelOf(t).classList.toggle('active', on);
    });
  }

  // A hand-typed or truncated URL ("#%") makes decodeURIComponent throw; treat it as "no hash".
  function hashId() {
    try {
      return decodeURIComponent(location.hash.slice(1));
    } catch (e) {
      return '';
    }
  }

  function route() {
    var id = hashId();
    var tab = tabs.filter(function (t) { return t.dataset.tab === id; })[0];
    if (tab) return select(tab);

    var target = id && document.getElementById(id);
    var panel = target && target.closest('[role="tabpanel"]');
    var owner = panel && tabForPanel(panel);
    if (!owner) return select(tabs[0]);

    select(owner);
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('keydown', function (e) {
      var next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      var target = tabs[(next + tabs.length) % tabs.length];
      target.focus();
      select(target);
      history.replaceState(null, '', '#' + target.dataset.tab);
    });
  });

  // Cards that link to a download section
  document.addEventListener('click', function (e) {
    var card = e.target.closest('[data-dl]');
    if (card) location.hash = card.dataset.dl;
  });
  document.addEventListener('keydown', function (e) {
    var card = e.target.closest('[data-dl]');
    if (card && e.target === card && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      location.hash = card.dataset.dl;
    }
  });

  window.addEventListener('hashchange', route);
  route();
})();
