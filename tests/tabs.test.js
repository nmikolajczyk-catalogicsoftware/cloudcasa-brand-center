// Browser test for assets/js/tabs.js. Injected into a copy of index.html by tools/test_browser.py;
// the result is written to document.title as "PASS ... || FAIL ...".
(function () {
  var results = [];
  var tabs = [].slice.call(document.querySelectorAll('[role=tab]'));
  var names = tabs.map(function (t) { return t.dataset.tab; });
  var card = document.querySelector('[data-dl]');
  var section = card.dataset.dl;
  var startHash = location.hash.slice(1);

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms || 60); }); }
  function key(el, k) { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); }
  function state() {
    var selected = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; });
    return {
      selected: selected.map(function (t) { return t.dataset.tab; }),
      panels: [].slice.call(document.querySelectorAll('[role=tabpanel].active')).map(function (p) { return p.id; }),
      focusable: tabs.filter(function (t) { return t.tabIndex === 0; }).map(function (t) { return t.dataset.tab; }),
      hash: location.hash
    };
  }
  function check(name, ok, info) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : ' ' + JSON.stringify(info))); }
  function only(name) { var s = state(); return s.selected.join() === name && s.panels.join() === 'tab-' + name && s.focusable.join() === name; }

  new Promise(function (r) { document.addEventListener('DOMContentLoaded', r); })
    .then(function () {
      var expected = names.indexOf(startHash) >= 0 ? startHash : (document.getElementById(startHash) ? 'downloads' : names[0]);
      check('initial state for #' + startHash, only(expected), state());
      tabs[1].click(); return wait();
    }).then(function () {
      check('click selects tab, panel, roving tabindex and hash', only(names[1]) && state().hash === '#' + names[1], state());
      tabs[1].focus(); key(tabs[1], 'ArrowRight'); return wait();
    }).then(function () {
      check('ArrowRight moves selection and focus', only(names[2]) && document.activeElement === tabs[2], state());
      key(tabs[2], 'End'); return wait();
    }).then(function () {
      check('End selects the last tab', only(names[names.length - 1]), state());
      key(tabs[tabs.length - 1], 'ArrowRight'); return wait();
    }).then(function () {
      check('ArrowRight wraps to the first tab', only(names[0]), state());
      key(tabs[0], 'ArrowLeft'); return wait();
    }).then(function () {
      check('ArrowLeft wraps to the last tab', only(names[names.length - 1]), state());
      key(tabs[tabs.length - 1], 'Home'); return wait();
    }).then(function () {
      check('Home selects the first tab', only(names[0]), state());
      location.hash = '#' + section; return wait(100);
    }).then(function () {
      var el = document.getElementById(section);
      check('deep link #' + section + ' opens Downloads with the section visible', only('downloads') && el.offsetParent !== null, state());
      tabs[0].click(); return wait();
    }).then(function () {
      card.click(); return wait(100);
    }).then(function () {
      check('product card click opens its download section', only('downloads') && state().hash === '#' + section, state());
      location.hash = '#does-not-exist'; return wait();
    }).then(function () {
      check('unknown hash falls back to the first tab', only(names[0]), state());
      card.focus(); key(card, 'Enter'); return wait(100);
    }).then(function () {
      check('Enter on a focused card opens Downloads', only('downloads'), state());
      check('exactly one tabpanel is visible', [].filter.call(document.querySelectorAll('[role=tabpanel]'), function (p) { return p.offsetParent !== null; }).length === 1, {});
      document.title = results.join(' || ');
    });
})();
