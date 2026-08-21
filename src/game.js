import { islandAudio } from './sound.js';
import confetti from 'canvas-confetti';

// ========================================================
// Story & Treasures Definition
// ========================================================

export const TREASURES_DEF = [
  {
    id: 'star_stone',
    name: '星の小石',
    emoji: '🌟',
    npcId: 'bear',
    storyPage: '【1ページ目】\nあの日、空からちいさな光が落ちてきて、島の森は静かに眠りについた。クマはずっと、あまい木の実をくれたあの人の笑顔を待っていた。',
  },
  {
    id: 'telescope',
    name: '古びた真鍮の望遠鏡',
    emoji: '🔭',
    npcId: 'gull',
    storyPage: '【2ページ目】\n遠い海の向こうに、かつて船が行き交う賑やかな港があった。カモメの船長は、もう誰も訪れない灯台の上で、礼儀正しい旅人の拍手を待っていた。',
  },
  {
    id: 'glass_ball',
    name: '海のガラス玉',
    emoji: '🔮',
    npcId: 'crab',
    storyPage: '【3ページ目】\n波が運んでくるのは、誰かが忘れていったカケラたち。カニの坊やは、一緒に楽しく踊ってくれる友達をずっと探していた。',
  },
  {
    id: 'music_box',
    name: '錆びたオルゴール',
    emoji: '📻',
    npcId: 'shadow',
    storyPage: '【4ページ目】\nこの島にいるみんなは、かつて迷い込んだ人々が残した「寂しさ」の幻だったのかもしれない。あなたが心を通わせてくれたことで、島は本当の朝を迎える。',
  },
];

export class GameStateManager {
  constructor(player, npcs, world, ui) {
    this.player = player;
    this.npcs = npcs;
    this.world = world;
    this.ui = ui;

    // Inventory: array of item IDs ['berry', 'shell', ...]
    this.inventory = [];
    this.selectedItem = null;

    // Collected Treasures: array of treasure IDs
    this.treasures = [];

    // NPC specific progress
    this.npcProgress = {
      bear: { fed: false, waved: false },
      gull: { bowed: false, clapped: false },
      crab: { danced: false, gifted: false },
      shadow: { ready: false },
    };

    this.isEndingTriggered = false;
  }

  // 1. アイテムを拾う
  pickupItem(itemObj) {
    if (itemObj.isCollected) return;

    itemObj.isCollected = true;
    this.world.scene.remove(itemObj.group);
    this.inventory.push(itemObj.id);

    islandAudio.playItemPickup();
    this.ui.updateInventory(this.inventory);
    this.ui.showToast(`✨ 【${itemObj.name}】を手に入れた！`);
  }

  // 2. エモート実行時のNPCリアクション判定
  handlePlayerEmote(emoteType) {
    this.player.playEmote(emoteType);
    islandAudio.playEmoteSound(emoteType);

    // 近くのNPCを探す
    const nearestNPC = this.findNearestNPC(3.5);
    if (!nearestNPC) return;

    const npc = nearestNPC;
    const prog = this.npcProgress[npc.id];

    // --- 🐻 クマモドキのリアクション ---
    if (npc.id === 'bear') {
      if (emoteType === 'wave') {
        prog.waved = true;
        if (prog.fed) {
          this.awardTreasure('star_stone', npc);
        } else {
          npc.showBubble('🍎'); // 木の実が欲しいとアピール
          islandAudio.playNPCVoice('bear', false);
        }
      } else {
        npc.showBubble('❓');
        islandAudio.playNPCVoice('bear', false);
      }
    }

    // --- 🕊️ カモメ爺さんのリアクション ---
    else if (npc.id === 'gull') {
      if (emoteType === 'bow') {
        prog.bowed = true;
        npc.showBubble('👏'); // 拍手を待つ
        islandAudio.playNPCVoice('gull', true);
      } else if (emoteType === 'clap') {
        if (prog.bowed) {
          prog.clapped = true;
          this.awardTreasure('telescope', npc);
        } else {
          npc.showBubble('🙇'); // 先におじぎをしてほしい
          islandAudio.playNPCVoice('gull', false);
        }
      } else {
        npc.showBubble('❓');
        islandAudio.playNPCVoice('gull', false);
      }
    }

    // --- 🦀 カニ坊やのリアクション ---
    else if (npc.id === 'crab') {
      if (emoteType === 'dance') {
        prog.danced = true;
        npc.showBubble('🐚'); // 桜貝が欲しい
        islandAudio.playNPCVoice('crab', true);
      } else {
        npc.showBubble('💢');
        islandAudio.playNPCVoice('crab', false);
      }
    }

    // --- 👤 影ぼうしのリアクション ---
    else if (npc.id === 'shadow') {
      if (emoteType === 'think') {
        // 他の3つの宝物を持っているか？
        if (this.treasures.length >= 3) {
          this.awardTreasure('music_box', npc);
        } else {
          npc.showBubble('🔒'); // まだ宝物が足りない
          islandAudio.playNPCVoice('shadow', false);
        }
      } else {
        npc.showBubble('……');
        islandAudio.playNPCVoice('shadow', false);
      }
    }
  }

