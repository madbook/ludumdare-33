
import GameBoard from './game-board';
import autobind from './autobind';
import dieRoll from './die-roll';

import {
  Entity,
  Player,
  Thinger,
  Monster,
  Wall,
  Barrel,
} from './entities';

import levels from './levels';

Array.prototype.each = function() {
  this.forEach.apply(this, arguments);
  return this;
}

const {floor, abs} = Math;


React.initializeTouchEvents(true);
FastClick.attach(document.body);


class Game extends React.Component {
  static get defaultProps() {
    return {
      rows: 5,
      cols: 5,
    };
  }

  constructor(props) {
    super();
    
    let state = {
      turn: 0,
      level: 0,
    };
    this.paused = true;
    this.levels = props.levels;
    this.state = state;
    this.initLevel(state.level, props, state);
    this.renderStep = 'idle';

    const fakeClick = (x, y) => {
      let {x: tileX, y: tileY} = this.player.tile;
      this.handleClick(tileX + x, tileY + y);
      return false;
    }

    window.addEventListener('keydown', (e) => {
      let key = e.keyIdentifier || e.key;

      if (key[1] == '+') {
        if (e.keyCode === 32) {
          key = 'space';
        }
      } 

      switch (key.toLowerCase()) {
        case "up":
          return fakeClick(0, -1);
        case "down":
          return fakeClick(0, 1);
        case "left":
          return fakeClick(-1, 0);
        case "right":
          return fakeClick(1, 0);
        case "space":
          return fakeClick(0, 0);
      }
    })
  }

  initLevel(level, props, state) {
    this.paused = false;
    let levelData = this.levels[level];
    let {rows, cols} = props;
    let playerX = floor(rows / 2);
    let playerY = floor(cols / 2);

    if (!levelData) {
      throw 'no level';
    }

    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
    }

    this.tileList = [];
    this.entityList = [];
    this.tiles = {};
    
    // init tiles
    for (let y = 0; y < cols; y++) {
      for (let x = 0; x < rows; x++) {
        let tile = {
          x, y,
          entity: null,
          occupied: 0,
          variant: dieRoll(6),
          flipBackground: dieRoll(2) === 1,
        };
        this.tileList.push(tile);
        this.tiles[`${x}_${y}`] = tile;
      }
    }

    levelData.each((t) => {
      let {x, y, type} = t;
      let tile = this.getTile(x, y);
      let EntityClass = Entity;

      if (type === 'player' || type === 'player-monster') {
        EntityClass = Player;
      } else if (type === 'wall') {
        EntityClass = Wall;
      } else if (type === 'monster') {
        EntityClass = Monster;
      } else if (type === 'barrel') {
        EntityClass = Barrel;
      } else if (type === 'thinger') {
        EntityClass = Thinger;
      }

      let entity = new EntityClass(tile);

      if (entity instanceof Player) {
        this.player = entity;
        entity.type = type;
      }

      tile.occupied = 1;
      
      this.entityList.push(entity);
    });

    if (this.renderStep === 'new-level') {
      // wut
    } else {
      this.renderStep = 'new-level';
      this.updateStep2(props, state);
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    switch (this.renderStep) {
      case 'idle':
        console.log('>>>> idle step')
        this.renderStep = 'step1';
        this.updateStep1(nextProps, nextState);
        this.renderTimeout = setTimeout(() => this.nextTurn(), 300);
        return true;
      case 'step1':
        console.log('>>>> step1')
        this.renderStep = 'step2';
        this.updateStep2(nextProps, nextState);
        this.renderTimeout = setTimeout(() => this.nextTurn(), 0);
        return true;
      case 'new-level':
        return true;
      case 'step2':
        this.renderStep = 'idle';
        return false;
    }
  }

  updateTiles(props, state) {
    this.updateStep1(props, state);
    this.updateStep2(props, state);
  }

  updateStep1(props, state) {
    let {entityList, tileList} = this;

    console.log('>> reset tile highlights');
    this.player.adjacentTiles(this)
               .each((t) => t.highlightForMove = false);

    console.log('>> tick');
    entityList.slice()
              .each((t) => t.tick(this))
  }

  updateStep2(props, state) {
    let {entityList, tileList} = this;
    
    console.log('>> update');
    entityList.slice()
              .each((t) => t.update(this))
    
    console.log('>> set tile highlights');
    this.player.adjacentTiles(this)
               .each((t) => {
      t.occupied = t.entity ? 1 : 0;
      t.highlightForMove = this.canMove(this.player, t) ?
                           this.getRelativeDirection(this.player.tile, t) : '';
    });

    console.log('>> late update');
    entityList.slice()
              .each((t) => t.lateUpdate(this));

    let thingers = entityList.filter((t) => t.type === 'thinger');

    if (!thingers.length) {
      console.log('no more thingers ~+~+~+~+~+~+~+~')
      this.nextLevel();
    }
  }

  getRelativeDirection(fromTile, toTile) {
    let {x: fx, y: fy} = fromTile;
    let {x: tx, y: ty} = toTile;
    let move = `${tx - fx}_${ty - fy}`;

    switch (move) {
      case '1_0':
        return 'right';
      case '-1_0':
        return 'left';
      case '0_1':
        return 'down';
      case '0_-1':
        return 'up';
      default:
        return '';
    }
  }

  getTile(x, y) {
    return this.tiles[`${x}_${y}`];
  }

  render() {
    let {tileList, handleClick} = this;

    return <GameBoard renderStep={this.renderStep}
                      tiles={tileList}
                      onClick={handleClick} />;
  }

  @autobind
  handleClick(x, y) {
    if (this.paused) {
      return;
    } else if (this.renderStep === 'new-level') {
      this.renderStep = 'idle';
    } else if (this.renderStep !== 'idle') {
      return;
    }

    let {props, player} = this;
    let tile = this.getTile(x, y);

    if (!tile) {
      return;
    }

    if (this.canMove(player, tile)) {
      player.moveTo(tile);
    } else if (tile.entity) {
      // tile.entity.handleClick(this);
    }

    this.nextTurn();
  }

  nextTurn() {
    console.log(`turn ${this.state.turn + 1} =================================`);
    this.setState({
      turn: this.state.turn + 1,
    });
  }

  nextLevel() {
    let level = this.state.level + 1;
    console.log(`level ${level} =================================`);
    this.paused = true;
    this.renderTimeout = setTimeout(() => {
      this.initLevel(level, this.props, this.state);
      this.setState({level});
    }, 500);
  }

  canMove(entity, tile) {
    let entityTile = entity.tile;
    let isAdjacent = this.areTilesAdjacent(entityTile, tile);
    let isOccupied = this.isTileOccupied(tile);
    return isAdjacent && !isOccupied;
  }

  areTilesAdjacent(tile1, tile2) {
    if (!tile1 || !tile2) {
      return false;
    }

    let {x: x1, y: y1} = tile1;
    let {x: x2, y: y2} = tile2;
    let _x = abs(x1 - x2);
    let _y = abs(y1 - y2);

    // change bitwise to OR to allow diagonal movement
    return _x < 2 && _y < 2 && _x ^ _y == 1;
  }

  isTileOccupied(tile) {
    return tile && tile.occupied > 0;
  }
}

let mount = document.getElementById('game');
React.render(<Game levels={levels}/>, mount);
