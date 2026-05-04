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
        .setAlpha(0.1)
        .setBlendMode(Phaser.BlendModes.NORMAL)
        .setTint(0xaaaaaa);

      planetParallax.maxPlanetScale = 0.7;
      planetParallax.isWin = false;

      dustParticles = this.add.group();
      const violetTint = 0xcc99ff;
      for (let i = 0; i < 90; i++) {
        const isLine = Math.random() > 0.5;
        let dust = isLine
          ? this.add.rectangle(
              0,
              0,
              1,
              Phaser.Math.Between(15, 30),
              violetTint,
              0.5,
            )
          : this.add.circle(0, 0, 1.2, violetTint, 0.6);
        dust.setDepth(2).setAlpha(0);
        dust.x = Phaser.Math.Between(0, width);
        dust.y = Phaser.Math.Between(0, height);
        dustParticles.add(dust);
      }

      speedLines = this.add.group();
      for (let i = 0; i < 60; i++) {
        const line = this.add.rectangle(
          Phaser.Math.Between(0, width),
          Phaser.Math.Between(0, height),
          1.2,
          Phaser.Math.Between(50, 100),
          0xffffff,
          0,
        );
        line.setDepth(2.1);
        speedLines.add(line);
      }

      ship = this.physics.add
        .sprite(width / 2, height * 0.85, "ship")
        .setDepth(12)
        .setScale(0.2);
      ship.setCollideWorldBounds(true);
      ship.setDamping(true).setDrag(0.95).setMaxVelocity(700);

      const fireCircle = this.make.graphics({ x: 0, y: 0, add: false });
      fireCircle.fillStyle(0xffffff);
      fireCircle.fillCircle(4, 4, 4);
      fireCircle.generateTexture("fireParticle", 8, 8);

      ship.fireEmitter = this.add
        .particles(0, 0, "fireParticle", {
          speed: { min: 300, max: 600 },
          angle: 90,
          scale: { start: 0.8, end: 0 },
          blendMode: "ADD",
          lifespan: 450,
          follow: ship,
          followOffset: { x: 0, y: 45 },
          color: [0xffff00, 0x00ffff],
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

      landingText = this.add
        .text(width / 2, height / 2, "Приземлення успішне!", {
          fontSize: "64px",
          fill: "#00ffff",
          fontFamily: "Arial Black",
        })
        .setOrigin(0.5)
        .setDepth(100)
        .setAlpha(0);
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
          this.cameras.main.flash(500, 0, 255, 255);
          this.time.delayedCall(50, () => {
            this.physics.pause();
            ship.fireEmitter.stop();
          });
          this.time.delayedCall(700, () => {
            this.cameras.main.flash(500, 0, 255, 255);
          });
          this.time.delayedCall(2000, () => {
            this.scene.restart();
          });
        }
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
        if (currentAcceleration < 1.6) currentAcceleration += 0.005;

        spaceBack.tilePositionY -= currentAcceleration * 55;
        spaceBackSlow.tilePositionY -= currentAcceleration * 8;

        const particlesVisibility =
          currentAcceleration > 0.7 ? currentAcceleration - 0.7 : 0;

        dustParticles.getChildren().forEach((d) => {
          d.setAlpha(particlesVisibility * 0.8);
          d.y += currentAcceleration * 35;
          if (d.y > height) {
            d.y = -30;
            d.x = Phaser.Math.Between(0, width);
          }
        });

        speedLines.getChildren().forEach((line) => {
          if (currentAcceleration > 0.5) {
            line.setAlpha(particlesVisibility * 1.0);
            line.y += currentAcceleration * 200;
            line.displayHeight =
              Phaser.Math.Between(50, 100) * (1 + currentAcceleration * 0.5);
            if (line.y > height) {
              line.y = -150;
              line.x = Phaser.Math.Between(0, width);
            }
          }
        });

        this.cameras.main.setZoom(1 + currentAcceleration * 0.025);

        let planetScaleEffect = 0.005;
        if (progress > 0.07) {
          const adjProgress = (progress - 0.07) / 0.93;
          planetScaleEffect =
            0.005 +
            (planetParallax.maxPlanetScale - 0.005) *
              Math.pow(adjProgress, 1.2);
          planetParallax.setAlpha(Math.min(1, 0.1 + adjProgress * 2));
          const tintVal = Math.floor(0xaa + 0x55 * adjProgress);
          planetParallax.setTint(
            Phaser.Display.Color.GetColor(tintVal, tintVal, tintVal),
          );
        }

        planetParallax.setScale(planetScaleEffect);
        planetParallax.y = height * 0.4 + height * 0.1 * progress;

        progressBar.width = 280 * progress;
        uiShip.x = 80 + 280 * progress;
        progressText.setText(`${Math.round(progress * 100)}%`);

        const cursors = this.input.keyboard.createCursorKeys();
        if (cursors.left.isDown) {
          ship.setAccelerationX(-1800);
          ship.setTint(0x00ffff);
        } else if (cursors.right.isDown) {
          ship.setAccelerationX(1800);
          ship.setTint(0x00ffff);
        } else {
          ship.setAccelerationX(0);
          ship.clearTint();
        }
        ship.angle = ship.body.velocity.x * 0.06;

        // ВЕЛИКІ, АЛЕ РІДКІ МЕТЕОРИТИ
        if (Phaser.Math.Between(0, 100) < 0.8) {
          let spawnX =
            Phaser.Math.Between(0, 10) < 6
              ? ship.x + Phaser.Math.Between(-150, 150)
              : Phaser.Math.Between(100, width - 100);

          spawnX = Phaser.Math.Clamp(spawnX, 100, width - 100);

          const ast = asteroids.create(
            spawnX,
            -200,
            Phaser.Math.RND.pick(["asteroid", "asteroid2"]),
          );
          const randomScale = Phaser.Math.FloatBetween(0.4, 0.8);
          ast
            .setVelocityY(Phaser.Math.Between(200, 400))
            .setScale(randomScale)
            .setDepth(1.5);

          // Круглий хітбокс для великого астероїда
          ast.body.setCircle(ast.width * 0.4);
          ast.setAngularVelocity(Phaser.Math.Between(-50, 50));
        }
      } else if (!planetParallax.isWin) {
        planetParallax.isWin = true;
        currentAcceleration = 0;
        ship.setAcceleration(0).setVelocity(0);
        ship.clearTint();
        speedLines.getChildren().forEach((l) => l.setVisible(false));
        dustParticles.getChildren().forEach((d) => d.setVisible(false));
        this.cameras.main.setZoom(1);
        planetParallax.setTint(0xffffff).setAlpha(1);

        this.tweens.add({
          targets: ship,
          x: width / 2,
          y: height / 2,
          scale: 0,
          duration: 2000,
          ease: "Power2",
          onStart: () => ship.fireEmitter.stop(),
          onComplete: () => {
            landingText.setAlpha(1);
          },
        });
      }
      asteroids.getChildren().forEach((a) => {
        if (a.y > height + 200) a.destroy();
      });
    }

    const game = new Phaser.Game(config);
    return () => game.destroy(true);
  }, []);

  return <div className="game-container" ref={gameRef} />;
}

export default App;
