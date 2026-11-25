// Progressive enhancement only. Without this script the CV is a normal
// scrolling page with every chamber visible. With it, the CV becomes a
// game: one level per screen, puzzles to solve, doors to the next level.
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
  var toggle = document.getElementById('toggle-classic');
  var toggleLabel = toggle && toggle.querySelector('.tool-label');
  var sprite = document.querySelector('.sprite');
  var current = -1;

  function isGame() { return root.classList.contains('game'); }
  function chamberIndex(id) {
    for (var i = 0; i < chambers.length; i++) if (chambers[i].id === id) return i;
    return -1;
  }

  // ---------- Portal rim animation (SVG/SMIL: CSS cannot stop it) ----------
  // Runs only on levels that show portals, and never with reduced motion.
  function syncSvgMotion() {
    if (!sprite || !sprite.pauseAnimations) return;
    var portalVisible = !isGame() || current === 0 || current === chambers.length - 1;
    if (reduceMotion.matches || !portalVisible) sprite.pauseAnimations();
    else sprite.unpauseAnimations();
  }
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', syncSvgMotion);

  // ---------- Narrator ----------
  var narratorTimer;
  function say(text) {
    if (!narrator || !text || !isGame()) return;
    narrator.classList.add('is-hidden');
    clearTimeout(narratorTimer);
    narratorTimer = setTimeout(function () {
      narratorText.textContent = text;
      narrator.classList.remove('is-hidden');
      narratorTimer = setTimeout(function () { narrator.classList.add('is-hidden'); }, 7000);
    }, reduceMotion.matches ? 0 : 200);
  }

  // ---------- Levels ----------
  function activate(index, moveFocus) {
    current = index;
    chambers.forEach(function (section, i) {
      section.classList.toggle('is-active', i === index);
      if (i !== index) section.classList.remove('is-in');
    });
    var section = chambers[index];
    // next frame, so the panels fold out of the wall
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { section.classList.add('is-in'); });
    });
    navLinks.forEach(function (link) {
      if (link.getAttribute('href') === '#' + section.id) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
    if (bar) bar.style.width = (index / (chambers.length - 1) * 100) + '%';
    root.classList.toggle('at-end', index === chambers.length - 1);
    var room = section.querySelector('.room');
    if (room) room.scrollTop = 0;
    if (isGame()) window.scrollTo(0, 0); // focus or scroll restoration must not shift the screen
    say(section.getAttribute('data-annonce'));
    syncSvgMotion();
    if (moveFocus) {
      var heading = section.querySelector('h1, h2');
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }

  var warp = document.createElement('div');
  warp.className = 'warp';
  warp.setAttribute('aria-hidden', 'true');
  document.body.appendChild(warp);
  var warping = false;

  // Level change: step through an orange portal opened where you clicked.
  function goTo(index, options) {
    options = options || {};
    if (index < 0 || index >= chambers.length || index === current || warping) return;
    if (options.push) history.pushState(null, '', '#' + chambers[index].id);
    if (!isGame() || reduceMotion.matches) {
      activate(index, options.focus);
      return;
    }
    warping = true;
    warp.style.setProperty('--x', (options.x || window.innerWidth / 2) + 'px');
    warp.style.setProperty('--y', (options.y || window.innerHeight / 2) + 'px');
    warp.classList.add('is-on');
    // the camera flies into the current room...
    var leaving = chambers[current];
    if (leaving) leaving.classList.add('is-leaving');
    setTimeout(function () {
      if (leaving) leaving.classList.remove('is-leaving');
      // ...and the next room arrives from the depth
      var next = chambers[index];
      next.classList.add('is-entering');
      activate(index, options.focus);
      warp.classList.remove('is-on');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          next.classList.remove('is-entering');
          warping = false;
        });
      });
    }, 300);
  }

  // ---------- 3D rooms ----------
  // Decorative box around each level (not the open-sky finale).
  chambers.forEach(function (section) {
    if (section.classList.contains('space')) return;
    var stage = document.createElement('div');
    stage.className = 'stage';
    stage.setAttribute('aria-hidden', 'true');
    stage.innerHTML = '<div class="wall wall-back"></div><div class="wall wall-left"></div>' +
      '<div class="wall wall-right"></div><div class="wall wall-floor"></div><div class="wall wall-ceil"></div>';
    var num = section.querySelector('.chamber-num');
    stage.firstChild.setAttribute('data-num', num ? num.textContent : '00');
    // restless wall: a few tiles of the back wall slide in and out on their own
    var tiles = '';
    [[0, 1], [2, 0], [5, 2], [7, 1], [9, 3], [3, 4], [10, 0]].forEach(function (cell, i) {
      tiles += '<i class="move-tile" style="left:' + cell[0] * 120 + 'px;top:' + cell[1] * 120 + 'px;animation-delay:' + (i * -1.7) + 's"></i>';
    });
    stage.firstChild.insertAdjacentHTML('beforeend', tiles);
    section.insertBefore(stage, section.firstChild);
  });

  // Camera: follows the pointer (or the phone's tilt), drifts on its own
  // when nobody moves. Walls swing, the content floats: depth for free.
  var cam = { x: 0, y: 0, tx: 0, ty: 0, last: 0 };
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  window.addEventListener('pointermove', function (event) {
    if (event.pointerType !== 'mouse') return;
    cam.tx = event.clientX / window.innerWidth * 2 - 1;
    cam.ty = event.clientY / window.innerHeight * 2 - 1;
    cam.last = performance.now();
  }, { passive: true });

  window.addEventListener('deviceorientation', function (event) {
    if (event.gamma == null) return;
    cam.tx = Math.max(-1, Math.min(1, event.gamma / 25));
    cam.ty = Math.max(-1, Math.min(1, (event.beta - 50) / 25));
    cam.last = performance.now();
  }, { passive: true });

  function cameraFrame(now) {
    requestAnimationFrame(cameraFrame);
    if (!isGame() || reduceMotion.matches || document.hidden) return;
    if (now - cam.last > 2500) { // idle: slow sway
      cam.tx = Math.sin(now / 2600) * .45;
      cam.ty = Math.sin(now / 3700) * .25;
    }
    cam.x += (cam.tx - cam.x) * .06;
    cam.y += (cam.ty - cam.y) * .06;
    var section = chambers[current];
    if (!section) return;
    var stage = section.querySelector('.stage');
    var inner = section.querySelector('.chamber-inner');
    // walls and content share one rotation and one pivot: a single world
    var view = 'rotateY(' + (cam.x * 7).toFixed(2) + 'deg) rotateX(' + (-cam.y * 4.5).toFixed(2) + 'deg)';
    if (stage) stage.style.transform = view;
    inner.style.transform = stage ? view : '';
    var sky = section.querySelector('.space-sky');
    if (sky) sky.style.transform = 'translate3d(' + (cam.x * -24).toFixed(1) + 'px,' + (cam.y * -14).toFixed(1) + 'px,0) scale(1.06)';
  }
  requestAnimationFrame(cameraFrame);

  // Plates tilt toward the pointer, with a moving glare.
  document.addEventListener('pointermove', function (event) {
    if (!isGame() || reduceMotion.matches || !finePointer.matches) return;
    var panel = event.target.closest && event.target.closest('.chamber.is-in .panel');
    if (!panel) return;
    var r = panel.getBoundingClientRect();
    var px = (event.clientX - r.left) / r.width;
    var py = (event.clientY - r.top) / r.height;
    panel.classList.add('is-tilting');
    panel.style.transform = 'rotateX(' + ((.5 - py) * 10).toFixed(2) + 'deg) rotateY(' + ((px - .5) * 12).toFixed(2) + 'deg) translateZ(26px)';
    panel.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
    panel.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
  }, { passive: true });
  document.addEventListener('pointerout', function (event) {
    var panel = event.target.closest && event.target.closest('.panel.is-tilting');
    if (!panel || panel.contains(event.relatedTarget)) return;
    panel.classList.remove('is-tilting');
    panel.style.transform = '';
  });

  // Arrival room props, built in the 3D world: an orange portal and the
  // observation window on the back wall, a blue portal on the right wall,
  // the cube standing on the floor. (Small screens keep the flat scene.)
  var PORTAL = '<span class="portal-view"></span><svg class="portal-rim" viewBox="0 0 140 240"><use href="#portal-rim"/></svg>';
  var CUBE = '<span class="cube3d"><span class="cube-face cube-front"></span><span class="cube-face cube-right"></span>' +
    '<span class="cube-face cube-top"></span><span class="cube-face cube-back"></span>' +
    '<span class="cube-face cube-left"></span><span class="cube-face cube-bottom"></span></span>';
  var heroStage = chambers[0].querySelector('.stage');
  if (heroStage) {
    heroStage.querySelector('.wall-back').insertAdjacentHTML('beforeend',
      '<span class="observation"></span><span class="portal portal-orange">' + PORTAL + '</span>');
    heroStage.querySelector('.wall-right').insertAdjacentHTML('beforeend',
      '<span class="portal portal-blue">' + PORTAL + '</span>');
    heroStage.insertAdjacentHTML('beforeend', '<span class="stage-cube">' + CUBE + '</span>');
  }

  // Cubes can be grabbed and spun; they keep turning a little after release.
  function makeSpinnable(holder, rx, ry) {
    var cube = holder.querySelector('.cube3d');
    var spin = { rx: rx, ry: ry, vx: 0, vy: 0, drag: null, raf: 0 };
    function render() {
      cube.style.transform = 'rotateX(' + spin.rx.toFixed(1) + 'deg) rotateY(' + spin.ry.toFixed(1) + 'deg)';
    }
    function coast() {
      spin.vx *= .95; spin.vy *= .95;
      spin.rx += spin.vx; spin.ry += spin.vy;
      render();
      if (Math.abs(spin.vx) + Math.abs(spin.vy) > .05) spin.raf = requestAnimationFrame(coast);
    }
    holder.addEventListener('pointerdown', function (event) {
      cancelAnimationFrame(spin.raf);
      spin.drag = { x: event.clientX, y: event.clientY };
      holder.setPointerCapture(event.pointerId);
      holder.classList.add('is-grabbed');
    });
    holder.addEventListener('pointermove', function (event) {
      if (!spin.drag) return;
      spin.vy = (event.clientX - spin.drag.x) * .6;
      spin.vx = -(event.clientY - spin.drag.y) * .6;
      spin.drag = { x: event.clientX, y: event.clientY };
      spin.rx += spin.vx; spin.ry += spin.vy;
      render();
    });
    function release() {
      if (!spin.drag) return;
      spin.drag = null;
      holder.classList.remove('is-grabbed');
      if (!reduceMotion.matches) spin.raf = requestAnimationFrame(coast);
    }
    holder.addEventListener('pointerup', release);
    holder.addEventListener('pointercancel', release);
  }
  var flatCube = document.querySelector('.hero-cube');
  if (flatCube) { flatCube.innerHTML = CUBE; makeSpinnable(flatCube, -24, -40); }
  var floorCube = document.querySelector('.stage-cube');
  if (floorCube) makeSpinnable(floorCube, 0, -32);

  // The blue portals of the arrival room lead to level 01.
  Array.prototype.forEach.call(document.querySelectorAll('.hero .portal-blue'), function (portal) {
    portal.addEventListener('click', function (event) {
      if (isGame()) goTo(1, { push: true, focus: true, x: event.clientX, y: event.clientY });
    });
  });

  // Level 03: the laser emitter tracks the pointer. Keep the beam on the
  // receiver for a moment and the level solves itself.
  var laserScene = document.querySelector('.level-projets');
  if (laserScene) {
    var beam = laserScene.querySelector('.laser-beam');
    var emitter = laserScene.querySelector('.laser-emitter');
    var aimTimer = 0;
    document.addEventListener('pointermove', function (event) {
      if (!isGame() || chambers[current].id !== 'projets') return;
      if (laserScene.classList.contains('is-cleared') || laserScene.classList.contains('is-busy')) return;
      var r = emitter.getBoundingClientRect();
      var angle = Math.atan2(event.clientY - (r.top + r.height / 2), event.clientX - r.right) * 180 / Math.PI;
      angle = Math.max(-75, Math.min(30, angle));
      beam.style.transform = 'rotate(' + angle.toFixed(1) + 'deg) scaleX(.6)';
      var aimed = Math.abs(angle) < 4 && event.clientX > r.right + 40;
      laserScene.classList.toggle('is-aimed', aimed);
      if (!aimed) { clearTimeout(aimTimer); aimTimer = 0; return; }
      if (!aimTimer) {
        aimTimer = setTimeout(function () {
          aimTimer = 0;
          beam.style.transform = '';
          laserScene.classList.remove('is-aimed');
          laserScene.querySelector('.puzzle-btn').click();
        }, 500);
      }
    }, { passive: true });
    laserScene.querySelector('.puzzle-btn').addEventListener('click', function () { beam.style.transform = ''; });
  }

  // ---------- Navigation ----------
  function indexFromHash() {
    var i = chamberIndex(location.hash.slice(1));
    return i < 0 ? 0 : i;
  }

  window.addEventListener('popstate', function () {
    if (isGame()) goTo(indexFromHash(), { focus: true });
  });

  // Every in-page link to a chamber becomes a level change.
  document.addEventListener('click', function (event) {
    if (!isGame()) return;
    var link = event.target.closest('a[href^="#"]');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var index = chamberIndex(link.getAttribute('href').slice(1));
    if (index < 0) return;
    event.preventDefault();
    goTo(index, { push: true, focus: true, x: event.clientX, y: event.clientY });
  });

  // ---------- Puzzles ----------
  // Each level has a real puzzle: set things up, press the action button
  // (or E), watch what happens. A wrong setup fails with a hint and can be
  // retried; the level menu always lets you skip.
  function finish(scene) {
    var section = scene.closest('.chamber');
    var exit = scene.querySelector('.exit-btn');
    scene.classList.remove('is-busy');
    scene.classList.add('is-cleared');
    exit.setAttribute('aria-label', 'Porte ouverte : passer au niveau suivant');
    navLinks.forEach(function (link) {
      if (link.getAttribute('href') === '#' + section.id) link.classList.add('is-solved');
    });
    var num = section.querySelector('.chamber-num');
    var text = 'Niveau ' + (num ? num.textContent : '') + ' terminé. La porte de sortie est ouverte.';
    scene.querySelector('.puzzle-hint').textContent = text;
    say(text);
    exit.focus({ preventScroll: true });
  }

  function add(scene, html) {
    scene.querySelector('.scene-decor').insertAdjacentHTML('beforeend', html);
  }

  // Keyframes are [offset, x, y, scale] in px from the element's CSS position.
  function animate(el, frames, ms, done) {
    if (!el.animate || reduceMotion.matches) { done(); return; }
    var keys = frames.map(function (f) {
      return {
        offset: f[0],
        transform: 'translate(' + f[1] + 'px,' + f[2] + 'px) scale(' + (f[3] == null ? 1 : f[3]) + ')'
      };
    });
    el.animate(keys, { duration: ms, easing: 'linear' }).onfinish = done;
  }

  // The portal gun: click a white surface to put a portal on it, blue
  // first, then orange, then blue again... Two portals are always linked.
  function portalGun(scene, surfaces) {
    var gun = { blue: null, orange: null, next: 'blue' };
    var buttons = {};
    function render() {
      Object.keys(buttons).forEach(function (id) {
        var color = gun.blue === id ? 'blue' : gun.orange === id ? 'orange' : '';
        buttons[id].setAttribute('data-portal', color);
        buttons[id].setAttribute('aria-label', buttons[id].getAttribute('data-name') +
          (color ? ' : portail ' + (color === 'blue' ? 'bleu' : 'orange') + ' posé' : ' : poser le portail ' + (gun.next === 'blue' ? 'bleu' : 'orange')));
      });
      scene.setAttribute('data-next', gun.next);
    }
    surfaces.forEach(function (surface) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'surf surf-' + surface[0];
      button.setAttribute('data-name', surface[1]);
      button.addEventListener('click', function () {
        if (scene.classList.contains('is-cleared') || scene.classList.contains('is-busy')) return;
        var other = gun.next === 'blue' ? 'orange' : 'blue';
        if (gun[other] === surface[0]) gun[other] = null;
        gun[gun.next] = surface[0];
        gun.next = other;
        render();
      });
      buttons[surface[0]] = button;
      scene.appendChild(button);
    });
    gun.linked = function (a, b) {
      return (gun.blue === a && gun.orange === b) || (gun.blue === b && gun.orange === a);
    };
    gun.has = function (id) { return gun.blue === id || gun.orange === id; };
    render();
    return gun;
  }

  var puzzles = {};

  // 01 — the cube must land on the button behind the glass: one portal
  // under the dropper, the other on the ceiling above the button.
  puzzles.competences = {
    hint: 'Objectif : le cube sur le bouton rouge. Posez deux portails sur les surfaces blanches (bleu, puis orange), puis lâchez le cube.',
    init: function (scene) {
      add(scene, '<span class="glass"></span>');
      this.gun = portalGun(scene, [['drop', 'Sol, sous le distributeur'], ['side', 'Sol, derrière la vitre'], ['top', 'Plafond, au-dessus du bouton']]);
    },
    act: function (scene, win, fail) {
      var gun = this.gun;
      var cube = scene.querySelector('.level-cube');
      var w = scene.clientWidth, h = scene.clientHeight;
      var floor = h - 50, dx = w * .42;
      if (gun.linked('drop', 'top')) {
        animate(cube, [[0, 0, 0], [.3, 0, floor], [.36, 0, floor + 20, 0], [.37, dx, -30, 0], [.45, dx, 0], [1, dx, floor - 12]], 1300, win);
      } else if (gun.linked('drop', 'side')) {
        animate(cube, [[0, 0, 0], [.3, 0, floor], [.36, 0, floor + 20, 0], [.37, w * .26, floor + 20, 0], [.55, w * .26, floor - 50], [.8, w * .26, floor], [1, w * .26, floor]], 1400,
          function () { fail('Le cube ressort du sol, du mauvais côté de la vitre. Le bouton est sous le plafond de droite.'); });
      } else {
        animate(cube, [[0, 0, 0], [.4, 0, floor], [.55, 0, floor - 14], [.7, 0, floor], [1, 0, floor]], 1100, function () {
          fail(gun.has('drop') ? 'Un portail seul ne mène nulle part : il en faut un second, là où le cube doit ressortir.'
            : 'Le cube tombe au sol, loin du bouton. Il faut un portail sous le distributeur.');
        });
      }
    }
  };

  // 02 — the light bridge hits a wall. Catch it with a portal and let it
  // out at the edge of the pit.
  puzzles.experiences = {
    hint: 'Objectif : franchir la fosse. Posez un portail là où le pont de lumière frappe le mur, l’autre au bord de la fosse, puis activez le pont.',
    init: function (scene) {
      add(scene, '<span class="bridge-a"></span><span class="bridge-c"></span>');
      this.gun = portalGun(scene, [['hit', 'Mur frappé par le pont'], ['edge', 'Mur au bord de la fosse'], ['roof', 'Plafond, au-dessus de la fosse']]);
    },
    act: function (scene, win, fail) {
      var gun = this.gun;
      scene.classList.add('is-firing');
      setTimeout(function () {
        if (gun.linked('hit', 'edge')) {
          scene.classList.add('is-bridged');
          setTimeout(win, reduceMotion.matches ? 0 : 650);
          return;
        }
        if (gun.linked('hit', 'roof')) scene.classList.add('is-dropping');
        setTimeout(function () {
          scene.classList.remove('is-firing', 'is-dropping');
          fail(gun.linked('hit', 'roof') ? 'Le pont ressort du plafond et tombe dans la fosse : inutilisable. Il doit sortir à l’horizontale.'
            : 'Le pont s’écrase contre le mur. Il lui faut une entrée là où il frappe, et une sortie.');
        }, 900);
      }, reduceMotion.matches ? 0 : 450);
    }
  };

  // 03 — aim the laser (see the pointer tracking above); E fires it for you.
  puzzles.projets = {
    hint: 'Objectif : toucher le récepteur. Le laser suit votre pointeur : maintenez le faisceau sur le récepteur (ou touche E).',
    act: function (scene, win) {
      scene.classList.add('is-cleared');
      setTimeout(win, reduceMotion.matches ? 0 : 500);
    }
  };

  // 04 — launch plate: the power needle swings, launch in the green zone.
  puzzles.formation = {
    hint: 'Objectif : le cube sur la plateforme. Lancez quand l’aiguille de puissance est dans la zone verte.',
    init: function (scene) {
      add(scene, '<span class="power-gauge"><span class="power-zone"></span><span class="power-needle"></span></span>');
    },
    act: function (scene, win, fail) {
      var cube = scene.querySelector('.level-cube-ledge');
      var svg = scene.querySelector('.launch-arc');
      var path = svg.querySelector('path');
      var gauge = scene.querySelector('.power-gauge');
      var needle = gauge.querySelector('.power-needle');
      var power = reduceMotion.matches ? .7 : parseFloat(getComputedStyle(needle).left) / gauge.clientWidth;
      var good = power >= .58 && power <= .82;
      if (!cube.animate || reduceMotion.matches) { if (good) win(); return; }
      needle.style.animationPlayState = 'paused';
      // scene-local geometry: screen boxes divided by the 3D scale of the scene
      var frame = scene.getBoundingClientRect();
      var k = frame.width / scene.clientWidth;
      function local(el) {
        var r = el.getBoundingClientRect();
        return { x: (r.left - frame.left) / k, y: (r.top - frame.top) / k, w: r.width / k, h: r.height / k };
      }
      var arc = local(svg), from = local(cube), ledge = local(scene.querySelector('.ledge'));
      var startX = from.x + from.w / 2, startY = from.y + from.h;
      var reach = good ? 1 : power / .7;
      var length = path.getTotalLength();
      var frames = [], last;
      for (var i = 0; i <= 24; i++) {
        var pt = path.getPointAtLength(length * i / 24);
        var x = arc.x + pt.x * arc.w / 400 * reach;
        var y = arc.y + pt.y * arc.h / 120;
        if (!good && i > 12) y += (scene.clientHeight - 8 - y) * (i - 12) / 12; // miss: it ends on the floor
        last = [i / 26, x - startX, y - startY];
        frames.push(last);
      }
      if (good) last = [1, ledge.x + ledge.w / 2 - startX, ledge.y - startY];
      frames.push([1, last[1], last[2]]);
      cube.style.opacity = 1;
      animate(cube, frames, 1000, function () {
        cube.style.opacity = '';
        needle.style.animationPlayState = '';
        if (good) win();
        else fail(power < .58 ? 'Trop court : le cube retombe avant la plateforme. Attendez que l’aiguille soit dans le vert.'
          : 'Trop fort : le cube passe au-dessus de la plateforme. Visez la zone verte.');
      });
    }
  };

  // 05 — gels: orange speeds the cube up, blue makes it bounce. It needs
  // speed first, then a bounce, to clear the pit and reach the button.
  puzzles.profil = {
    hint: 'Objectif : le cube sur le bouton, de l’autre côté de la fosse. Cliquez les dalles pour changer de gel : l’orange accélère, le bleu fait rebondir.',
    init: function (scene) {
      add(scene, '<span class="pit gel-pit"></span><span class="floor-button gel-target"></span>' +
        '<span class="level-cube gel-cube"><span class="cube3d"><span class="cube-face cube-front"></span>' +
        '<span class="cube-face cube-right"></span><span class="cube-face cube-top"></span></span></span>');
      var names = { none: 'sans gel', orange: 'gel orange (accélère)', blue: 'gel bleu (rebond)' };
      var order = ['none', 'orange', 'blue'];
      this.tiles = [1, 2].map(function (n) {
        var tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'tile tile-' + n;
        function set(gel) {
          tile.setAttribute('data-gel', gel);
          tile.setAttribute('aria-label', 'Dalle ' + n + ' : ' + names[gel] + '. Cliquer pour changer.');
        }
        set('none');
        tile.addEventListener('click', function () {
          if (scene.classList.contains('is-cleared') || scene.classList.contains('is-busy')) return;
          set(order[(order.indexOf(tile.getAttribute('data-gel')) + 1) % 3]);
        });
        scene.appendChild(tile);
        return tile;
      });
    },
    act: function (scene, win, fail) {
      var first = this.tiles[0].getAttribute('data-gel');
      var second = this.tiles[1].getAttribute('data-gel');
      var cube = scene.querySelector('.gel-cube');
      var w = scene.clientWidth, h = scene.clientHeight;
      var t1 = w * .14, t2 = w * .36, pit = w * .5, target = w * .64;
      if (first === 'blue') {
        animate(cube, [[0, 0, 0], [.3, t1, 0], [.5, t1 + 10, -h * .5], [.7, t1, 0], [.85, t1, -h * .2], [1, t1, 0]], 1300,
          function () { fail('Le gel bleu fait rebondir sur place : sans élan, le cube ne va nulle part. Il faut d’abord de la vitesse.'); });
      } else if (first !== 'orange') {
        if (second === 'blue') {
          animate(cube, [[0, 0, 0], [.55, t2, 0], [.75, pit, -h * .35], [1, pit + 14, h * .5, .6]], 1700,
            function () { fail('Un rebond sans élan retombe dans la fosse. Accélérez d’abord avec le gel orange.'); });
        } else {
          animate(cube, [[0, 0, 0], [.8, pit - 30, 0], [1, pit - 30, 0]], 1800,
            function () { fail('Trop lent : le cube s’arrête avant la fosse. Le gel orange donne de la vitesse.'); });
        }
      } else if (second !== 'blue') {
        animate(cube, [[0, 0, 0], [.2, t1, 0], [.6, pit, 0], [1, pit + 30, h * .6, .6]], 900,
          function () { fail('Rapide, mais sans rebond : le cube file droit dans la fosse. Le gel bleu, juste avant le bord, le fera sauter.'); });
      } else {
        animate(cube, [[0, 0, 0], [.2, t1, 0], [.45, t2 + 20, 0], [.7, (t2 + target) / 2 + 10, -h * .62], [1, target, -6]], 1100, win);
      }
    }
  };

  Array.prototype.forEach.call(document.querySelectorAll('.level-scene'), function (scene) {
    var section = scene.closest('.chamber');
    var trigger = scene.querySelector('.puzzle-btn');
    var exit = scene.querySelector('.exit-btn');
    var puzzle = puzzles[section.id];
    var fails = 0;

    // the objective, then the result of each try (read by screen readers too)
    var hint = document.createElement('p');
    hint.className = 'puzzle-hint';
    hint.setAttribute('role', 'status');
    hint.textContent = puzzle.hint;
    scene.insertBefore(hint, scene.firstChild);
    if (puzzle.init) puzzle.init(scene);

    trigger.hidden = false;
    exit.hidden = false;
    exit.setAttribute('aria-label', 'Porte verrouillée : résolvez l’énigme pour l’ouvrir');

    trigger.addEventListener('click', function () {
      if (scene.classList.contains('is-cleared') || scene.classList.contains('is-busy')) return;
      scene.classList.add('is-busy');
      puzzle.act(scene, function () { finish(scene); }, function (message) {
        fails++;
        scene.classList.remove('is-busy');
        if (fails >= 3) message += ' (Le menu des niveaux permet aussi de passer.)';
        hint.textContent = message;
        say(message);
      });
    });

    exit.addEventListener('click', function (event) {
      if (!scene.classList.contains('is-cleared') || scene.classList.contains('is-busy')) {
        exit.classList.remove('is-locked');
        void exit.offsetWidth; // restart the shake
        exit.classList.add('is-locked');
        say('Porte verrouillée. Résolvez l’énigme, ou passez par le menu des niveaux.');
        return;
      }
      var rect = exit.getBoundingClientRect();
      goTo(chamberIndex(section.id) + 1, {
        push: true, focus: true,
        x: event.clientX || rect.left + rect.width / 2,
        y: event.clientY || rect.top + rect.height / 2
      });
    });
  });

  // Keyboard: arrows / PageUp / PageDown change level, E uses the puzzle.
  document.addEventListener('keydown', function (event) {
    if (!isGame() || event.altKey || event.ctrlKey || event.metaKey) return;
    var tag = event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      goTo(current + 1, { push: true, focus: true });
      event.preventDefault();
    } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      goTo(current - 1, { push: true, focus: true });
      event.preventDefault();
    } else if (event.key === 'e' || event.key === 'E') {
      var trigger = chambers[current].querySelector('.puzzle-btn');
      if (trigger) trigger.click();
    }
  });

  // ---------- Classic view ----------
  function readPref() {
    try { return localStorage.getItem('cv-view') === 'classic'; } catch (e) { return false; }
  }
  function savePref(on) {
    try { localStorage.setItem('cv-view', on ? 'classic' : 'game'); } catch (e) { /* storage blocked */ }
  }

  // Classic view keeps a sticky header: anchored headings must clear it.
  function syncHeaderHeight() {
    var sticky = !isGame() && getComputedStyle(header).position === 'sticky';
    root.style.setProperty('--header-h', sticky ? header.offsetHeight + 'px' : '0px');
  }
  window.addEventListener('resize', syncHeaderHeight);

  function setClassic(on) {
    root.classList.toggle('classic', on);
    root.classList.toggle('game', !on);
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(on));
      toggleLabel.textContent = on ? 'Revenir au mode jeu' : 'Afficher le CV classique';
      toggle.title = toggleLabel.textContent;
    }
    if (narrator) narrator.classList.add('is-hidden');
    syncHeaderHeight();
    if (on) {
      chambers.forEach(function (section) {
        section.classList.add('is-in');
        // drop the camera offsets of the game
        section.querySelector('.chamber-inner').style.transform = '';
      });
      if (current > 0) chambers[current].scrollIntoView();
      else window.scrollTo(0, 0);
    } else {
      var index = current < 0 ? 0 : current;
      current = -1;
      window.scrollTo(0, 0); // the game screen never scrolls
      activate(index, false);
    }
    syncSvgMotion();
  }

  if (toggle) {
    toggle.hidden = false;
    toggle.addEventListener('click', function () {
      var on = !root.classList.contains('classic');
      setClassic(on);
      savePref(on);
    });
  }

  // Printing (and "save as PDF") always uses the classic layout.
  var gameBeforePrint = false;
  window.addEventListener('beforeprint', function () {
    gameBeforePrint = isGame();
    root.classList.add('classic');
    root.classList.remove('game');
  });
  window.addEventListener('afterprint', function () {
    if (!gameBeforePrint) return;
    root.classList.remove('classic');
    root.classList.add('game');
  });

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  current = indexFromHash();
  setClassic(/[?&]classique\b/.test(location.search) || readPref());
})();
