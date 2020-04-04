const initGame = () => {
  const config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    width: 640,
    height: 640,
    pixelArt: true,
    roundPixels: true,
    scale: {  // See https://rexrainbow.github.io/phaser3-rex-notes/docs/site/scalemanager/
      mode: Phaser.Scale.ENVELOP,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: true,
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

      this.load.spritesheet('RPGpack_sheet', 'RPGpack_sheet.png', {frameWidth: 64, frameHeight: 64});
      this.load.spritesheet('characters', 'roguelikeChar_transparent.png', {frameWidth: 17, frameHeight: 17});
      this.load.image('portal', 'raft.png');
      this.load.image('coin', 'coin_01.png');
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
      this.cameras.main.fadeIn(500, 0, 0, 0);
    }

    create() {
      // Listen for player input.
      this.cursors = this.input.keyboard.createCursorKeys();

      this.createMap();
      this.createPlayer();
      this.createPortal();
      this.createCoins();

      // Update the camera to follow the player.
      this.cameras.main.startFollow(this.player);

      // Create collisions.
      this.addCollisions();
    }

    update() {
      this.player.update(this.cursors);
    }

    addCollisions() {
      this.physics.add.collider(this.player, this.blockedLayer);
      this.physics.add.overlap(this.player, this.portal, this.loadNextLevel.bind(this));
      this.physics.add.overlap(this.coinsGroup, this.player, this.coinsGroup.collectCoin.bind(this.coinsGroup));
    }

    createMap() {
      this.add.tileSprite(0, 0, 8000, 8000, 'RPGpack_sheet', 31); // Add water everywhere in the background.

      // Load the current level.
      this.map = this.make.tilemap({ key: this._LEVELS[this._LEVEL] });

      this.tiles = this.map.addTilesetImage('RPGpack_sheet');
      this.backgroundLayer = this.map.createStaticLayer('Background', this.tiles, 0, 0);
      this.blockedLayer = this.map.createStaticLayer('Blocked', this.tiles, 0, 0);

      if (!this.blockedLayer) {
        throw new Error('Map is either missing or does not have a Blocked layer.');
      }

      this.blockedLayer.setCollisionByExclusion(this.noTileExcluded);
      this.foregroundLayer = this.map.createStaticLayer('Foreground', this.tiles, 0, 0);
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

    loadNextLevel() {
      if (this.loadingLevel) {
        return false;
      }

      this.cameras.main.fade(100, 0, 0, 0);
      this.cameras.main.on('camerafadeoutcomplete', () => {
        this.scene.restart({ level: this.portal.portToLevel, levels: this._LEVELS, newGame: false });
      });
      this.loadingLevel = true;
    }
  }

  class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
      super(scene, x, y, 'characters', 325);
      this.scene = scene;

      // Enable physics for the player object.
      this.scene.physics.world.enable(this);

      // Add the player object to the scene.
      this.scene.add.existing(this);

      // Scale the player tile size.
      this.setScale(4);

      this.straightSpeed = 150;
      this.diagonalSpeed = Math.ceil(Math.sqrt(Math.pow(this.straightSpeed, 2)/2)); // This formula is based on a 45 degrees angle, to maintain a consistent speed.
      this.noSpeed = 0;
    }

    update(cursors) {
      if (cursors.up.isDown) {
        this.setVelocityY(-this.straightSpeed);
      } else if (cursors.down.isDown) {
        this.setVelocityY(this.straightSpeed);
      }
      if (cursors.left.isDown) {
        this.setVelocityX(-this.straightSpeed);
      } else if (cursors.right.isDown) {
        this.setVelocityX(this.straightSpeed);
      }

      if (cursors.up.isDown && cursors.left.isDown) {
        this.setVelocityY(-this.diagonalSpeed);
        this.setVelocityX(-this.diagonalSpeed);
      }
      if (cursors.up.isDown && cursors.right.isDown) {
        this.setVelocityY(-this.diagonalSpeed);
        this.setVelocityX(this.diagonalSpeed);
      }
      if (cursors.down.isDown && cursors.left.isDown) {
        this.setVelocityY(this.diagonalSpeed);
        this.setVelocityX(-this.diagonalSpeed);
      }
      if (cursors.down.isDown && cursors.right.isDown) {
        this.setVelocityY(this.diagonalSpeed);
        this.setVelocityX(this.diagonalSpeed);
      }

      if (cursors.up.isUp && cursors.down.isUp) {
        this.setVelocityY(this.noSpeed);
      }
      if (cursors.left.isUp && cursors.right.isUp) {
        this.setVelocityX(this.noSpeed);
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

      if (!spriteArray || spriteArray.length === 0) {
        return;
      }

      // Add the spriteArray to the group.
      spriteArray.forEach((coin) => {
        coin.setScale(0.2);
        this.add(coin);
      });
    }

    collectCoin(player, coin) {
      this.remove(coin);
      coin.destroy();
    }
  }

  class Game extends Phaser.Game {
    constructor() {
      super(config);
      this.scene.add('Boot', BootScene);
      this.scene.add('Game', GameScene);
      this.scene.start('Boot');
    }
  }

  window.game = new Game();
}

window.addEventListener('load', initGame);
