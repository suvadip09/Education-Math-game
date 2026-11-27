/* =====================================================================
   game.js  —  THE GAME LOGIC
   A "level" = 7 or 8 questions. Each question is one puzzle:
   some numbers shown scrambled, and the child drags them into order
   (small -> big). When sorted, that question is ticked and the next
   one loads. All questions done = win.
   (Sounds/voice/music live in audio.js and are called from here.)
   ===================================================================== */

/* ---------- Lists used for look & voice ---------- */
var COLORS = ["#ff6b9d","#ffa63d","#ffd23f","#4ecb71","#36c5d6","#6a8bff","#b06bff","#ff7b54"]; // tile colours
var WORDS  = ["one","two","three","four","five","six","seven","eight"]; // for spoken "question two done"
var GARDEN = ["🌳","🌻","🌸","🌷","🌲","🍀","🌼","🌹"];                  // a plant grows per finished question
var COACH  = ["Dhyaan se khelo!","Chhote se bade tak lagao!","Shabaash, seekhte raho!","Bahut achhe, aage badho!","Soch ke lagao!"];
var CHEERS = ["Yay! 🎈","So good! ⭐","Nice one! 😄","Keep going! 💪","Woohoo! 🎉","Super! 🌟","You rock! 🤩"];
var IDLE   = ["Drag the numbers in order! 😊","Small first, big last!","Tap two to swap them!","You can do it! 💛"];

/* ---------- The game's memory (state) ---------- */
var state = {
  n:6,            // how many numbers in each question (4/6/8)
  q:0,            // which question we are on (0-based)
  total:6,        // how many questions this level (7 or 8)
  moves:0,        // moves used this level
  won:false,      // is the current puzzle solved?
  selected:null,  // tile picked with a tap (for tap-to-swap)
  best:{},        // best score per level, loaded from localStorage
  quiet:false,    // true while building a puzzle (no sounds)
  prevRight:{},   // which numbers were already correct (to detect NEW ones)
  sinceProgress:0,// moves since the "correct count" last went up (for hints)
  lastCorrect:0
};
try{ state.best = JSON.parse(localStorage.getItem('nlu_best') || '{}'); }catch(e){}

/* ---------- Grab the HTML elements we need ---------- */
var track    = document.getElementById('track'),
    movesEl  = document.getElementById('moves'),
    bestEl   = document.getElementById('best'),
    meterEl  = document.getElementById('meter'),
    winEl    = document.getElementById('win'),
    bubble   = document.getElementById('bubble'),
    mascot   = document.getElementById('mascot'),
    trackerEl= document.getElementById('tracker'),
    qlabelEl = document.getElementById('qlabel'),
    landing  = document.getElementById('landing'),
    seg      = document.getElementById('count');

