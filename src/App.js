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
    };

    let ship,
      asteroids,
      spaceBack,
      spaceBackSlow,
      planetParallax,
      speedLines,
      dustParticles,
      starParticles,
      progressBar,
      uiShip,
      progressText,
      landingText,
      countdownText,
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

      const dot = this.make.graphics({ x: 0, y: 0, add: false });
      dot.fillStyle(0xffffff);
      dot.fillCircle(4, 4, 4);
      dot.generateTexture("fireDot", 8, 8);

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

      speedLines = this.add.group();
      const lineCount = isMobile ? 40 : 150;
      for (let i = 0; i < lineCount; i++) {
        const lineLen = Phaser.Math.Between(height * 0.1, height * 0.33);
        const line = this.add.rectangle(
          Phaser.Math.Between(0, width),
          Phaser.Math.Between(0, height),
          (isMobile ? 0.8 : 1.5) * dpr,
          lineLen,
          0xaa55ff,
          0.8,
        );
        line.setDepth(2.1).setAlpha(0);
        line.speedMult = isMobile
          ? Phaser.Math.FloatBetween(3.0, 5.0)
          : Phaser.Math.FloatBetween(5.0, 9.0);
        speedLines.add(line);
      }

      ship = this.physics.add
        .sprite(width / 2, isMobile ? height * 0.8 : height * 0.85, "ship")
        .setDepth(12)
        .setScale((isMobile ? 0.12 : 0.15) * uiScale);

      // Фізика з інерцією
      ship
        .setCollideWorldBounds(true)
        .setDamping(true)
        .setDrag(isMobile ? 0.92 : 0.95)
        .setMaxVelocity((isMobile ? 350 : 800) * dpr);

      // Яскравий вогонь
      ship.fireEmitter = this.add
        .particles(0, 0, "fireDot", {
          color: [0xffffff, 0x00ffff, 0x0000ff, 0x000000],
          colorEase: "quad.out",
          lifespan: 250,
          angle: { min: 85, max: 95 },
          speed: { min: 300 * dpr, max: 600 * dpr },
          scale: { start: 1.2 * uiScale, end: 0, ease: "sine.in" },
          blendMode: "ADD",
          frequency: 20,
          follow: ship,
          followOffset: { x: 0, y: 30 * uiScale },
          emitting: false,
        })
        .setDepth(11);

      // Маска кольору морської хвилі при дотику
      this.input.on("pointerdown", () => {
        if (isGameStarted && !isGameOver) {
          ship.setTint(0x00ffff);
          this.tweens.add({
            targets: ship,
            scaleX: ship.scaleX * 1.05,
            scaleY: ship.scaleY * 1.05,
            duration: 100,
            yoyo: true,
            ease: "Quad.easeOut",
            onComplete: () => {
              ship.clearTint();
            },
          });
        }
      });

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
          fontSize: `${16 * uiScale}px`,
          fill: "#00ffff",
          fontFamily: "Arial Black",
        })
        .setOrigin(0, 0.5)
        .setDepth(20);
      landingText = this.add
        .text(width / 2, height / 2, "Приземлення успішне!", {
          fontSize: `${(isMobile ? 22 : 64) * dpr}px`,
          fill: "#00ffff",
          fontFamily: "Arial Black",
        })
        .setOrigin(0.5)
        .setDepth(100)
        .setAlpha(0);

      countdownText = this.add
        .text(width / 2, height / 2, "", {
          fontSize: `${isMobile ? 30 * dpr : 120 * dpr}px`,
          fill: "#00ffff",
          fontFamily: "Arial Black",
        })
        .setOrigin(0.5)
        .setDepth(100);

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
            ship.fireEmitter.start();
            planetParallax.spawnTime = this.time.now / 1000;
            timer.destroy();
          }
        },
        repeat: 4,
      });

      this.physics.add.overlap(ship, asteroids, () => {
        if (!planetParallax.isWin && isGameStarted && !isGameOver) {
          isGameOver = true;
          this.cameras.main.flash(500, 0, 255, 255);
          this.physics.pause();
          ship.fireEmitter.stop();
          this.time.delayedCall(1600, () => {
            this.scene.restart();
          });
        }
      });
    }

    function update(time, delta) {
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
        const maxAccel = isMobile ? 1.5 : 2.0;
        const accelSpeed = isMobile ? 0.003 : 0.005;
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
          targetAccelX = (isMobile ? -1200 : -2400) * dpr;
        } else if (
          cursors.right.isDown ||
          (pointer.isDown && pointer.x >= width / 2)
        ) {
          targetAccelX = (isMobile ? 1200 : 2400) * dpr;
        }

        const currentAccelX = ship.body.acceleration.x || 0;
        const smoothAccelX = Phaser.Math.Linear(
          currentAccelX,
          targetAccelX,
          0.15,
        );
        ship.setAccelerationX(smoothAccelX);

        // Поворот залежно від швидкості
        const targetAngle = (ship.body.velocity.x * 0.05) / dpr;
        ship.angle = Phaser.Math.Linear(ship.angle, targetAngle, 0.2);

        speedLines.getChildren().forEach((line) => {
          if (currentAcceleration > 0.1) {
            line.setAlpha(vis * 0.8);
            line.y +=
              currentAcceleration *
              (isMobile ? 250 : 450) *
              line.speedMult *
              dpr *
              dt;
            if (line.y > height) {
              line.y = -height * 0.4;
              line.x = Phaser.Math.Between(0, width);
            }
          } else {
            line.setAlpha(0);
          }
        });

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
          onStart: () => ship.fireEmitter.stop(),
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
