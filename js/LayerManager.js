import { Point } from './Point.js';
import { Layer } from './Layer.js';
import { Rectangle } from './Rectangle.js';
import { MicroEvent } from './MicroEvent.js';
import * as color from './color.js';

const corners = {
  tl: Symbol('tl'),
  tr: Symbol('tr'),
  bl: Symbol('bl'),
  br: Symbol('br')
};

export class LayerManager extends MicroEvent {
  static get corners() {
    return corners;
  }

  constructor(song) {
    super();
    this.song = song;
    this.parentLayer = new Layer(...song.rect);
    this._layers = [];
    this.prevCursor = 'default';
    this._dragging = {
      sourceLayer: undefined,
      layer: undefined,
      offset: new Point(0, 0),
      copy: false,
      origin: new Point(0, 0),
      clear: () => {
        this.setDraggingLayer(undefined);
      }
    };
    this.creation = {
      active: false,
      rect: new Rectangle()
    };
    this._resizing = {
      active: false,
      layer: undefined,
      cornerType: undefined,
      start: layer => {
        this._resizing.active = layer !== undefined;
        this._resizing.layer = layer;
        if (layer !== undefined) {
          this._resizing.cornerType = this.resizableCorner;
        }
      },
      stop: () => {
        this._resizing.active = false;
        this._resizing.layer = undefined;
        this._resizing.cornerType = undefined;
      }
    };
    this.list = document.createElement('ol');
    this.adjustingSubdivision = false;

    this._subdivision = 3;
    this._subdivisionString = '';
    this.subdivisionTimeout = undefined;
    this.subdivisionTimeoutDur = 450;

    this._lastMousePosition = new Point(0, 0);
    this._currentLayerIndex = 0;
    this._currentRect = undefined;

    this.bind('layersChanged', layers => this.updateList());
    this.bind('currentChanged', layer => this.updateList());

    this._inThresh = 4;
  }

  get currentRect() {
    return this.currentLayer === undefined ?
      this.song.rect
      : this.currentLayer.rects.find(rect => {
        return rect.containsPoint(this._lastMousePosition, this._inThresh);
      });
  }

  snapPointToLayers(point, thresh = 20) {
    let x = point.x;
    let minDistance = Infinity;
    this.rects.forEach(rect => {
      [rect.tl.x, rect.br.x].forEach(cx => {
        const dist = Math.abs(cx - point.x);
        if (dist < minDistance) {
          minDistance = dist;
          x = cx;
        }
      });
    });

    const distanceToStepAbove = point.y % this.song.noteHeight;
    const lessThanHalfWay = distanceToStepAbove > this.song.noteHeight / 2;
    const additionalHeight = (lessThanHalfWay ? this.song.noteHeight : 0);
    const y = point.y - distanceToStepAbove + additionalHeight;
    return new Point(x, y);
  }

  _finaliseSubdivision() {
    if (this.subdivisionString === '') { return; }

    const int = parseInt(this.subdivisionString, 10);
    this.subdivision = isFinite(int) ? int : this.subdivision;
    this.subdivisionString = '';
    if (this.currentLayer !== undefined) {
      this.currentLayer.subdivision = this.subdivision;
    }
  }

  subdivisionInput(char) {
    if (!Number.isInteger(parseInt(char, 10))) { return; }

    clearTimeout(this.subdivisionTimeout);
    if (this.currentLayer !== undefined && this.currentLayer !== this.parentLayer) {
      this.subdivisionString += char;
      this.currentLayer.subdivision = parseInt(this.subdivisionString, 10);
      this.subdivisionTimeout = setTimeout(() => {
        this._finaliseSubdivision();
      }, this.subdivisionTimeoutDur);
    }
  }

  get subdivisionString() {
    return this._subdivisionString;
  }

  set subdivisionString(subdivisionString) {
    this._subdivisionString = subdivisionString;
    this.trigger('subdivisionStringChanged', this.subdivisionString);
  }

  get subdivision() {
    return this._subdivision;
  }

  set subdivision(subdivision) {
    this._subdivision = Math.max(subdivision, 1);
    this.trigger('subdivisionChanged', this.subdivision);
  }

  addLayer(rect, subdivision) {
    const layer = new Layer(...rect);
    layer.subdivision = subdivision;
    this._layers.push(layer);
    this.currentLayerIndex = this.currentLayers.indexOf(layer);
    this.trigger('layersChanged', this._layers);
    return layer;
  }

  removeLayer(layer) {
    if (layer === undefined) { return; }
    this._layers.splice(this._layers.indexOf(layer), 1);
    this.trigger('layersChanged', this._layers);
  }

