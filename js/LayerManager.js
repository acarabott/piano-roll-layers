import { Point } from './Point.js';
import { Layer } from './Layer.js';
import { Rectangle } from './Rectangle.js';

export class LayerManager {
  constructor() {
    this._layers = [];
    this._currentLayer = undefined;
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
  }

  addLayer(x, y, width, height, subdivision) {
    this.layersChanged = true;
    const layer = new Layer(x, y, width, height);
    layer.subdivision = subdivision;
    this._layers.push(layer);
    return layer;
  }

  get layers() {
    return this._layers.slice();
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
          this._layers.splice(this._layers.indexOf(layer), 1);
          this.layersChanged = true;
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

  updateMove(inputPoint) {
    this._layers.forEach(l => l.grabbable = l.frame.isPointOnLine(inputPoint, 4));

    const targets = this._layers.filter(layer => layer.frame.containsPoint(inputPoint));
    this._currentLayer = this._layers.find((layer, i) => {
      const containsPoint = layer.frame.containsPoint(inputPoint);
      const containsRects = targets.some(target => {
        return target !== layer && layer.frame.containsPartialRect(target.frame);
      });
      return containsPoint && !containsRects;
    });
  }
}
