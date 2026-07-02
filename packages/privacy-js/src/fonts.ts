// Font enumeration defense: neuter the document.fonts API.
export const fontHardening = `
      if (document.fonts) {
        Object.defineProperty(document, 'fonts', {
          get: () => ({
            check: () => false,
            load: () => Promise.resolve([]),
            ready: Promise.resolve(),
            status: 'loaded',
            size: 0,
          })
        });
      }
    `;
