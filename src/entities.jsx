
import dieRoll from './die-roll';

function apply(obj1, obj2) {
  for (let key in obj1) {
    obj2[key] = obj1[key];
  }

  return obj2;
}

const vector = (x, y) => ({x, y});

const dirs = {
  'up': vector(0, -1),
  'down': vector(0, 1),
  'left': vector(-1, 0),
  'right': vector(1, 0),
};

const dirKeys = Object.keys(dirs);

const randomElement = (l) => l[dieRoll(l.length) - 1];

export class Entity {
  /* base entity class */
  get defaultState() {
    return {
      tile: null,
      moved: false,
    };
  }

  constructor(tile, type) {
    this.state = apply({tile, type}, this.defaultState)
    this.nextState = apply(this.state, {});
    this.type = type;
    tile.entity = this;
  }

  tick(game) {
  }

  update(game) {
    console.log(`>> updating ${this}`);
    let prevTile = this.state.tile;

    this.state = apply(this.nextState, this.state);
    this.nextState = apply({moved: false}, this.nextState);

    if (this.moved) {
      if (prevTile.entity === this) {
        console.log(`${this} left previous tile`);
        prevTile.entity = null;
      }
      if (this.state.tile.entity !== this) {
        console.log(`${this} entering new tile`);
        if (this.state.tile.entity && !this.state.tile.entity.nextState.moved) {
          this.movedInto(this.state.tile.entity, game);
          this.state.tile.entity.wasMovedIntoBy(this, game);
        } else {
          console.log(`${this} entered tile without incident`);
          this.state.tile.entity = this;
        }
      }
    } else {
      console.log(`${this} did not move`);
    }
  }

  lateUpdate(game) {
  }

  get tile() {
    return this.state.tile;
  }

  set tile(v) {
    if (v !== this.tile) {
      this.moved = true;
    }

    return this.nextState.tile = v;
  }

  get moved() {
    return this.state.moved;
  }

  set moved(v) {
    console.log(`${this} will move`);
    return this.nextState.moved = v;
  }

  moveTo(tile) {
    if (tile.entity) {
      console.log(`${this} will move towards ${tile.entity}`)
    }
    this.tile.occupied -= 1;
    this.tile = tile;
    tile.occupied += 1;
  }

  moveToImmediately(tile) {
    this.moveTo(tile);
    this.tick()
  }

  movedInto(entity, game) {
    console.log(`${entity} moved into ${this}`);
    // when this moves into a tile occupied by another entity
  }

  wasMovedIntoBy(entity, game) {
    // when another entity moves into tile occupied by this
    console.log(`${entity} was moved into by ${this}`);
  }

  handleClick() {
  }

  adjacentTiles(game) {
    let {x, y} = this.tile;

    return [game.getTile(x + 1, y),
            game.getTile(x - 1, y),
            game.getTile(x, y + 1),
            game.getTile(x, y - 1)].filter((t) => t);
  }

  toString() {
    return `[${this.type} at (${this.tile.x}, ${this.tile.y})]`;
  }
}

export class Player extends Entity {
  /* the player-controlled entity */

  constructor(tile) {
    super(tile, 'player');
  }

  lateUpdate(game) {
    super.lateUpdate(game);

    let openTiles = this.adjacentTiles(game)
                        .filter((t) => game.canMove(this, t));

    if (!openTiles.length) {
      console.log(`${this} became a monster!`);
      this.type = 'player-monster';
    }
  }
}

class Follower extends Entity {
  /* Follows another entity.  If another entity moves in the way, will stop
  following */

  get defaultState() {
    return {
      tile: null,
      moved: false,
      following: null,
    };
  }

  toggleFollowing(target) {
    if (this.following) {
      this.following = null;
    } else {
      this.following = target;
    }
  }

  get following() {
    return this.state.following;
  }

  set following(v) {
    if (v) {
      console.log(`${this} fill follow ${v}`);
    } else {
      console.log(`${this} is no longer following`);
    }
    return this.nextState.following = v;
  }

  tickFollow(game) {
    let {following} = this;
    
    if (!following) {
      return;
    }

    if (following.tile.entity !== following) {
      this.following = null;
      console.log(`${this}'s follow target left the map.`);
      return
    }
    

    let willMove = following.nextState.moved;
    
    if (willMove) {
      // let occupied = following.tile.occupied;
      
      if (game.canMove(this, following.tile)) {
        this.moveTo(following.tile);
      } else {
        this.following = null;
      }
    }
  }

