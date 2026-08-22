import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import kamomeUrl from '../public/models/kamome.glb?url';

// ========================================================
// Player & Island Resident NPCs (3D Low-poly Models & Emotes)
// ========================================================

export class PlayerCharacter {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.position.set(0, 1.4, 8); // 桟橋近くからスタート

    this.speed = 4.5;
    this.moveDir = new THREE.Vector3();
    this.isMoving = false;
    this.walkCycle = 0;

    // Emote State
    this.currentEmote = null;
    this.emoteTimer = 0;

    this.buildMesh();
    this.scene.add(this.group);
  }

  buildMesh() {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdfba, roughness: 0.8, flatShading: true });
    const clothMat = new THREE.MeshStandardMaterial({ color: 0x2a9d8f, roughness: 0.7, flatShading: true });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xe9c46a, roughness: 0.9, flatShading: true });
    const bagMat = new THREE.MeshStandardMaterial({ color: 0x9b5de5, roughness: 0.8, flatShading: true });
    const armMat = new THREE.MeshStandardMaterial({ color: 0x2a9d8f, roughness: 0.7, flatShading: true });

    // 胴体 (Body)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.5, 6), clothMat);
    body.position.y = 0.5;
    body.castShadow = true;
    this.group.add(body);
    this.bodyMesh = body;

    // リュック (Backpack) - 胴体の子にしておじぎと完全連動！
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.35, 0.18), bagMat);
    bag.position.set(0, 0.05, -0.25);
    bag.castShadow = true;
    body.add(bag);
    this.backpackMesh = bag;

    // 腕 (Arms) - 胴体の子にしておじぎと自然に連動
    this.leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.32, 6), armMat);
    this.leftArm.position.set(-0.32, 0.05, 0);
    body.add(this.leftArm);

    this.rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.32, 6), armMat);
    this.rightArm.position.set(0.32, 0.05, 0);
    body.add(this.rightArm);

    // 頭 (Head)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), skinMat);
    head.position.y = 0.95;
    head.castShadow = true;
    this.group.add(head);
    this.headMesh = head;

    // 帽子 (Straw Hat) - 頭の子にしておじぎと完全連動！
    const hatGroup = new THREE.Group();
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 8), hatMat);
    hatBrim.position.y = 0.17;
    hatGroup.add(hatBrim);

    const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.18, 8), hatMat);
    hatTop.position.y = 0.27;
    hatGroup.add(hatTop);

    head.add(hatGroup);
    this.hatMesh = hatGroup;
  }

  playEmote(type) {
    this.currentEmote = type;
    this.emoteTimer = 1.5;
  }

  update(delta, inputDir, world) {
    const groundY = world ? world.getGroundHeight(this.group.position.x, this.group.position.z) : 1.4;
    this.group.position.y = groundY; // カメラを揺らさないようルートY座標は常に地面に固定！

    // 1. エモートアニメーション
    if (this.emoteTimer > 0) {
      this.emoteTimer -= delta;
      const t = Date.now() / 150;

      if (this.currentEmote === 'wave') {
        this.rightArm.position.y = 0.25;
        this.rightArm.rotation.z = Math.sin(t * 2) * 0.5 - 0.8;
      } else if (this.currentEmote === 'bow') {
        // おじぎ: 胴体と頭を自然に前に倒す (帽子・リュック・腕も完全に連動)
        this.bodyMesh.rotation.x = 0.55;
        this.headMesh.rotation.x = 0.45;
        this.headMesh.position.set(0, 0.92, 0.12);
      } else if (this.currentEmote === 'dance') {
        // ダンス: カメラを揺らさないよう体パーツのみピョンピョン跳ねる
        const hop = Math.abs(Math.sin(t * 1.5)) * 0.25;
        this.bodyMesh.position.y = 0.5 + hop;
        this.headMesh.position.y = 0.95 + hop;
        this.group.rotation.y += delta * 6;
      } else if (this.currentEmote === 'clap') {
        this.leftArm.rotation.z = 0.8;
        this.rightArm.rotation.z = -0.8;
      } else if (this.currentEmote === 'surprise') {
        // おどろき: 体パーツのみピョンと跳ねる
        const hop = Math.abs(Math.sin(t * 3)) * 0.35;
        this.bodyMesh.position.y = 0.5 + hop;
        this.headMesh.position.y = 0.95 + hop;
      }
      return;
    }

    // エモート終了時のリセット
    this.bodyMesh.rotation.x = 0;
    this.headMesh.rotation.x = 0;
    this.headMesh.position.set(0, 0.95, 0);
    this.leftArm.rotation.set(0, 0, 0);
    this.rightArm.rotation.set(0, 0, 0);
    this.leftArm.position.set(-0.32, 0.05, 0);
    this.rightArm.position.set(0.32, 0.05, 0);

    // 2. 移動処理
    this.isMoving = inputDir.lengthSq() > 0.01;
    if (this.isMoving) {
      this.moveDir.copy(inputDir).normalize();
      const nextPos = this.group.position.clone().addScaledVector(this.moveDir, this.speed * delta);

      // 島から落ちないように半径制限 (島内: 半径24.5m以内、または 桟橋: xが[-1.6, 1.6]でzが28.5以内)
      const dist = new THREE.Vector2(nextPos.x, nextPos.z).length();
      const onPier = Math.abs(nextPos.x) < 1.6 && nextPos.z >= 18.0 && nextPos.z <= 28.8;

      if (dist < 24.5 || onPier) {
        this.group.position.copy(nextPos);
      }

      // 進行方向を向く
      const angle = Math.atan2(this.moveDir.x, this.moveDir.z);
      this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, angle, delta * 12);

      // 歩行アニメーション (カメラを揺らさないよう手足と体のみ動かす)
      this.walkCycle += delta * 10;
      this.bodyMesh.position.y = 0.5 + Math.abs(Math.sin(this.walkCycle)) * 0.05;
      this.headMesh.position.y = 0.95 + Math.abs(Math.sin(this.walkCycle)) * 0.05;
      this.leftArm.rotation.x = Math.sin(this.walkCycle) * 0.6;
      this.rightArm.rotation.x = -Math.sin(this.walkCycle) * 0.6;
    } else {
      this.bodyMesh.position.y = 0.5;
      this.headMesh.position.y = 0.95;
      this.leftArm.rotation.x = 0;
      this.rightArm.rotation.x = 0;
    }
  }
}

