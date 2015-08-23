
import autobind from './autobind';
import classSet from './class-set';

class Tile extends React.Component {
  render() {
    let {handleClick} = this;
    let {entity, highlightForMove, renderStep, variant, flipBackground} = this.props;
    let type = entity ? entity.type : 'empty';
    let {x, y} = this.props;
    let slideClass = '';

    if (entity) {
      let nextTile = entity.nextState.tile;
      let {x: nx, y: ny} = nextTile;

      if (x !== nx || y !== ny) {
        slideClass = nx - x ==  1 ? 'right' :
                     nx - x == -1 ?  'left' :
                     ny - y ==  1 ?  'down' :
                     ny - y == -1 ?    'up' : 
                                         '' ;
      }
    }

    let className = classSet({
      'tile': true,
      [type]: true,
      [`variant-${variant}`]: true,
      [`flip-background`]: flipBackground,
      'move-highlight': highlightForMove,
      [`slide slide-${slideClass}`]: renderStep === 'step1' && slideClass,
      [`move-highlight-${highlightForMove}`]: highlightForMove,
      'is-following': entity && !!entity.following,
    });

        // {`tile: ${x}, ${y}`}
    return <div className={className} onClick={handleClick}>
      <canvas width="1" height="1" className="aspect-ratio-canvas" />
      <div className="tile-background">
      </div>
      <div className="tile-display-container">
        <div className="tile-display">
        </div>
      </div>
    </div>
  }

  @autobind
  handleClick() {
    let {x, y, onClick} = this.props;
    
    onClick instanceof Function && onClick(x, y);
  }
}

export default class GameBoard extends React.Component {
  static get defaultProps() {
    return {
      tiles: [],
    };
  }

  render() {
    let {tiles} = this.props;
    let renderedTiles = tiles.map((c, i) => {
      return <Tile renderStep={this.props.renderStep}
                   key={i}
                   i={i}
                   onClick={this.props.onClick}
                   {...c} />
    });
    
    return <div className="game-board">
      {renderedTiles}
    </div>;
  }
}
