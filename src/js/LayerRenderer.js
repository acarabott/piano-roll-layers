import * as color from './color.js';
import { linlin } from './utils.js';

export class LayerRenderer {
  constructor(layerManager) {
    this.layerManager = layerManager;
  }

  render(ctx) {
    if (this.layerManager === undefined) { return; }

    ctx.save();

    if (this.layerManager.currentRect !== undefined &&
        this.layerManager.layers.length > 1)
    {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = color.blue;
      ctx.fillRect(...this.layerManager.currentRect);
      ctx.globalAlpha = 1.0;
    }

    this.layerManager.layers.filter(layer => layer.active).forEach(layer => {
      const isParentLayer = layer === this.layerManager.parentLayer;
      const isCurrent = layer === this.layerManager.currentLayer;
      const style = isCurrent ? color.blue : color.black;
      const lineWidth = isCurrent ? 2 : 1;


      ctx.save();
      ctx.strokeStyle = style;

      // subdivisions
      ctx.lineWidth = lineWidth;
      this.layerManager.getLayerRects(layer).forEach((rect, i) => {
        ctx.strokeRect(...rect);
        ctx.fillStyle = style;
        if (!isParentLayer) {
          const val = this.layerManager.getLayerFrame(layer).width / layer._subdivision;
          const fontsize = linlin(val, 10, 800, 12, 20);
          ctx.font = `${fontsize}px Monaco`;
          ctx.textAlign = 'center';
          ctx.fillText(i + 1, rect.x + rect.width / 2, rect.y + fontsize * 1.25);
        }
      });

      // border
      ctx.lineWidth = lineWidth * 2;
      ctx.strokeRect(...this.layerManager.getLayerFrame(layer));

      ctx.restore();
    });

    if (this.layerManager.creation.active) {
      ctx.strokeStyle = color.blue;
      ctx.setLineDash([20, 10]);
      ctx.lineWidth = 2;
      ctx.strokeRect(...this.layerManager.creation.rect);
    }

    if (this.layerManager.dragging) {
      ctx.lineWidth = 2;
      ctx.setLineDash([20, 10]);
      ctx.strokeStyle = this.layerManager.copying ? color.green : color.black;
      this.layerManager.getLayerRects(this.layerManager.draggingLayer).forEach(rect => {
        ctx.strokeRect(...rect);
      });
    }

    ctx.restore();
  }
}
