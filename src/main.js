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
  const npcs = createIslandNPCs(scene);
  const ui = new UIManager();
  const gameState = new GameStateManager(player, npcs, world, ui);
  ui.setGameState(gameState);

  // 3. Controls & Inputs
  const keys = {};
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

  // クリックでインタラクト
  window.addEventListener('pointerdown', (e) => {
    if (e.target.tagName !== 'BUTTON' && !e.target.closest('button') && !e.target.closest('.modal-overlay')) {
      islandAudio.init();
      checkInteractions();
    }
  });

  // 毎フレームのインタラクトプロンプト自動更新
  function updateProximityPrompts() {
    const pPos = player.group.position;

    // 1. 祭壇の近く (半径5.0m以内)
    const altarDist = pPos.distanceTo(new THREE.Vector3(0, 1.4, 0));
    if (altarDist < 5.0) {
      if (gameState.treasures.length >= 4) {
        ui.promptText.innerHTML = '🌟 <strong>4つの宝物を祭壇に捧げる</strong> (クリックまたは [E])';
      } else {
        ui.promptText.innerHTML = `🏛️ <strong>古代の祭壇を調べる</strong> (宝物: ${gameState.treasures.length}/4)`;
      }
      ui.interactPrompt.classList.remove('prompt-hidden');
      return;
    }

    // 2. 拾えるアイテムの近く
    let nearbyItem = null;
    world.pickables.forEach(item => {
      if (!item.isCollected && pPos.distanceTo(item.pos) < 2.0) {
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

  // プロンプト自体をクリック/タップしてもインタラクト実行
  ui.interactPrompt.onclick = () => {
    islandAudio.init();
    checkInteractions();
  };

  function checkInteractions() {
    // 1. 祭壇の確認 (半径5.0m以内)
    const altarDist = player.group.position.distanceTo(new THREE.Vector3(0, 1.4, 0));
    if (altarDist < 5.0) {
      gameState.checkAltarInteraction();
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

    // Player Input Vector (WASD & Arrow Keys)
    const inputDir = new THREE.Vector3();
    if (keys['KeyW'] || keys['ArrowUp']) inputDir.z -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) inputDir.z += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) inputDir.x -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) inputDir.x += 1;

    player.update(delta, inputDir, world);
    world.update(delta, elapsedTime);
    npcs.forEach(npc => npc.update(delta, elapsedTime));

    // 近接プロンプト更新
    updateProximityPrompts();

    // Smooth Camera Follow (完全にブレのない滑らかなクォータービュー追従)
    const targetCamPos = new THREE.Vector3(
      player.group.position.x,
      9.9, // 1.4 (地面) + 8.5 (カメラ高さ) で固定
      player.group.position.z + 11
    );
    camera.position.lerp(targetCamPos, delta * 5.0);
    camera.lookAt(new THREE.Vector3(player.group.position.x, 1.4, player.group.position.z));

    // 3D Speech Bubble Projection to 2D HUD
    ui.updateNPCBubbles(npcs, camera, window.innerWidth, window.innerHeight);

    renderer.render(scene, camera);
  }

  loop();
}

window.addEventListener('DOMContentLoaded', main);
