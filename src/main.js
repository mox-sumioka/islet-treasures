import * as THREE from 'three';
import { IslandWorld, PICKABLE_ITEMS_DEF } from './world.js';
import { PlayerCharacter, createIslandNPCs } from './characters.js';
import { GameStateManager, TREASURES_DEF } from './game.js';
import { islandAudio } from './sound.js';

// ========================================================
// UI Controller & 3D Speech Bubble Projector
// ========================================================

class UIManager {
  constructor() {
    this.treasureCount = document.getElementById('treasure-count');
    this.inventorySlots = document.getElementById('inventory-slots');
    this.interactPrompt = document.getElementById('interact-prompt');
    this.promptText = document.getElementById('prompt-text');
    this.npcBubblesContainer = document.getElementById('npc-bubbles-container');

    this.diaryModal = document.getElementById('diary-modal');
    this.treasuresGrid = document.getElementById('treasures-grid');
    this.storyPages = document.getElementById('story-pages');
    this.btnOpenDiary = document.getElementById('btn-open-diary');
    this.btnCloseDiary = document.getElementById('btn-close-diary');

    this.endingModal = document.getElementById('ending-modal');
    this.endingBodyText = document.getElementById('ending-body-text');
    this.btnRestart = document.getElementById('btn-restart-island');

    this.btnSoundToggle = document.getElementById('btn-sound-toggle');
    this.soundIcon = document.getElementById('sound-icon');

    this.gameState = null;
    this.bubbleElements = {}; // npcId -> DOMElement

    this.setupListeners();
  }

  setGameState(state) {
    this.gameState = state;
    this.updateInventory([]);
    this.updateTreasureCount(0);
  }

  setupListeners() {
    // 記憶の手帳モーダル
    this.btnOpenDiary.onclick = () => {
      islandAudio.init();
      this.renderDiary();
      this.diaryModal.classList.remove('hidden');
    };

    this.btnCloseDiary.onclick = () => {
      this.diaryModal.classList.add('hidden');
    };

    this.btnRestart.onclick = () => {
      this.endingModal.classList.add('hidden');
    };

    this.btnSoundToggle.onclick = () => {
      islandAudio.init();
      const isSoundOn = islandAudio.toggleMute();
      this.soundIcon.textContent = isSoundOn ? '🔊' : '🔇';
    };

    // エモートボタン
    document.querySelectorAll('.emote-btn').forEach(btn => {
      btn.onclick = () => {
        islandAudio.init();
        const emote = btn.dataset.emote;
        if (this.gameState) {
          this.gameState.handlePlayerEmote(emote);
        }
      };
    });
  }

  showToast(text) {
    this.promptText.textContent = text;
    this.interactPrompt.classList.remove('prompt-hidden');
    setTimeout(() => {
      this.interactPrompt.classList.add('prompt-hidden');
    }, 2800);
  }

  updateTreasureCount(count) {
    this.treasureCount.textContent = count;
  }

  updateInventory(items) {
    this.inventorySlots.innerHTML = '';
    if (items.length === 0) {
      this.inventorySlots.innerHTML = '<span style="font-size:0.75rem; color:#888;">島を歩いてアイテムを探そう</span>';
      return;
    }

    items.forEach(itemId => {
      const def = PICKABLE_ITEMS_DEF.find(p => p.id === itemId);
      if (!def) return;

      const slot = document.createElement('div');
      slot.className = 'item-slot';
      slot.innerHTML = `<span class="item-emoji">${def.emoji}</span>`;
      slot.title = `${def.name} (クリックして住人に渡す)`;

      slot.onclick = () => {
        islandAudio.init();
        if (this.gameState) {
          this.gameState.giveItemToNearestNPC(itemId);
        }
      };

      this.inventorySlots.appendChild(slot);
    });
  }

  renderDiary() {
    if (!this.gameState) return;
    this.treasuresGrid.innerHTML = '';
    this.storyPages.innerHTML = '';

    let storyFull = '';

    TREASURES_DEF.forEach(def => {
      const isCollected = this.gameState.treasures.includes(def.id);
      const card = document.createElement('div');
      card.className = `treasure-card ${isCollected ? 'collected' : ''}`;
      card.innerHTML = `
        <div class="treasure-icon">${isCollected ? def.emoji : '❓'}</div>
        <div class="treasure-name">${isCollected ? def.name : '未発見'}</div>
      `;
      this.treasuresGrid.appendChild(card);

      if (isCollected) {
        storyFull += `${def.storyPage}\n\n`;
      }
    });

    if (storyFull === '') {
      this.storyPages.textContent = 'まだ宝物は見つかっていない。島の住人たちと交流してみよう…';
    } else {
      this.storyPages.textContent = storyFull;
    }
  }

