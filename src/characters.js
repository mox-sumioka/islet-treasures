import * as THREE from 'three';

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

    // 胴体 (Body)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.5, 6), clothMat);
    body.position.y = 0.5;
    body.castShadow = true;
    this.group.add(body);
    this.bodyMesh = body;

    // 頭 (Head)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), skinMat);
    head.position.y = 0.95;
    head.castShadow = true;
    this.group.add(head);
    this.headMesh = head;

    // 帽子 (Straw Hat)
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 8), hatMat);
    hatBrim.position.y = 1.12;
    this.group.add(hatBrim);
    const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.18, 8), hatMat);
    hatTop.position.y = 1.22;
    this.group.add(hatTop);

    // リュック (Backpack)
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.35, 0.18), bagMat);
    bag.position.set(0, 0.55, -0.25);
    bag.castShadow = true;
    this.group.add(bag);

    // 腕 (Arms)
    const armMat = new THREE.MeshStandardMaterial({ color: 0x2a9d8f, roughness: 0.7, flatShading: true });
    this.leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.32, 6), armMat);
    this.leftArm.position.set(-0.32, 0.52, 0);
    this.group.add(this.leftArm);

    this.rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.32, 6), armMat);
    this.rightArm.position.set(0.32, 0.52, 0);
    this.group.add(this.rightArm);
  }

  playEmote(type) {
    this.currentEmote = type;
    this.emoteTimer = 1.5;
  }

  update(delta, inputDir) {
    // 1. エモートアニメーション
    if (this.emoteTimer > 0) {
      this.emoteTimer -= delta;
      const t = Date.now() / 150;

      if (this.currentEmote === 'wave') {
        this.rightArm.position.y = 0.85;
        this.rightArm.rotation.z = Math.sin(t * 2) * 0.5 - 0.8;
      } else if (this.currentEmote === 'bow') {
        this.bodyMesh.rotation.x = 0.5;
        this.headMesh.position.z = 0.15;
      } else if (this.currentEmote === 'dance') {
        this.group.position.y = 1.4 + Math.abs(Math.sin(t * 1.5)) * 0.3;
        this.group.rotation.y += delta * 6;
      } else if (this.currentEmote === 'clap') {
        this.leftArm.rotation.z = 0.8;
        this.rightArm.rotation.z = -0.8;
      } else if (this.currentEmote === 'surprise') {
        this.group.position.y = 1.4 + Math.abs(Math.sin(t * 3)) * 0.4;
      }
      return;
    }

    // エモート終了時のリセット
    this.bodyMesh.rotation.x = 0;
    this.headMesh.position.z = 0;
    this.leftArm.rotation.set(0, 0, 0);
    this.rightArm.rotation.set(0, 0, 0);
    this.leftArm.position.set(-0.32, 0.52, 0);
    this.rightArm.position.set(0.32, 0.52, 0);

    // 2. 移動処理
    this.isMoving = inputDir.lengthSq() > 0.01;
    if (this.isMoving) {
      this.moveDir.copy(inputDir).normalize();
      const nextPos = this.group.position.clone().addScaledVector(this.moveDir, this.speed * delta);

      // 島から落ちないように半径制限 (10.5以内)
      const dist = new THREE.Vector2(nextPos.x, nextPos.z).length();
      if (dist < 11.0) {
        this.group.position.copy(nextPos);
      }

      // 進行方向を向く
      const angle = Math.atan2(this.moveDir.x, this.moveDir.z);
      this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, angle, delta * 12);

      // 歩行ボビング
      this.walkCycle += delta * 10;
      this.group.position.y = 1.4 + Math.abs(Math.sin(this.walkCycle)) * 0.12;
      this.leftArm.rotation.x = Math.sin(this.walkCycle) * 0.6;
      this.rightArm.rotation.x = -Math.sin(this.walkCycle) * 0.6;
    } else {
      this.group.position.y = 1.4;
      this.leftArm.rotation.x = 0;
      this.rightArm.rotation.x = 0;
    }
  }
}

// ========================================================
// NPC Resident Class
// ========================================================

export class ResidentNPC {
  constructor(id, name, pos, scene, buildFunc) {
    this.id = id;
    this.name = name;
    this.pos = pos.clone();
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.position.copy(pos);

    this.bubbleState = 'idle'; // 'idle', 'happy', 'angry', 'thinking', 'request'
    this.bubbleEmoji = '❓';
    this.bubbleTimer = 0;

    this.isSatisfied = false;
    this.hasGivenTreasure = false;

    buildFunc(this.group);
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

    // のんびり呼吸・揺れアニメーション
    this.group.position.y = this.pos.y + Math.sin(time * 2 + this.pos.x) * 0.06;
  }
}

// ========================================================
// Factory for the 4 Island NPCs
// ========================================================

export function createIslandNPCs(scene) {
  const npcs = [];

  // 1. 🐻 森のクマモドキ (Bear)
  const bear = new ResidentNPC('bear', '森のクマモドキ', new THREE.Vector3(-4.5, 1.4, 2.5), scene, (group) => {
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

  // 2. 🕊️ 灯台のカモメ爺さん (Gull)
  const gull = new ResidentNPC('gull', '灯台のカモメ爺さん', new THREE.Vector3(5.5, 1.4, -3.2), scene, (group) => {
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, flatShading: true });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xf4a261, roughness: 0.5, flatShading: true });

    // 丸い胴体
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 8), whiteMat);
    body.position.y = 0.45;
    body.castShadow = true;
    group.add(body);

    // クチバシ
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 6), beakMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.48, 0.45);
    group.add(beak);

    // 白髭 (爺さん)
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.3, 6), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
    beard.rotation.x = Math.PI;
    beard.position.set(0, 0.25, 0.35);
    group.add(beard);
  });
  npcs.push(gull);

  // 3. 🦀 浜辺のカニ坊や (Crab)
  const crab = new ResidentNPC('crab', '浜辺のカニ坊や', new THREE.Vector3(6.5, 0.5, 4.5), scene, (group) => {
    const redMat = new THREE.MeshStandardMaterial({ color: 0xe76f51, roughness: 0.7, flatShading: true });

    // 甲羅
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.2, 8), redMat);
    shell.position.y = 0.15;
    shell.castShadow = true;
    group.add(shell);

    // ハサミ (Claws)
    [-0.45, 0.45].forEach((cx, idx) => {
      const claw = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6), redMat);
      claw.scale.set(1.4, 1, 0.6);
      claw.position.set(cx, 0.3, 0.2);
      group.add(claw);
    });

    // 飛び出ためだま
    [-0.14, 0.14].forEach(ex => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), new THREE.MeshBasicMaterial({ color: 0x000000 }));
      eye.position.set(ex, 0.38, 0.28);
      group.add(eye);
    });
  });
  npcs.push(crab);

  // 4. 👤 古井戸の影ぼうし (Shadow)
  const shadow = new ResidentNPC('shadow', '古井戸の影ぼうし', new THREE.Vector3(-4.8, 1.4, -4.8), scene, (group) => {
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x240046, transparent: true, opacity: 0.85 });

    const body = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 8), shadowMat);
    body.position.y = 0.45;
    group.add(body);

    // 光る紫の目
    [-0.09, 0.09].forEach(ex => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshBasicMaterial({ color: 0xc77dff }));
      eye.position.set(ex, 0.6, 0.24);
      group.add(eye);
    });
  });
  npcs.push(shadow);

  return npcs;
}
