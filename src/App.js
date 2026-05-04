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

    let ship, asteroids, spaceBack, planetParallax, stars, scoreText;
    let score = 0;
    const publicBase = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
    const asset = (name) => `${publicBase}/${name}`;

    function preload() {
      this.load.image("space", asset("space.png"));
      this.load.image("planet", asset("planet.png"));
      this.load.image("ship", asset("ship.png"));
      this.load.image("asteroid", asset("asteroid.png"));
    }

    function create() {
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

      planetParallax = this.add.image(width * 0.78, height * 0.26, "planet");
      planetParallax.setDepth(1);
      const planetTargetH = height * 0.36;
      planetParallax.setScale(planetTargetH / planetParallax.height);
      planetParallax.setAlpha(0.82);
      planetParallax.setTint(0x9bb7ff);

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
        star.speed = Phaser.Math.FloatBetween(10, 24);
        star.setDepth(1);
        stars.add(star);
      }

      ship = this.physics.add.sprite(width * 0.15, height / 2, "ship");

      // КОРАБЕЛЬ ВДВІЧІ МЕНШИЙ (було 100 пікселів, тепер 50)
      const shipScale = 50 / ship.height;
      ship.setScale(shipScale);

      ship.setDepth(2);

      ship.setCollideWorldBounds(true);
      ship.setDamping(true);
      ship.setDragY(0.96);

      asteroids = this.physics.add.group();

      const spawnAst = (x, y) => {
        const ast = asteroids.create(x, y, "asteroid");
        ast.setDepth(2);
        ast.body.allowGravity = false;
        const size = Phaser.Math.Between(60, 120);
        ast.setScale(size / ast.height);
        ast.setVelocityX(-400);
        ast.setAngularVelocity(Phaser.Math.Between(-100, 100));
      };

      for (let i = 0; i < 6; i++) {
        spawnAst(width + i * 450, Phaser.Math.Between(50, height - 50));
      }

      // НЕОНОВИЙ РАХУНОК
      scoreText = this.add.text(30, 30, "SCORE: 0", {
        fontSize: "42px",
        fill: "#00ffff", // Неоновий блакитний
        fontFamily: "Arial Black",
        stroke: "#00ffff",
        strokeThickness: 2,
      });
      // Додаємо ефект світіння (shadow)
      scoreText.setShadow(0, 0, "#00ffff", 15, true, true);
      scoreText.setDepth(10);

      this.physics.add.overlap(ship, asteroids, () => {
        score = 0;
        this.scene.restart();
      });
    }

    function update() {
      const { width, height } = this.scale;
      const bgScroll = 16;
      spaceBack.tilePositionX += bgScroll;
      const planetScroll = 0.45;
      planetParallax.x -= planetScroll;
      const halfW = planetParallax.displayWidth * 0.5;
      if (planetParallax.x < -halfW) {
        planetParallax.x = width + halfW + Phaser.Math.Between(80, 280);
        planetParallax.y = Phaser.Math.Between(height * 0.08, height * 0.34);
      }
      stars.getChildren().forEach((star) => {
        star.x -= star.speed;
        if (star.x < -4) {
          star.x = width + Phaser.Math.Between(2, 30);
          star.y = Phaser.Math.Between(0, height);
          star.speed = Phaser.Math.FloatBetween(10, 24);
        }
      });

      const cursors = this.input.keyboard.createCursorKeys();
      const isDown =
        this.input.activePointer.isDown ||
        cursors.space.isDown ||
        cursors.up.isDown;

      if (isDown) {
        ship.setAccelerationY(-1800);
        ship.setTint(0x00ffff); // Неонове підсвічування корабля при тязі
      } else {
        ship.setAccelerationY(1200);
        ship.clearTint();
      }

      ship.angle = ship.body.velocity.y * 0.04;

      asteroids.getChildren().forEach((ast) => {
        if (ast.x < -150) {
          ast.x = width + Phaser.Math.Between(100, 600);
          ast.y = Phaser.Math.Between(50, height - 50);

          score += 1;
          scoreText.setText(`SCORE: ${score}`);

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