  get layers() {
    const layers = this._layers.slice();
    layers.push(this.parentLayer);
    return layers;
  }

  // returns all rectangles of all layers as a single array
  get rects() {
    return this.layers.map(l => l.rects).reduce((cur, prev) => {
      return prev.concat(cur);
    }, []);
  }

  updateList() {
    Array.from(this.list.children).forEach(item => this.list.removeChild(item));

    const positionToTimeString = (xpos) => {
      const time = this.song.positionToTime(xpos);
      const timeSecs = Math.floor(time % 60);
      const timeMins = Math.floor((time - timeSecs) / 60);
      return `${timeMins.toString().padStart(1, '0')}:${timeSecs.toString().padStart(2, '0')}`;
    };

    this._layers.forEach((layer, i) => {
      const li = document.createElement('li');

      const enabledInput = document.createElement('input');
      enabledInput.type = 'checkbox';
      enabledInput.checked = layer.active;
      enabledInput.classList.add('enabled');
      enabledInput.addEventListener('change', event => {
        layer.active = enabledInput.checked;
      });
      li.appendChild(enabledInput);

      const label = document.createElement('span');
      const isCurrent = layer === this.currentLayer;
      label.style.backgroundColor = isCurrent ? color.blue : color.white;
      label.style.color = isCurrent ? color.white : color.black;

      const startTime = positionToTimeString(layer.rect.x);
      const endTime = positionToTimeString(layer.rect.br.x);
      label.textContent = `Division: ${layer.subdivision} - ${startTime}-${endTime}`;
      li.appendChild(label);

      const removeButton = document.createElement('input');
      removeButton.type = 'button';
      removeButton.value = 'remove';
      removeButton.addEventListener('click', event => {
        this.removeLayer(layer);
      });
      removeButton.classList.add('removeButton');
      li.appendChild(removeButton);

      this.list.appendChild(li);
    });
  }

  get grabbableLayer() {
    if (this.resizableCorner !== undefined) { return undefined; }

    return this._layers.find(layer => {
      return layer === this.currentLayer &&
             layer.frame.isPointOnLine(this._lastMousePosition, this._inThresh);
      });
  }

  get resizableLayer() {
    const layer = this._layers.find(layer => layer === this.currentLayer);
    if (layer === undefined) { return undefined; }

    const frame = this.currentLayer.frame;
    const mouse = this._lastMousePosition;
    const thresh = this._inThresh;

    const onAnyCorner = frame.isPointOnTopLeft(mouse, thresh) ||
                        frame.isPointOnTopRight(mouse, thresh) ||
                        frame.isPointOnBottomLeft(mouse, thresh) ||
                        frame.isPointOnBottomRight(mouse, thresh);

    return onAnyCorner ? layer : undefined;
  }

  get resizableCorner() {
    if (this.resizableLayer === undefined) { return; }

    const frame = this.resizableLayer.frame;
    const mouse = this._lastMousePosition;
    const thresh = this._inThresh;
    if (frame.isPointOnTopLeft(mouse, thresh)) { return corners.tl; }
    if (frame.isPointOnTopRight(mouse, thresh)) { return corners.tr; }
    if (frame.isPointOnBottomLeft(mouse, thresh)) { return corners.bl; }
    if (frame.isPointOnBottomRight(mouse, thresh)) { return corners.br; }
    return undefined;
  }

  setDraggingLayer(layer, grabPoint) {
    this._dragging.sourceLayer = layer;
    this._dragging.layer =  layer === undefined ? undefined : layer.clone();
    this._dragging.origin = layer === undefined ? undefined : layer.frame.tl;
    this._dragging.offset = layer === undefined ? undefined : grabPoint.subtract(layer.frame.tl);
  }

  get draggingLayer() {
    return this._dragging.layer;
  }

  get copying() {
    return this._dragging.copy;
  }

  set copying(isCopying) {
    this._dragging.copy = isCopying;
  }

  get dragging() {
    return this._dragging.layer !== undefined;
  }

  get currentLayerIndex() {
    return this._currentLayerIndex;
  }

  set currentLayerIndex(index) {
    this._currentLayerIndex = index;
    this.trigger('currentChanged', this.currentLayer);
  }

  get currentLayers() {
    return this.layers.filter(layer => {
      return layer.frame.containsPoint(this._lastMousePosition, this._inThresh);
    });
  }

  get currentLayer() {
    return this.currentLayers[this.currentLayerIndex % this.currentLayers.length];
  }