  showEndingModal() {
    this.endingBodyText.innerHTML = `
      あなたが4つの宝物を祭壇に捧げると、島の霧が晴れ、温かな夕焼けが海を照らしました。<br><br>
      森のクマモドキも、灯台のカモメ爺さんも、浜辺のカニ坊やも、古井戸の影も…<br>
      みんな嬉しそうにあなたを見つめて微笑んでいます。<br><br>
      言葉はなくても、心を通わせることができたこの島は、もう決して「忘れられた島」ではありません。<br><br>
      <strong>〜 GAME CLEAR 〜</strong>
    `;
    this.endingModal.classList.remove('hidden');
  }

  // 3D空間上のNPC位置からスクリーン座標に吹き出しを更新
  updateNPCBubbles(npcs, camera, width, height) {
    npcs.forEach(npc => {
      let el = this.bubbleElements[npc.id];
      if (!el) {
        el = document.createElement('div');
        el.className = 'npc-bubble';
        this.npcBubblesContainer.appendChild(el);
        this.bubbleElements[npc.id] = el;
      }

      if (npc.bubbleTimer > 0) {
        el.textContent = npc.bubbleEmoji;
        el.style.display = 'flex';

        // 3D座標 -> 2Dスクリーン座標変換
        const headPos = npc.pos.clone().add(new THREE.Vector3(0, 1.4, 0));
        headPos.project(camera);

        const screenX = (headPos.x * 0.5 + 0.5) * width;
        const screenY = (-(headPos.y * 0.5) + 0.5) * height;

        el.style.left = `${screenX}px`;
        el.style.top = `${screenY}px`;
      } else {
        el.style.display = 'none';
      }
    });
  }
}

