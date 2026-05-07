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
      bgMusic,
      crashSound,
      fpsText,
      cursors;
    let isGameStarted = false;
    let isGameOver = false;
    let currentAcceleration = 0;
    let lastAsteroidTime = 0;
    let asteroidPatterns = [];
    let isTurboActivated = false;
    let musicStartTime = 0;
    const publicBase = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
    const asset = (name) => `${publicBase}/${name}`;

    function preload() {
      this.load.image("space", asset("space.png"));
      this.load.image("planet", asset("planet.png"));
      this.load.image("ship", asset("ship.png"));
      this.load.image("asteroid", asset("asteroid.png"));
      this.load.image("asteroid2", asset("asteroid2.png"));

      this.load.audio("bgMusic", asset("music.mp3"));
      this.load.audio("crash", asset("crash.mp3"));
    }

    function create(data) {
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      const isMobile = window.innerWidth < 768;
      const baseScale = isMobile ? Math.min(window.innerWidth / 400, 0.6) : 1.0;
      const uiScale = baseScale * dpr;

      // Скидаємо стан
      isGameStarted = false;
      isGameOver = false;

      isTurboActivated = false; // ОБОВ'ЯЗКОВО СКИДАЄМО ТУТ
      musicStartTime = 0; // ОБОВ'ЯЗКОВО СКИДАЄМО ТУТ

      currentAcceleration = 0;
      lastAsteroidTime = 0;

      const isRestart = data && data.isRestart;

      // Ініціалізація звуків (тільки якщо ще не створені)
      if (!bgMusic)
        bgMusic = this.sound.add("bgMusic", { loop: true, volume: 0.5 });
      if (!crashSound) crashSound = this.sound.add("crash", { volume: 0.6 });

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
      planetParallax.spawnTime = 0;

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
        .setScale((isMobile ? 0.12 : 0.15) * uiScale); // Додано uiScale для чіткості
      ship.body.enable = true;
      //Trail
      // --- 1. СТВОРЕННЯ ТЕКСТУРИ (Малюємо м'яку крапку) ---
      const graphics = this.make.graphics({ x: 0, y: 0, add: false });

      // Зовнішнє коло (аура). 0.4 - це прозорість. Менше = шлейф "худіший"
      graphics.fillStyle(0xffffff, 0.4);
      graphics.fillCircle(8, 8, 8); // Радіус 8 (для текстури 16x16)

      // Внутрішнє коло (ядро). 1 - повна яскравість.
      graphics.fillStyle(0xffffff, 1);
      graphics.fillCircle(8, 8, 3); // Чіткий центр

      graphics.generateTexture("white_dot", 16, 16);

      // --- 2. ПАРАМЕТРИ ПІДЛАШТУВАННЯ (Змінюй тут) ---
      const trailSettings = {
        // Базова ширина: на ПК 0.9, на мобілці менше (0.6), бо там високий DPR
        baseScale: isMobile ? 0.4 : 0.9,

        // Відступ від центру корабля (щоб виходило точно з сопла)
        yOffset: isMobile ? 16 : 30,

        // Час життя часток (мс). Більше = довший шлейф
        lifespan: isMobile ? 200 : 380,

        // Швидкість вильоту вниз (min/max для рандому)
        speedY: isMobile ? 120 : 150,

        // Розкид вбік (0 = ідеально пряма лінія, 10 = широкий факел)
        speedX: 5,

        // Густота: 1 - рідко (диркавий), 10 - дуже густий (як лазер)
        frequency: 6,

        // Кількість часток за один раз
        quantity: 2,
      };

      // --- 3. НАЛАШТУВАННЯ ЕМІТЕРА ---
      ship.thrustEmitter = this.add
        .particles(0, 0, "white_dot", {
          follow: ship,
          followOffset: { x: 0, y: trailSettings.yOffset * dpr },

          lifespan: trailSettings.lifespan,

          // Швидкість множимо на dpr, щоб на телефонах не "гальмувало"
          speedY: {
            min: trailSettings.speedY * dpr,
            max: (trailSettings.speedY + 100) * dpr,
          },

          speedX: {
            min: -trailSettings.speedX * dpr,
            max: trailSettings.speedX * dpr,
          },

          // Множимо базу на dpr для чіткості на Retina/AMOLED екранах
          scale: { start: trailSettings.baseScale * dpr, end: 0 },

          // Прозорість: 0.7 на старті, 0 в кінці (плавне зникнення)
          alpha: { start: 0.7, end: 0 },

          // Кольори: Phaser вибирає рандомно з масиву для кожної частки
          tint: [0xffffff, 0x00ccff, 0x0066ff, 0x0000ff, 0x000088],

          blendMode: "ADD", // Режим накладання (світіння)
          frequency: trailSettings.frequency,
          quantity: trailSettings.quantity,
        })
        .setDepth(11);

      // Фізика з інерцією
      ship
        .setCollideWorldBounds(true)
        .setDamping(true)
        .setDrag(isMobile ? 0.92 : 0.95)
        .setMaxVelocity((isMobile ? 350 : 800) * dpr);

      asteroids = this.physics.add.group();

      //Pattern asteroids
      // =========================
      // ПАТТЕРНИ АСТЕРОЇДІВ
      // =========================

      // 3 лінії:
      // [лівий, центр, правий]
      //
      // 1 = є астероїд
      // 0 = прохід

      asteroidPatterns = [
        [1, 0, 1], // прохід по центру
        [0, 1, 1], // прохід зліва
        [1, 1, 0], // прохід справа

        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],

        [1, 0, 1],
        [0, 1, 0],
      ];

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

      // Функція запуску
      const startCountdown = () => {
        // Музика стартує з самого початку відліку
        if (bgMusic) {
          bgMusic.stop();
          bgMusic.play();
          musicStartTime = this.time.now;
        }

        let count = 3;
        countdownText.setAlpha(1);
        countdownText.setText(count);

        const timer = this.time.addEvent({
          delay: 1000,
          repeat: 4, // Важливо: 4 повтори, щоб вистачило часу на всі фази
          callback: () => {
            if (count > 0) {
              countdownText.setText(count--);
            } else if (count === 0) {
              countdownText.setText("ПОЛЕТІЛИ!");
              count--;
            } else {
              // ОСЬ ТУТ ГРА ЗАПУСКАЄТЬСЯ
              countdownText.setText("");
              isGameStarted = true; // Тепер корабель точно летить
              planetParallax.spawnTime = this.time.now / 1000;
              ship.thrustEmitter.start(); // Вмикаємо вогонь
              timer.destroy();
            }
          },
        });
      };

      // Кнопка START або автозапуск при Restart
      if (isRestart) {
        startCountdown();
      } else {
        const startBtn = this.add
          .text(width / 2, height / 2, "START", {
            fontSize: isMobile ? "50px" : "80px",
            fill: "#00ffff",
            fontFamily: "Arial Black",
            backgroundColor: "#00000088",
            padding: { x: 20, y: 10 },
          })
          .setOrigin(0.5)
          .setDepth(1000)
          .setInteractive({ useHandCursor: true });

        startBtn.on("pointerdown", () => {
          startBtn.destroy();
          startCountdown();
        });
      }

      this.physics.add.overlap(ship, asteroids, () => {
        if (!planetParallax.isWin && isGameStarted && !isGameOver) {
          isGameOver = true; // Блокуємо повторні спрацювання

          // Зупиняємо все
          this.physics.pause();
          ship.thrustEmitter.stop();
          if (bgMusic) bgMusic.stop(); // Музика зупиняється
          if (crashSound) crashSound.play();

          // ПЕРШИЙ СПАЛАХ (Морська хвиля)
          this.cameras.main.flash(200, 0, 255, 255);

          // ДРУГИЙ СПАЛАХ через 250 мс
          this.time.delayedCall(250, () => {
            this.cameras.main.flash(200, 0, 255, 255);
          });

          this.cameras.main.shake(300, 0.02);

          // Кнопка RESTART
          this.time.delayedCall(800, () => {
            const rBtn = this.add
              .text(width / 2, height / 2, "RESTART", {
                fontSize: isMobile ? "45px" : "64px",
                fill: "#ff4444",
                fontFamily: "Arial Black",
                backgroundColor: "#00000088",
                padding: { x: 20, y: 10 },
              })
              .setOrigin(0.5)
              .setDepth(2000)
              .setInteractive({ useHandCursor: true });

            rBtn.on("pointerdown", () => {
              this.scene.restart({ isRestart: true });
            });
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
        const maxAccel = isMobile ? 2.8 : 2.0;
        const accelTime = 3000; // 3 секунды
        const accelSpeed = maxAccel / (accelTime / 16.66);
        if (currentAcceleration < maxAccel)
          currentAcceleration += accelSpeed * dt;

        // 1. Рахуємо час від початку музики
        const elapsed = this.time.now - musicStartTime;

        // 2. Перевіряємо, чи пора робити спалах і прискорювати фон
        if (elapsed > 21000 && !isTurboActivated) {
          isTurboActivated = true;
          this.cameras.main.flash(500, 255, 255, 255); // Білий спалах на пів секунди
        }

        // 3. Створюємо множник швидкості: якщо турбо ввімкнено — швидкість х3
        const speedMultiplier = isTurboActivated ? 3 : 1;

        // 4. ЗАМІСТЬ ТВОЇХ РЯДКІВ СТАВИМО ЦІ:
        spaceBack.tilePositionY -=
          currentAcceleration * (isMobile ? 30 : 65) * dt * speedMultiplier;
        spaceBackSlow.tilePositionY -=
          currentAcceleration * (isMobile ? 6 : 10) * dt * speedMultiplier;

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

        //Pattern asteroids
        // =====================================
        // SPAWN ПАТТЕРНІВ
        // =====================================

        // Інтервал між групами астероїдів
        // Менше = складніше
        // =====================================
        // SPAWN ПАТТЕРНІВ
        // =====================================

        // Інтервал між паттернами
        // Менше = складніше
        const spawnInterval = isMobile ? 2000 : 2000;

        if (this.time.now > lastAsteroidTime + spawnInterval) {
          lastAsteroidTime = this.time.now;

          // 3 лінії
          const lanes = 3;

          // Ширина однієї лінії
          const laneWidth = width / lanes;

          // Випадковий паттерн
          const pattern = Phaser.Math.RND.pick(asteroidPatterns);

          //Єдина швидкість для патернів
          const patternSpeed = isMobile
            ? Phaser.Math.Between(200, 260)
            : Phaser.Math.Between(300, 420);

          // Проходимо по лініях
          pattern.forEach((cell, laneIndex) => {
            // Якщо тут мають бути астероїди
            if (cell === 1) {
              // =========================
              // СКІЛЬКИ АСТЕРОЇДІВ В ЛІНІЇ
              // =========================

              const asteroidCount = isMobile ? 3 : 4;

              for (let j = 0; j < asteroidCount; j++) {
                // =========================
                // МЕЖІ ЛІНІЇ
                // =========================

                const laneStartX = laneWidth * laneIndex;
                const laneEndX = laneStartX + laneWidth;

                // Випадкова позиція В СЕРЕДИНІ ВСІЄЇ ЛІНІЇ
                const spawnX = Phaser.Math.Between(
                  laneStartX + 20 * dpr,
                  laneEndX - 20 * dpr,
                );

                // Невеликий вертикальний розкид
                const spawnY = -100 * dpr - Phaser.Math.Between(0, 120 * dpr);

                // Створення астероїда
                const ast = asteroids.create(
                  spawnX,
                  spawnY,
                  Phaser.Math.RND.pick(["asteroid", "asteroid2"]),
                );

                // =========================
                // РОЗМІРИ
                // =========================

                const astScale =
                  (isMobile
                    ? Phaser.Math.FloatBetween(0.12, 0.2)
                    : Phaser.Math.FloatBetween(0.4, 0.7)) * dpr;

                ast
                  .setScale(astScale)

                  // =========================
                  // ШВИДКІСТЬ
                  // =========================

                  .setVelocityY(patternSpeed)

                  .setDepth(1.5);

                // =========================
                // ХІТБОКС
                // =========================

                ast.body.setCircle((ast.width / dpr) * 0.38);

                // =========================
                // ОБЕРТАННЯ
                // =========================

                ast.setAngularVelocity(Phaser.Math.Between(-80, 80));
              }
            }
          });
        }
      } else if (!planetParallax.isWin) {
        planetParallax.isWin = true;
        currentAcceleration = 0;
        ship.setAcceleration(0).setVelocity(0);

        // ЗУПИНЯЄМО ВИПУСК НОВИХ ЧАСТОК
        if (ship.thrustEmitter) ship.thrustEmitter.stop();

        this.tweens.add({
          targets: ship,
          x: width / 2,
          y: height / 2,
          scale: 0,
          duration: 2000,
          onComplete: () => {
            landingText.setAlpha(1);

// 2. Створюємо кнопку "Круто! Грати ще!!!"
            const winBtn = this.add
              .text(width / 2, height / 2 + 80 * dpr, "Оце Круто! Грати ще!!!", {
                fontSize: isMobile ? "28px" : "40px",
                fill: "#00ffff",
                fontFamily: "Arial Black",
                backgroundColor: "#000000aa",
                padding: { x: 20, y: 10 },
              })
              .setOrigin(0.5)
              .setDepth(2000)
              .setInteractive({ useHandCursor: true });

            // 3. Логіка натискання (перезапуск)
            winBtn.on("pointerdown", () => {
              this.scene.restart({ isRestart: true });
            });

            // Ефект при наведенні (необов'язково)
            winBtn.on("pointerover", () => winBtn.setStyle({ fill: "#ffffff" }));
            winBtn.on("pointerout", () => winBtn.setStyle({ fill: "#00ffff" }));
            
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

