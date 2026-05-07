/* eslint-disable */
import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
import "./App.css";

function App() {
  const gameRef = useRef(null);

  useEffect(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const config = {
      type: Phaser.AUTO,
      parent: gameRef.current,
      canvasStyle: "width: 100%; height: 100%;",
      pixelArt: false, // Для плавної графіки
      antialias: true,
      antialiasGL: true, // Покращує чіткість на нових мобілках
      roundPixels: true, // Змушує об'єкти чітко ставати в сітку пікселів (як у ГД)
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: window.innerWidth * dpr,
        height: window.innerHeight * dpr,
      },
      physics: {
        default: "arcade",
        arcade: { gravity: { y: 0 }, debug: false },
      },
      scene: { preload, create, update },
      render: {
        pixelArt: false,
        antialias: true,
        roundPixels: true,
      },
    };

    let ship,
      asteroids,
      spaceBack,
      spaceBackSlow,
      planetParallax,
      dustParticles,
      starParticles,
      progressBar,
      uiShip,
      progressText,
      landingText,
      countdownText,
      fpsText,
      cursors;
    let isGameStarted = false;
    let isGameOver = false;
    let currentAcceleration = 0;
    let lastAsteroidTime = 0;
    const publicBase = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
    const asset = (name) => `${publicBase}/${name}`;

    function preload() {
      this.load.image("space", asset("space.png"));
      this.load.image("planet", asset("planet.png"));
      this.load.image("ship", asset("ship.png"));
      this.load.image("asteroid", asset("asteroid.png"));
      this.load.image("asteroid2", asset("asteroid2.png"));
    }

    function create() {
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      const isMobile = window.innerWidth < 768;
      const baseScale = isMobile ? Math.min(window.innerWidth / 400, 0.6) : 1.0;
      const uiScale = baseScale * dpr;

      isGameStarted = false;
      isGameOver = false;
      currentAcceleration = 0;
      lastAsteroidTime = 0;
      cursors = this.input.keyboard.createCursorKeys();

      spaceBackSlow = this.add
        .tileSprite(width / 2, height / 2, width, height, "space")
        .setDepth(0);
      spaceBack = this.add
        .tileSprite(width / 2, height / 2, width, height, "space")
        .setAlpha(0.05)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(0.1);

      planetParallax = this.physics.add
        .sprite(width / 2, height * 0.4, "planet")
        .setDepth(1)
        .setScale(0.005)
        .setAlpha(0.3)
        .setTint(0xaaaaaa);
      planetParallax.maxPlanetScale = width / planetParallax.width;
      planetParallax.isWin = false;

      dustParticles = this.add.group();
      for (let i = 0; i < (isMobile ? 10 : 120); i++) {
        let dust = this.add.circle(
          Phaser.Math.Between(0, width),
          Phaser.Math.Between(0, height),
          0.8 * dpr,
          0xbc88ff,
          0.7,
        );
        dust.setDepth(2).setAlpha(0);
        dust.speedMult = Phaser.Math.FloatBetween(1.5, 4.0);
        dustParticles.add(dust);
      }

      ship = this.physics.add
        .sprite(width / 2, isMobile ? height * 0.8 : height * 0.85, "ship")
        .setDepth(12)
        .setScale(isMobile ? 0.12 : 0.15);

      //Trail
      // --- СТВОРЕННЯ М'ЯКОЇ КРАПКИ ---
      const graphics = this.make.graphics({ x: 0, y: 0, add: false });
      graphics.fillStyle(0xffffff, 0.3);
      graphics.fillCircle(4, 4, 4);
      graphics.fillStyle(0xffffff, 0.8);
      graphics.fillCircle(4, 4, 2);
      graphics.generateTexture("white_dot", 8, 8);

      // --- НАЛАШТУВАННЯ ЕМІТЕРА ---
      ship.thrustEmitter = this.add.particles(0, 0, "white_dot", {
        follow: ship,
        followOffset: { x: 0, y: 30 * dpr },

        // ДЕ МІНЯТИ ДОВЖИНУ:
        lifespan: 380, // Збільшуй це число (напр. до 600), щоб шлейф став ще довшим
        speedY: { min: 150, max: 250 }, // Швидкість вниз (теж впливає на довжину)

        speedX: { min: -5, max: 5 },
        scale: { start: 1.8 * dpr, end: 0 },
        alpha: { start: 0.7, end: 0 },

        // Кольори (більше синього, мало білого)
        tint: [0xffffff, 0x00ccff, 0x0066ff, 0x0000ff, 0x000088],

        blendMode: "ADD",
        frequency: 6,
        quantity: 2,
      });

      // Фізика з інерцією
      ship
        .setCollideWorldBounds(true)
        .setDamping(true)
        .setDrag(isMobile ? 0.92 : 0.95)
        .setMaxVelocity((isMobile ? 350 : 800) * dpr);

      asteroids = this.physics.add.group();

      const barWidth = isMobile ? width * 0.5 : 280 * dpr;
      const barX = (isMobile ? 20 : 80) * dpr;
      const barY = (isMobile ? 15 : 30) * dpr;
      const barHeight = (isMobile ? 4 : 8) * dpr;

      this.add
        .rectangle(
          barX + barWidth / 2,
          barY + 5,
          barWidth,
          barHeight,
          0x000000,
          0.5,
        )
        .setStrokeStyle(1 * dpr, 0x00ffff)
        .setDepth(20);
      progressBar = this.add
        .rectangle(barX, barY + 5, 0, barHeight, 0x00ffff)
        .setOrigin(0, 0.5)
        .setDepth(21);
      uiShip = this.add
        .image(barX, barY + 5, "ship")
        .setScale(0.05 * uiScale)
        .setAngle(90)
        .setDepth(22);
      this.add
        .image(barX + barWidth + 25 * dpr, barY + 5, "planet")
        .setScale(0.015 * uiScale)
        .setDepth(22);
      progressText = this.add
        .text(barX + barWidth + 40 * dpr, barY + 5, "0%", {
          fontSize: `${isMobile ? 14 : 16}px`,
          fill: "#00ffff",
          fontFamily: "Arial Black",
        })
        .setOrigin(0, 0.5)
        .setDepth(20)
        .setResolution(dpr);

      landingText = this.add
        .text(width / 2, height / 2, "Приземлення успішне!", {
          fontSize: `${Math.min(width * 0.08, isMobile ? 28 : 64)}px`,
          wordWrap: { width: width * 0.9 },
          align: "center",
          fill: "#00ffff",
          fontFamily: "Arial Black",
        })
        .setOrigin(0.5)
        .setDepth(100)
        .setAlpha(0)
        .setResolution(dpr);

      countdownText = this.add
        .text(width / 2, height / 2, "", {
          fontSize: `${Math.min(width * 0.2, isMobile ? 60 : 120)}px`,
          fill: "#00ffff",
          fontFamily: "Arial Black",
        })
        .setOrigin(0.5)
        .setDepth(100)
        .setResolution(dpr);

      let count = 3;
      const timer = this.time.addEvent({
        delay: 1000,
        callback: () => {
          if (count > 0) countdownText.setText(count--);
          else if (count === 0) {
            countdownText.setText("ПОЛЕТІЛИ!");
            count--;
          } else {
            countdownText.destroy();
            isGameStarted = true;
            planetParallax.spawnTime = this.time.now / 1000;
            timer.destroy();
          }
        },
        repeat: 4,
      });

      this.physics.add.overlap(ship, asteroids, () => {
        if (!planetParallax.isWin && isGameStarted && !isGameOver) {
          isGameOver = true;
          this.cameras.main.flash(400, 0, 255, 255);
          this.cameras.main.shake(300, 0.01);

          this.time.delayedCall(450, () => {
            this.cameras.main.flash(600, 0, 255, 255);
            this.cameras.main.shake(400, 0.015);
          });
          this.physics.pause();
          this.time.delayedCall(1600, () => {
            this.scene.restart();
          });
        }
      });

      //FPS
      // В create() знайдеш місце, де створюєш fpsText:

      const fpsFontSize = isMobile ? 8 * dpr : 20 * dpr;
      const fpsOffsetY = isMobile ? 2 * dpr : 2 * dpr; // 2 * dpr підніме майже до самої рамки

      fpsText = this.add
        .text(width - 5 * dpr, fpsOffsetY, "FPS: 60", {
          fontSize: `${fpsFontSize}px`,
          fill: "#00ff00",
          fontFamily: "Arial",
          fontWeight: "bold",
        })
        .setOrigin(1, 0) // Правий верхній кут тексту стає точкою відліку
        .setDepth(1000)
        .setScrollFactor(0)
        .setResolution(dpr);
    }

    function update(time, delta) {
      if (fpsText) {
        fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);
      }

      if (!isGameStarted || isGameOver) return;
      const dt = Math.min(delta / 16.66, 2);
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      const isMobile = window.innerWidth < 768;

      const progress = Math.min(
        1,
        (this.time.now / 1000 - planetParallax.spawnTime) / 90,
      );

      if (progress < 1) {
        const maxAccel = 2.0;
        const accelTime = 3000; // 3 секунды
        const accelSpeed = maxAccel / (accelTime / 16.66);
        if (currentAcceleration < maxAccel)
          currentAcceleration += accelSpeed * dt;

        spaceBack.tilePositionY -=
          currentAcceleration * (isMobile ? 30 : 65) * dt;
        spaceBackSlow.tilePositionY -=
          currentAcceleration * (isMobile ? 6 : 10) * dt;

        const vis =
          currentAcceleration > 0.05
            ? Math.min(1, (currentAcceleration - 0.05) * 2.5)
            : 0;

        dustParticles.getChildren().forEach((d) => {
          d.setAlpha(vis * 0.9);
          d.y += currentAcceleration * (isMobile ? 30 : 60) * d.speedMult * dt;
          if (d.y > height) {
            d.y = -20;
            d.x = Phaser.Math.Between(0, width);
          }
        });

        // Плавне керування з інтерполяцією (як у ГД)
        let targetAccelX = 0;
        const pointer = this.input.activePointer;
        if (cursors.left.isDown || (pointer.isDown && pointer.x < width / 2)) {
          targetAccelX = (isMobile ? -1000 : -2400) * dpr;
        } else if (
          cursors.right.isDown ||
          (pointer.isDown && pointer.x >= width / 2)
        ) {
          targetAccelX = (isMobile ? 1000 : 2400) * dpr;
        }

        const currentAccelX = ship.body.acceleration.x || 0;
        const smoothAccelX = Phaser.Math.Linear(
          currentAccelX,
          targetAccelX,
          0.15,
        );
        ship.setAccelerationX(smoothAccelX);

        // Поворот залежно від швидкості
        // Вибираємо 0.10 для мобілки і 0.05 для ПК
        const angleSensitivity = isMobile ? 0.1 : 0.05;
        const targetAngle = (ship.body.velocity.x * angleSensitivity) / dpr;
        ship.angle = Phaser.Math.Linear(ship.angle, targetAngle, 0.2);

        if (progress > 0.07) {
          const adj = (progress - 0.07) / 0.93;
          planetParallax.setScale(
            0.005 * dpr +
              (planetParallax.maxPlanetScale - 0.005 * dpr) *
                Math.pow(adj, 2.5),
          );
          planetParallax.setAlpha(Math.min(1, 0.3 + adj * 2));
        }
        planetParallax.y = height * 0.4 + height * 0.1 * progress;

        const barWidth = isMobile ? width * 0.5 : 280 * dpr;
        const barX = (isMobile ? 20 : 80) * dpr;
        progressBar.width = barWidth * progress;
        uiShip.x = barX + barWidth * progress;
        progressText.setText(`${Math.round(progress * 100)}%`);

        const spawnInterval = isMobile ? 650 : 350;
        if (this.time.now > lastAsteroidTime + spawnInterval) {
          lastAsteroidTime = this.time.now;
          let spawnX = Phaser.Math.Between(30 * dpr, width - 30 * dpr);
          const ast = asteroids.create(
            spawnX,
            -100 * dpr,
            Phaser.Math.RND.pick(["asteroid", "asteroid2"]),
          );
          const astScale =
            (isMobile
              ? Phaser.Math.FloatBetween(0.1, 0.2)
              : Phaser.Math.FloatBetween(0.4, 0.7)) * dpr;
          ast
            .setVelocityY(
              isMobile
                ? Phaser.Math.Between(150, 300)
                : Phaser.Math.Between(250, 500),
            )
            .setScale(astScale)
            .setDepth(1.5);
          ast.body.setCircle((ast.width / dpr) * 0.35);
          ast.setAngularVelocity(Phaser.Math.Between(-50, 50));
        }
      } else if (!planetParallax.isWin) {
        planetParallax.isWin = true;
        currentAcceleration = 0;
        ship.setAcceleration(0).setVelocity(0);
        this.tweens.add({
          targets: ship,
          x: width / 2,
          y: height / 2,
          scale: 0,
          duration: 2000,
          onComplete: () => {
            landingText.setAlpha(1);
          },
        });
      }
      asteroids.getChildren().forEach((a) => {
        if (a.y > height + 200 * dpr) a.destroy();
      });
    }

    const game = new Phaser.Game(config);
    return () => game.destroy(true);
  }, []);

  return <div className="game-container" ref={gameRef} />;
}

export default App;