  // 3. アイテムを渡す・見せる
  giveItemToNearestNPC(itemId) {
    const nearestNPC = this.findNearestNPC(3.5);
    if (!nearestNPC) {
      this.ui.showToast('近くに誰もいないようだ…');
      return;
    }

    const npc = nearestNPC;
    const prog = this.npcProgress[npc.id];

    // 🐻 クマに木の実
    if (npc.id === 'bear') {
      if (itemId === 'berry') {
        prog.fed = true;
        this.removeItem(itemId);
        npc.showBubble('👋'); // 手を振ってほしい
        islandAudio.playNPCVoice('bear', true);
        this.ui.showToast('🐻 クマモドキは木の実を美味しそうに食べた！');
        if (prog.waved) {
          this.awardTreasure('star_stone', npc);
        }
      } else {
        npc.showBubble('💢');
        islandAudio.playNPCVoice('bear', false);
        this.ui.showToast('🐻 クマモドキはプイッと横を向いた…');
      }
    }

    // 🦀 カニに桜貝
    else if (npc.id === 'crab') {
      if (itemId === 'shell') {
        prog.gifted = true;
        this.removeItem(itemId);
        npc.showBubble('💃');
        islandAudio.playNPCVoice('crab', true);
        this.ui.showToast('🦀 カニ坊やは桜貝を受け取って大喜び！');
        if (prog.danced) {
          this.awardTreasure('glass_ball', npc);
        }
      } else {
        npc.showBubble('❓');
        islandAudio.playNPCVoice('crab', false);
      }
    }

    // 🕊️ カモメや影へのアイテム
    else {
      npc.showBubble('❓');
      islandAudio.playNPCVoice(npc.id, false);
      this.ui.showToast('特に興味がないようだ…');
    }
  }

  // 宝物の授与
  awardTreasure(treasureId, npc) {
    if (this.treasures.includes(treasureId)) return;

    this.treasures.push(treasureId);
    npc.isSatisfied = true;
    npc.showBubble('💖', 4.0);

    islandAudio.playNPCVoice(npc.id, true);
    islandAudio.playTreasureFanfare();
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

    const def = TREASURES_DEF.find(t => t.id === treasureId);
    this.ui.showToast(`🎉 【${def.name}】を分けてもらった！手帳に記憶が蘇る…`);
    this.ui.updateTreasureCount(this.treasures.length);

    // 4つ集まったら祭壇へ促す
    if (this.treasures.length === 4) {
      setTimeout(() => {
        this.ui.showToast('🌟 4つの宝物が揃った！島の中央の祭壇へ向かおう…');
      }, 3500);
    }
  }

  // 祭壇への奉納
  checkAltarInteraction() {
    const altarPos = new THREE.Vector3(0, 1.4, 0);
    const dist = this.player.group.position.distanceTo(altarPos);

    if (dist < 3.0) {
      if (this.treasures.length === 4 && !this.isEndingTriggered) {
        this.triggerEnding();
      } else {
        this.ui.showToast(`🏛️ 古代の祭壇：宝物を4つ捧げると封印が解けるらしい (${this.treasures.length}/4)`);
      }
    }
  }

  triggerEnding() {
    this.isEndingTriggered = true;
    confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
    islandAudio.playTreasureFanfare();

    this.ui.showEndingModal();
  }

  removeItem(itemId) {
    const idx = this.inventory.indexOf(itemId);
    if (idx !== -1) {
      this.inventory.splice(idx, 1);
      this.ui.updateInventory(this.inventory);
    }
  }

  findNearestNPC(maxDist = 3.5) {
    let nearest = null;
    let minDist = maxDist;

    this.npcs.forEach(npc => {
      const dist = this.player.group.position.distanceTo(npc.pos);
      if (dist < minDist) {
        minDist = dist;
        nearest = npc;
      }
    });

    return nearest;
  }
}
