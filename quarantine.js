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
    }

    create() {
      this.scene.start('Game');
    }
  }
  
  class GameScene extends Phaser.Scene {
    constructor(key) {
      super(key);
    }

    create() {
      this.createMap();
      this.createPlayer();

      // Update the camera to follow the player.
      this.cameras.main.startFollow(this.player);
    }

    createMap() {
      this.map = this.make.tilemap({ key: 'level1' });
      this.tiles = this.map.addTilesetImage('RPGpack_sheet');
      this.backgroundLayer = this.map.createStaticLayer('Background', this.tiles, 0, 0);
      this.blockedLayer = this.map.createStaticLayer('Blocked', this.tiles, 0, 0);
    }

    createPlayer() {
      this.map.findObject('Player', (player) => {
        console.log(player);
        this.player = new Player(this, player.x, player.y);
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
