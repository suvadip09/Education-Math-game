/* =====================================================================
   audio.js  —  ALL the sound in the game
   Three kinds of sound, none of them use audio files:
     1. Sound effects  -> made with the Web Audio API (oscillators)
     2. Background music -> a short tune looped with the Web Audio clock
     3. Talking voice   -> the Web Speech API (SpeechSynthesis)
   These functions are called from game.js and main.js.
   ===================================================================== */

/* soundOn controls the effects + voice. The 🔊 button flips it. */
var soundOn = true;

/* ---------- The audio "engine" (created on first use) ---------- */
var AC; // the AudioContext
function ac(){
  AC = AC || new (window.AudioContext || window.webkitAudioContext)();
  return AC;
}
/* Browsers block audio until the user clicks. Call this on a click. */
function ensureAudio(){
  try{ ac(); if(AC && AC.state === 'suspended') AC.resume(); }catch(e){}
}

/* ---------- 1. SOUND EFFECTS ---------- */
/* Play one short beep. `freq` can be a number OR a function that sets a
   sliding pitch (used for the "boing"). */
function blip(freq, start, dur, type, peak){
  var a = ac(), o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine';
  o.connect(g); g.connect(a.destination);
  if(typeof freq === 'function') freq(o, a.currentTime + start);
  else o.frequency.setValueAtTime(freq, a.currentTime + start);
  // quick fade in, then fade out (makes it sound soft, not clicky)
  g.gain.setValueAtTime(0.0001, a.currentTime + start);
  g.gain.exponentialRampToValueAtTime(peak || 0.3, a.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.02);
}
/* A tiny burst of white noise (used inside "pop" and "cheer"). */
function noise(start, dur, peak){
  var a = ac(), n = a.sampleRate * dur, b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
  for(var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  var s = a.createBufferSource(); s.buffer = b;
  var g = a.createGain(); g.gain.value = peak || 0.15;
  s.connect(g); g.connect(a.destination);
  s.start(a.currentTime + start);
}
/* S() = "only play if sound is ON". Every effect goes through it. */
function S(fn){ if(!soundOn) return; try{ fn(); }catch(e){} }

function sBoing(){ S(function(){ blip(function(o,t){
  o.frequency.setValueAtTime(240,t);
  o.frequency.exponentialRampToValueAtTime(560,t+0.08);
  o.frequency.exponentialRampToValueAtTime(200,t+0.22);
}, 0, 0.26, 'triangle', 0.3); }); }
function sPop(){ S(function(){ blip(function(o,t){
  o.frequency.setValueAtTime(320,t);
  o.frequency.exponentialRampToValueAtTime(680,t+0.06);
}, 0, 0.1, 'sine', 0.3); noise(0,0.05,0.1); }); }
function sSparkle(){ S(function(){ [880,1175,1568,2093].forEach(function(f,i){ blip(f, i*0.05, 0.14, 'triangle', 0.22); }); }); }
function sCheer(){ S(function(){ [523,659,784,1046].forEach(function(f,i){ blip(f, i*0.1, 0.4, 'triangle', 0.26); }); noise(0.1,0.5,0.12); sSparkle(); }); }

/* ---------- 3. TALKING VOICE (Hinglish) ---------- */
var VOICES = [];
function loadVoices(){ try{ VOICES = window.speechSynthesis ? speechSynthesis.getVoices() : []; }catch(e){} }
if('speechSynthesis' in window){ loadVoices(); try{ speechSynthesis.onvoiceschanged = loadVoices; }catch(e){} }

function speak(text){
  if(!soundOn || !('speechSynthesis' in window)) return;
  try{
    speechSynthesis.cancel(); // stop any sentence still playing
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'hi-IN';   // Hindi/Hinglish
    u.rate = 0.92;      // a little slow for kids
    u.pitch = 1.2;      // higher = friendlier
    // use a Hindi voice if the device has one
    var hi = VOICES.filter(function(v){ return v.lang && v.lang.toLowerCase().indexOf('hi') === 0; })[0];
    if(hi) u.voice = hi;
    speechSynthesis.speak(u);
  }catch(e){}
}

/* ---------- 2. BACKGROUND MUSIC (looping tune) ---------- */
var MEL = [523.25,392,440,523.25,392,329.63,392,440,523.25,440,392,329.63,293.66,329.63,392,523.25]; // melody notes (Hz)
var BASS = [130.81,196,220,196];                                                                      // bass notes (Hz)
var music = { on:true, timer:null, next:0, step:0, gain:null };

/* Play one music note into the music volume channel. */
function mNote(freq, t, dur, type, vol){
  if(!music.gain) return;
  var o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = freq;
  o.connect(g); g.connect(music.gain);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t); o.stop(t + dur + 0.05);
}
/* Runs often and schedules the next few notes a little ahead of time
   (this is the standard way to make steady Web Audio music). */
function schedMusic(){
  if(!AC || !music.gain) return;
  while(music.next < AC.currentTime + 0.25){
    mNote(MEL[music.step % MEL.length], music.next, 0.22, 'triangle', 0.5);
    if(music.step % 4 === 0) mNote(BASS[Math.floor(music.step/4) % BASS.length], music.next, 0.5, 'sine', 0.45);
    music.next += 0.25;  // next note is an 1/8th note later
    music.step++;
  }
}
function startMusic(){
  if(!music.on || music.timer) return;
  ensureAudio(); if(!AC) return;
  music.gain = AC.createGain();
  music.gain.gain.value = 0.07;        // quiet background level
  music.gain.connect(AC.destination);
  music.next = AC.currentTime + 0.1; music.step = 0;
  music.timer = setInterval(schedMusic, 60);
  schedMusic();
}
function stopMusic(){
  if(music.timer){ clearInterval(music.timer); music.timer = null; }
  try{
    if(music.gain){
      music.gain.gain.linearRampToValueAtTime(0, AC.currentTime + 0.2); // fade out
      var g = music.gain; music.gain = null;
      setTimeout(function(){ try{ g.disconnect(); }catch(e){} }, 350);
    }
  }catch(e){}
}
