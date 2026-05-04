/* eslint-disable */
import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
import "./App.css";

function App() {
  const gameRef = useRef(null);

  useEffect(() => {
    const config = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: gameRef.current,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
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
      progressBar,
      uiShip,
      progressText,
      landingText,
      countdownText;
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
      const { width, height } = this.scale;

      isGameStarted = false;
      isGameOver = false;
      currentAcceleration = 0;
      lastAsteroidTime = 0;

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
      planetParallax.maxPlanetScale = 0.7;
      planetParallax.isWin = false;

      dustParticles = this.add.group();
      for (let i = 0; i < 200; i++) {
        let dust = this.add.circle(
          Phaser.Math.Between(0, width),
          Phaser.Math.Between(0, height),
          1.1,
          0xbc88ff,
          0.9,
        );
        dust.setDepth(2).setAlpha(0);
        dust.speedMult = Phaser.Math.FloatBetween(0.8, 2.5);
        dustParticles.add(dust);
      }

      speedLines = this.add.group();
      for (let i = 0; i < 120; i++) {
        const line = this.add.rectangle(
          Phaser.Math.Between(0, width),
          Phaser.Math.Between(0, height),
          1.2,
          Phaser.Math.Between(120, 250),
          0x9933ff,
          0.6,
        );
        line.setDepth(2.1);
        line.setAlpha(0);
        line.speedMult = Phaser.Math.FloatBetween(2.5, 4.5);
        speedLines.add(line);
      }

      ship = this.physics.add
        .sprite(width / 2, height * 0.85, "ship")
        .setDepth(12)
        .setScale(0.2);
      ship
        .setCollideWorldBounds(true)
        .setDamping(true)
        .setDrag(0.95)
        .setMaxVelocity(800);

      ship.fireEmitter = this.add
        .particles(0, 0, "fireDot", {
          color: [0xffffff, 0x00ffff, 0x0000ff, 0x000000],
          colorEase: "quad.out",
          lifespan: 300,
          angle: { min: 85, max: 95 },
          speed: { min: 400, max: 800 },
          scale: { start: 1.5, end: 0, ease: "sine.in" },
          blendMode: "ADD",
          follow: ship,
          followOffset: { x: 0, y: 40 },
          emitting: false,
        })
        .setDepth(11);

      asteroids = this.physics.add.group();

      const barX = 80;
      const barY = 30;
      this.add
        .rectangle(barX + 140, barY + 5, 280, 10, 0x000000, 0.5)
        .setStrokeStyle(2, 0x00ffff)
        .setDepth(20);
      progressBar = this.add
        .rectangle(barX, barY + 5, 0, 10, 0x00ffff)
        .setOrigin(0, 0.5)
        .setDepth(21);
      uiShip = this.add
        .image(barX, barY + 5, "ship")
        .setScale(0.05)
        .setAngle(90)
        .setDepth(22);
      this.add
        .image(barX + 310, barY + 5, "planet")
        .setScale(0.025)
        .setDepth(22);

      progressText = this.add
        .text(barX + 340, barY + 5, "0%", {
          fontSize: "22px",
          fill: "#00ffff",
          fontFamily: "Arial Black",
        })
        .setOrigin(0, 0.5)
        .setDepth(20);

      // Повернення фінального напису
      landingText = this.add
        .text(width / 2, height / 2, "Приземлення успішне!", {
          fontSize: "64px",
          fill: "#00ffff",
          fontFamily: "Arial Black",
        })
        .setOrigin(0.5)
        .setDepth(100)
        .setAlpha(0);

      // Повернення початкового зворотного відліку
      countdownText = this.add
        .text(width / 2, height / 2, "", {
          fontSize: "120px",
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
            if (countdownText) countdownText.destroy();
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
          this.cameras.main.flash(400, 0, 255, 255);
          this.physics.pause();
          ship.fireEmitter.stop();
          this.time.delayedCall(1000, () => {
            this.scene.restart();
          });
        }
      });

      this.scale.on("resize", (gameSize) => {
        const { width, height } = gameSize;
        spaceBack.setPosition(width / 2, height / 2).setSize(width, height);
        spaceBackSlow.setPosition(width / 2, height / 2).setSize(width, height);
        ship.setX(width / 2);
        landingText.setPosition(width / 2, height / 2);
      });
    }

    function update() {
      if (!isGameStarted || isGameOver) return;
      const { width, height } = this.scale;
      const progress = Math.min(
        1,
        (this.time.now / 1000 - planetParallax.spawnTime) / 90,
      );

      if (progress < 1) {
        if (currentAcceleration < 2.0) currentAcceleration += 0.006;
        spaceBack.tilePositionY -= currentAcceleration * 65;
        spaceBackSlow.tilePositionY -= currentAcceleration * 10;

        const vis =
          currentAcceleration > 0.4
            ? Math.min(1, (currentAcceleration - 0.4) * 2)
            : 0;

        dustParticles.getChildren().forEach((d) => {
          d.setAlpha(vis * 0.9);
          d.y += currentAcceleration * 55 * d.speedMult;
          if (d.y > height) {
            d.y = -20;
            d.x = Phaser.Math.Between(0, width);
          }
        });

        speedLines.getChildren().forEach((line) => {
          if (currentAcceleration > 0.6) {
            line.setAlpha(vis * 0.7);
            line.y += currentAcceleration * 340 * line.speedMult;
            if (line.y > height) {
              line.y = -250;
              line.x = Phaser.Math.Between(0, width);
            }
          } else {
            line.setAlpha(0);
          }
        });

        if (progress > 0.07) {
          const adj = (progress - 0.07) / 0.93;
          planetParallax.setScale(
            0.005 +
              (planetParallax.maxPlanetScale - 0.005) * Math.pow(adj, 1.2),
          );
          planetParallax.setAlpha(Math.min(1, 0.3 + adj * 2));
        }
        planetParallax.y = height * 0.4 + height * 0.1 * progress;

        progressBar.width = 280 * progress;
        uiShip.x = 80 + 280 * progress;
        progressText.setText(`${Math.round(progress * 100)}%`);

        const cursors = this.input.keyboard.createCursorKeys();
        const pointer = this.input.activePointer;

        if (cursors.left.isDown || (pointer.isDown && pointer.x < width / 2)) {
          ship.setAccelerationX(-2400);
        } else if (
          cursors.right.isDown ||
          (pointer.isDown && pointer.x >= width / 2)
        ) {
          ship.setAccelerationX(2400);
        } else {
          ship.setAccelerationX(0);
        }

        ship.angle = ship.body.velocity.x * 0.07;

        // СПАВН: Ще на 10% легше (збільшено інтервал до 340мс)
        if (this.time.now > lastAsteroidTime + 340) {
          lastAsteroidTime = this.time.now;
          let spawnX = Phaser.Math.Between(50, width - 50);
          const shipX = ship.x;
          const safeZone = 160;

          if (Math.abs(spawnX - shipX) < safeZone) {
            spawnX = spawnX < shipX ? spawnX - safeZone : spawnX + safeZone;
          }

          const ast = asteroids.create(
            Phaser.Math.Clamp(spawnX, 50, width - 50),
            -150,
            Phaser.Math.RND.pick(["asteroid", "asteroid2"]),
          );
          ast
            .setVelocityY(Phaser.Math.Between(300, 600))
            .setScale(Phaser.Math.FloatBetween(0.4, 0.75))
            .setDepth(1.5);
          ast.body.setCircle(ast.width * 0.4);
          ast.setAngularVelocity(Phaser.Math.Between(-60, 60));
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
        if (a.y > height + 250) a.destroy();
      });
    }

    const game = new Phaser.Game(config);
    return () => game.destroy(true);
  }, []);

  return (
    <div
      className="game-container"
      ref={gameRef}
      style={{ touchAction: "none" }}
    />
  );
}

export default App;
