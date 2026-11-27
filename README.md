# 🌈 Number Line-Up

A cartoon educational game for kids. Scrambled numbers appear and the child
drags them into order (small → big). Each level has 7–8 questions shown as a
"garden" tracker at the top. Features a jungle theme, a monkey mascot,
cartoon sound effects, looping background music, a Hinglish talking voice,
and auto-hints when the child is stuck.

---

## ▶️ How to run

**Easiest way (recommended) — VS Code Live Server:**
1. Open this `number-lineup` folder in VS Code.
2. Install the **"Live Server"** extension (by Ritwick Dey).
3. Right-click `index.html` → **"Open with Live Server"**.

**Or just open the file:**
- Double-click `index.html` to open it in your browser.

> 🔊 **Note:** Browsers block sound until you click something. The music and
> voice start **after you tap a level** — this is normal browser behaviour.

---

## 📁 Project structure

```
number-lineup/
├── index.html        ← the page (HTML structure)
├── css/
│   └── style.css      ← all styling + animations (organised in 10 sections)
├── js/
│   ├── audio.js       ← sound effects, background music, talking voice
│   ├── game.js        ← the game logic (the "brain")
│   └── main.js        ← connects buttons and starts the game
└── README.md          ← this file
```

**How the files work together:**
1. `index.html` lays out the screen and loads the 3 scripts in order.
2. `audio.js` makes all the sound (no sound files are used).
3. `game.js` runs the game — builds puzzles, checks answers, animates tiles.
4. `main.js` listens to the buttons and calls functions in `game.js`.

---

## 🛠️ Technologies used

| Area | Technology |
|------|-----------|
| Structure | **HTML5** |
| Styling & animation | **CSS3** (`@keyframes`, variables, flexbox) |
| Logic | **Vanilla JavaScript** (no framework) |
| Drag & drop | **Pointer Events API** (mouse + touch) |
| Smooth motion | **FLIP animation technique** |
| Character art | **SVG** (the monkey) |
| Sound effects & music | **Web Audio API** (no audio files) |
| Talking voice | **Web Speech API** (SpeechSynthesis) |
| Saving best score | **localStorage** |
| Celebrations | **canvas-confetti** (only external library, via CDN) |

---

## 🎮 How to play
- Tap a level on the welcome screen (**Easy 4 / Medium 6 / Hard 8** numbers).
- **Drag** a number to a new place, or **tap two** numbers to swap them.
- Put them in order **small → big**. Each tile turns green with a ✓ when correct.
- Finish all 7–8 questions to win. 🎉
- Buttons: 🎵 music • 🔊 sound/voice • 🏠 home • ↻ new numbers.
