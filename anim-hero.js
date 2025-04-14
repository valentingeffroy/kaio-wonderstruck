const createDotsCanvas = () => {
  if (window.innerWidth <= 991) return null;

  // Créer le canvas
  const canvas = document.createElement("canvas");
  canvas.className = "absolute top-0 left-0 w-full h-full -z-10";
  const dotsContainer = document.querySelector(".dots-container");

  if (!dotsContainer) {
    console.error("dots-container not found");
    return null;
  }

  // Définir les dimensions
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  dotsContainer.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const config = {
    dotSpacing: 40,
    baseDotRadius: 3,
    maxDotRadius: 12,
    mouseInfluenceRadius: 100,
    headerInfluenceRadius: 1.5,
    activeColor: getComputedStyle(document.documentElement).getPropertyValue(
      "--base-color-brand--dot-active"
    ),
    inactiveColor: getComputedStyle(document.documentElement).getPropertyValue(
      "--base-color-brand--dot-inactive"
    ),
    // glowSize: 15,
    // glowIntensity: 1,
    // glowColor: "#FFE664",
  };

  // Dessiner les dots
  for (let x = config.dotSpacing; x < canvas.width; x += config.dotSpacing) {
    for (let y = config.dotSpacing; y < canvas.height; y += config.dotSpacing) {
      ctx.beginPath();
      ctx.arc(x, y, config.baseDotRadius * 0.2, 0, Math.PI * 2); // Scale initial de 0.2
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.fill();
    }
  }

  canvas.config = config;

  return {
    canvas,
    ctx,
    config,
  };
};