// ========================================================
// Resident NPC Class (クマ、カモメ、カニ、影)
// ========================================================
export class ResidentNPC {
  constructor(id, name, pos, scene, meshBuilder) {
    this.id = id;
    this.name = name;
    this.pos = pos.clone();
    this.group = new THREE.Group();
    this.group.position.copy(this.pos);
    this.scene = scene;
    this.mixer = null;

    this.bubbleEmoji = '❓';
    this.bubbleTimer = 0;
    this.isSatisfied = false;

    if (meshBuilder) {
      meshBuilder(this.group, this);
    }
    this.scene.add(this.group);
  }

  showBubble(emoji, durationSec = 2.5) {
    this.bubbleEmoji = emoji;
    this.bubbleTimer = durationSec;
  }

  update(delta, time) {
    if (this.bubbleTimer > 0) {
      this.bubbleTimer -= delta;
    }

    if (this.mixer) {
      try {
        this.mixer.update(delta);
      } catch (err) {
        // ignore animation error
      }
    }

    // カモメ爺さん(gull)以外はのんびり呼吸・揺れアニメーション
    if (this.id !== 'gull') {
      this.group.position.y = this.pos.y + Math.sin(time * 2 + this.pos.x) * 0.06;
    } else {
      this.group.position.y = this.pos.y;
    }
  }
}

// ========================================================
// Factory for the 4 Island NPCs
// ========================================================

