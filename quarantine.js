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
      this.load.tilemapTiledJSON('level1', 'level1.json');
      this.load.spritesheet('RPGpack_sheet', 'RPGpack_sheet.png', {frameWidth: 64, frameHeight: 64});
      this.load.spritesheet('characters', 'roguelikeChar_transparent.png', {frameWidth: 17, frameHeight: 17});
      this.load.image('portal', 'raft.png');
    }

    create() {
      this.scene.start('Game');
    }
  }
  
  class GameScene extends Phaser.Scene {
    constructor(key) {
      super(key);

      this.noTileExcluded = [-1];
    }

    create() {
      // Listen for player input.
      this.cursors = this.input.keyboard.createCursorKeys();

      this.createMap();
      this.createPlayer();
      this.createPortal();

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
    }

    createMap() {
      this.add.tileSprite(0, 0, 8000, 8000, 'RPGpack_sheet', 31); // Add water everywhere in the background.
      this.map = this.make.tilemap({ key: 'level1' });
      this.tiles = this.map.addTilesetImage('RPGpack_sheet');
      this.backgroundLayer = this.map.createStaticLayer('Background', this.tiles, 0, 0);
      this.blockedLayer = this.map.createStaticLayer('Blocked', this.tiles, 0, 0);
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
        this.portal = new Portal(this, portal.x, portal.y)
      });
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

      this.straightSpeed = 300;
      this.diagonalSpeed = 200;
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
    constructor(scene, x, y) {
      super(scene, x, y - 68, 'portal');
      this.scene = scene;
      this.scene.physics.world.enable(this);
      this.scene.add.existing(this);
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
