/**
 * 3D Web Experience Architect Engine (3d-web-experience.js)
 * Based on: sickn33/agentic-awesome-skills/skills/3d-web-experience/SKILL.md
 *
 * Implements:
 * 1. Optimized Three.js Background Scene using THREE.InstancedMesh (1 draw call) & capped PixelRatio
 * 2. Interactive 3D Hero Showcase on Product List Page (3D Sculpted Hobak + Orbiting Textured Product Cubes)
 * 3. Interactive 360° 3D Product Visualizer & Lighting/Material Configurator on Detail & Write Pages
 */

(function () {
  'use strict';

  const prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * Resolve image source to a CORS-safe WebGL texture URI (handles file:// protocol)
   */
  function resolveWebGLTextureSrc(src) {
    if (!src) return '';
    if (src.startsWith('data:')) return src;

    const textures = window.HOBAK_WEBGL_TEXTURES || {};
    if (textures[src]) return textures[src];

    // Match filename like image/product_3.jpg even if src has ./ or full path
    const match = src.match(/image\/product_[^?#]+/i);
    if (match && textures[match[0]]) {
      return textures[match[0]];
    }
    return src;
  }

  function loadSafeWebGLTexture(THREE, src, onLoad) {
    const resolved = resolveWebGLTextureSrc(src);
    if (!resolved) return null;

    const img = new Image();
    if (!resolved.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    const texture = new THREE.Texture(img);
    img.onload = () => {
      texture.needsUpdate = true;
      if (typeof onLoad === 'function') onLoad(texture, img);
    };
    img.src = resolved;
    return texture;
  }

  /**
   * Generate a smooth 3D Depth/Displacement Map from an actual product photo
   * Center-weighted + luminance relief so the actual item pops out in 3D space
   */
  function createDepthTextureFromImage(THREE, img) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, size, size);
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Luminance + edge contrast
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        // Soft radial center focus (keeps borders flush with 3D frame, pops center subject)
        const nx = (x / size) * 2 - 1;
        const ny = (y / size) * 2 - 1;
        const dist = Math.sqrt(nx * nx + ny * ny);
        const radialWeight = Math.max(0, 1 - Math.pow(dist / 1.15, 2));

        const depth = Math.min(255, Math.max(0, lum * 0.65 * radialWeight + 90 * radialWeight));
        data[idx] = depth;
        data[idx + 1] = depth;
        data[idx + 2] = depth;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const depthTex = new THREE.CanvasTexture(canvas);
    depthTex.needsUpdate = true;
    return depthTex;
  }

  // Lighting Environment Presets for 3D Configurators
  const LIGHTING_PRESETS = {
    studio: {
      ambientColor: 0xffffff,
      ambientIntensity: 0.85,
      dirColor: 0xfff7ed,
      dirIntensity: 1.9,
      pointColor: 0xff6f0f,
      pointIntensity: 1.4,
      bgGradient: 'radial-gradient(circle at 50% 40%, #243044 0%, #0f172a 100%)'
    },
    warm: {
      ambientColor: 0xffedd5,
      ambientIntensity: 0.75,
      dirColor: 0xff7e29,
      dirIntensity: 2.3,
      pointColor: 0xfbbf24,
      pointIntensity: 2.0,
      bgGradient: 'radial-gradient(circle at 50% 40%, #431407 0%, #1c1917 100%)'
    },
    neon: {
      ambientColor: 0xc7d2fe,
      ambientIntensity: 0.65,
      dirColor: 0x38bdf8,
      dirIntensity: 2.1,
      pointColor: 0xf43f5e,
      pointIntensity: 2.4,
      bgGradient: 'radial-gradient(circle at 50% 40%, #1e1b4b 0%, #090d16 100%)'
    }
  };

  /* ==========================================================================
     1. Fullscreen Ambient Three.js Scene with THREE.InstancedMesh Optimization
     ========================================================================== */
  function initBackgroundInstancedScene() {
    if (!window.THREE || prefersReducedMotion) return;
    if (document.querySelector('.webgl-bg-canvas')) return;

    const THREE = window.THREE;
    const canvas = document.createElement('canvas');
    canvas.className = 'webgl-bg-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch (e) {
      canvas.remove();
      return;
    }

    // Best Practice: Cap pixel ratio to max 2 for 60 FPS stability
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.z = 18;

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xff8c42, 1.6);
    dirLight.position.set(8, 12, 10);
    scene.add(dirLight);

    // Best Practice: Use THREE.InstancedMesh to render 24 floating 3D shapes in a SINGLE draw call
    const instanceCount = 24;
    const geometry = new THREE.IcosahedronGeometry(0.48, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff7e29,
      roughness: 0.32,
      metalness: 0.18,
      transparent: true,
      opacity: 0.26
    });

    const instancedMesh = new THREE.InstancedMesh(geometry, material, instanceCount);
    const dummy = new THREE.Object3D();
    const instanceData = [];
    const palette = [
      new THREE.Color(0xff6f0f),
      new THREE.Color(0xff9f43),
      new THREE.Color(0x20c997),
      new THREE.Color(0xfdba74)
    ];

    for (let i = 0; i < instanceCount; i++) {
      const x = (Math.random() - 0.5) * 34;
      const y = (Math.random() - 0.5) * 22;
      const z = (Math.random() - 0.5) * 14 - 4;
      const scale = 0.45 + Math.random() * 0.95;

      dummy.position.set(x, y, z);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
      instancedMesh.setColorAt(i, palette[i % palette.length]);

      instanceData.push({
        baseX: x,
        baseY: y,
        baseZ: z,
        scale,
        rotSpeedX: (Math.random() - 0.5) * 0.012,
        rotSpeedY: (Math.random() - 0.5) * 0.015,
        floatSpeed: 0.4 + Math.random() * 0.8,
        floatOffset: Math.random() * Math.PI * 2,
        rx: dummy.rotation.x,
        ry: dummy.rotation.y
      });
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
    scene.add(instancedMesh);

    let pointerX = 0;
    let pointerY = 0;
    window.addEventListener(
      'pointermove',
      (e) => {
        pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
        pointerY = -(e.clientY / window.innerHeight - 0.5) * 2;
      },
      { passive: true }
    );

    let clockStart = performance.now();
    function animateBg() {
      requestAnimationFrame(animateBg);
      if (document.hidden) return; // Pause when tab is inactive

      const elapsed = (performance.now() - clockStart) * 0.001;

      // Smooth camera parallax
      camera.position.x += (pointerX * 1.4 - camera.position.x) * 0.04;
      camera.position.y += (pointerY * 1.0 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      for (let i = 0; i < instanceCount; i++) {
        const d = instanceData[i];
        d.rx += d.rotSpeedX;
        d.ry += d.rotSpeedY;
        dummy.position.set(
          d.baseX,
          d.baseY + Math.sin(elapsed * d.floatSpeed + d.floatOffset) * 0.55,
          d.baseZ
        );
        dummy.rotation.set(d.rx, d.ry, 0);
        dummy.scale.setScalar(d.scale);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
      }
      instancedMesh.instanceMatrix.needsUpdate = true;
      renderer.render(scene, camera);
    }
    animateBg();

    // Responsive Resize Handling
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  /* ==========================================================================
     2. Interactive 3D Hero Showcase Banner on Product List Page (index.html)
     ========================================================================== */
  function initList3DHeroShowcase() {
    const listMain = document.querySelector('.list-main-container');
    if (!listMain || document.getElementById('hobak3dHeroBanner')) return;

    const banner = document.createElement('section');
    banner.id = 'hobak3dHeroBanner';
    banner.className = 'hobak-3d-hero-banner';
    banner.setAttribute('aria-label', '호박 3D 인터랙티브 쇼케이스');
    banner.innerHTML = `
      <div class="hero-3d-text-col">
        <div class="hero-3d-badge-row">
          <img src="image/hobak_character.jpg" alt="호박 마스코트" class="hobak-hero-mascot" />
          <span class="hero-3d-pill">🧊 Three.js WebGL 쇼케이스</span>
          <span class="hero-3d-fps-badge">⚡ 60 FPS · PBR Studio Lighting</span>
        </div>
        <h2 class="hero-3d-title">
          우리 동네 인기 매물을 <strong>3D 공간</strong>에서 돌려보세요
        </h2>
        <p class="hero-3d-desc">
          우측 3D 호박 엠블럼과 실물 매물 큐브를 마우스로 드래그해 360° 회전해 보세요.
          각 상품 상세 페이지에서는 <strong>실물 3D 회전 뷰어</strong>로 매물을 입체 감상할 수 있습니다.
        </p>
        <div class="hero-3d-controls">
          <button type="button" class="hero-3d-ctrl-btn active" data-hero-light="studio">☀️ 스튜디오 조명</button>
          <button type="button" class="hero-3d-ctrl-btn" data-hero-light="warm">🎃 호박 웜톤</button>
          <button type="button" class="hero-3d-ctrl-btn" data-hero-light="neon">🌙 네온 나이트</button>
          <button type="button" class="hero-3d-ctrl-btn active" id="heroAutoRotateBtn">🔄 자동회전 ON</button>
        </div>
      </div>
      <div class="hero-3d-canvas-wrap" id="hero3dCanvasWrap" title="드래그하여 3D 쇼케이스 회전">
        <div class="hero-3d-hint">🖱️ 마우스로 드래그하여 360° 회전 · 휠 줌</div>
      </div>
    `;

    listMain.prepend(banner);

    const wrap = document.getElementById('hero3dCanvasWrap');
    if (!wrap || !window.THREE) return;

    const THREE = window.THREE;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      return;
    }

    const width = wrap.clientWidth || 420;
    const height = wrap.clientHeight || 220;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    wrap.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.3, 6.4);
    camera.lookAt(0, 0, 0);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    const dirLight = new THREE.DirectionalLight(0xfff7ed, 1.9);
    dirLight.position.set(5, 8, 6);
    const pointLight = new THREE.PointLight(0xff6f0f, 1.5, 20);
    pointLight.position.set(-4, 2, 4);
    scene.add(ambientLight, dirLight, pointLight);

    // Root 3D Group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Build 3D Sculpted Hobak Pumpkin Emblem in the center
    const pumpkinGroup = new THREE.Group();
    const pumpkinMat = new THREE.MeshStandardMaterial({
      color: 0xff6f0f,
      roughness: 0.28,
      metalness: 0.15
    });

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const lobeGeo = new THREE.SphereGeometry(0.68, 20, 20);
      lobeGeo.scale(0.68, 0.88, 0.68);
      const lobe = new THREE.Mesh(lobeGeo, pumpkinMat);
      lobe.position.set(Math.cos(angle) * 0.26, 0, Math.sin(angle) * 0.26);
      pumpkinGroup.add(lobe);
    }

    // Pumpkin Stem
    const stemGeo = new THREE.CylinderGeometry(0.08, 0.15, 0.42, 12);
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.5
    });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.set(0, 0.68, 0);
    stem.rotation.z = 0.15;
    pumpkinGroup.add(stem);

    // Glowing Pedestal Ring under Pumpkin
    const ringGeo = new THREE.TorusGeometry(1.35, 0.035, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xff9f43,
      emissive: 0xff6f0f,
      emissiveIntensity: 0.45,
      roughness: 0.2,
      metalness: 0.6
    });
    const pedestalRing = new THREE.Mesh(ringGeo, ringMat);
    pedestalRing.rotation.x = Math.PI / 2;
    pedestalRing.position.y = -0.82;
    rootGroup.add(pedestalRing);
    rootGroup.add(pumpkinGroup);

    // Orbiting 3D Textured Product Cubes (Actual Product Photos!)
    const samplePhotos = [
      'image/product_1.jpg',
      'image/product_2.jpg',
      'image/product_3.jpg',
      'image/product_6.jpg'
    ];
    const orbitCubes = [];

    samplePhotos.forEach((photoUrl, idx) => {
      const cubeGeo = new THREE.BoxGeometry(0.88, 0.88, 0.88);
      const cubeMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.22,
        metalness: 0.08
      });
      loadSafeWebGLTexture(THREE, photoUrl, (tex) => {
        cubeMat.map = tex;
        cubeMat.needsUpdate = true;
      });
      const cube = new THREE.Mesh(cubeGeo, cubeMat);
      const angle = (idx / samplePhotos.length) * Math.PI * 2;
      cube.position.set(Math.cos(angle) * 2.25, Math.sin(idx) * 0.2, Math.sin(angle) * 2.25);
      rootGroup.add(cube);
      orbitCubes.push({ mesh: cube, baseAngle: angle });
    });

    // Interactive Drag-to-Orbit Damping State
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let targetRotY = 0.4;
    let targetRotX = 0.12;
    let autoRotate = true;

    wrap.addEventListener('pointerdown', (e) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    });

    window.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;
      targetRotY += dx * 0.012;
      targetRotX = Math.max(-0.6, Math.min(0.6, targetRotX + dy * 0.01));
    });

    window.addEventListener('pointerup', () => {
      isDragging = false;
    });

    wrap.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        camera.position.z = Math.max(4.0, Math.min(9.0, camera.position.z + e.deltaY * 0.004));
      },
      { passive: false }
    );

    // Lighting Preset Controls
    const lightBtns = banner.querySelectorAll('[data-hero-light]');
    lightBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-hero-light');
        const preset = LIGHTING_PRESETS[key] || LIGHTING_PRESETS.studio;
        lightBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        ambientLight.color.setHex(preset.ambientColor);
        ambientLight.intensity = preset.ambientIntensity;
        dirLight.color.setHex(preset.dirColor);
        dirLight.intensity = preset.dirIntensity;
        pointLight.color.setHex(preset.pointColor);
        pointLight.intensity = preset.pointIntensity;
        wrap.style.background = preset.bgGradient;
      });
    });

    const autoRotateBtn = document.getElementById('heroAutoRotateBtn');
    if (autoRotateBtn) {
      autoRotateBtn.addEventListener('click', () => {
        autoRotate = !autoRotate;
        autoRotateBtn.classList.toggle('active', autoRotate);
        autoRotateBtn.textContent = autoRotate ? '🔄 자동회전 ON' : '⏸️ 자동회전 OFF';
      });
    }

    let startTime = performance.now();
    function animateHero() {
      requestAnimationFrame(animateHero);
      if (document.hidden) return;

      const t = (performance.now() - startTime) * 0.001;
      if (autoRotate && !isDragging) {
        targetRotY += 0.006;
      }

      rootGroup.rotation.y += (targetRotY - rootGroup.rotation.y) * 0.08;
      rootGroup.rotation.x += (targetRotX - rootGroup.rotation.x) * 0.08;
      pumpkinGroup.position.y = Math.sin(t * 2.2) * 0.1;

      orbitCubes.forEach((item, idx) => {
        item.mesh.rotation.x += 0.008;
        item.mesh.rotation.y += 0.012;
        item.mesh.position.y = Math.sin(t * 2 + idx * 1.5) * 0.18;
      });

      renderer.render(scene, camera);
    }
    animateHero();

    window.addEventListener('resize', () => {
      const nw = wrap.clientWidth || 420;
      const nh = wrap.clientHeight || 220;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
  }

  /* ==========================================================================
     3. Interactive 360° 3D Depth-Relief Product Photo Viewer (detail.html & write.html)
     ========================================================================== */
  function attach3DProductVisualizer(viewerContainer, getImageSourceFn) {
    if (!viewerContainer || !window.THREE) return;
    if (viewerContainer.querySelector('.viewer-3d-toggle-btn')) return;

    const THREE = window.THREE;

    // Toggle Button ("🧊 3D 입체 사진 뷰어")
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'viewer-3d-toggle-btn';
    toggleBtn.innerHTML = '<span>🧊 3D 입체 뷰어</span>';
    viewerContainer.appendChild(toggleBtn);

    // 3D Stage Overlay
    const stageWrap = document.createElement('div');
    stageWrap.className = 'detail-3d-stage-wrap';
    stageWrap.innerHTML = `
      <div class="detail-3d-guide-pill">🖱️ 드래그하여 360° 입체 회전 · 마우스 휠 확대/축소</div>
      <div class="detail-3d-canvas-container"></div>
      <div class="detail-3d-config-bar" role="toolbar" aria-label="3D 조명 및 회전 설정">
        <button type="button" class="config-3d-chip active" data-light="studio">☀️ 스튜디오</button>
        <button type="button" class="config-3d-chip" data-light="warm">🎃 호박 웜톤</button>
        <button type="button" class="config-3d-chip" data-light="neon">🌙 사이버 네온</button>
        <button type="button" class="config-3d-chip active" data-action="autorotate">🔄 자동회전</button>
      </div>
    `;
    viewerContainer.appendChild(stageWrap);

    const canvasHost = stageWrap.querySelector('.detail-3d-canvas-container');
    let is3DActive = false;
    let initialized = false;
    let updateTextureFn = null;

    function setupThreeProductStage() {
      if (initialized) return;
      initialized = true;

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch (e) {
        return;
      }

      const w = viewerContainer.clientWidth || 640;
      const h = viewerContainer.clientHeight || 460;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h);
      canvasHost.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
      camera.position.set(0, 0.35, 5.4);

      // Studio Lighting Rig
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
      const dirLight = new THREE.DirectionalLight(0xfff7ed, 1.9);
      dirLight.position.set(4, 6, 5);
      const rimLight = new THREE.PointLight(0xff6f0f, 1.5, 18);
      rimLight.position.set(-4, -2, 3);
      scene.add(ambientLight, dirLight, rimLight);

      const showcaseGroup = new THREE.Group();
      scene.add(showcaseGroup);

      // Floating Group for the 3D Depth-Displaced Real Product Photo
      const photoObjectGroup = new THREE.Group();
      showcaseGroup.add(photoObjectGroup);

      // 1. Solid 3D Metallic Backing Frame
      const sideMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.28,
        metalness: 0.72
      });
      const backFaceMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.22,
        metalness: 0.08
      });
      const backingGeo = new THREE.BoxGeometry(3.18, 2.54, 0.16);
      const backingMesh = new THREE.Mesh(backingGeo, [
        sideMat, sideMat, sideMat, sideMat, sideMat, backFaceMat
      ]);
      backingMesh.position.z = -0.08;
      photoObjectGroup.add(backingMesh);

      // Orange Accent Outer Rim
      const rimBoxGeo = new THREE.BoxGeometry(3.28, 2.64, 0.12);
      const rimBoxMat = new THREE.MeshStandardMaterial({
        color: 0xff6f0f,
        roughness: 0.3,
        metalness: 0.55
      });
      const rimBoxMesh = new THREE.Mesh(rimBoxGeo, rimBoxMat);
      rimBoxMesh.position.z = -0.09;
      photoObjectGroup.add(rimBoxMesh);

      // 2. High-Segment 3D Depth-Relief Photo Mesh (Real photo + Real-time Depth Displacement)
      const reliefGeo = new THREE.PlaneGeometry(3.12, 2.48, 84, 84);
      const reliefMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.24,
        metalness: 0.06,
        displacementScale: 0.52,
        displacementBias: 0.02
      });
      const reliefMesh = new THREE.Mesh(reliefGeo, reliefMat);
      reliefMesh.position.z = 0.01;
      photoObjectGroup.add(reliefMesh);

      // 3. Floating Turntable Pedestal Ring below Product
      const ringGeo = new THREE.TorusGeometry(1.78, 0.032, 16, 64);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xff8c42,
        emissive: 0xff6f0f,
        emissiveIntensity: 0.45,
        roughness: 0.2,
        metalness: 0.7
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = -1.52;
      showcaseGroup.add(ringMesh);

      updateTextureFn = function () {
        const src = getImageSourceFn();
        if (!src) return;
        loadSafeWebGLTexture(THREE, src, (tex, loadedImg) => {
          reliefMat.map = tex;
          backFaceMat.map = tex;
          if (loadedImg) {
            const depthTex = createDepthTextureFromImage(THREE, loadedImg);
            if (depthTex) {
              reliefMat.displacementMap = depthTex;
            }
          }
          reliefMat.needsUpdate = true;
          backFaceMat.needsUpdate = true;
        });
      };
      updateTextureFn();

      // Orbit Controls (Drag + Wheel Zoom with smooth damping)
      let dragging = false;
      let lastX = 0;
      let lastY = 0;
      let targetRotY = 0.28;
      let targetRotX = 0.06;
      let autoRotate = true;

      canvasHost.addEventListener('pointerdown', (e) => {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
      });

      window.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        targetRotY += dx * 0.013;
        targetRotX = Math.max(-0.65, Math.min(0.65, targetRotX + dy * 0.011));
      });

      window.addEventListener('pointerup', () => {
        dragging = false;
      });

      canvasHost.addEventListener(
        'wheel',
        (e) => {
          e.preventDefault();
          camera.position.z = Math.max(3.2, Math.min(8.0, camera.position.z + e.deltaY * 0.004));
        },
        { passive: false }
      );

      // Configurator Toolbar Buttons
      const configBar = stageWrap.querySelector('.detail-3d-config-bar');
      configBar.addEventListener('click', (e) => {
        const btn = e.target.closest('.config-3d-chip');
        if (!btn) return;

        const lightKey = btn.getAttribute('data-light');
        const actionKey = btn.getAttribute('data-action');

        if (lightKey && LIGHTING_PRESETS[lightKey]) {
          const p = LIGHTING_PRESETS[lightKey];
          configBar
            .querySelectorAll('[data-light]')
            .forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');

          ambientLight.color.setHex(p.ambientColor);
          ambientLight.intensity = p.ambientIntensity;
          dirLight.color.setHex(p.dirColor);
          dirLight.intensity = p.dirIntensity;
          rimLight.color.setHex(p.pointColor);
          rimLight.intensity = p.pointIntensity;
          stageWrap.style.background = p.bgGradient;
        } else if (actionKey === 'autorotate') {
          autoRotate = !autoRotate;
          btn.classList.toggle('active', autoRotate);
          btn.textContent = autoRotate ? '🔄 자동회전' : '⏸️ 회전정지';
        }
      });

      let start = performance.now();
      function animateVisualizer() {
        requestAnimationFrame(animateVisualizer);
        if (!is3DActive || document.hidden) return;

        const t = (performance.now() - start) * 0.001;
        if (autoRotate && !dragging) {
          targetRotY += 0.007;
        }

        showcaseGroup.rotation.y += (targetRotY - showcaseGroup.rotation.y) * 0.08;
        showcaseGroup.rotation.x += (targetRotX - showcaseGroup.rotation.x) * 0.08;
        photoObjectGroup.position.y = Math.sin(t * 2.0) * 0.07;

        renderer.render(scene, camera);
      }
      animateVisualizer();

      window.addEventListener('resize', () => {
        const nw = viewerContainer.clientWidth || 640;
        const nh = viewerContainer.clientHeight || 460;
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      });
    }

    toggleBtn.addEventListener('click', () => {
      is3DActive = !is3DActive;
      toggleBtn.classList.toggle('active', is3DActive);
      toggleBtn.innerHTML = is3DActive
        ? '<span>🖼️ 2D 실물 사진 보기</span>'
        : '<span>🧊 3D 입체 뷰어</span>';
      stageWrap.classList.toggle('active', is3DActive);

      if (is3DActive) {
        setupThreeProductStage();
        if (updateTextureFn) updateTextureFn();
      }
    });
  }

  function init3DProductViewers() {
    // 1. Product Detail Page Viewer (detail.html)
    const detailViewer = document.querySelector('.detail-image-viewer');
    if (detailViewer) {
      attach3DProductVisualizer(detailViewer, () => {
        const activeDot = detailViewer.querySelector('.slider-dot.active');
        const idx = activeDot ? Number(activeDot.dataset.index || 0) : 0;
        const imgs = detailViewer.querySelectorAll('.slider-slide img');
        const activeImg = imgs[idx] || imgs[0];
        return activeImg ? activeImg.getAttribute('src') : 'image/product_1.jpg';
      });
    }

    // 2. Product Write Page Live Preview Viewer (write.html)
    const writePreviewGallery = document.querySelector('.preview-gallery');
    if (writePreviewGallery) {
      attach3DProductVisualizer(writePreviewGallery, () => {
        const previewImg = document.getElementById('previewMainImage');
        return previewImg ? previewImg.getAttribute('src') : 'image/product_1.jpg';
      });
    }
  }

  function initAll3DWebExperiences() {
    initBackgroundInstancedScene();
    initList3DHeroShowcase();
    init3DProductViewers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll3DWebExperiences);
  } else {
    initAll3DWebExperiences();
  }
})();
