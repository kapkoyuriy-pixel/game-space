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
          gravity: { y: 650 }, // ШВИДКІСТЬ ПАДІННЯ
          debug: false,
        },
      },
      scene: { preload, create, update },
    };

    let ship, asteroids, spaceBack, starfield, cursors;
    let score = 0;
    let scoreText;

    function preload() {
      this.load.image("space", "space.png");
      this.load.image("stars", "stars.png");
      this.load.image("ship", "spaceship.png");
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
      starfield = this.add.tileSprite(
        width / 2,
        height / 2,
        width,
        height,
        "stars",
      );

      ship = this.physics.add.sprite(width * 0.15, height / 2, "ship");
      ship.setScale(height / 450);
      ship.setCollideWorldBounds(true);
      ship.setAngle(90);
      ship.setDamping(true);
      ship.setDragY(0.9); // ІНЕРЦІЯ (0.1 - 0.99)

      asteroids = this.physics.add.group();

      const spawnAst = (x, y, speedY) => {
        const ast = asteroids.create(x, y, "asteroid");
        ast.body.allowGravity = false;
        ast.setImmovable(true);
        ast.setScale(Phaser.Math.FloatBetween(height / 350, height / 180));
        ast.setVelocityX(-450); // ШВИДКІСТЬ ПОТОКУ ВЛІВО
        ast.setVelocityY(speedY); // ШВИДКІСТЬ ВГОРУ/ВНИЗ
        ast.setAngularVelocity(Phaser.Math.Between(-150, 150));
      };

      // ГЕНЕРАЦІЯ ХВИЛЬ
      const generateWave = (startX) => {
        const pattern = Phaser.Math.Between(0, 2);
        const centerY = Phaser.Math.Between(200, height - 200);

        if (pattern === 0) {
          spawnAst(startX, 150, 150); // Одиночний зверху
          spawnAst(startX, height - 150, -150); // Одиночний знизу
        } else if (pattern === 1) {
          for (let i = 0; i < 3; i++) {
            // КУПКА
            spawnAst(startX + i * 60, centerY + i * 50 - 50, 80);
          }
        } else {
          spawnAst(startX, centerY, Phaser.Math.Between(-200, 200));
        }
      };

      for (let i = 0; i < 7; i++) {
        // КІЛЬКІСТЬ ГРУП
        generateWave(width + i * 400);
      }

      scoreText = this.add.text(25, 25, "Score: 0", {
        fontSize: "32px",
        fill: "#ff3333",
        fontWeight: "bold",
      });

      this.physics.add.overlap(ship, asteroids, () => {
        this.scene.restart();
        score = 0;
      });

      cursors = this.input.keyboard.createCursorKeys();
    }

    function update() {
      const { width, height } = this.scale;

      spaceBack.tilePositionX += 1.2;
      starfield.tilePositionX += 4;

      if (cursors.up.isDown || this.input.activePointer.isDown) {
        ship.setAccelerationY(-2400); // СИЛА ТЯГИ ВГОРУ
        ship.setTint(0xff5555);
      } else {
        ship.setAccelerationY(0);
        ship.clearTint();
      }

      ship.angle = 90 + ship.body.velocity.y * 0.05;

      asteroids.getChildren().forEach((ast) => {
        if (ast.x < -150) {
          ast.x = width + Phaser.Math.Between(200, 500);
          ast.y = Phaser.Math.Between(50, height - 50);
          ast.setVelocityY(Phaser.Math.Between(-250, 250));
          score += 1;
          scoreText.setText(`Score: ${Math.floor(score / 3)}`);
        }

        if (ast.y <= 0 || ast.y >= height) {
          ast.body.velocity.y *= -1; // ВІДБИТТЯ ВІД СТЕЛІ/ПІДЛОГИ
        }
      });
    }

    const game = new Phaser.Game(config);
    return () => game.destroy(true);
  }, []);

  return <div className="game-container" ref={gameRef} />;
}

export default App;
