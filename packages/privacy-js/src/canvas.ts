// Canvas fingerprint defense — STABLE per-session noise.
//
// The old version added fresh Math.random noise on every read, so the same
// canvas produced a different fingerprint each time. Real users have a *stable*
// fingerprint; instability itself is a bot signal and can break canvas-based
// rendering. Here we derive the per-pixel perturbation deterministically from a
// per-session seed + pixel index: the same canvas yields the same output within
// a session, but differs from the true device and across sessions — which is
// what actually defeats cross-site fingerprinting without looking automated.
export const canvasHardening = `
      var __canvasSeed = (Math.floor(Math.random() * 0x7fffffff)) >>> 0;
      var __noiseAt = function(i) {
        // Cheap deterministic hash of (seed, index) -> {-1, 0, 1}.
        var x = (__canvasSeed ^ ((i + 1) * 2654435761)) >>> 0;
        x = ((x >>> 15) ^ x) >>> 0;
        return (x % 3) - 1;
      };
      var __perturb = function(ctx, w, h) {
        try {
          var imageData = ctx.getImageData(0, 0, w, h);
          var d = imageData.data;
          for (var i = 0; i < d.length; i += 4) {
            d[i]     += __noiseAt(i);
            d[i + 1] += __noiseAt(i + 1);
            d[i + 2] += __noiseAt(i + 2);
          }
          ctx.putImageData(imageData, 0, 0);
        } catch (e) {}
      };

      var originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function() {
        var ctx = this.getContext('2d');
        if (ctx) __perturb(ctx, this.width, this.height);
        return originalToDataURL.apply(this, arguments);
      };

      if (HTMLCanvasElement.prototype.toBlob) {
        var originalToBlob = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function() {
          var ctx = this.getContext('2d');
          if (ctx) __perturb(ctx, this.width, this.height);
          return originalToBlob.apply(this, arguments);
        };
      }
    `;
