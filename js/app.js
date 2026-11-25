// Progressive enhancement only: without this script every chamber is
// still rendered and readable, it just loses the portal effects.
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var header = document.querySelector('.site-header');
  var bar = document.querySelector('.test-progress-bar');
  var narrator = document.querySelector('.narrator');
  var narratorText = document.querySelector('.narrator-text');
  var chambers = Array.prototype.slice.call(document.querySelectorAll('.chamber'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-list a'));

  // Sticky header must not hide anchored headings.
  function syncHeaderHeight() {
    var sticky = getComputedStyle(header).position === 'sticky';
    root.style.setProperty('--header-h', sticky ? header.offsetHeight + 'px' : '0px');
  }
  syncHeaderHeight();
  window.addEventListener('resize', syncHeaderHeight);

  // Scroll progress across the whole test.
  var ticking = false;
  function updateProgress() {
    ticking = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    if (bar) bar.style.width = (ratio * 100).toFixed(1) + '%';
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(updateProgress); }
  }, { passive: true });
  updateProgress();

  // Current chamber: nav highlight and narrator line.
  var current = null;
  var narratorTimer;
  function enterChamber(section) {
    if (section === current) return;
    current = section;
    navLinks.forEach(function (link) {
      if (link.getAttribute('href') === '#' + section.id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    if (!narrator) return;
    narrator.classList.add('is-hidden');
    clearTimeout(narratorTimer);
    // Read the line when the timer fires: fast jumps must show the last chamber.
    narratorTimer = setTimeout(function () {
      var line = current.getAttribute('data-annonce');
      if (!line) return;
      narratorText.textContent = line;
      narrator.classList.remove('is-hidden');
      // Fade out so the line never sits on top of the content for long.
      narratorTimer = setTimeout(function () { narrator.classList.add('is-hidden'); }, 7000);
    }, reduceMotion.matches ? 0 : 200);
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) enterChamber(entry.target);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    chambers.forEach(function (section) { observer.observe(section); });
  } else if (chambers.length) {
    enterChamber(chambers[0]);
  }

  // In-page links teleport: blue portal where you click, orange portal
  // where you land. Plain anchor jump when motion is reduced.
  function spawnPortal(color, x, y) {
    var fx = document.createElement('span');
    fx.className = 'portal-fx is-' + color;
    fx.setAttribute('aria-hidden', 'true');
    fx.style.left = x + 'px';
    fx.style.top = y + 'px';
    document.body.appendChild(fx);
    return fx;
  }

  function closePortal(fx) {
    fx.classList.add('is-closing');
    fx.addEventListener('animationend', function () { fx.remove(); }, { once: true });
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href^="#"]');
    if (!link || link.classList.contains('skip-link') || reduceMotion.matches) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var target = document.getElementById(link.getAttribute('href').slice(1));
    if (!target) return;
    event.preventDefault();

    var rect = link.getBoundingClientRect();
    var x = event.clientX || rect.left + rect.width / 2;
    var y = event.clientY || rect.top + rect.height / 2;
    var entry = spawnPortal('blue', x, y);

    setTimeout(function () {
      target.scrollIntoView({ block: 'start' });
      history.pushState(null, '', '#' + target.id);
      var heading = target.querySelector('h1, h2') || target;
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });

      var box = heading.getBoundingClientRect();
      var exit = spawnPortal('orange', box.left - 30 > 40 ? box.left - 30 : 40, box.top + box.height / 2);
      closePortal(entry);
      setTimeout(function () { closePortal(exit); }, 200);
    }, 180);
  });
})();
