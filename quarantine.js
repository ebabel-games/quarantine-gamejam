const initGame = () => {
  // This formula is based on a 45 degrees angle, to maintain a consistent speed.
  const straightToDiagonalSpeed = (straightSpeed) => Math.ceil(Math.sqrt(Math.pow(straightSpeed, 2)/2));

  const config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    width: 640,
    height: 640,
    pixelArt: true,
    roundPixels: true,
    scale: {  // See https://rexrainbow.github.io/phaser3-rex-notes/docs/site/scalemanager/
      mode: Phaser.Scale.ENVELOP,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false,
      },
    },
  };

  class BootScene extends Phaser.Scene {
    constructor(key) {
      super(key);
    }

    preload() {
      this.levels = {
        1: 'level1',
        2: 'level2',
      };

      Object.keys(this.levels).map((key) => {
        return this.load.tilemapTiledJSON(this.levels[key], `${this.levels[key]}.json`);
      });

      this.load.spritesheet('tiles', 'tiles.png', {frameWidth: 64, frameHeight: 64});
      this.load.image('portal', 'raft.png');
      this.load.image('coin', 'heart.png');
      this.load.image('bullet', 'bullet.png');
    }

    create() {
      this.scene.start('Game', {level: 1, newGame: true, levels: this.levels});
    }
  }

  class GameScene extends Phaser.Scene {
    constructor(key) {
      super(key);

      this.noTileExcluded = [-1];
    }

    init(data) {
      this._LEVEL = data.level;
      this._LEVELS = data.levels;
      this._NEWGAME = data.newGame;
      this.loadingLevel = false;
      if (this._NEWGAME) {
        this.events.emit('newGame');
      }
      this.cameras.main.fadeIn(500, 0, 0, 0);
    }

    create() {
      this.uiScene = this.scene.get('UI');

      // Listen for player input.
      this.cursors = this.input.keyboard.createCursorKeys();
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

      this.createMap();
      this.createPlayer();
      this.createPortal();
      this.createCoins();
      this.createEnemies();
      this.createBullets();

      // Create collisions.
      this.addCollisions();

      // Update the camera to follow the player.
      this.cameras.main.startFollow(this.player);
    }

    update() {
      this.player.update(this.cursors);

      if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        this.bullets.fireBullet(this.player.x, this.player.y, this.player.bulletDirection);
      }
    }

    addCollisions() {
      this.physics.add.collider(this.player, this.blockedLayer);
      this.physics.add.collider(this.enemiesGroup, this.blockedLayer);
      this.physics.add.overlap(this.player, this.enemiesGroup, this.player.enemyCollision.bind(this.player));
      this.physics.add.overlap(this.player, this.portal, this.loadNextLevel.bind(this, false));
      this.physics.add.overlap(this.coinsGroup, this.player, this.coinsGroup.collectCoin.bind(this.coinsGroup));
      this.physics.add.overlap(this.bullets, this.enemiesGroup, this.bullets.enemyCollision);
    }

    createMap() {
      this.add.tileSprite(0, 0, 8000, 8000, 'tiles', 4); // Add water everywhere in the background.

      // Load the current level.
      this.map = this.make.tilemap({ key: this._LEVELS[this._LEVEL] });

      this.tiles = this.map.addTilesetImage('tiles');
      this.backgroundLayer = this.map.createStaticLayer('Background', this.tiles, 0, 0);
      this.blockedLayer = this.map.createStaticLayer('Blocked', this.tiles, 0, 0);

      if (!this.blockedLayer) {
        throw new Error('Map is either missing or does not have a Blocked layer.');
      }

      this.blockedLayer.setCollisionByExclusion(this.noTileExcluded);
    }

    createPlayer() {
      this.map.findObject('Player', (player) => {
        this.player = new Player(this, player.x, player.y);
      });
    }

    createPortal() {
      this.map.findObject('Portal', (portal) => {
        const offsetY = portal.properties.find(item => item.name === 'offsetY').value;
        const portToLevel = portal.properties.find(item => item.name === 'portToLevel').value;
        this.portal = new Portal(this, portal.x, portal.y, offsetY, portToLevel);
      });
    }

    createCoins() {
      this.coins = this.map.createFromObjects('Coins', 'Coin', { key: 'coin' });
      this.coinsGroup = new Coins(this.physics.world, this, [], this.coins);
    }

    createEnemies() {
      this.enemies = this.map.createFromObjects('Enemies', 'Enemy', {});
      this.enemiesGroup = new Enemies(this.physics.world, this, [], this.enemies);
    }

    createBullets() {
      this.bullets = new Bullets(this.physics.world, this, []);
    }

    loadNextLevel(endGame) {
      if (this.loadingLevel) {
        return false;
      }

      this.cameras.main.fade(100, 0, 0, 0);
      this.cameras.main.on('camerafadeoutcomplete', () => {
        if (endGame) {
          this.scene.restart({ level: 1, levels: this._LEVELS, newGame: true });
        } else {
          this.scene.restart({ level: this.portal.portToLevel, levels: this._LEVELS, newGame: false });
        }
      });
      this.loadingLevel = true;
    }
  }

  class UIScene extends Phaser.Scene {
    constructor() {
      super({ key: 'UI', active: true });
    }

    init() {
      this.coinsCollected = 0;
      this.health = 3;
    }

    create() {
      const textStyle = { fontSize: '32px', fill: '#000000' };
      this.scoreText = this.add.text(12, 12, `Score: ${this.coinsCollected}`, textStyle);
      this.healthText = this.add.text(12, 50, `Health: ${this.health}`, textStyle);

      this.gameScene = this.scene.get('Game');

      this.gameScene.events.on('coinCollected', () => {
        this.coinsCollected += 1;
        this.scoreText.setText(`Score: ${this.coinsCollected}`);
      });

      this.gameScene.events.on('loseHealth', () => {
        this.health -= 1;
        this.healthText.setText(`Health: ${this.health}`);
      });

      this.gameScene.events.on('newGame', () => {
        this.coinsCollected = 0;
        this.health = 3;
        this.scoreText.setText(`Score: ${this.coinsCollected}`);
        this.healthText.setText(`Health: ${this.health}`);
      });
    }
  }

  class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
      super(scene, x, y, 'tiles', 11);
      this.scene = scene;
      this.hitDelay = false;
      this.bulletDirection = 'east';

      // Enable physics for the player object.
      this.scene.physics.world.enable(this);

      // Add the player object to the scene.
      this.scene.add.existing(this);

      this.straightSpeed = 150;
      this.diagonalSpeed = straightToDiagonalSpeed(this.straightSpeed);
      this.noSpeed = 0;
    }

    update(cursors) {
      if (cursors.up.isDown) {
        this.setVelocityY(-this.straightSpeed);
        this.bulletDirection = 'north';
      } else if (cursors.down.isDown) {
        this.setVelocityY(this.straightSpeed);
        this.bulletDirection = 'south';
      }
      if (cursors.left.isDown) {
        this.setVelocityX(-this.straightSpeed);
        this.bulletDirection = 'west';
      } else if (cursors.right.isDown) {
        this.setVelocityX(this.straightSpeed);
        this.bulletDirection = 'east';
      }

      if (cursors.up.isDown && cursors.left.isDown) {
        this.setVelocityY(-this.diagonalSpeed);
        this.setVelocityX(-this.diagonalSpeed);
        this.bulletDirection = 'north-west';
      }
      if (cursors.up.isDown && cursors.right.isDown) {
        this.setVelocityY(-this.diagonalSpeed);
        this.setVelocityX(this.diagonalSpeed);
        this.bulletDirection = 'north-east';
      }
      if (cursors.down.isDown && cursors.left.isDown) {
        this.setVelocityY(this.diagonalSpeed);
        this.setVelocityX(-this.diagonalSpeed);
        this.bulletDirection = 'south-west';
      }
      if (cursors.down.isDown && cursors.right.isDown) {
        this.setVelocityY(this.diagonalSpeed);
        this.setVelocityX(this.diagonalSpeed);
        this.bulletDirection = 'south-east';
      }

      if (cursors.up.isUp && cursors.down.isUp) {
        this.setVelocityY(this.noSpeed);
      }
      if (cursors.left.isUp && cursors.right.isUp) {
        this.setVelocityX(this.noSpeed);
      }
    }

    enemyCollision(player, enemy) {
      if (!this.hitDelay) {
        this.loseHealth();
        this.hitDelay = true;
        this.tint = 0x999999;
        this.scene.time.addEvent({
          delay: 1200,
          callback: () => {
            this.hitDelay = false;
            this.tint = 0xffffff;
          },
          callbackScope: this,
        });
      }
    }

    loseHealth() {
      this.scene.events.emit('loseHealth');
      if (this.scene.uiScene.health <= 0) {
        this.scene.loadNextLevel(true);
      }
    }
  }

  class Portal extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, offsetY, portToLevel) {
      super(scene, x, y + offsetY, 'portal');
      this.offsetY = offsetY;
      this.portToLevel = portToLevel;
      this.scene = scene;
      this.scene.physics.world.enable(this);
      this.scene.add.existing(this);
    }
  }

  class Coins extends Phaser.Physics.Arcade.StaticGroup {
    constructor(world, scene, children, spriteArray) {
      super(world, scene, children);
      this.scene = scene;
      this.createCoins(spriteArray);
    }

    createCoins(spriteArray) {
      spriteArray.forEach((coin) => {
        coin.setOrigin(0);
        this.world.enableBody(coin, 1);
        coin.body.setSize(coin.width * coin.scaleX, coin.height * coin.scaleY, true)
        this.add(coin);
      });
      this.refresh();
    }

    collectCoin(player, coin) {
      this.remove(coin);
      coin.destroy();
      this.scene.events.emit('coinCollected');
    }
  }

  class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, frameIndex) {
      super(scene, x, y, 'tiles', frameIndex);

      this.scene = scene;
      this.health = 3;

      this.scene.physics.world.enable(this);
      this.scene.add.existing(this);

      // Move this enemy.
      this.moveEvent = this.scene.time.addEvent({
        delay: Math.ceil(Math.random() * 4000 + 1000),
        callback: this.move,
        loop: true,
        callbackScope: this,
      });
    }

    randomDirection() {
      return Math.ceil(Math.random() * 50 + 50) * (Math.random() >= 0.5 ? 1 : -1);
    }

    move() {
      this.setVelocityX(this.randomDirection());
      this.setVelocityY(this.randomDirection())
      this.scene.time.addEvent({
        delay: 500,
        callback: () => {
          if (this.active) {
            this.setVelocity(0);
          }
        },
        callbackScope: this,
      });
    }

    loseHealth() {
      this.health--;
      this.tint = 0x999999;
      if (this.health <= 0) {
        this.moveEvent.destroy(); // Remove the time event of the enemy object that is about to be destroyed.
        this.destroy();
      } else {
        this.scene.time.addEvent({
          delay: 200,
          callback: () => {
            this.tint = 0xffffff;
          },
        });
      }
    }
  }

  class Enemies extends Phaser.Physics.Arcade.Group {
    constructor(world, scene, children, spriteArray) {
      super(world, scene, children);
      this.scene = scene;
      this.createEnemies(scene, spriteArray);
    }

    createEnemies(scene, spriteArray) {
      spriteArray.forEach((sprite) => {
        const enemy = new Enemy(scene, sprite.x, sprite.y, 10);
        this.add(enemy);
        sprite.destroy();
      });
    }
  }

  class Bullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
      super(scene, x, y, 'bullet');
      this.straightSpeed = 300;
      this.diagonalSpeed = straightToDiagonalSpeed(this.straightSpeed);
    }

    fire(x, y, bulletDirection) {
      this.enableBody(true);
      this.body.reset(x, y);
      this.setActive(true);
      this.setVisible(true);
      this.setPosition(x, y);
      this.scene.physics.add.existing(this);

      switch (bulletDirection) {
        case 'north':
          this.setVelocityY(-this.straightSpeed);
          break;
        case 'south':
          this.setVelocityY(this.straightSpeed);
          break;
        case 'west':
          this.setVelocityX(-this.straightSpeed);
          break;
        case 'north-west':
          this.setVelocityY(-this.diagonalSpeed);
          this.setVelocityX(-this.diagonalSpeed);
          break;
        case 'north-east':
          this.setVelocityY(-this.diagonalSpeed);
          this.setVelocityX(this.diagonalSpeed);
          break;
        case 'south-west':
          this.setVelocityY(this.diagonalSpeed);
          this.setVelocityX(-this.diagonalSpeed);
          break;
        case 'south-east':
          this.setVelocityY(this.diagonalSpeed);
          this.setVelocityX(this.diagonalSpeed);
          break;
        default:  // East.
        this.setVelocityX(this.straightSpeed);
      }

      this.scene.time.addEvent({
        delay: 1500,
        callback: () => {
          this.setActive(false);
          this.setVisible(false);
          if (this.body) {
            this.body.setVelocity(0);
            this.disableBody();
          }
        },
      });
    }
  }

  class Bullets extends Phaser.Physics.Arcade.Group {
    constructor(world, scene, children) {
      super(world, scene);
      this.scene = scene;

      this.createMultiple({
        frameQuantity: 5,
        key: 'bullet',
        active: false,
        visible: false,
        classType: Bullet,
      });
    }

    fireBullet(x, y, bulletDirection) {
      const bullet = this.getFirstDead(false);
      if (bullet) {
        bullet.fire(x, y, bulletDirection);
      }
    }

    enemyCollision(bullet, enemy) {
      bullet.active = false;
      bullet.visible = false;
      bullet.disableBody();
      enemy.loseHealth();
    }
  }

  class Game extends Phaser.Game {
    constructor() {
      super(config);
      this.scene.add('Boot', BootScene);
      this.scene.add('Game', GameScene);
      this.scene.add('UI', UIScene);
      this.scene.start('Boot');
    }
  }

  window.game = new Game();
}

window.addEventListener('load', initGame);
