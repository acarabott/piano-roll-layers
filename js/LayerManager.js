import { Point } from './Point.js';
import { Layer } from './Layer.js';
import { Rectangle } from './Rectangle.js';
import { MicroEvent } from './MicroEvent.js';

export class LayerManager extends MicroEvent {
  constructor() {
    super();
    this.parentRect = undefined;
    this.numKeys = undefined;
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
    this.list = document.createElement('ol');
    this.adjustingSubdivision = false;

    this._subdivision = 3;
    this._subdivisionString = '';
    this.subdivisionTimeout = undefined;
    this.subdivisionTimeoutDur = 450;

    this._currentLayers = [];
    this._currentLayerIndex = 0;

    this.bind('layersChanged', layers => this.updateList());
  }

  get noteHeight() {
    return this.parentRect.height / this.numKeys;
  }

  get currentRect() {
    return this.currentLayer === undefined ? this.parentRect : this.currentRect;
  }

  snapPointToLayers(point, thresh = 20) {
    let x = point.x;
    let minDistance = Infinity;
    [this.parentRect, ...this.rects].forEach(rect => {
      [rect.tl.x, rect.br.x].forEach(cx => {
        const dist = Math.abs(cx - point.x);
        if (dist < minDistance) {
          minDistance = dist;
          x = cx;
        }
      });
    });

    const distanceToStepAbove = point.y % this.noteHeight;
    const lessThanHalfWay = distanceToStepAbove > this.noteHeight / 2;
    const additionalHeight = (lessThanHalfWay ? this.noteHeight : 0);
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
    this.subdivisionString += char;
    if (this.currentLayer !== undefined) {
      this.currentLayer.subdivision = parseInt(this.subdivisionString, 10);
    }
    this.subdivisionTimeout = setTimeout(() => {
      this._finaliseSubdivision();
    }, this.subdivisionTimeoutDur);
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
    this._currentLayers.push(layer);
    this._currentLayerIndex = this._currentLayers.indexOf(layer);
    this.trigger('layersChanged', this._layers);
    return layer;
  }

  removeLayer(layer) {
    if (layer === undefined) { return; }
    this._layers.splice(this._layers.indexOf(layer), 1);
    this.trigger('layersChanged', this._layers);
  }

  get layers() {
    return this._layers.slice();
  }

  // returns all rectangles of all layers as a single array
  get rects() {
    return this._layers.map(l => l.rects).reduce((cur, prev) => {
      return prev.concat(cur);
    }, []);
  }

  updateList() {
    Array.from(this.list.children).forEach(item => this.list.removeChild(item));

    this._layers.forEach((layer, i) => {
      const li = document.createElement('li');

      const enabledInput = document.createElement('input');
      enabledInput.type = 'checkbox';
      enabledInput.checked = layer.active;
      enabledInput.addEventListener('change', event => {
        layer.active = enabledInput.checked;
      });
      li.appendChild(enabledInput);

      const label = document.createElement('span');
      label.textContent = `Layer ${i + 1} - ${layer.subdivision}`;
      li.appendChild(label);

      const removeButton = document.createElement('input');
      removeButton.type = 'button';
      removeButton.value = 'remove';
      removeButton.addEventListener('click', event => {
        this.removeLayer(layer);
      });
      li.appendChild(removeButton);

      this.list.appendChild(li);
    });
  }

  get grabbableLayers() {
    return this._layers.filter(layer => layer.grabbable);
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

  get currentLayer() {
    return this._currentLayers[this._currentLayerIndex % this._currentLayers.length];
  }

  cycleCurrentLayerForward() {
    this._currentLayerIndex++;
    if (this._currentLayerIndex > this._currentLayers.length) {
      this._currentLayerIndex -= this._currentLayers.length;
    }
    this.trigger('currentChanged', this.currentLayer);
  }

  cycleCurrentLayerBackward() {
    this._currentLayerIndex--;
    if (this._currentLayerIndex < 0) {
      this._currentLayerIndex += this._currentLayers.length;
    }
    this.trigger('currentChanged', this.currentLayer);
  }

  get dragOffset() {
    return this._dragging.offset;
  }

  dragTo(point) {
    if (this.dragging) { this._dragging.layer.origin = point; }
  }

  updateMouseDown(point, snapping) {
    const snappedPoint = snapping ? this.snapPointToLayers(point) : point;

    if (this.grabbableLayers.length > 0) {
      const chosen = this.grabbableLayers[0];
      this.setDraggingLayer(chosen, point);
    }
    else {
      if (!this.copying) {
        this.creation.active = true;
        const tlX = snapping ? this.targetRect.tl.x : point.x;
        const tlY = snapping ? snappedPoint.y : point.y;
        this.creation.rect.tl = new Point(tlX, tlY);
        const brX = snappedPoint.x === this.targetRect.tl.x ? this.targetRect.br.x : snappedPoint.x;
        this.creation.rect.br = new Point(brX, snappedPoint.y + this.noteHeight);
      }
    }
  }

  updateMouseMove(point, snapping) {
    const snappedPoint = snapping ? this.snapPointToLayers(point) : point;

    // creating layers
    if (this.creation.active) {
      const x = snappedPoint.x === this.targetRect.tl.x ? this.targetRect.br.x : snappedPoint.x;
      const y = snappedPoint.y + (snappedPoint.y === this.creation.rect.tl.y ? this.noteHeight : 0);
      this.creation.rect.br = new Point(x, y);
    }
    else if (this.dragging) {
      let origin = point.subtract(this.dragOffset);
      if (snapping) { origin = this.snapPointToLayers(origin); }
      this.dragTo(origin);
    }
    else {
      // update potential current layers
      this._currentLayers = this._layers.filter(layer => layer.frame.containsPoint(point));

      // layers as grabbable
      this._layers.forEach(l => l.grabbable = l.frame.isPointOnLine(point, 4));
    }
  }

  updateMouseUp(inputPoint) {
    if (this.creation.active) {
      this.creation.active = false;
      const absWidth = Math.abs(this.creation.rect.width);
      const absHeight = Math.abs(this.creation.rect.height);
      if (absWidth > 0 && absHeight > 0) {
        const tl = this.creation.rect.tl;
        const br = this.creation.rect.br;
        const rect = new Rectangle(Math.min(tl.x, br.x), Math.min(tl.y, br.y), absWidth, absHeight);
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
  }
}
