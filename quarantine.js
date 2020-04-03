const initGame = () => {
  const config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    width: 800,
    height: 600,
    pixelArt: true,
    roundPixels: true,
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
      this.load.image('logo', 'logo.png');
    }

    create() {
      this.logo = this.add.image(400, 200, 'logo');
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
