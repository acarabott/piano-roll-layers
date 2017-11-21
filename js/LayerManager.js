import { Point } from './Point.js';
import { Layer } from './Layer.js';
import { Rectangle } from './Rectangle.js';

export class LayerManager {
  constructor() {
    this.parentRect = undefined;
    this.numKeys = undefined
    this._layers = [];
    this._currentLayer = undefined;
    this.currentRect = undefined;
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
    this.layersChanged = true;
    this._list = document.createElement('ol');
    this.adjustingSubdivision = false;
    this.currentChanged = true;

    this._subdivision = 3;
    this.subdivisionString = '';
    this.subdivisionTimeout = undefined;
    this.subdivisionTimeoutDur = 450;
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

    const vertStep = this.parentRect.height / this.numKeys;
    const distanceToStepAbove = point.y % vertStep;
    const y = point.y - distanceToStepAbove + (distanceToStepAbove > (vertStep / 2)
                                                ? vertStep
                                                : 0);
    return new Point(x, y);
  }

  _finaliseSubdivision() {
    if (this.subdivisionString === '') { return; }

    const int = parseInt(this.subdivisionString, 10);
    this._subdivision = isFinite(int) ? int : this._subdivision;
    this.subdivisionString = '';
    if (this.currentLayer !== undefined) {
      this.currentLayer.subdivision = this._subdivision;
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

  get subdivision() {
    return this._subdivision;
  }

  set subdivision(subdivision) {
    this._subdivision = Math.max(subdivision, 1);
  }

  addLayer(x, y, width, height, subdivision) {
    this.layersChanged = true;
    const layer = new Layer(x, y, width, height);
    layer.subdivision = subdivision;
    this._layers.push(layer);
    return layer;
  }

  removeLayer(layer) {
    this._layers.splice(this._layers.indexOf(layer), 1);
    this.layersChanged = true;
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

  get list() {
    if (this.layersChanged) {
      Array.from(this._list.children).forEach(item => this._list.removeChild(item));

      this._layers.forEach((layer, i) => {
        const li = document.createElement('li');

        const enabledInput = document.createElement('input');
        enabledInput.type = 'checkbox';
        enabledInput.checked = layer.active;
        enabledInput.addEventListener('change', event => {
          layer.active = enabledInput.checked;
        });
        li.appendChild(enabledInput);

        const currentInput = document.createElement('input');
        currentInput.type = 'radio';
        currentInput.name = 'current';
        currentInput.checked = layer === this._currentLayer;
        currentInput.addEventListener('change', event => {
          this.currentLayer = layer;
        });
        li.appendChild(currentInput);


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

        this._list.appendChild(li);
      });
    }
    return this._list;
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
    return this._currentLayer;
  }

  set currentLayer(currentLayer) {
    clearTimeout(this.subdivisionTimeout);
    this._finaliseSubdivision();

    this.layers.forEach(layer => layer.focused = layer === currentLayer);
    this.currentChanged = this._currentLayer !== currentLayer;
    this._currentLayer = currentLayer;
  }

  get dragOffset() {
    return this._dragging.offset;
  }

  dragTo(point) {
    if (this.dragging) { this._dragging.layer.origin = point; }
  }

  moveDraggedLayer() {
    this._dragging.sourceLayer.origin = this._dragging.layer.frame.tl;
    this.currentLayer = this._dragging.sourceLayer;
  }

  stopDragging() {
    this._dragging.clear();
  }

  updateMouseDown(point, snappedPoint, targetRect, minHeight) {
    if (this.grabbableLayers.length > 0) {
      const chosen = this.grabbableLayers[0];
      this.setDraggingLayer(chosen, point);
    }
    else {
      if (!this.copying) {
        this.creation.active = true;
        this.creation.rect.tl = new Point(targetRect.tl.x, snappedPoint.y);
        const x = snappedPoint.x === targetRect.tl.x ? targetRect.br.x : snappedPoint.x;
        this.creation.rect.br = new Point(x, snappedPoint.y + minHeight);
      }
    }
  }

  updateMove(inputPoint, snappedPoint, targetRect, minHeight) {
    // creating layers
    if (this.creation.active) {
      const x = snappedPoint.x === targetRect.tl.x ? targetRect.br.x : snappedPoint.x;
      const y = snappedPoint.y + (snappedPoint.y === this.creation.rect.tl.y ? minHeight : 0);
      this.creation.rect.br = new Point(x, y);
    }
    else {
      // layers as grabbable
      this._layers.forEach(l => l.grabbable = l.frame.isPointOnLine(inputPoint, 4));

      // setting current layer
      const targets = this._layers.filter(layer => layer.frame.containsPoint(inputPoint));
      // TODO this is stupid, use targets instead of this._layers
      this.currentLayer = this._layers.find((layer, i) => {
        const containsPoint = layer.frame.containsPoint(inputPoint);
        const containsRects = targets.some(target => {
          return target !== layer && layer.frame.containsPartialRect(target.frame);
        });
        return containsPoint && !containsRects;
      });

      this.currentRect = this.currentLayer === undefined
        ? undefined
        : this.currentLayer.rects.find(rect => rect.containsPoint(inputPoint));
    }
  }

  updateMouseUp(inputPoint) {
    if (this.creation.active) {
      this.creation.active = false;
      if (Math.abs(this.creation.rect.width) > 0 && Math.abs(this.creation.rect.height) > 0) {
        const rect = this.creation.rect.tl.lessThan(this.creation.rect.br)
          ? this.creation.rect
          : (() => {
            const normal = this.creation.rect.tl.lessThan(this.creation.rect.br);
            const tl = normal ? this.creation.rect.tl : this.creation.rect.br;
            const br = normal ? this.creation.rect.br : this.creation.rect.tl;
            return Rectangle.fromPoints(tl, br);
          })();
        this.currentLayer = this.addLayer(...rect, this.subdivision);
      }
    }

    if (this.dragging) {
      if (this.copying) {
        // copy the layer
        const layer = this.addLayer(...this.draggingLayer.frame,
                                    this.draggingLayer.subdivision);

        // reset the original
        this._dragging.layer.x = this._dragging.origin.x;
        this._dragging.layer.y = this._dragging.origin.y;
        this.currentLayer = layer;
      }
      else {
        // move the original
        this.moveDraggedLayer();
      }
      this.stopDragging();
    }
  }
}
