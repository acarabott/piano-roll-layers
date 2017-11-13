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
    this._list = document.createElement('ol');
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

  get list() {
    if (this.layersChanged) {
      Array.from(this._list.children).forEach(item => this._list.removeChild(item));

      this._layers.forEach((layer, i) => {
        const li = document.createElement('li');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = layer.active;
        checkbox.addEventListener('change', event => {
          layer.active = checkbox.checked;
        });
        li.appendChild(checkbox);

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
}