  cycleCurrentLayerForward() {
    // using setter, so no ++
    let newIndex = this.currentLayerIndex + 1;
    if (newIndex > this.currentLayers.length) {
      newIndex -= this.currentLayers.length;
    }
    this.currentLayerIndex = newIndex;
  }

  cycleCurrentLayerBackward() {
    // using setter, so no --
    let newIndex = this.currentLayerIndex - 1;
    if (newIndex < 0) {
      newIndex += this.currentLayers.length;
    }
    this.currentLayerIndex = newIndex;
  }

  get dragOffset() {
    return this._dragging.offset;
  }

  dragTo(point) {
    if (this.dragging) { this._dragging.layer.origin = point; }
  }

  get resizing() {
    return this._resizing.active;
  }

  updateMouseDown(point, snapping) {
    const snappedPoint = this.snapPointToLayers(point);
    this._lastMousePosition.set(point);

    if (this.grabbableLayer !== undefined) {
      this.setDraggingLayer(this.grabbableLayer, point);
    }
    if (this.resizableCorner !== undefined) {
      this._resizing.start(this.currentLayer);
    }
    else {
      if (!this.copying) {
        this.creation.active = true;
        const tlX = snapping ? this.currentRect.tl.x : point.x;
        const tlY = snappedPoint.y;
        this.creation.rect.tl = new Point(tlX, tlY);
        const brX = snapping ? this.currentRect.br.x : point.x;
        this.creation.rect.br = new Point(brX, snappedPoint.y + this.song.noteHeight);
      }
    }
  }

  updateMouseMove(point, snapping) {
    const snappedPoint = this.snapPointToLayers(point);

    const prevCurrentLayer = this.currentLayer;
    this._lastMousePosition.set(point);
    if (this.currentLayer !== prevCurrentLayer) {
      this.trigger('currentChanged', this.currentLayer);
    }

    // creating layers
    if (this.creation.active) {
      const x = snapping ? snappedPoint.x : point.x;
      const y = snappedPoint.y === this.creation.rect.tl.y
        ? snappedPoint.y + this.song.noteHeight
        : snappedPoint.y;
      this.creation.rect.br = new Point(x, y);
    }
    else if (this.resizing) {
      const x = snapping ? snappedPoint.x : point.x;
      const y = snappedPoint.y;
      const type = this._resizing.cornerType;
      const frame = this._resizing.layer.frame;
      const newCorner = new Point(x, y);

      if (type === LayerManager.corners.tl) {
        const br = frame.br;
        frame.tl = new Point(Math.min(newCorner.x, br.x - 1),
                             Math.min(newCorner.y, br.y - this.song.noteHeight));
        frame.br = br;
      }
      else if (type === LayerManager.corners.tr) {
        const bl = frame.bl;
        frame.tr = new Point(Math.max(newCorner.x, bl.x + 1),
                             Math.min(newCorner.y, bl.y - this.song.noteHeight));
        frame.bl = bl;
      }
      else if (type === LayerManager.corners.bl) {
        const tr = frame.tr;
        frame.bl = new Point(Math.min(newCorner.x, tr.x - 1),
                             Math.max(newCorner.y, tr.y + this.song.noteHeight));
        frame.tr = tr;
      }
      else if (type === LayerManager.corners.br) {
        const tl = frame.tl;
        frame.br = new Point(Math.max(newCorner.x, tl.x + 1),
                             Math.max(newCorner.y, tl.y + this.song.noteHeight));
        frame.tl = tl;
      }
    }
    else if (this.dragging) {
      const dragged = (snapping ? snappedPoint : new Point(point.x, snappedPoint.y));
      this.dragTo(dragged.subtract(this.dragOffset));
    }

  }

  updateMouseUp(point) {
    this._lastMousePosition.set(point);

    if (this.creation.active) {
      this.creation.active = false;
      const absWidth = Math.abs(this.creation.rect.width);
      const absHeight = Math.abs(this.creation.rect.height);
      if (absWidth > 0 && absHeight > 0) {
        const tl = this.creation.rect.tl;
        const br = this.creation.rect.br;
        const rect = new Rectangle(Math.min(tl.x, br.x),
                                   Math.min(tl.y, br.y), absWidth, absHeight);
        this.addLayer(rect, this.subdivision);
      }
    }

    if (this.dragging) {
      if (this.copying) {
        // copy the layer
        this.addLayer(this.draggingLayer.frame, this.draggingLayer.subdivision);

        // reset the original
        this._dragging.origin = this._dragging.origin;
      }
      else {
        // move the original
        this._dragging.sourceLayer.origin = this._dragging.layer.frame.tl;
      }
      // stop dragging
      this._dragging.clear();
    }

    this._resizing.stop();
  }
}
