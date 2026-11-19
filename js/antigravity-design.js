/**
 * Antigravity Design Expert Engine (antigravity-design.js)
 * Based on: sickn33/agentic-awesome-skills/skills/antigravity-design-expert/SKILL.md
 *
 * Capabilities:
 * 1. Weightlessness & Glassmorphism Ambient Light Stage
 * 2. 3D CSS Perspective & Interactive Pointer Tilt (rotateX, rotateY, translateZ) + Specular Glare
 * 3. Isometric 3D Spatial Grid Showcase Mode Toggle
 * 4. GSAP + ScrollTrigger Motion Choreography (with 60fps native spring fallback)
 */

(function () {
  'use strict';

  const SPATIAL_MODE_KEY = 'hobak_antigravity_isometric_mode';
  const prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Ambient Background Orbs Injection (Glassmorphism Refraction Backing)
  function injectAmbientStage() {
    if (document.querySelector('.ag-ambient-stage')) return;
    const stage = document.createElement('div');
    stage.className = 'ag-ambient-stage';
    stage.setAttribute('aria-hidden', 'true');
    stage.innerHTML = `
      <div class="ag-orb ag-orb-1"></div>
      <div class="ag-orb ag-orb-2"></div>
      <div class="ag-orb ag-orb-3"></div>
    `;
    document.body.prepend(stage);
  }

  // 2. Inject "✨ 3D 공간 뷰" (Isometric / Spatial Mode) Toggle into Header
  function injectSpatialToggleButton() {
    const navActions = document.querySelector('.hobak-nav-actions');
    if (!navActions || document.getElementById('agSpatialToggleBtn')) return;

    const isIso = sessionStorage.getItem(SPATIAL_MODE_KEY) === 'true';
    if (isIso) {
      document.body.classList.add('ag-isometric-mode');
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'agSpatialToggleBtn';
    btn.className = 'ag-spatial-toggle-btn' + (isIso ? ' active' : '');
    btn.setAttribute('aria-pressed', String(isIso));
    btn.title = 'Antigravity 3D Isometric 공간 뷰 전환';
    btn.innerHTML = `
      <span>✨ 3D 공간 뷰</span>
    `;

    btn.addEventListener('click', () => {
      const active = document.body.classList.toggle('ag-isometric-mode');
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
      sessionStorage.setItem(SPATIAL_MODE_KEY, String(active));
      triggerGridEntranceAnimation();
    });

    navActions.prepend(btn);
  }

  // 3. Attach 3D Perspective Tilt & Specular Glare to Cards
  function bind3DTiltToElement(card, maxTiltDeg = 9, liftZ = 14) {
    if (!card || card.dataset.agTiltBound === 'true') return;
    card.dataset.agTiltBound = 'true';
    card.classList.add('ag-3d-card');

    // Add Specular Glare layer if not present
    if (!card.querySelector(':scope > .ag-glare')) {
      const glare = document.createElement('div');
      glare.className = 'ag-glare';
      card.appendChild(glare);
    }

    if (prefersReducedMotion) return;

    let rafId = null;

    card.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const rect = card.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      const normX = Math.max(-1, Math.min(1, (relX / rect.width) * 2 - 1));
      const normY = Math.max(-1, Math.min(1, (relY / rect.height) * 2 - 1));

      const rotateY = normX * maxTiltDeg;
      const rotateX = -normY * maxTiltDeg;
      const glareX = ((relX / rect.width) * 100).toFixed(1) + '%';
      const glareY = ((relY / rect.height) * 100).toFixed(1) + '%';

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        card.style.setProperty('--glare-x', glareX);
        card.style.setProperty('--glare-y', glareY);

        if (window.gsap) {
          window.gsap.to(card, {
            rotateX,
            rotateY,
            y: -8,
            z: liftZ,
            transformPerspective: 1100,
            duration: 0.35,
            ease: 'power2.out',
            overwrite: 'auto'
          });
        } else {
          card.style.transform = `perspective(1100px) translateY(-8px) translateZ(${liftZ}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
        }
      });
    });

    card.addEventListener('pointerleave', () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (window.gsap) {
        window.gsap.to(card, {
          rotateX: 0,
          rotateY: 0,
          y: 0,
          z: 0,
          duration: 0.55,
          ease: 'expo.out',
          overwrite: 'auto',
          clearProps: 'transform'
        });
      } else {
        card.style.transform = '';
      }
    });
  }

  // 4. Staggered 3D Weightless Entrance Choreography
  function animateCardsEntrance(cards) {
    if (!cards || cards.length === 0) return;

    cards.forEach((card, index) => {
      bind3DTiltToElement(card, 9, 16);

      if (prefersReducedMotion) return;

      if (window.gsap) {
        window.gsap.fromTo(
          card,
          {
            opacity: 0,
            y: 34,
            rotateX: 12,
            scale: 0.96,
            transformPerspective: 1100
          },
          {
            opacity: 1,
            y: 0,
            rotateX: 0,
            scale: 1,
            duration: 0.62,
            delay: Math.min(index * 0.055, 0.45),
            ease: 'power3.out',
            clearProps: 'opacity,rotateX,scale'
          }
        );
      } else {
        card.style.opacity = '0';
        card.style.transform = 'perspective(1100px) translateY(30px) rotateX(10deg) scale(0.96)';
        setTimeout(() => {
          card.style.transition =
            'opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1), transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)';
          card.style.opacity = '1';
          card.style.transform = '';
        }, 35 + Math.min(index * 55, 420));
      }
    });
  }

  function triggerGridEntranceAnimation() {
    const productCards = Array.from(document.querySelectorAll('.product-card'));
    if (productCards.length > 0) {
      animateCardsEntrance(productCards);
    }

    const relatedCards = Array.from(document.querySelectorAll('.related-card'));
    if (relatedCards.length > 0) {
      animateCardsEntrance(relatedCards);
    }
  }

  // 5. Observe Dynamic Grid Renders (Search / Filter / Category Changes)
  function observeDynamicGrids() {
    const targets = [
      document.getElementById('productGrid'),
      document.getElementById('relatedGrid')
    ].filter(Boolean);

    targets.forEach((grid) => {
      grid.classList.add('ag-perspective-stage');
      const observer = new MutationObserver(() => {
        const cards = Array.from(grid.children).filter(
          (el) => el.classList.contains('product-card') || el.classList.contains('related-card')
        );
        animateCardsEntrance(cards);
      });
      observer.observe(grid, { childList: true });
    });
  }

  // 6. Enhance Detail Card, Preview Card, and Sidebar Cards with Spatial Depth
  function enhanceStaticContainers() {
    const detailCard = document.getElementById('detailCard');
    if (detailCard) {
      bind3DTiltToElement(detailCard, 3.2, 8);
      if (!prefersReducedMotion && window.gsap) {
        window.gsap.fromTo(
          detailCard,
          { opacity: 0, y: 28, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.65, ease: 'power3.out' }
        );
      }
    }

    const previewCard = document.querySelector('.preview-detail-card');
    if (previewCard) {
      bind3DTiltToElement(previewCard, 5.5, 12);
    }

    const sidebarCards = document.querySelectorAll('.sidebar-card');
    sidebarCards.forEach((sc) => bind3DTiltToElement(sc, 5, 10));
  }

  // 7. Scroll-Linked Parallax on Ambient Orbs
  function initScrollParallax() {
    if (prefersReducedMotion) return;

    if (window.gsap && window.ScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
    }

    let ticking = false;
    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            const scrollY = window.scrollY || 0;
            const orb1 = document.querySelector('.ag-orb-1');
            const orb2 = document.querySelector('.ag-orb-2');
            if (orb1) orb1.style.transform = `translate3d(0, ${scrollY * 0.12}px, 0)`;
            if (orb2) orb2.style.transform = `translate3d(0, ${-scrollY * 0.08}px, 0)`;
            ticking = false;
          });
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  function initAntigravityDesign() {
    injectAmbientStage();
    injectSpatialToggleButton();
    observeDynamicGrids();
    enhanceStaticContainers();
    triggerGridEntranceAnimation();
    initScrollParallax();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAntigravityDesign);
  } else {
    initAntigravityDesign();
  }
})();
