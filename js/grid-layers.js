/* global Rectangle */
const canvas = document.createElement('canvas');
canvas.width = 800;
canvas.height = 400;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

function loop(n, func) {
  for (let i = 0; i < n; i++) {
    func(i);
  }
}

function renderPiano(ctx, drawRect, numKeys, alpha = 1.0) {
  const colors = ['w', 'b', 'w', 'b', 'w', 'w', 'b', 'w', 'b', 'w', 'b', 'w'];
  const keyHeight = drawRect.height / numKeys;

  loop(numKeys, i => {
    ctx.fillStyle = colors[i % colors.length] === 'w'
      ? `rgba(255, 255, 255, ${alpha}`
      : `rgba(0, 0, 0, ${alpha}`;
    const y = drawRect.y + ((numKeys - (i + 1)) * keyHeight);
    ctx.fillRect(drawRect.x, y, drawRect.width, keyHeight);
    ctx.strokeStyle = `rgba(100, 100, 100, ${alpha})`;
    ctx.strokeRect(drawRect.x, y, drawRect.width, keyHeight);
  });
}


function render() {
  ctx.save();
  ctx.fillStyle = 'rgb(200, 200, 200)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const keyRect = new Rectangle(0, 0, canvas.width * 0.075, canvas.height);
  renderPiano(ctx, keyRect, 12);
  const patternRect = new Rectangle(keyRect.br[0],
                                    keyRect.y,
                                    canvas.width - keyRect.width,
                                    keyRect.height);
  renderPiano(ctx, patternRect, 12, 0.2);

  ctx.restore();
}

function mainLoop() {
  render();
  // requestAnimationFrame(mainLoop);
}


document.addEventListener('DOMContentLoaded', mainLoop);
