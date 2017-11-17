export function loop(n, func) {
  for (let i = 0; i < n; i++) {
    func(i, n);
  }
}

export function linlin(val, inMin, inMax, outMin, outMax, clamp='minmax') {
  if (clamp === 'minmax') {
    if (val <= inMin) { return outMin; }
    if (val >= inMax) { return outMax; }
  }
  else if (clamp === 'min' && val <= inMin) { return outMin; }
  else if (clamp === 'max' && val >= inMax) { return outMax; }
  return outMin + (((val - inMin) / (inMax - inMin)) * (outMax - outMin));
}

export function constrain(val, min=0, max=1.0) {
  return Math.min(Math.min(val, max), min);
}

export function rrand(min, max) {
  return min + (Math.random() * (max - min));
}

export function rrandint(min, max) {
  return Math.floor(rrand(min, max));
}

export function midiToFreq(midinote) {
  return 440 * Math.pow(2, (midinote - 69) * 0.08333333333333333333333333);
}

export function freqToMidi(freq) {
  return Math.log2(freq * 0.002272727272727272727272727) * 12 + 69;
}