// ========================================================
// Main Application Setup
// ========================================================
function main() {
  try {
    const container = document.getElementById('game-container');

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa8dadc);
    scene.fog = new THREE.FogExp2(0xa8dadc, 0.025);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 12, 16);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 2. Game Entities
    const world = new IslandWorld(scene);
    const player = new PlayerCharacter(scene);
    player.group.position.set(0, 1.4, 20); // 桟橋のスタート位置

    const npcs = createIslandNPCs(scene);
    const ui = new UIManager();
    const gameState = new GameStateManager(player, npcs, world, ui);
    ui.setGameState(gameState);

  // 3. Controls & Inputs (Keyboard & Touch Joystick)
  const keys = {};
  const touchInputDir = new THREE.Vector3();
  let touchId = null;
  let touchOrigin = { x: 0, y: 0 };
  const joystickBase = document.getElementById('joystick-base');
  const joystickKnob = document.getElementById('joystick-knob');
  const touchControls = document.getElementById('touch-controls');

  // Keyboard Listeners
  window.addEventListener('keydown', (e) => {
    islandAudio.init();
    keys[e.code] = true;

    // Eキーでインタラクト / 拾う / 祭壇
    if (e.code === 'KeyE' || e.code === 'Space') {
      checkInteractions();
    }

    // 1-6キーでエモートショートカット
    const emoteMap = {
      Digit1: 'wave',
      Digit2: 'bow',
      Digit3: 'dance',
      Digit4: 'think',
      Digit5: 'clap',
      Digit6: 'surprise',
    };
    if (emoteMap[e.code]) {
      gameState.handlePlayerEmote(emoteMap[e.code]);
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  // Touch Virtual Joystick Listeners
  window.addEventListener('touchstart', (e) => {
    islandAudio.init();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const target = touch.target;

      // ボタンやモーダル、インベントリ以外の画面タッチ
      if (target.tagName !== 'BUTTON' && !target.closest('button') && !target.closest('.modal-overlay') && !target.closest('.inventory-tray') && !target.closest('.emote-bar')) {
        // 画面左側または下部タッチでジョイスティック開始
        if (touchId === null) {
          touchId = touch.identifier;
          touchOrigin = { x: touch.clientX, y: touch.clientY };

          joystickBase.style.left = `${touchOrigin.x}px`;
          joystickBase.style.top = `${touchOrigin.y}px`;
          joystickKnob.style.transform = 'translate(0px, 0px)';
          touchControls.classList.remove('touch-hidden');
        } else {
          // 別の指でタップした時はインタラクト判定
          checkInteractions();
        }
      }
    }
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchId) {
        e.preventDefault();
        const dx = touch.clientX - touchOrigin.x;
        const dy = touch.clientY - touchOrigin.y;
        const dist = Math.hypot(dx, dy);
        const maxRadius = 45;

        const angle = Math.atan2(dy, dx);
        const clampedDist = Math.min(dist, maxRadius);

        const knobX = Math.cos(angle) * clampedDist;
        const knobY = Math.sin(angle) * clampedDist;
        joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;

        // 3D移動ベクトルへ変換 (画面座標のX/Y -> 3DのX/Z)
        if (dist > 5) {
          touchInputDir.set(dx / maxRadius, 0, dy / maxRadius);
          if (touchInputDir.length() > 1.0) touchInputDir.normalize();
        } else {
          touchInputDir.set(0, 0, 0);
        }
      }
    }
  }, { passive: false });

  const endTouch = (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchId) {
        touchId = null;
        touchInputDir.set(0, 0, 0);
        touchControls.classList.add('touch-hidden');
      }
    }
  };

  window.addEventListener('touchend', endTouch);
  window.addEventListener('touchcancel', endTouch);

  // マウスクリックでのインタラクト
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.target.tagName !== 'BUTTON' && !e.target.closest('button') && !e.target.closest('.modal-overlay')) {
      islandAudio.init();
      checkInteractions();
    }
  });

  // 毎フレームのインタラクトプロンプト自動更新
  function updateProximityPrompts() {
    const px = player.group.position.x;
    const pz = player.group.position.z;
    const horizontalDist = Math.hypot(px, pz); // 祭壇中心 (0, 0) からの水平距離

    // 4つの宝物があれば光の柱を常時点灯
    if (gameState.treasures.length >= 4 && world.showAltarGuideBeam) {
      world.showAltarGuideBeam();
    }

    // 1. 祭壇の近く (半径3.8m以内)
    if (horizontalDist < 3.8) {
      if (gameState.treasures.length >= 4) {
        ui.promptText.innerHTML = '🌟 <strong>4つの宝物を祭壇に捧げる</strong> ([E] または タップ)';
      } else {
        ui.promptText.innerHTML = `🏛️ <strong>古代の祭壇を調べる</strong> (宝物: ${gameState.treasures.length}/4)`;
      }
      ui.interactPrompt.classList.remove('prompt-hidden');
      return;
    }

    // 2. 拾えるアイテムの近く
    let nearbyItem = null;
    world.pickables.forEach(item => {
      if (!item.isCollected && player.group.position.distanceTo(item.pos) < 2.2) {
        nearbyItem = item;
      }
    });
    if (nearbyItem) {
      ui.promptText.innerHTML = `✨ 【${nearbyItem.name}】を拾う ([E] または タップ)`;
      ui.interactPrompt.classList.remove('prompt-hidden');
      return;
    }

    // 3. 住人NPCの近く
    const nearbyNPC = gameState.findNearestNPC(3.5);
    if (nearbyNPC) {
      ui.promptText.innerHTML = `💬 <strong>${nearbyNPC.name}</strong> にエモートやアイテムを渡そう`;
      ui.interactPrompt.classList.remove('prompt-hidden');
      return;
    }

    ui.interactPrompt.classList.add('prompt-hidden');
  }

  // プロンプト自体をクリック/タップして明示的に実行
  ui.interactPrompt.onclick = (e) => {
    e.stopPropagation();
    islandAudio.init();
    checkInteractions();
  };

  function checkInteractions() {
    // 1. 祭壇の確認 (水平距離3.8m以内で明示的に捧げる)
    const horizontalDist = Math.hypot(player.group.position.x, player.group.position.z);
    if (horizontalDist < 3.8) {
      gameState.offerTreasuresToAltar();
      return;
    }

    // 2. 近くの拾えるアイテム
    world.pickables.forEach(item => {
      if (!item.isCollected) {
        const dist = player.group.position.distanceTo(item.pos);
        if (dist < 2.2) {
          gameState.pickupItem(item);
        }
      }
    });
  }

  // 4. Window Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // 5. Main Render Loop
  const clock = new THREE.Clock();
  function loop() {
    requestAnimationFrame(loop);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // Player Input Vector (Keyboard WASD + Touch Joystick 合算)
    const inputDir = new THREE.Vector3();
    if (keys['KeyW'] || keys['ArrowUp']) inputDir.z -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) inputDir.z += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) inputDir.x -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) inputDir.x += 1;

    // タッチジョイスティック入力の加算
    if (touchInputDir.lengthSq() > 0.01) {
      inputDir.add(touchInputDir);
    }

    player.update(delta, inputDir, world);
    world.update(delta, elapsedTime);
    npcs.forEach(npc => npc.update(delta, elapsedTime));

    // 近接プロンプト更新
    updateProximityPrompts();

    // Smooth Camera Follow (広大な島を見渡す滑らかなクォータービュー追従)
    const targetCamPos = new THREE.Vector3(
      player.group.position.x,
      player.group.position.y + 9.5,
      player.group.position.z + 12.0
    );
    camera.position.lerp(targetCamPos, delta * 4.5);
    camera.lookAt(new THREE.Vector3(player.group.position.x, player.group.position.y + 0.5, player.group.position.z));

    // 3D Speech Bubble Projection to 2D HUD
    ui.updateNPCBubbles(npcs, camera, window.innerWidth, window.innerHeight);

    renderer.render(scene, camera);
  }

    loop();
  } catch (err) {
    console.error('Fatal initialization error:', err);
    const errDiv = document.createElement('div');
    errDiv.style.position = 'absolute';
    errDiv.style.top = '10px';
    errDiv.style.left = '10px';
    errDiv.style.color = 'red';
    errDiv.style.background = 'rgba(0,0,0,0.8)';
    errDiv.style.padding = '10px';
    errDiv.style.zIndex = '9999';
    errDiv.textContent = `エラー: ${err.message}`;
    document.body.appendChild(errDiv);
  }
}

main();
