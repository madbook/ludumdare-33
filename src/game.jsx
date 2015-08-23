
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
    
    let {rows, cols} = props;
    let playerX = floor(rows / 2);
    let playerY = floor(cols / 2);
    let state = {
      turn: 0,
    };

    this.state = state;
    this.tileList = [];
    this.tiles = {};
    this.renderStep = 'idle';
    
    // init tiles
    for (let y = 0; y < cols; y++) {
      for (let x = 0; x < rows; x++) {
        let tile = {x, y, entity: null, occupied: 0, variant: dieRoll(4)};
        this.tileList.push(tile);
        this.tiles[`${x}_${y}`] = tile;
      }
    }

    this.entityList = [];
    this.player = new Player(this.getTile(playerX, playerY));

    // add the player to the entityList
    this.entityList.push(this.player);

    let addSomeEntities = (n, EntityClass) => {
      // add some thingers to entity list
      for (let i = 0; i < n; i++) {
        let x = dieRoll(rows) - 1;
        let y = dieRoll(cols) - 1;
        let tile = this.getTile(x, y);

        if (tile.entity) {
          continue;
        }

        this.entityList.push(new EntityClass(tile));
      }
    }
    
    addSomeEntities(3, Thinger);
    addSomeEntities(2, Wall);
    addSomeEntities(2, Monster);
    addSomeEntities(2, Barrel);

    this.updateTiles(props, state);

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

  shouldComponentUpdate(nextProps, nextState) {
    switch (this.renderStep) {
      case 'idle':
        this.renderStep = 'step1';
        this.updateStep1(nextProps, nextState);
        setTimeout(() => this.nextTurn(), 300);
        return true;
      case 'step1':
        this.renderStep = 'step2';
        this.updateStep2(nextProps, nextState);
        setTimeout(() => this.nextTurn(), 0);
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

    this.player.adjacentTiles(this)
               .each((t) => t.highlightForMove = false);

    entityList.each((t) => t.tick(this))
  }

  updateStep2(props, state) {
    let {entityList, tileList} = this;
    
    entityList.each((t) => t.update(this))
    
    this.player.adjacentTiles(this)
               .each((t) => {
      t.occupied = t.entity ? 1 : 0;
      t.highlightForMove = this.canMove(this.player, t) ?
                           this.getRelativeDirection(this.player.tile, t) : '';
    });

    entityList.each((t) => t.lateUpdate(this));
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
    if (this.renderStep !== 'idle') {
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
    this.setState({
      turn: this.state.turn + 1,
    });
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
    return tile && !!tile.entity || !!tile.occupied;
  }
}

let mount = document.getElementById('game');
React.render(<Game/>, mount);
