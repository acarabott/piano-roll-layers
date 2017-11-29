import * as color from './color.js';
import { linlin } from './utils.js';

export class LayerRenderer {
  static render(ctx, layerManager) {
    ctx.save();

    if (layerManager.currentRect !== undefined && layerManager.layers.length > 1) {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = color.blue;
      ctx.fillRect(...layerManager.currentRect);
      ctx.globalAlpha = 1.0;
    }

    layerManager.layers.filter(layer => layer.active).forEach(layer => {
      const isParentLayer = layer === layerManager.parentLayer;
      const isCurrent = layer === layerManager.currentLayer;
      const style = isCurrent ? color.blue : color.black;
      const lineWidth = isCurrent ? 2 : 1;


      ctx.save();
      ctx.strokeStyle = style;

      // subdivisions
      ctx.lineWidth = lineWidth;
      layerManager.getLayerRects(layer).forEach((rect, i) => {
        ctx.strokeRect(...rect);
        ctx.fillStyle = style;
        if (!isParentLayer) {
          const val = layerManager.getLayerFrame(layer).width / layer._subdivision;
          const fontsize = linlin(val, 10, 800, 12, 20);
          ctx.font = `${fontsize}px Monaco`;
          ctx.textAlign = 'center';
          ctx.fillText(i + 1, rect.x + rect.width / 2, rect.y + fontsize * 1.25);
        }
      });

      // border
      ctx.lineWidth = lineWidth * 2;
      ctx.strokeRect(...layerManager.getLayerFrame(layer));

      ctx.restore();
    });

    if (layerManager.creation.active) {
      ctx.strokeStyle = color.blue;
      ctx.setLineDash([20, 10]);
      ctx.lineWidth = 2;
      ctx.strokeRect(...layerManager.creation.rect);
    }

    if (layerManager.dragging) {
      ctx.lineWidth = 2;
      ctx.setLineDash([20, 10]);
      ctx.strokeStyle = layerManager.copying ? color.green : color.black;
      layerManager.getLayerRects(layerManager.draggingLayer).forEach(rect => {
        ctx.strokeRect(...rect);
      });
    }

    ctx.restore();
  }
}
