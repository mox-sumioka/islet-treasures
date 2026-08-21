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
        if (prog.clapped) {
          this.awardTreasure('telescope', npc);
        } else {
          npc.showBubble('👏'); // 拍手を待つ
          islandAudio.playNPCVoice('gull', true);
        }
      } else if (emoteType === 'clap') {
        prog.clapped = true;
        if (prog.bowed) {
          this.awardTreasure('telescope', npc);
        } else {
          npc.showBubble('🙇'); // おじぎを待つ
          islandAudio.playNPCVoice('gull', true);
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
        if (prog.gifted) {
          // 既に貝殻を渡している場合は即座に宝物を渡す！
          this.awardTreasure('glass_ball', npc);
        } else {
          npc.showBubble('🐚'); // 桜貝が欲しい
          islandAudio.playNPCVoice('crab', true);
        }
      } else {
        npc.showBubble('❓');
        islandAudio.playNPCVoice('crab', false);
      }
    }

    // --- 👤 影ぼうしのリアクション ---
    else if (npc.id === 'shadow') {
      // どんなエモートでも、3つの宝物があれば4つ目のオルゴールを渡す！
      if (this.treasures.length >= 3) {
        this.awardTreasure('music_box', npc);
      } else {
        npc.showBubble('🔒');
        islandAudio.playNPCVoice('shadow', false);
        this.ui.showToast(`👤 影ぼうし「まだ宝物が足りないようだ… (現在 ${this.treasures.length}/3)」`);
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

    // 👤 影ぼうしに話しかけた時
    if (npc.id === 'shadow') {
      if (this.treasures.length >= 3) {
        this.awardTreasure('music_box', npc);
      } else {
        npc.showBubble('🔒');
        this.ui.showToast(`👤 影ぼうし「他の3人の住人から宝物を集めてくるのだ… (現在 ${this.treasures.length}/3)」`);
      }
      return;
    }

    // 🐻 クマに木の実
    if (npc.id === 'bear') {
      if (itemId === 'berry') {
        prog.fed = true;
        this.removeItem(itemId);
        this.ui.showToast('🐻 クマモドキは木の実を美味しそうに食べた！');
        if (prog.waved) {
          this.awardTreasure('star_stone', npc);
        } else {
          npc.showBubble('👋'); // 手を振ってほしい
          islandAudio.playNPCVoice('bear', true);
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
        this.ui.showToast('🦀 カニ坊やは桜貝を受け取って大喜び！');
        if (prog.danced) {
          this.awardTreasure('glass_ball', npc);
        } else {
          npc.showBubble('💃'); // 一緒に踊ってほしい
          islandAudio.playNPCVoice('crab', true);
        }
      } else {
        npc.showBubble('❓');
        islandAudio.playNPCVoice('crab', false);
      }
    }

    // 🕊️ カモメへのアイテム
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
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });

    const def = TREASURES_DEF.find(t => t.id === treasureId);
    this.ui.showToast(`🎉 【${def.name}】を分けてもらった！手帳に記憶が蘇る… (${this.treasures.length}/4)`);
    this.ui.updateTreasureCount(this.treasures.length);

    // 4つ集まったら祭壇へ促す & 祭壇を黄金に光らせる！
    if (this.treasures.length >= 4) {
      if (this.world && this.world.showAltarGuideBeam) {
        this.world.showAltarGuideBeam();
      }
      setTimeout(() => {
        this.ui.showToast('🌟 4つの宝物がすべて揃った！中央の光る祭壇へ向かおう！');
      }, 2000);
    }
  }

  // 祭壇への明示的な奉納アクション
  offerTreasuresToAltar() {
    const px = this.player.group.position.x;
    const pz = this.player.group.position.z;
    const horizontalDist = Math.hypot(px, pz); // 祭壇中心からの距離

    if (horizontalDist < 4.0) {
      if (this.treasures.length >= 4) {
        this.triggerEnding();
      } else {
        this.ui.renderDiary();
        this.ui.diaryModal.classList.remove('hidden');
        this.ui.showToast(`🏛️ 祭壇の封印には4つの宝物が必要です (現在 ${this.treasures.length}/4)`);
      }
    } else {
      this.ui.showToast('祭壇の中央へもっと近づこう！');
    }
  }

  triggerEnding() {
    if (this.isEndingTriggered) return;
    this.isEndingTriggered = true;

    // 1. 祭壇の台座に4つの宝物を光らせて配置 (ドラマチック奉納演出)
    if (this.world && this.world.placeTreasuresOnAltar) {
      this.world.placeTreasuresOnAltar();
    }

    // 2. お祝いファンファーレ & 紙吹雪
    confetti({ particleCount: 300, spread: 140, origin: { y: 0.5 } });
    islandAudio.playTreasureFanfare();
    this.ui.showToast('🌟 4つの宝物を捧げた！島の記憶がひとつになる…');

    // 3. エンディングモーダル表示
    setTimeout(() => {
      this.ui.showEndingModal();
    }, 1500);
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
