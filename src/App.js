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
        arcade: {
          gravity: { y: 0 },
          debug: false,
        },
      },
      scene: { preload, create, update },
    };

    let ship, asteroids, spaceBack, scoreText;
    let score = 0;

    function preload() {
      this.load.image("space", "space.png");
      this.load.image("ship", "ship.png");
      this.load.image("asteroid", "asteroid.png");
    }

    function create() {
      const { width, height } = this.scale;

      spaceBack = this.add.tileSprite(
        width / 2,
        height / 2,
        width,
        height,
        "space",
      );
      spaceBack.setDisplaySize(width, height);

      ship = this.physics.add.sprite(width * 0.15, height / 2, "ship");

      // КОРАБЕЛЬ ВДВІЧІ МЕНШИЙ (було 100 пікселів, тепер 50)
      const shipScale = 50 / ship.height;
      ship.setScale(shipScale);

      ship.setCollideWorldBounds(true);
      ship.setDamping(true);
      ship.setDragY(0.96);

      asteroids = this.physics.add.group();

      const spawnAst = (x, y) => {
        const ast = asteroids.create(x, y, "asteroid");
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

      this.physics.add.overlap(ship, asteroids, () => {
        score = 0;
        this.scene.restart();
      });
    }

    function update() {
      const { width, height } = this.scale;
      spaceBack.tilePositionX += 2;

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
