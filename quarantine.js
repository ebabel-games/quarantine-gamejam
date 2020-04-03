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
  
  class GameScene extends Phaser.Scene {
    constructor(key) {
      super(key);
    }

    preload() {
      this.load.tilemapTiledJSON('level1', 'level1.json');
      this.load.spritesheet(
        'RPGpack_sheet',
        'RPGpack_sheet.png',
        { frameWidth: 64, frameHeight: 64 }
      );
    }

    create() {
      this.createMap();
    }

    createMap() {
      this.map = this.make.tilemap({ key: 'level1' });
      this.tiles = this.map.addTilesetImage('RPGpack_sheet');
      this.backgroundLayer = this.map.createStaticLayer('Background', this.tiles, 0, 0);
      this.blockedLayer = this.map.createStaticLayer('Blocked', this.tiles, 0, 0);
    }
  }

  class Game extends Phaser.Game {
    constructor() {
      super(config);
      this.scene.add('Game', GameScene);
      this.scene.start('Game');
    }
  }

  const game = new Game();


  window.quarantine = {
    config,
    Game,
    GameScene,
    game,
  };
}

window.addEventListener('load', initGame);
