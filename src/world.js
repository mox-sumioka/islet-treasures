import * as THREE from 'three';

// ========================================================
// 3D Low-poly Island World & Pickable Items
// ========================================================

export const PICKABLE_ITEMS_DEF = [
  {
    id: 'berry',
    name: 'あまい木の実',
    emoji: '🍎',
    color: 0xff3b30,
    pos: new THREE.Vector3(-10.0, 1.4, 7.0), // クマから離れた西の深い森の木陰
  },
  {
    id: 'shell',
    name: 'きれいな桜貝',
    emoji: '🐚',
    color: 0xffa8ba,
    pos: new THREE.Vector3(18.0, 1.05, -8.0), // カニから大きく離れた北東の美しい砂浜
  },
  {
    id: 'mushroom',
    name: '光る青キノコ',
    emoji: '🍄',
    color: 0x00b4d8,
    pos: new THREE.Vector3(-14.0, 1.4, -4.0), // 西の井戸の近くの草地の上
  },
  {
    id: 'coin',
    name: '古びた金のコイン',
    emoji: '🪙',
    color: 0xffd166,
    pos: new THREE.Vector3(14.0, 1.4, -13.0), // 灯台の脇の草地
  },
];

export class IslandWorld {
  constructor(scene) {
    this.scene = scene;
    this.pickables = [];
    this.waterMesh = null;
    this.lighthouseLight = null;
    this.altarPillars = [];

    this.buildTerrain();
    this.buildDecorations();
    this.buildLandmarks();
    this.spawnPickableItems();
    this.setupLighting();
  }