/* ---------- Small helpers ---------- */
function shuffle(a){ for(var i=a.length-1;i>0;i--){ var j=(Math.random()*(i+1))|0, t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
function pick(a){ return a[(Math.random()*a.length)|0]; }
function say(msg){ bubble.textContent = msg; }                // mascot speech bubble text

/* Say a number out loud when the child hovers/picks it up.
   First time each puzzle it also says "Aap bhi mere saath bolo!" (you say it too).
   The _lastSpoke guard stops the same number being said twice in a row. */
var _lastSpoke = { n:null, t:0 };
function sayNumber(n){
  if(!soundOn) return;
  var now = Date.now();
  if(_lastSpoke.n === n && now - _lastSpoke.t < 500) return;
  _lastSpoke = { n:n, t:now };
  if(!state.saidBolo){ state.saidBolo = true; speak("Aap bhi mere saath bolo! " + n); }
  else speak(String(n));
}
/* Play a one-time animation on an element, then let its idle animation return. */
function oneShot(el, anim){
  if(!el) return;
  el.style.animation = anim;
  el.addEventListener('animationend', function h(){ el.style.animation=''; el.removeEventListener('animationend', h); });
}
function hopMascot(){ oneShot(mascot, 'cheer 1s ease-in-out'); }

/* =====================================================================
   START A LEVEL  (7-8 questions) and START ONE QUESTION
   ===================================================================== */
function newLevel(n){
  state.n = n; setSeg(n);
  state.q = 0;
  state.total = Math.random() < 0.5 ? 7 : 8;   // 7 or 8 questions
  state.moves = 0; movesEl.textContent = 0;
  bestEl.textContent = state.best[n] || '—';
  winEl.classList.remove('show');
  buildTracker();
  newPuzzle();
}

function newPuzzle(){
  state.won = false; state.selected = null; state.prevRight = {}; state.sinceProgress = 0;
  state.saidBolo = false;
  say(pick(IDLE));
  qlabelEl.textContent = 'Question ' + (state.q + 1) + ' of ' + state.total;

  // 1) pick `n` different random numbers (1..50)
  var pool = []; for(var k=1;k<=50;k++) pool.push(k); shuffle(pool);
  var nums = pool.slice(0, state.n);
  // 2) scramble them (and make sure they are NOT already sorted)
  var scr = nums.slice(); do{ shuffle(scr); } while(isSorted(scr) && scr.length > 1);

  // 3) build a tile for each number
  track.innerHTML = '';
  scr.forEach(function(v, i){
    var t = document.createElement('div');
    t.className = 'tile'; t.dataset.val = v;
    t.innerHTML =
      '<div class="chip" style="background:' + COLORS[nums.indexOf(v) % COLORS.length] + '">' +
        '<div class="eyes" style="animation-delay:' + (Math.random()*3).toFixed(2) + 's"><div class="eye"><i></i></div><div class="eye"><i></i></div></div>' +
        '<span class="cheek l"></span><span class="cheek r"></span>' +
        '<div class="num">' + v + '</div><div class="mouth"></div>' +
      '</div><span class="tick">✓</span>';
    attach(t);                 // make it draggable
    track.appendChild(t);
    oneShot(t.querySelector('.chip'), 'pop .5s ' + (i*0.08).toFixed(2) + 's backwards'); // staggered pop-in
  });

  state.quiet = true; update(); state.quiet = false;          // check state silently
  if(state.q > 0 && Math.random() < 0.6) speak(pick(COACH));  // coaching voice between questions
}

/* =====================================================================
   THE QUESTION TRACKER (dots that turn into plants)
   ===================================================================== */
function buildTracker(){
  trackerEl.innerHTML = '';
  for(var i=0;i<state.total;i++){ var s=document.createElement('div'); s.className='step'; trackerEl.appendChild(s); }
  setCurrent(0);
}
function steps(){ return Array.prototype.slice.call(trackerEl.children); }
function setCurrent(i){ steps().forEach(function(s,k){ s.classList.toggle('current', k===i && !s.classList.contains('done')); }); }
function tickStep(i){ var s=steps()[i]; if(!s) return; s.classList.remove('current'); s.classList.add('done'); s.textContent = GARDEN[i % GARDEN.length]; }
function stepConfetti(i){
  var s=steps()[i]; if(!s || !window.confetti) return; var r=s.getBoundingClientRect();
  window.confetti({ particleCount:30, spread:65, startVelocity:32,
    origin:{ x:(r.left+r.width/2)/innerWidth, y:(r.top+r.height/2)/innerHeight }, disableForReducedMotion:true });
}

/* =====================================================================
   HINT: after a few moves with no progress, show the next move
   ===================================================================== */
function clearHints(){ tiles().forEach(function(t){ t.classList.remove('hint','hintTarget'); }); }
function showHint(){
  var cur = vals(), sorted = cur.slice().sort(function(a,b){ return a-b; });
  var i = 0; while(i < cur.length && cur[i] === sorted[i]) i++;   // first wrong position
  if(i >= cur.length) return;                                     // already solved
  var need = sorted[i], tl = tiles(), from = tl[cur.indexOf(need)];
  clearHints();
  if(from) from.classList.add('hint');          // glow YELLOW: move me
  if(tl[i]) tl[i].classList.add('hintTarget');  // glow GREEN: move here
  say("Dhyaan se! " + need + " ko yahan 👉 laao");
  speak("Dhyaan se khelo. Number " + need + " ko aage laao.");
  hopMascot();
  setTimeout(clearHints, 3800);
}

/* =====================================================================
   READING THE BOARD
   ===================================================================== */
function isSorted(a){ for(var i=1;i<a.length;i++) if(a[i-1] > a[i]) return false; return true; }
function tiles(){ return Array.prototype.slice.call(track.querySelectorAll('.tile')); }
function vals(){ return tiles().map(function(t){ return +t.dataset.val; }); }

/* Called after every move: marks correct tiles, updates the bar,
   handles hints, and checks for a solved puzzle. */
function update(){
  var cur = vals(), sorted = cur.slice().sort(function(a,b){ return a-b; }), correct = 0, newly = [];
  tiles().forEach(function(t, i){
    var v = +t.dataset.val, ok = (v === sorted[i]);
    t.classList.toggle('right', ok);
    if(ok){ correct++; if(!state.prevRight[v]) newly.push(t); } // newly correct this move
  });
  // remember which are correct now
  state.prevRight = {}; tiles().forEach(function(t, i){ if(+t.dataset.val === sorted[i]) state.prevRight[+t.dataset.val] = true; });

  meterEl.style.width = (correct / cur.length * 100) + '%';      // progress bar

  // happy feedback for tiles that just became correct
  if(!state.quiet && newly.length && !state.won){
    sSparkle(); hopMascot(); say(pick(CHEERS));
    newly.forEach(function(t){ oneShot(t.querySelector('.chip'), 'hopHappy .6s'); });
  }

  // hint logic: count moves that did NOT increase the correct count
  if(!state.quiet){ if(correct > state.lastCorrect) state.sinceProgress = 0; else state.sinceProgress++; }
  state.lastCorrect = correct;
  if(!state.quiet && state.sinceProgress >= 4 && correct < cur.length && !state.won){ state.sinceProgress = 0; showHint(); }

  // solved?
  if(correct === cur.length && !state.won && !state.quiet) onSolved();
}
function bump(){ state.moves++; movesEl.textContent = state.moves; }

/* One question solved -> tick it, then load the next (or finish). */
function onSolved(){
  state.won = true;
  sSparkle(); stepConfetti(state.q); tickStep(state.q);
  hopMascot(); say("Shabaash! 🎉");
  speak("Question " + (WORDS[state.q] || (state.q+1)) + " done! Shabaash!");
  state.q++;
  if(state.q >= state.total){ setTimeout(finishLevel, 800); return; } // all done
  setTimeout(function(){ setCurrent(state.q); newPuzzle(); }, 1000);  // next question
}

/* Whole level finished -> celebrate + save best score. */
function finishLevel(){
  sCheer(); bigConfetti();
  mascot.style.animation = 'cheer .9s ease-in-out 3';
  setTimeout(function(){ mascot.style.animation = ''; }, 2800);
  speak("Wah! Sab sawaal ho gaye! Bahut badhiya!");
  var prev = state.best[state.n];
  if(prev == null || state.moves < prev){
    state.best[state.n] = state.moves;
    try{ localStorage.setItem('nlu_best', JSON.stringify(state.best)); }catch(e){}
    bestEl.textContent = state.moves;
  }
  document.getElementById('wsub').textContent = 'All ' + state.total + ' questions done in ' + state.moves + ' moves! 🎊';
  setTimeout(function(){ winEl.classList.add('show'); }, 650);
}

/* =====================================================================
   SMOOTH SLIDING (the "FLIP" technique)
   Measure where things are, move them in the HTML, then animate from the
   old spot to the new spot. This is what makes tiles glide into place.
   ===================================================================== */
function flip(nodes, mutate){
  var first = nodes.map(function(n){ return n.getBoundingClientRect(); }); // BEFORE
  mutate();                                                                // change order
  nodes.forEach(function(n, i){
    var last = n.getBoundingClientRect();                                  // AFTER
    var dx = first[i].left - last.left, dy = first[i].top - last.top;
    if(dx || dy){
      n.style.transition = 'none';
      n.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';          // jump back to old spot
      n.getBoundingClientRect();                                           // force a reflow
      n.style.transition = 'transform .26s cubic-bezier(.2,.9,.25,1.1)';
      n.style.transform = '';                                              // ...then glide to new spot
    }
  });
}

/* =====================================================================
   DRAG A TILE  (works with mouse AND touch via Pointer Events)
   ===================================================================== */
function attach(t){
  var chip = t.querySelector('.chip');

  // HOVER (desktop): say the number out loud
  t.addEventListener('pointerenter', function(){ if(!state.won) sayNumber(+t.dataset.val); });

  t.addEventListener('pointerdown', function(e){
    if(state.won) return;
    e.preventDefault();
    sayNumber(+t.dataset.val);            // PICK UP (works on touch too): say the number
    var r = t.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top, moved = false;
    var ph = document.createElement('div'); ph.className = 'ph';  // placeholder keeps the gap
    t.setPointerCapture(e.pointerId);

    // start the actual drag once the finger/mouse really moves
    function begin(){
      clearHints(); moved = true; sBoing();
      track.insertBefore(ph, t);
      t.classList.add('dragging');
      chip.style.animation = 'none'; chip.classList.add('grab');
      t.style.position = 'fixed'; t.style.margin = 0;
      t.style.width = r.width + 'px'; t.style.height = r.height + 'px';
      t.style.left = r.left + 'px'; t.style.top = r.top + 'px';
      document.body.appendChild(t);
    }
    function move(ev){
      if(!moved){ if(Math.abs(ev.clientX-e.clientX) > 4 || Math.abs(ev.clientY-e.clientY) > 4) begin(); else return; }
      t.style.left = (ev.clientX - ox) + 'px';
      t.style.top  = (ev.clientY - oy) + 'px';
      // find where to drop (before the first tile the pointer is past)
      var sibs = tiles(), target = null;
      for(var i=0;i<sibs.length;i++){
        var rr = sibs[i].getBoundingClientRect(), mid = rr.top+rr.height/2, midx = rr.left+rr.width/2;
        if(ev.clientY < mid-4 || (Math.abs(ev.clientY-mid) < rr.height/2 && ev.clientX < midx)){ target = sibs[i]; break; }
      }
      var nodes = sibs.concat(ph);
      if(target){ if(ph.nextSibling !== target) flip(nodes, function(){ track.insertBefore(ph, target); }); }
      else { if(track.lastElementChild !== ph) flip(nodes, function(){ track.appendChild(ph); }); }
    }
    function up(ev){
      try{ t.releasePointerCapture(e.pointerId); }catch(_){}
      t.removeEventListener('pointermove', move); t.removeEventListener('pointerup', up);
      if(!moved){ selectSwap(t); return; }           // it was a TAP, not a drag
      // drop the tile where the placeholder is
      var pr = ph.getBoundingClientRect();
      t.classList.remove('dragging'); chip.classList.remove('grab');
      t.style.position=''; t.style.left=''; t.style.top=''; t.style.width=''; t.style.height=''; t.style.margin='';
      track.insertBefore(t, ph); ph.remove();
      // small glide into the final spot
      var last = t.getBoundingClientRect(), dx = pr.left-last.left, dy = pr.top-last.top;
      if(dx || dy){
        t.style.transition='none'; t.style.transform='translate('+dx+'px,'+dy+'px)';
        t.getBoundingClientRect();
        t.style.transition='transform .2s cubic-bezier(.2,.8,.25,1)'; t.style.transform='';
      }
      oneShot(chip, 'drop .4s'); sPop(); bump(); update();
    }
    t.addEventListener('pointermove', move);
    t.addEventListener('pointerup', up);
  });
}

/* =====================================================================
   TAP TWO TILES TO SWAP (easy alternative to dragging)
   ===================================================================== */
function selectSwap(t){
  if(state.won) return;
  var chip = t.querySelector('.chip');
  if(!state.selected){                           // first tile picked
    state.selected = t; t.classList.add('sel');
    chip.style.outline = '4px solid var(--accent)'; chip.style.outlineOffset = '3px';
    sPop(); return;
  }
  var a = state.selected, b = t, aChip = a.querySelector('.chip');
  aChip.style.outline = ''; a.classList.remove('sel'); state.selected = null;
  if(a === b) return;                            // tapped same tile -> just deselect
  var nodes = tiles(), aNext = a.nextSibling === b ? a : a.nextSibling, bNext = b.nextSibling;
  flip(nodes, function(){ track.insertBefore(b, aNext); track.insertBefore(a, bNext); }); // swap with slide
  oneShot(a.querySelector('.chip'), 'drop .4s'); oneShot(b.querySelector('.chip'), 'drop .4s');
  sPop(); bump(); update();
}

/* Big confetti for a finished level. */
function bigConfetti(){
  if(!window.confetti) return;
  var end = Date.now() + 1500;
  (function f(){
    window.confetti({ particleCount:7, angle:60,  spread:70, startVelocity:45, origin:{x:0}, disableForReducedMotion:true });
    window.confetti({ particleCount:7, angle:120, spread:70, startVelocity:45, origin:{x:1}, disableForReducedMotion:true });
    if(Date.now() < end) requestAnimationFrame(f);
  })();
  window.confetti({ particleCount:80, spread:100, origin:{y:0.4}, disableForReducedMotion:true });
}

/* =====================================================================
   LEVEL PICKER + LANDING SCREEN
   ===================================================================== */
function setSeg(n){
  Array.prototype.forEach.call(seg.querySelectorAll('button'), function(b){
    b.setAttribute('aria-pressed', (+b.dataset.n === n) ? 'true' : 'false');
  });
}
function startGame(n){
  ensureAudio();                                   // unlock audio (we're in a click)
  landing.classList.add('hide');
  setTimeout(function(){ landing.style.display = 'none'; }, 480);
  speak("Hello student! Chalo, game khelte hain!");
  startMusic();
  newLevel(n);
}
function goHome(){
  try{ if(window.speechSynthesis) speechSynthesis.cancel(); }catch(e){}
  landing.style.display = '';
  landing.classList.remove('hide','show');
  void landing.offsetWidth;                        // restart the entry animations
  landing.classList.add('show');
}
