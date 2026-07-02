// Cloak the spoofed methods so Function.prototype.toString still reports
// "[native code]" — otherwise the hardening itself becomes detectable.
export const toStringCloak = `
      const nativeToString = Function.prototype.toString;
      Function.prototype.toString = function() {
        if (this === Function.prototype.toString) return nativeToString.call(this);
        if (this === WebGLRenderingContext.prototype.getParameter) {
          return 'function getParameter() { [native code] }';
        }
        if (this === HTMLCanvasElement.prototype.toDataURL) {
          return 'function toDataURL() { [native code] }';
        }
        return nativeToString.call(this);
      };
    `;
