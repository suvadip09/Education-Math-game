/* =====================================================================
   main.js  —  connects the buttons to the game, then starts it.
   This runs last (after audio.js and game.js are loaded).
   ===================================================================== */

/* Landing screen: the three level buttons (Easy / Medium / Hard) */
Array.prototype.forEach.call(document.querySelectorAll('.lv'), function(b){
  b.addEventListener('click', function(){ startGame(+b.dataset.n); });
});

/* 🏠 Home button AND ← Back button -> back to the landing screen */
document.getElementById('home').addEventListener('click', goHome);
document.getElementById('back').addEventListener('click', goHome);

/* Level switcher inside the game (Easy / Medium / Hard) */
seg.addEventListener('click', function(e){
  var b = e.target.closest('button'); if(!b) return;
  ensureAudio();
  newLevel(+b.dataset.n);
});

/* "New Numbers" -> fresh puzzle for the current question */
document.getElementById('shuffle').addEventListener('click', function(){
  ensureAudio(); newPuzzle(); speak("Chalo, phir se!");
});

/* "Play again" on the win pop-up -> restart the whole level */
document.getElementById('next').addEventListener('click', function(){ newLevel(state.n); });

/* 🔊 Sound button: effects + voice on/off */
document.getElementById('sound').addEventListener('click', function(){
  soundOn = !soundOn;
  this.textContent = soundOn ? '🔊' : '🔇';
  if(soundOn){ sPop(); }
  else { try{ if(window.speechSynthesis) speechSynthesis.cancel(); }catch(e){} }
});

/* 🎵 Music button: background music on/off */
document.getElementById('music').addEventListener('click', function(){
  music.on = !music.on;
  this.style.opacity = music.on ? '1' : '.45';
  if(music.on){ startMusic(); } else { stopMusic(); }
});

/* Build the first level behind the landing screen so it's ready to play. */
newLevel(state.n);