  buildTerrain() {
    // 1. 広大な海面 (Water Plane)
    const waterGeo = new THREE.PlaneGeometry(240, 240, 32, 32);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x48cae4,
      roughness: 0.1,
      metalness: 0.6,
      transparent: true,
      opacity: 0.85,
      flatShading: true,
    });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.y = -0.1;
    this.scene.add(this.waterMesh);

    // 2. 2倍の広さの島 (Sand Beach & Green Grass)
    // 砂浜 (広々とした外側)
    const sandGeo = new THREE.CylinderGeometry(24, 28, 1.2, 32);
    const sandMat = new THREE.MeshStandardMaterial({
      color: 0xfde2b8,
      roughness: 0.9,
      flatShading: true,
    });
    const sand = new THREE.Mesh(sandGeo, sandMat);
    sand.position.y = 0.4;
    sand.receiveShadow = true;
    this.scene.add(sand);

    // 草地 (内側の豊かな台地)
    const grassGeo = new THREE.CylinderGeometry(17, 21, 1.0, 28);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x90be6d,
      roughness: 0.8,
      flatShading: true,
    });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.position.y = 0.9;
    grass.receiveShadow = true;
    this.scene.add(grass);

    // 中央の高台 (なだらかな丘)
    const hillGeo = new THREE.CylinderGeometry(4.0, 9.0, 0.9, 20);
    const hillMat = new THREE.MeshStandardMaterial({
      color: 0x7fa95b,
      roughness: 0.9,
      flatShading: true,
    });
    const hill = new THREE.Mesh(hillGeo, hillMat);
    hill.position.set(-4, 1.6, -4);
    hill.receiveShadow = true;
    this.scene.add(hill);
  }

  // 座標(x, z)に応じた地面の高さを返す (広大な島に対応)
  getGroundHeight(x, z) {
    // 桟橋 (南端海上: xが[-1.6, 1.6], zが[18.0, 29.0])
    if (Math.abs(x) < 1.8 && z >= 18.0 && z <= 29.0) {
      return 1.15;
    }

    const distFromCenter = Math.sqrt(x * x + z * z);

    // なだらかな丘の上の判定 (中心: -4, -4, 半径: 9.0)
    const hillDist = Math.sqrt((x + 4) * (x + 4) + (z + 4) * (z + 4));
    if (hillDist < 9.0) {
      const hillFactor = Math.max(0, 1.0 - hillDist / 9.0);
      return 1.4 + hillFactor * 0.9;
    }

    // 草地 (内側)
    if (distFromCenter < 17.5) {
      return 1.4;
    }

    // 砂浜 (浜辺)
    return 1.05;
  }

  buildDecorations() {
    // 木々 (Low-poly Trees - 広大な森と木立)
    const treePositions = [
      // 西の深い森 (クマの住処周辺)
      [-8, 1.4, 4], [-11, 1.4, 2], [-13, 1.4, 6], [-9, 1.4, 9], [-7, 1.4, 7],
      // 北西の林 (古井戸周辺)
      [-8, 1.4, -6], [-12, 1.4, -10], [-6, 1.4, -10],
      // 中央南・東の並木
      [4, 1.4, 8], [-2, 1.4, 12], [6, 1.4, 12], [8, 1.4, 4],
      // 北東の灯台への小道
      [6, 1.4, -6], [8, 1.4, -12],
    ];

    treePositions.forEach(([x, y, z]) => {
      const tree = new THREE.Group();
      tree.position.set(x, y, z);

      // 幹
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.35, 1.4, 6),
        new THREE.MeshStandardMaterial({ color: 0x6f4e37, roughness: 0.9, flatShading: true })
      );
      trunk.position.y = 0.7;
      trunk.castShadow = true;
      tree.add(trunk);

      // 葉 (2段のコーン)
      const leavesMat = new THREE.MeshStandardMaterial({ color: 0x4d908e, roughness: 0.8, flatShading: true });
      const leaves1 = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.4, 6), leavesMat);
      leaves1.position.y = 1.6;
      leaves1.castShadow = true;
      tree.add(leaves1);

      const leaves2 = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.2, 6), leavesMat);
      leaves2.position.y = 2.4;
      leaves2.castShadow = true;
      tree.add(leaves2);

      this.scene.add(tree);
    });

    // 桟橋 (Wooden Pier - 海へ突き出るウッドデッキ)
    const pier = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8, flatShading: true });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.9, flatShading: true });

    // 12枚の木の床板 (z: 18 から 28.5 まで)
    for (let i = 0; i < 12; i++) {
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(3.0, 0.15, 0.75),
        woodMat
      );
      const zPos = 18.0 + i * 0.95;
      plank.position.set(0, 1.1, zPos);
      plank.receiveShadow = true;
      plank.castShadow = true;
      pier.add(plank);

      // 左右の木製支柱・杭 (海の中へ打ち込み)
      if (i % 3 === 0) {
        [-1.35, 1.35].forEach(postX => {
          const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.12, 1.8, 6),
            postMat
          );
          post.position.set(postX, 0.4, zPos);
          post.castShadow = true;
          pier.add(post);
        });
      }
    }
    this.scene.add(pier);
  }

  buildLandmarks() {
    // 1. 白い灯台 (Lighthouse) - 北東の岬 (x: 12, z: -10)
    const lighthouse = new THREE.Group();
    lighthouse.position.set(12, 1.4, -10);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 2.4, 6.0, 12),
      new THREE.MeshStandardMaterial({ color: 0xf4f1de, roughness: 0.5, flatShading: true })
    );
    base.position.y = 3.0;
    base.castShadow = true;
    base.receiveShadow = true;
    lighthouse.add(base);

    // 赤いストライプ
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 2.0, 1.2, 12),
      new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.5, flatShading: true })
    );
    stripe.position.y = 4.2;
    lighthouse.add(stripe);

    // 灯台のランタン室
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 1.0, 8),
      new THREE.MeshStandardMaterial({ color: 0x264653, roughness: 0.3 })
    );
    top.position.y = 6.4;
    lighthouse.add(top);

    // 灯台の光
    this.lighthouseLight = new THREE.SpotLight(0xfff3b0, 4, 30, Math.PI / 4, 0.5);
    this.lighthouseLight.position.set(0, 6.5, 0);
    this.lighthouseLight.castShadow = true;
    lighthouse.add(this.lighthouseLight);
    lighthouse.add(this.lighthouseLight.target);

    this.scene.add(lighthouse);

    // 2. 古代の祭壇 (Ancient Altar) - 中央 (x: 0, z: 0)
    const altar = new THREE.Group();
    altar.position.set(0, 1.4, 0);

    const altarBase = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.8, 0.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x6c757d, roughness: 0.9, flatShading: true })
    );
    altarBase.position.y = 0.2;
    altarBase.receiveShadow = true;
    altar.add(altarBase);

    // 4本の石柱 (4つの宝物の台座)
    const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    angles.forEach((rad, idx) => {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.35, 0.8, 6),
        new THREE.MeshStandardMaterial({ color: 0x495057, roughness: 0.8, flatShading: true })
      );
      pillar.position.set(Math.cos(rad) * 1.6, 0.55, Math.sin(rad) * 1.6);
      pillar.castShadow = true;
      altar.add(pillar);
      this.altarPillars.push(pillar);
    });

    this.scene.add(altar);
    this.altarGroup = altar;

    // 4つ揃った時に光る祭壇の光の魔法陣 & 光柱
    const beamGeo = new THREE.CylinderGeometry(2.2, 2.2, 18, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    this.altarBeam = new THREE.Mesh(beamGeo, beamMat);
    this.altarBeam.position.set(0, 9.0, 0);
    this.scene.add(this.altarBeam);

    const circleGeo = new THREE.RingGeometry(0.6, 3.2, 24);
    const circleMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    this.altarCircle = new THREE.Mesh(circleGeo, circleMat);
    this.altarCircle.rotation.x = -Math.PI / 2;
    this.altarCircle.position.set(0, 1.45, 0);
    this.scene.add(this.altarCircle);

    // 3. 古井戸 (Ancient Well) - 北西 (x: -11.0, z: -7.0)
    const well = new THREE.Group();
    well.position.set(-11.0, 1.4, -7.0);

    const wellRing = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.0, 0.8, 8, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x5c4d3c, roughness: 0.9, flatShading: true, side: THREE.DoubleSide })
    );
    wellRing.position.y = 0.35;
    well.add(wellRing);

    // 不気味な紫の光
    const wellLight = new THREE.PointLight(0x9d4edd, 2.2, 5);
    wellLight.position.set(0, 0.3, 0);
    well.add(wellLight);

    this.scene.add(well);
  }

  showAltarGuideBeam() {
    if (this.altarBeam && this.altarCircle) {
      this.altarBeam.material.opacity = 0.45;
      this.altarCircle.material.opacity = 0.8;
    }
  }

  placeTreasuresOnAltar() {
    const emojis = ['🌟', '🔭', '🔮', '📻'];
    const colors = [0xffd166, 0xf4a261, 0x48cae4, 0x9d4edd];
    
    this.altarPillars.forEach((pillar, idx) => {
      const geo = new THREE.DodecahedronGeometry(0.2);
      const mat = new THREE.MeshStandardMaterial({
        color: colors[idx],
        emissive: colors[idx],
        emissiveIntensity: 0.8,
        roughness: 0.2
      });
      const tMesh = new THREE.Mesh(geo, mat);
      tMesh.position.set(0, 0.55, 0);
      pillar.add(tMesh);

      // 台座の光
      const pLight = new THREE.PointLight(colors[idx], 1.5, 4);
      pLight.position.set(0, 0.6, 0);
      pillar.add(pLight);
    });
  }

  spawnPickableItems() {
    PICKABLE_ITEMS_DEF.forEach(def => {
      const group = new THREE.Group();
      group.position.copy(def.pos);

      // アイテム本体の3Dモデル
      const itemMeshGroup = new THREE.Group();

      if (def.id === 'berry') {
        // 🍎 りんご (木の実)
        const apple = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xff3333, roughness: 0.3, emissive: 0x440000 })
        );
        apple.position.y = 0.25;
        itemMeshGroup.add(apple);

        // 枝 & 葉
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, 0.12, 4),
          new THREE.MeshStandardMaterial({ color: 0x5c3d2e })
        );
        stem.position.set(0, 0.5, 0);
        itemMeshGroup.add(stem);

        const leaf = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 4, 4),
          new THREE.MeshStandardMaterial({ color: 0x40916c })
        );
        leaf.scale.set(1.5, 0.3, 0.8);
        leaf.position.set(0.08, 0.52, 0);
        itemMeshGroup.add(leaf);

      } else if (def.id === 'shell') {
        // 🐚 桜貝 (ピンクの二枚貝)
        const shellMat = new THREE.MeshStandardMaterial({ color: 0xffafcc, roughness: 0.2, metalness: 0.2, side: THREE.DoubleSide });
        const shell1 = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.35, 6, 1, true), shellMat);
        shell1.rotation.x = -Math.PI / 4;
        shell1.position.y = 0.25;
        itemMeshGroup.add(shell1);

        const pearl = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, emissive: 0x222222 })
        );
        pearl.position.set(0, 0.2, 0.05);
        itemMeshGroup.add(pearl);

      } else if (def.id === 'mushroom') {
        // 🍄 光る青キノコ
        const capMat = new THREE.MeshStandardMaterial({ color: 0x00b4d8, roughness: 0.3, emissive: 0x0077b6, emissiveIntensity: 0.6 });
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.35, 8), capMat);
        cap.position.y = 0.38;
        itemMeshGroup.add(cap);

        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.14, 0.3, 6),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })
        );
        stem.position.y = 0.18;
        itemMeshGroup.add(stem);

        // キノコの発光PointLight
        const shroomLight = new THREE.PointLight(0x00b4d8, 1.5, 3);
        shroomLight.position.set(0, 0.4, 0);
        itemMeshGroup.add(shroomLight);

      } else if (def.id === 'coin') {
        // 🪙 金のコイン
        const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.2, metalness: 0.8, emissive: 0x664400 });
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 12), coinMat);
        coin.rotation.x = Math.PI / 3;
        coin.position.y = 0.25;
        itemMeshGroup.add(coin);
      }

      itemMeshGroup.traverse(m => {
        if (m.isMesh) m.castShadow = true;
      });
      group.add(itemMeshGroup);

      // 足元の光るリング (Glow Indicator Ring)
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.35, 0.55, 16),
        new THREE.MeshBasicMaterial({ color: def.color, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      group.add(ring);

      this.scene.add(group);
      this.pickables.push({
        id: def.id,
        name: def.name,
        emoji: def.emoji,
        group: group,
        mesh: itemMeshGroup,
        pos: def.pos,
        isCollected: false,
      });
    });
  }

  setupLighting() {
    // 環境光 (温かいパステル調)
    const ambient = new THREE.AmbientLight(0xfff5eb, 0.7);
    this.scene.add(ambient);

    // 太陽光 (Directional Sun)
    const sun = new THREE.DirectionalLight(0xffecd1, 1.2);
    sun.position.set(15, 25, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    this.scene.add(sun);
  }

  update(delta, time) {
    // 1. 水面の波の揺らぎ (Water Wave Animation)
    if (this.waterMesh) {
      const pos = this.waterMesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i);
        const v = pos.getY(i);
        const z = Math.sin(u * 0.3 + time * 2) * 0.08 + Math.cos(v * 0.3 + time * 1.5) * 0.08;
        pos.setZ(i, z);
      }
      pos.needsUpdate = true;
    }

    // 2. 灯台の回転ビーム
    if (this.lighthouseLight) {
      const angle = time * 0.8;
      this.lighthouseLight.target.position.set(
        6 + Math.cos(angle) * 10,
        0,
        -5 + Math.sin(angle) * 10
      );
      this.scene.add(this.lighthouseLight.target);
    }

    // 4. 祭壇の光柱の回転
    if (this.altarBeam && this.altarBeam.material.opacity > 0) {
      this.altarBeam.rotation.y += delta * 1.5;
      this.altarCircle.rotation.z += delta * 0.8;
    }
  }
}
