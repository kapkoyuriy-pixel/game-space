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

      ship = this.physics.add.sprite(width / 2, height * 0.85, "ship");

      const shipScale = 125 / ship.height;
      ship.setScale(shipScale);

      ship.setDepth(2);

      ship.setCollideWorldBounds(true);
      ship.setDamping(true);
      ship.setDragX(0.92);

      asteroids = this.physics.add.group();

      const spawnAst = (x, y) => {
        const ast = asteroids.create(x, y, "asteroid");
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

      // НЕОНОВИЙ РАХУНОК
      scoreText = this.add.text(30, 30, "SCORE: 0", {
        fontSize: "42px",
        fill: "#00ffff",
        fontFamily: "Arial Black",
        stroke: "#00ffff",
        strokeThickness: 2,
      });
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
      spaceBack.tilePositionY += bgScroll;
      const planetScroll = 0.45;
      planetParallax.y += planetScroll;
      const halfH = planetParallax.displayHeight * 0.5;
      if (planetParallax.y > height + halfH) {
        planetParallax.y = -halfH - Phaser.Math.Between(80, 280);
        planetParallax.x = Phaser.Math.Between(width * 0.2, width * 0.8);
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

      if (cursors.left.isDown) {
        moveX = -1;
      } else if (cursors.right.isDown) {
        moveX = 1;
      }

      if (moveX !== 0) {
        ship.setAccelerationX(moveX * 1800);
        ship.setTint(0x00ffff);
      } else {
        ship.setAccelerationX(0);
        ship.clearTint();
      }

      ship.angle = ship.body.velocity.x * 0.04;

      asteroids.getChildren().forEach((ast) => {
        if (ast.y > height + 150) {
          ast.y = -50;
          ast.x = Phaser.Math.Between(50, width - 50);

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
