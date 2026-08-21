// ========================================================
// Islet Sound Synthesizer (Wave Ambience, Voices & Interactive Quartet BGM)
// ========================================================

class IslandAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.isMuted = false;
    this.stepIndex = 0;
    this.bgmInterval = null;

    // 楽器のアンロック状態 (宝物獲得に応じて増えていく)
    this.unlocked = {
      drums: false,   // 🐻 クマ (星の小石): 大地の太鼓・パーカッション
      strings: false, // 🦀 カニ (海のガラス玉): 軽やかな弦楽器ピチカート
      flute: false,   // 🕊️ カモメ (望遠鏡): 伸びやかな風のフルート
      bass: false,    // 👤 影 (オルゴール): 深海ベース＆幻想ベル
    };
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);

      this.startOceanWaves();
      this.startSessionLoop();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    if (!this.masterGain) return false;
    this.isMuted = !this.isMuted;
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
    return !this.isMuted;
  }

  // 宝物の獲得状況に応じて楽器をアンロック
  updateUnlockedTreasures(treasures) {
    if (treasures.includes('star_stone')) this.unlocked.drums = true;
    if (treasures.includes('glass_ball')) this.unlocked.strings = true;
    if (treasures.includes('telescope')) this.unlocked.flute = true;
    if (treasures.includes('music_box')) this.unlocked.bass = true;
  }

  // 1. さざ波の環境音 (Ocean Waves)
  startOceanWaves() {
    setInterval(() => {
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;
      const duration = 4.5;

      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const envelope = Math.sin((i / bufferSize) * Math.PI);
        data[i] = (Math.random() * 2 - 1) * envelope;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(250, now);
      filter.frequency.linearRampToValueAtTime(650, now + duration * 0.4);
      filter.frequency.linearRampToValueAtTime(180, now + duration);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.07, now);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start(now);
    }, 4800);
  }

  // 2. エモート音
  playEmoteSound(type) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    if (type === 'wave') {
      [587.33, 880.00].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.3, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
      });
    } else if (type === 'bow') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.15);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'dance') {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.25, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.15);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.2);
      });
    } else if (type === 'think') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.18);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'clap') {
      [0, 0.08, 0.16].forEach((offset) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now + offset);
        gain.gain.setValueAtTime(0.3, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.05);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + offset);
        osc.stop(now + offset + 0.06);
      });
    } else if (type === 'surprise') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.12);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.16);
    }
  }

  // 3. 住人NPCボイス
  playNPCVoice(npcId, isHappy = true) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    if (npcId === 'bear') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const baseFreq = isHappy ? 160 : 90;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * (isHappy ? 1.4 : 0.8), now + 0.25);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.32);
    } else if (npcId === 'gull') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.18);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (npcId === 'crab') {
      [0, 0.05, 0.1].forEach(offset => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1800, now + offset);
        gain.gain.setValueAtTime(0.3, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.03);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + offset);
        osc.stop(now + offset + 0.04);
      });
    } else if (npcId === 'shadow') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(260, now + 0.2);
      osc.frequency.linearRampToValueAtTime(200, now + 0.5);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.65);
    }
  }

  // 4. 宝物獲得ファンファーレ
  playTreasureFanfare() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const melody = [
      { f: 523.25, d: 0.12 },
      { f: 659.25, d: 0.12 },
      { f: 783.99, d: 0.12 },
      { f: 1046.50, d: 0.45 },
    ];
    let time = 0;
    melody.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, now + time);
      gain.gain.setValueAtTime(0.4, now + time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + note.d);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + time);
      osc.stop(now + time + note.d + 0.05);
      time += note.d * 0.8;
    });
  }

  // 5. アイテム入手音
  playItemPickup() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  // ========================================================
  // 6. インタラクティブ四重奏セッションBGM (Interactive Quartet)
  // ========================================================
  startSessionLoop() {
    // 16拍サイクル (D - A - Bm - F#m - G - D - Em - A)
    const melodyTrack = [
      587.33, 659.25, 739.99, 880.00,
      739.99, 659.25, 587.33, 440.00,
      493.88, 587.33, 739.99, 659.25,
      587.33, 493.88, 440.00, 370.00
    ];

    // 🕊️ カモメのフルート (美しい高音ハーモニー・オブリガート)
    const fluteTrack = [
      880.00, 0, 1174.66, 0,
      1108.73, 0, 880.00, 0,
      987.77, 0, 1174.66, 0,
      880.00, 739.99, 659.25, 0
    ];

    // 🦀 カニの弦楽器ピチカート (D, A, Bm, F#m, G, D, Em, A のコード分散)
    const stringsTrack = [
      [293.66, 369.99, 440.00], // D
      [220.00, 277.18, 329.63], // A
      [246.94, 293.66, 369.99], // Bm
      [185.00, 220.00, 277.18], // F#m
      [196.00, 246.94, 293.66], // G
      [293.66, 369.99, 440.00], // D
      [164.81, 196.00, 246.94], // Em
      [220.00, 277.18, 329.63], // A
    ];

    // 👤 影のサブベース (ルート音)
    const bassTrack = [
      146.83, 146.83, 110.00, 110.00,
      123.47, 123.47, 92.50, 92.50,
      98.00, 98.00, 146.83, 146.83,
      82.41, 82.41, 110.00, 110.00
    ];

    this.bgmInterval = setInterval(() => {
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;
      const step = this.stepIndex % 16;
      const chordIdx = Math.floor(step / 2);

      // --- [基本] オルゴール / 木琴 (Music Box) ---
      const mFreq = melodyTrack[step];
      if (mFreq > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(mFreq, now);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
        osc.connect(gain);
        gain.connect(this.bgmGain);
        osc.start(now);
        osc.stop(now + 1.5);
      }

      // --- [1. クマ] 🐻 大地の太鼓・パーカッション (Drums) ---
      if (this.unlocked.drums) {
        // バスドラム (拍の頭)
        if (step % 4 === 0) {
          const drumOsc = this.ctx.createOscillator();
          const drumGain = this.ctx.createGain();
          drumOsc.type = 'sine';
          drumOsc.frequency.setValueAtTime(110, now);
          drumOsc.frequency.exponentialRampToValueAtTime(35, now + 0.18);
          drumGain.gain.setValueAtTime(0.35, now);
          drumGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          drumOsc.connect(drumGain);
          drumGain.connect(this.bgmGain);
          drumOsc.start(now);
          drumOsc.stop(now + 0.22);
        }
        // 木製リムショット / ウッドブロック (裏拍)
        if (step % 4 === 2 || step % 4 === 3) {
          const woodOsc = this.ctx.createOscillator();
          const woodGain = this.ctx.createGain();
          woodOsc.type = 'triangle';
          woodOsc.frequency.setValueAtTime(step % 4 === 2 ? 620 : 750, now);
          woodGain.gain.setValueAtTime(0.15, now);
          woodGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          woodOsc.connect(woodGain);
          woodGain.connect(this.bgmGain);
          woodOsc.start(now);
          woodOsc.stop(now + 0.1);
        }
      }

      // --- [2. カニ] 🦀 軽やかな弦楽器ピチカート (Strings Pluck) ---
      if (this.unlocked.strings) {
        const chord = stringsTrack[chordIdx];
        const noteFreq = chord[step % chord.length];
        const strOsc = this.ctx.createOscillator();
        const strGain = this.ctx.createGain();
        strOsc.type = 'triangle';
        strOsc.frequency.setValueAtTime(noteFreq * (step % 2 === 0 ? 1 : 2), now);
        strGain.gain.setValueAtTime(0.14, now);
        strGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        strOsc.connect(strGain);
        strGain.connect(this.bgmGain);
        strOsc.start(now);
        strOsc.stop(now + 0.5);
      }

      // --- [3. カモメ] 🕊️ 澄みわたる風のフルート (Flute Harmony) ---
      if (this.unlocked.flute) {
        const fFreq = fluteTrack[step];
        if (fFreq > 0) {
          const fluteOsc = this.ctx.createOscillator();
          const fluteGain = this.ctx.createGain();
          fluteOsc.type = 'sine';
          fluteOsc.frequency.setValueAtTime(fFreq, now);

          // 優しいブレス＆ヴィブラート
          fluteGain.gain.setValueAtTime(0.02, now);
          fluteGain.gain.linearRampToValueAtTime(0.12, now + 0.1);
          fluteGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

          fluteOsc.connect(fluteGain);
          fluteGain.connect(this.bgmGain);
          fluteOsc.start(now);
          fluteOsc.stop(now + 1.3);
        }
      }

      // --- [4. 影ぼうし] 👤 深海ベース ＆ 幻想ベルパッド (Bass & Chimes) ---
      if (this.unlocked.bass) {
        const bFreq = bassTrack[step];
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(bFreq, now);
        bassGain.gain.setValueAtTime(0.22, now);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
        bassOsc.connect(bassGain);
        bassGain.connect(this.bgmGain);
        bassOsc.start(now);
        bassOsc.stop(now + 1.0);

        // キラキラ光る天空ベル (8拍に1回)
        if (step % 8 === 0) {
          const bellOsc = this.ctx.createOscillator();
          const bellGain = this.ctx.createGain();
          bellOsc.type = 'triangle';
          bellOsc.frequency.setValueAtTime(1480, now);
          bellGain.gain.setValueAtTime(0.1, now);
          bellGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
          bellOsc.connect(bellGain);
          bellGain.connect(this.bgmGain);
          bellOsc.start(now);
          bellOsc.stop(now + 1.9);
        }
      }

      this.stepIndex++;
    }, 600);
  }
}

export const islandAudio = new IslandAudioEngine();
