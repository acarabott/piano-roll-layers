/* global Rectangle, Layer */

class LayerManager {
  constructor() {
    this._layers = [];
    this.currentLayer = undefined;
    this.selection = {
      active: false,
      rect: new Rectangle()
    };
    this.layersChanged = true;
  }

  addLayer(x, y, width, height, subdivision) {
    this.layersChanged = true;
    const layer = new Layer(x, y, width, height);
    layer.subdivision = subdivision;
    this._layers.push(layer);
  }

  get layers() {
    return this._layers.slice();
  }
}