export function createIslandNPCs(scene) {
  const npcs = [];
  const gltfLoader = new GLTFLoader();

  // 1. 🐻 森のクマモドキ (Bear) - 西の森 (x: -9.0, z: 5.0)
  const bear = new ResidentNPC('bear', '森のクマモドキ', new THREE.Vector3(-9.0, 1.4, 5.0), scene, (group) => {
    const mat = new THREE.MeshStandardMaterial({ color: 0x8d5b4c, roughness: 0.9, flatShading: true });
    const earMat = new THREE.MeshStandardMaterial({ color: 0xffb5a7, roughness: 0.8, flatShading: true });

    // まんまるボディ
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), mat);
    body.position.y = 0.55;
    body.castShadow = true;
    group.add(body);

    // 耳
    [-0.32, 0.32].forEach(ex => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6), earMat);
      ear.position.set(ex, 1.0, 0);
      group.add(ear);
    });

    // 鼻先
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), new THREE.MeshStandardMaterial({ color: 0xffe3d8 }));
    snout.position.set(0, 0.6, 0.45);
    group.add(snout);
  });
  npcs.push(bear);

  // 2. 🕊️ 灯台のカモメ爺さん (Gull) - 灯台の手前南西 (x: 8.5, z: -5.5)
  const gull = new ResidentNPC('gull', '灯台のカモメ爺さん', new THREE.Vector3(8.5, 1.4, -5.5), scene, (group, npcInstance) => {
    // まず仮のプレースホルダーを配置して即座に画面に表示されるようにする
    const fallbackMesh = new THREE.Group();
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), whiteMat);
    body.position.y = 0.5;
    fallbackMesh.add(body);

    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 6), new THREE.MeshStandardMaterial({ color: 0xf4a261 }));
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.55, 0.5);
    fallbackMesh.add(beak);
    group.add(fallbackMesh);

    // Blenderカスタムモデルのロード (1.5倍サイズ)
    gltfLoader.load(
      kamomeUrl,
      (gltf) => {
        try {
          const model = gltf.scene;

          // モデルのバウンディングボックスを計算して1.5倍サイズにスケール
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const targetSize = 1.5; // 1.5倍に拡大！
          const scaleFactor = targetSize / (maxDim || 1.0);

          model.scale.set(scaleFactor, scaleFactor, scaleFactor);
          model.position.set(0, 0, 0);

          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // ロード成功したら仮メッシュを削除してモデルを追加
          group.remove(fallbackMesh);
          group.add(model);

          // アニメーションがある場合は再生
          if (gltf.animations && gltf.animations.length > 0) {
            npcInstance.mixer = new THREE.AnimationMixer(model);
            const action = npcInstance.mixer.clipAction(gltf.animations[0]);
            action.play();
          }
        } catch (e) {
          console.warn('Error parsing gltf model:', e);
        }
      },
      undefined,
      (error) => {
        console.warn('GLTFLoader failed to load kamome.glb, using fallback:', error);
      }
    );
  });
  npcs.push(gull);

  // 3. 🦀 浜辺のカニ坊や (Crab) - 南東の波打ち際・海のすぐ近くの砂浜 (x: 16.5, y: 1.05, z: 17.5)
  const crab = new ResidentNPC('crab', '浜辺のカニ坊や', new THREE.Vector3(16.5, 1.05, 17.5), scene, (group) => {
    const redMat = new THREE.MeshStandardMaterial({ color: 0xff3333, roughness: 0.4, flatShading: true });
    const legMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5, flatShading: true });

    // 鮮やかな赤い甲羅
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.3, 8), redMat);
    shell.position.y = 0.25;
    shell.castShadow = true;
    group.add(shell);

    // 大きなハサミ (Claws)
    [-0.65, 0.65].forEach((cx, idx) => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 6), legMat);
      arm.rotation.z = idx === 0 ? 0.8 : -0.8;
      arm.position.set(cx * 0.6, 0.35, 0.2);
      group.add(arm);

      const claw = new THREE.Mesh(new THREE.SphereGeometry(0.24, 6, 6), redMat);
      claw.scale.set(1.4, 1.2, 0.7);
      claw.position.set(cx, 0.48, 0.35);
      claw.castShadow = true;
      group.add(claw);
    });

    // カニの足 (Legs)
    [-0.45, 0.45].forEach((lx, idx) => {
      [-0.15, 0.05, 0.25].forEach(lz => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.35, 4), legMat);
        leg.rotation.z = idx === 0 ? 0.9 : -0.9;
        leg.position.set(lx, 0.12, lz);
        group.add(leg);
      });
    });

    // 飛び出ためだま (大きなクリクリ目)
    [-0.2, 0.2].forEach(ex => {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 6), redMat);
      stem.position.set(ex, 0.45, 0.35);
      group.add(stem);

      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: 0x000000 }));
      eye.position.set(ex, 0.56, 0.38);
      group.add(eye);

      // 白目のハイライト
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      dot.position.set(ex - 0.03, 0.6, 0.46);
      group.add(dot);
    });
  });
  npcs.push(crab);

  // 4. 👤 古井戸の影ぼうし (Shadow) - 北西の古井戸のすぐ横 (x: -11.0, y: 1.4, z: -5.5)
  const shadow = new ResidentNPC('shadow', '古井戸の影ぼうし', new THREE.Vector3(-11.0, 1.4, -5.5), scene, (group) => {
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x240046, transparent: true, opacity: 0.9 });

    const body = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.1, 8), shadowMat);
    body.position.y = 0.55;
    group.add(body);

    // 光る紫の目
    [-0.12, 0.12].forEach(ex => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), new THREE.MeshBasicMaterial({ color: 0xc77dff }));
      eye.position.set(ex, 0.75, 0.3);
      group.add(eye);
    });
  });
  npcs.push(shadow);

  return npcs;
}
