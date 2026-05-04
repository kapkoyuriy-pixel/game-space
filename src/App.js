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
      render: {
        roundPixels: true,
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: "arcade",
        arcade: {
          gravity: { y: 0 },
          debug: false,
        },
      },
      scene: { preload, create, update },
    };

    let ship,
      asteroids,
      spaceBack,
      planetParallax,
      stars,
      progressBar,
      progressText,
      uiShip,
      planetIcon,
      landingText,
      barX,
      barWidth,
      barHeight;
    let score = 0;
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
      // Сбрасываем глобальные переменные при каждом создании сцены
      score = 0;

      const { width, height } = this.scale;

      this.textures.get("space").setFilter(Phaser.Textures.FilterMode.NEAREST);
      spaceBack = this.add.tileSprite(
        width / 2,
        height / 2,
        width,
        height,
        "space",
      );
      const spaceTexture = this.textures.get("space").getSourceImage();
      const bgScale = Math.max(
        width / spaceTexture.width,
        height / spaceTexture.height,
      );
      spaceBack.setTileScale(bgScale, bgScale);
      spaceBack.setDepth(0);

      planetParallax = this.physics.add.sprite(width / 2, 100, "planet");
      planetParallax.body.allowGravity = false;
      planetParallax.setDepth(1);
      const planetTargetH = height * 3;
      const maxPlanetScale = planetTargetH / planetParallax.height;
      planetParallax.setScale(0.05);
      planetParallax.maxPlanetScale = maxPlanetScale;
      planetParallax.setAlpha(1);
      planetParallax.spawnTime = this.time.now / 1000;
      planetParallax.isWin = false;
      planetParallax.isLanding = false;

      // Рухомий шар зірок для відчуття польоту без шва фону
      stars = this.add.group();
      for (let i = 0; i < 120; i++) {
        const size = Phaser.Math.Between(1, 3);
        const star = this.add.rectangle(
          Phaser.Math.Between(0, width),
          Phaser.Math.Between(0, height),
          size,
          size,
          0xffffff,
          Phaser.Math.FloatBetween(0.35, 1),
        );
        star.speed = Phaser.Math.FloatBetween(20, 48);
        star.setDepth(1);
        stars.add(star);
      }

      ship = this.physics.add.sprite(width / 2, height * 0.85, "ship");

      const shipScale = 125 / ship.height;
      ship.setScale(shipScale);

      ship.setDepth(2);

      ship.setCollideWorldBounds(true);
      ship.setDamping(true);
      ship.setDrag(0.92);

      // Создаем текстуру для огня
      const fireGraphics = this.add.graphics({ x: 0, y: 0 });
      fireGraphics.fillStyle(0xffcc33, 1);
      fireGraphics.fillCircle(12, 12, 12);
      fireGraphics.fillStyle(0xff6600, 0.95);
      fireGraphics.fillCircle(12, 12, 9);
      fireGraphics.fillStyle(0xffffcc, 0.8);
      fireGraphics.fillCircle(12, 12, 5);
      fireGraphics.generateTexture("fire", 24, 24);
      fireGraphics.destroy();

      // Включаем огонь за основным кораблём
      const fireParticles = this.add.particles(0, 0, "fire", {
        frequency: 24,
        quantity: 8,
        speed: { min: 180, max: 280 },
        angle: { min: 80, max: 100 },
        scale: { start: 1.4, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 450,
        gravityY: 0,
        blendMode: "ADD",
      });
      fireParticles.startFollow(ship, 0, ship.displayHeight * 0.65, true);
      fireParticles.setDepth(3);
      ship.fireEmitter = fireParticles;

      asteroids = this.physics.add.group();

      const spawnAst = (x, y) => {
        const asteroidType = Phaser.Math.RND.pick(["asteroid", "asteroid2"]);
        const ast = asteroids.create(x, y, asteroidType);
        ast.setDepth(2);
        ast.body.allowGravity = false;
        const size = Phaser.Math.Between(60, 120);
        ast.setScale(size / ast.height);
        ast.setVelocityY(300);
        ast.setAngularVelocity(Phaser.Math.Between(-100, 100));
      };

      for (let i = 0; i < 6; i++) {
        spawnAst(Phaser.Math.Between(50, width - 50), -150 - i * 400);
      }

      // ПРОГРЕСС БАР
      barWidth = 280;
      barHeight = 10;
      barX = 80;
      const barY = 30;

      // Фоновый прямокутник
      const barBackground = this.add.rectangle(
        barX + barWidth / 2,
        barY + barHeight / 2,
        barWidth,
        barHeight,
        0x000000,
        0.7,
      );
      barBackground.setStrokeStyle(2, 0x00ffff);
      barBackground.setDepth(10);

      // Прогресс-бар заливка
      progressBar = this.add.rectangle(
        barX,
        barY + barHeight / 2,
        0,
        barHeight,
        0x00ffff,
        0.8,
      );
      progressBar.setOrigin(0, 0.5);
      progressBar.setDepth(11);

      // Кораблик слева, движущийся по шкале
      uiShip = this.add.image(barX, barY + barHeight / 2, "ship");
      uiShip.setScale(0.07);
      uiShip.setDepth(12);
      uiShip.setOrigin(0.5, 0.5);
      uiShip.setAngle(90);

      // Планета справа
      planetIcon = this.add.image(
        barX + barWidth + 40,
        barY + barHeight / 2,
        "planet",
      );
      planetIcon.setScale(0.08);
      planetIcon.setDepth(12);
      planetIcon.setOrigin(0.5, 0.5);

      // Текст процентов
      progressText = this.add.text(
        barX + barWidth + 80,
        barY + barHeight / 2,
        "0%",
        {
          fontSize: "18px",
          fill: "#00ffff",
          fontFamily: "Arial Black",
          stroke: "#000000",
          strokeThickness: 2,
        },
      );
      progressText.setOrigin(0, 0.5);
      progressText.setDepth(10);

      landingText = this.add.text(
        width / 2,
        height / 2,
        "Приземлення успішне!",
        {
          fontSize: "64px",
          fill: "#00ff00",
          fontFamily: "Arial Black",
          stroke: "#000000",
          strokeThickness: 6,
        },
      );
      landingText.setOrigin(0.5);
      landingText.setDepth(100);
      landingText.setAlpha(0);

      this.physics.add.overlap(ship, asteroids, () => {
        if (!planetParallax.isWin) {
          this.scene.restart();
        }
      });
    }

    function update() {
      const { width, height } = this.scale;
      const currentTime = this.time.now / 1000; // время в секундах
      // console.log(`Текущее время: ${currentTime.toFixed(2)} сек`); // раскомментируйте для отладки
      const bgScroll = 32;
      spaceBack.tilePositionY -= bgScroll;

      const travelTime = 90;
      const timeSinceSpawn = currentTime - planetParallax.spawnTime;

      if (!planetParallax.isLanding) {
        const progress = Math.min(1, timeSinceSpawn / travelTime);
        const startY = 100;
        const endY = height / 2;

        planetParallax.y = startY + (endY - startY) * progress;

        const minScale = 0.05;
        const currentScale =
          minScale +
          (planetParallax.maxPlanetScale - minScale) * Math.pow(progress, 2);
        planetParallax.setScale(currentScale);

        // Обновляем прогресс-бар
        progressBar.width = barWidth * progress;
        uiShip.x = barX + barWidth * progress;
        progressText.setText(`${Math.round(progress * 100)}%`);

        if (progress >= 1) {
          planetParallax.isLanding = true;
          planetParallax.isWin = true;
          this.physics.pause();

          this.tweens.add({
            targets: ship,
            props: {
              x: { value: width / 2, duration: 1500, ease: "Cubic.easeInOut" },
              y: { value: height / 2, duration: 1500, ease: "Cubic.easeInOut" },
              angle: { value: 720, duration: 3000, ease: "Power2" },
              scale: { value: 0, duration: 3000, ease: "Power2" },
            },
            onComplete: () => {
              landingText.setAlpha(1);

              this.time.delayedCall(3000, () => {
                this.scene.restart();
              });
            },
          });
        }
      }
      stars.getChildren().forEach((star) => {
        star.y += star.speed;
        if (star.y > height + 4) {
          star.x = Phaser.Math.Between(0, width);
          star.y = Phaser.Math.Between(-30, -2);
          star.speed = Phaser.Math.FloatBetween(10, 24);
        }
      });

      const cursors = this.input.keyboard.createCursorKeys();
      let moveX = 0;

      if (cursors.left.isDown) moveX = -1;
      else if (cursors.right.isDown) moveX = 1;

      if (moveX !== 0) ship.setAccelerationX(moveX * 1800);
      else ship.setAccelerationX(0);

      if (moveX !== 0) {
        ship.setTint(0x00ffff);
      } else {
        ship.clearTint();
      }

      ship.angle = ship.body.velocity.x * 0.04;

      // Увеличиваем силу огня при движении корабля
      if (ship.fireEmitter) {
        const speedBoost = Math.abs(ship.body.velocity.x) * 0.1;
        ship.fireEmitter.setConfig({
          speed: { min: 100 + speedBoost, max: 160 + speedBoost },
          quantity: moveX !== 0 ? 5 : 3,
        });
      }

      asteroids.getChildren().forEach((ast) => {
        if (ast.y > height + 150) {
          ast.y = -50;
          ast.x = Phaser.Math.Between(50, width - 50);

          const size = Phaser.Math.Between(60, 120);
          ast.setScale(size / ast.texture.getSourceImage().height);
        }
      });
    }

    const game = new Phaser.Game(config);
    return () => game.destroy(true);
  }, []);

  return <div className="game-container" ref={gameRef} />;
}

export default App;