  tick(game) {
    this.tickFollow(game);
    super.tick(game);
  }

  lateUpdate(game) {
    let {following} = this;
    if (!this.willFollow(following)) {
      console.log(`${this} can no longer follow ${following}`)
      this.following = null;
      this.state.following = null;
      return;
    }
  }
}

export class Thinger extends Follower {
  /* Player can click on an adjacent thinger (?) to toggle its following state */

  constructor(tile) {
    super(tile, 'thinger');
  }

  handleClick(game) {
    if (game.areTilesAdjacent(game.player.tile, this.tile)) {
      this.toggleFollowing(game.player);
    }
  }

  willFollow(entity) {
    return entity && entity.type === 'player';
  }

  lateUpdate(game) {
    let {x, y} = this.tile;
    // look for a barrel to jump into
    let found = dirKeys.some((key) => {
      let {x: dx, y: dy} = dirs[key];
      let tile = game.getTile(x + dx, y + dy);

      if (tile &&
          tile.entity &&
          tile.entity instanceof Barrel &&
          !tile.entity.contains) {
        console.log(`${this} moving to ${tile.entity}`)
        this.following = null;
        this.state.following = null;
        this.moveTo(tile);
        tile.entity.contains = this;
        return true;
      }

      return false;
    });


    // look for a monster to run from
    if (!found) {
      let adjacentTiles = this.adjacentTiles(game)
      let adjacentMonsters = adjacentTiles.filter((t) => this.willRunFrom(t.entity));
      let openTiles = adjacentTiles.filter((t) => game.canMove(this, t));

      if (adjacentMonsters.length && openTiles.length) {
        console.log(`${this} running from ${adjacentMonsters[0]} to ${openTiles[0]}`);
        this.moveTo(openTiles[0]);
        // really wish I hadn't done this
        this.following = null;
        this.state.following = null;
      }
    }

    if (!this.following && !this.nextState.moved) {
      let {x, y} = this.tile;

      // look for player or thinger to follow
      let found = dirKeys.some((key) => {
        let {x: dx, y: dy} = dirs[key];
        let tile = game.getTile(x + dx, y + dy);

        if (tile && tile.entity && 
            this.willFollow(tile.entity)) {
          this.following = tile.entity;
          this.state.following = tile.entity;
          return true;
        }

        return false;
      });
    }

    super.lateUpdate(game);
  }

  willRunFrom(entity) {
    return entity && (entity.type === 'monster' || entity.type === 'player-monster');
  }
}

export class Monster extends Follower {
  /* Will start following any adjacent thinger (?) or player.  otherwise, will 
  move randomly */

  constructor(tile) {
    super(tile, 'monster');
  }

  tick(game) {
    if (!this.following && !this.nextState.moved) {
      // move in a random dir
      let randomDir = randomElement(dirKeys);
      let {x: rx, y: ry} = dirs[randomDir];
      let {x, y} = this.tile;
      let tile = game.getTile(x + rx, y + ry);

      if (!tile || !game.canMove(this, tile)) {
        return;
      }

      this.moveTo(tile);
    }

    super.tick(game);
  }

  willFollow(entity) {
    return entity && (entity instanceof Player || entity instanceof Thinger);
  }

  lateUpdate(game) {
    if (!this.following && !this.nextState.moved) {
      let {x, y} = this.tile;

      // look for player or thinger to follow
      let found = dirKeys.some((key) => {
        let {x: dx, y: dy} = dirs[key];
        let tile = game.getTile(x + dx, y + dy);

        if (tile && tile.entity && 
            this.willFollow(tile.entity)) {
          this.following = tile.entity;
          this.state.following = tile.entity;
          return true;
        }

        return false;
      });
    }

    super.lateUpdate(game);
  }
}

export class Wall extends Entity {
  /* just a wall */

  constructor(tile) {
    super(tile, 'wall');
  } 
}

export class Barrel extends Entity {
  /* a barrel or something */
  constructor(tile) {
    super(tile, 'barrel');
    this.contains = false;
  }

  wasMovedIntoBy(entity, game) {
    if (entity instanceof Thinger) {
      console.log(`${entity} getting inside of ${this}`)
      this.tile.occupied -= 1;
      entity.tile = this.tile
      this.contains = entity;
      this.type = 'barrel-full';
      // FUCK
      // ME
      game.entityList.splice(game.entityList.indexOf(entity), 1);
    }
  }
}
