const { src, dest } = require('gulp');

// Copia los .json de nodos y credenciales preservando la estructura de carpetas
function copyResources() {
  return src(['nodes/**/*.json', 'credentials/**/*.json'], { base: '.' }).pipe(dest('dist'));
}

exports.default = copyResources;