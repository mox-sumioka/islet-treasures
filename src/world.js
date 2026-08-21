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
    pos: new THREE.Vector3(-2.5, 1.4, 4.0), // クマから離れた森の木陰
  },
  {
    id: 'shell',
    name: 'きれいな桜貝',
    emoji: '🐚',
    color: 0xffa8ba,
    pos: new THREE.Vector3(5.5, 1.05, 2.5), // 浜辺の砂の上
  },
  {
    id: 'mushroom',
    name: '光る青キノコ',
    emoji: '🍄',
    color: 0x00b4d8,
    pos: new THREE.Vector3(-6.5, 1.4, -1.5), // 井戸の近くの草地の上
  },
  {
    id: 'coin',
    name: '古びた金のコイン',
    emoji: '🪙',
    color: 0xffd166,
    pos: new THREE.Vector3(7.0, 1.4, -4.0), // 灯台の脇
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
    // 1. 海面 (Water Plane)
    const waterGeo = new THREE.PlaneGeometry(120, 120, 24, 24);
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

    // 2. 島の土台 (Green Grass & Sand Beach)
    // 砂浜 (外側)
    const sandGeo = new THREE.CylinderGeometry(13, 15, 1.2, 24);
    const sandMat = new THREE.MeshStandardMaterial({
      color: 0xfde2b8,
      roughness: 0.9,
      flatShading: true,
    });
    const sand = new THREE.Mesh(sandGeo, sandMat);
    sand.position.y = 0.4;
    sand.receiveShadow = true;
    this.scene.add(sand);

    // 草地 (内側の丘)
    const grassGeo = new THREE.CylinderGeometry(10, 12, 1.0, 20);
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
    const hillGeo = new THREE.CylinderGeometry(2.0, 4.8, 0.8, 16);
    const hillMat = new THREE.MeshStandardMaterial({
      color: 0x7fa95b,
      roughness: 0.9,
      flatShading: true,
    });
    const hill = new THREE.Mesh(hillGeo, hillMat);
    hill.position.set(-2, 1.6, -2);
    hill.receiveShadow = true;
    this.scene.add(hill);
  }

  // 座標(x, z)に応じた地面の高さを返す
  getGroundHeight(x, z) {
    const distFromCenter = Math.sqrt(x * x + z * z);
    
    // 桟橋
    if (Math.abs(x) < 1.2 && z > 11.0) {
      return 1.4;
    }

    // 丘の上の判定 (中心: -2, -2, 半径: 4.5)
    const hillDist = Math.sqrt((x + 2) * (x + 2) + (z + 2) * (z + 2));
    if (hillDist < 4.5) {
      const hillFactor = Math.max(0, 1.0 - hillDist / 4.5);
      return 1.4 + hillFactor * 0.8;
    }

    // 草地
    if (distFromCenter < 10.0) {
      return 1.4;
    }

    // 砂浜
    return 1.05;
  }

  buildDecorations() {
    // 木々 (Low-poly Trees)
    const treePositions = [
      [-5, 1.4, 2], [-7, 1.4, 0], [-4, 1.4, -4],
      [2, 1.4, 4], [0, 1.4, 6], [-3, 1.4, 6],
    ];

    treePositions.forEach(([x, y, z]) => {
      const tree = new THREE.Group();
      tree.position.set(x, y, z);

      // 幹
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.25, 1.2, 6),
        new THREE.MeshStandardMaterial({ color: 0x6f4e37, roughness: 0.9, flatShading: true })
      );
      trunk.position.y = 0.6;
      trunk.castShadow = true;
      tree.add(trunk);

      // 葉 (2段のコーン)
      const leavesMat = new THREE.MeshStandardMaterial({ color: 0x4d908e, roughness: 0.8, flatShading: true });
      const leaves1 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.2, 6), leavesMat);
      leaves1.position.y = 1.4;
      leaves1.castShadow = true;
      tree.add(leaves1);

      const leaves2 = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.0, 6), leavesMat);
      leaves2.position.y = 2.0;
      leaves2.castShadow = true;
      tree.add(leaves2);

      this.scene.add(tree);
    });

    // 桟橋 (Wooden Pier)
    const pier = new THREE.Group();
    pier.position.set(0, 0.3, 13);
    for (let i = 0; i < 4; i++) {
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.15, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x7f5539, roughness: 0.9, flatShading: true })
      );
      plank.position.set(0, 0, i * 0.8);
      plank.castShadow = true;
      plank.receiveShadow = true;
      pier.add(plank);
    }
    this.scene.add(pier);

    // 浜辺の岩 (Rocks)
    const rockMat = new THREE.MeshStandardMaterial({ color: 0xadb5bd, roughness: 0.9, flatShading: true });
    [[8, 0.3, 2], [-9, 0.3, 3], [3, 0.3, -8], [-5, 0.3, -9]].forEach(([rx, ry, rz]) => {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + Math.random() * 0.4), rockMat);
      rock.position.set(rx, ry, rz);
      rock.castShadow = true;
      this.scene.add(rock);
    });
  }

  buildLandmarks() {
    // 1. 白い灯台 (Lighthouse) - 東側 (x: 6, z: -5)
    const lighthouse = new THREE.Group();
    lighthouse.position.set(6, 1.4, -5);

    // 本体塔
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 1.1, 4.2, 8),
      new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.6, flatShading: true })
    );
    tower.position.y = 2.1;
    tower.castShadow = true;
    lighthouse.add(tower);

    // 赤いストライプ
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.82, 0.92, 0.8, 8),
      new THREE.MeshStandardMaterial({ color: 0xd90429, roughness: 0.6, flatShading: true })
    );
    stripe.position.y = 2.5;
    lighthouse.add(stripe);

    // ランプ室 & 屋根
    const lamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 0.6, 8),
      new THREE.MeshBasicMaterial({ color: 0xffea00 })
    );
    lamp.position.y = 4.4;
    lighthouse.add(lamp);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(0.8, 0.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x2b2d42, roughness: 0.5, flatShading: true })
    );
    roof.position.y = 5.0;
    lighthouse.add(roof);

    // 灯台の回転ビーム光 (Spotlight)
    const spot = new THREE.SpotLight(0xffea00, 3.0, 20, Math.PI / 6, 0.3);
    spot.position.set(0, 4.4, 0);
    lighthouse.add(spot);
    this.lighthouseLight = spot;

    this.scene.add(lighthouse);

    // 2. 古い石の祠・祭壇 (Altar of Memories) - 中央 (x: 0, z: 0)
    const altar = new THREE.Group();
    altar.position.set(0, 1.4, 0);

    const baseStone = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.5, 0.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x6c757d, roughness: 0.9, flatShading: true })
    );
    baseStone.receiveShadow = true;
    altar.add(baseStone);

    // 4つの宝物台座
    const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    angles.forEach((rad, idx) => {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.3, 0.7, 6),
        new THREE.MeshStandardMaterial({ color: 0x495057, roughness: 0.8, flatShading: true })
      );
      pillar.position.set(Math.cos(rad) * 1.3, 0.45, Math.sin(rad) * 1.3);
      pillar.castShadow = true;
      altar.add(pillar);
      this.altarPillars.push(pillar);
    });

    this.scene.add(altar);
    this.altarGroup = altar;

    // 4つ揃った時に光る祭壇の光の魔法陣 & 光柱
    const beamGeo = new THREE.CylinderGeometry(1.8, 1.8, 15, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    this.altarBeam = new THREE.Mesh(beamGeo, beamMat);
    this.altarBeam.position.set(0, 7.5, 0);
    this.scene.add(this.altarBeam);

    const circleGeo = new THREE.RingGeometry(0.5, 2.5, 24);
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

    // 3. 古井戸 (Ancient Well) - 西側 (x: -4.5, z: -2.5)
    const well = new THREE.Group();
    well.position.set(-4.5, 1.4, -2.5);

    const wellRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 0.7, 8, 1, true),
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