// Créer le canvas et attendre qu'il soit prêt
const canvasSetup = createDotsCanvas();
if (!canvasSetup) {
  console.error("Canvas setup failed");
} else {
  // Effet hover
  const initHoverEffect = (canvas) => {
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const config = canvas.config;
    let mousePosition = { x: -1000, y: -1000 }; // Position initiale hors écran
    let headerBounds = { x: 0, y: 0, width: 0, height: 0 };
    let animationFrame;

    // Stocker les animations en cours pour chaque dot
    const dotAnimations = new Map(); // clé: "x,y", valeur: { tween, baseRadius }

    function getRGBA(color, alpha = 1) {
      if (color === config.activeColor) {
        return '#FFE664'; // Utilisation directe de la couleur hex pour les dots actifs
      }
      
      const tempDiv = document.createElement("div");
      tempDiv.style.color = color;
      document.body.appendChild(tempDiv);
      const computedColor = getComputedStyle(tempDiv).color;
      document.body.removeChild(tempDiv);
    
      const match = computedColor.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
      if (match) {
        return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
      }
      return color;
    }

    function updateHeaderBounds() {
      const header = document.querySelector(".home_hero-wrapper");
      if (!header) return;

      const headerRect = header.getBoundingClientRect();
      headerBounds = {
        x: headerRect.left,
        y: headerRect.top,
        width: headerRect.width,
        height: headerRect.height,
      };
    }

    function drawDot(x, y, radius, color, opacity) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = getRGBA(color, opacity);
      ctx.fill();
    }

    function createDotAnimation(x, y, baseRadius, hoverRadius) {
      const key = `${x},${y}`;
      const existingAnimation = dotAnimations.get(key);

      // Si une animation existe déjà pour ce dot, on la garde
      if (existingAnimation) {
        existingAnimation.hoverRadius = hoverRadius;
        return existingAnimation;
      }

      const dotState = {
        currentRadius: baseRadius, // On démarre de la taille de base
        baseRadius: baseRadius,
        hoverRadius: hoverRadius,
        scale: 0, // On démarre à scale 0
      };

      // Animation initiale rapide avec easing
      gsap.to(dotState, {
        scale: 1,
        duration: 0.4,
        ease: "power2.out",
        onUpdate: () => {
          dotState.currentRadius =
            dotState.baseRadius +
            (dotState.hoverRadius - dotState.baseRadius) * dotState.scale;
        },
      });

      // Animation en boucle avec délai aléatoire
      const timeline = gsap.timeline({
        repeat: -1,
        delay: Math.random() * 2,
        onUpdate: () => {
          dotState.currentRadius =
            dotState.baseRadius +
            (dotState.hoverRadius - dotState.baseRadius) * dotState.scale;
        },
      });

      timeline
        .to(dotState, {
          scale: 1,
          duration: 1,
          ease: "power2.inOut",
        })
        .to(dotState, {
          scale: 0,
          duration: 1,
          ease: "power2.inOut",
        });

      dotState.timeline = timeline;
      dotAnimations.set(key, dotState);
      return dotState;
    }

    function drawDots() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const headerCenterX = headerBounds.x + headerBounds.width / 2;
      const headerCenterY = headerBounds.y + headerBounds.height / 2;
      const headerInfluenceRadius =
        Math.max(headerBounds.width, headerBounds.height) *
        config.headerInfluenceRadius;

      // Stocker les dots actifs pour nettoyer les animations inactives
      const activeDots = new Set();

      for (
        let x = config.dotSpacing;
        x < canvas.width;
        x += config.dotSpacing
      ) {
        for (
          let y = config.dotSpacing;
          y < canvas.height;
          y += config.dotSpacing
        ) {
          const key = `${x},${y}`;
          const distToMouse = Math.sqrt(
            Math.pow(x - mousePosition.x, 2) + Math.pow(y - mousePosition.y, 2)
          );

          const distToHeader = Math.sqrt(
            Math.pow(x - headerCenterX, 2) + Math.pow(y - headerCenterY, 2)
          );

          let baseRadius = config.baseDotRadius;
          let currentColor = config.inactiveColor;

          if (distToMouse < config.mouseInfluenceRadius) {
            const scale = 1 - distToMouse / config.mouseInfluenceRadius;
            const hoverRadius =
              config.baseDotRadius +
              (config.maxDotRadius - config.baseDotRadius) * scale;
            currentColor = config.activeColor;

            // On passe la taille calculée à l'animation
            const dotState = createDotAnimation(
              x,
              y,
              config.baseDotRadius,
              hoverRadius
            );
            activeDots.add(key);

            baseRadius = dotState.currentRadius;
          } else {
            // Si le dot n'est plus survolé, arrêter son animation
            const existingAnimation = dotAnimations.get(key);
            if (existingAnimation) {
              existingAnimation.timeline.kill();
              dotAnimations.delete(key);
            }
          }

          let opacity = 1;
          if (distToHeader < headerInfluenceRadius) {
            opacity = distToHeader / headerInfluenceRadius;
          }

          drawDot(x, y, baseRadius, currentColor, opacity);
        }
      }

      // Nettoyer les animations des dots qui ne sont plus actifs
      for (const [key, animation] of dotAnimations.entries()) {
        if (!activeDots.has(key)) {
          animation.timeline.kill();
          dotAnimations.delete(key);
        }
      }

      animationFrame = requestAnimationFrame(drawDots);
    }

    function handleMouseMove(e) {
      mousePosition = { x: e.clientX, y: e.clientY };
    }

    // Initialisation
    updateHeaderBounds();
    const dotsAnimation = document.querySelector(".dots_animation");
    if (dotsAnimation) {
      dotsAnimation.addEventListener("mousemove", handleMouseMove);
    }
    drawDots();

    return {
      destroy: () => {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
        if (dotsAnimation) {
          dotsAnimation.removeEventListener("mousemove", handleMouseMove);
        }
        // Nettoyer toutes les animations
        dotAnimations.forEach((animation) => animation.timeline.kill());
        dotAnimations.clear();
      },
    };
  };

  // Initialiser l'effet hover
  initHoverEffect(canvasSetup.canvas);

  // Effet random
  const canvas = document.querySelector(".dots-container canvas");
  if (canvas) {
    // Configuration pour l'effet random
    const config = {
      ...canvas.config,
      randomColor: "#A7C6EB",
      dotsPerSecond: 10,
      animationDuration: 0.3,
      fadeOutDuration: 0.5,
    };

    // Créer une grille de points avec leurs états
    const dots = [];
    for (let x = config.dotSpacing; x < canvas.width; x += config.dotSpacing) {
      for (
        let y = config.dotSpacing;
        y < canvas.height;
        y += config.dotSpacing
      ) {
        dots.push({
          x,
          y,
          scale: 1,
          isAnimating: false,
        });
      }
    }

    function animateRandomDot() {
      const randomDot = dots[Math.floor(Math.random() * dots.length)];
      if (randomDot.isAnimating) return;

      randomDot.isAnimating = true;

      // Animation d'apparition
      gsap
        .timeline()
        .to(randomDot, {
          scale: 2,
          duration: config.animationDuration,
          ease: "power2.out",
        })
        .to(randomDot, {
          scale: 1,
          duration: config.fadeOutDuration,
          ease: "power2.inOut",
          onComplete: () => {
            randomDot.isAnimating = false;
          },
        });
    }

    let interval;
    function startRandomAnimation() {
      interval = setInterval(animateRandomDot, 1000 / config.dotsPerSecond);
    }

    const originalDrawDots = canvas.drawDots;
    function drawRandomDots() {
      if (originalDrawDots) {
        originalDrawDots();
      }

      const ctx = canvas.getContext("2d");
      dots.forEach((dot) => {
        if (dot.isAnimating) {
          ctx.beginPath();
          ctx.shadowBlur = config.glowSize;
          ctx.shadowColor = config.glowColor;

          ctx.arc(
            dot.x,
            dot.y,
            config.baseDotRadius * dot.scale,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = config.randomColor;
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.shadowColor = "transparent";
        }
      });

      requestAnimationFrame(drawRandomDots);
    }

    // Gestion de la visibilité de la page
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        startRandomAnimation();
      }
    });

    // Démarrer les animations
    startRandomAnimation();
    drawRandomDots();
  }
}
