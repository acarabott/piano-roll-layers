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
        this.draggingLayer = undefined;
      }
    };
    this.selection = {
      active: false,
      rect: new Rectangle()
    };
    this.layersChanged = true;
    this._list = document.createElement('ol');
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

  get highlightedLayers() {
    return this._layers.filter(layer => layer.highlight);
  }

  set draggingLayer(layer) {
    this._dragging.sourceLayer = layer;
    this._dragging.layer = layer === undefined ? undefined : layer.clone();
    this._dragging.origin = layer === undefined ? undefined : layer.frame.tl;
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
    this._currentLayer = currentLayer;
  }
}
