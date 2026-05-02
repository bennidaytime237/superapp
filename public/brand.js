function triggerDownload(url, filename) {
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function downloadSVG(src, filename) {
  fetch(src)
    .then(function(r) { return r.blob(); })
    .then(function(blob) {
      var url = URL.createObjectURL(blob);
      triggerDownload(url, filename);
      setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    });
}

function downloadAsPNG(svgSrc, filename, svgW, svgH) {
  fetch(svgSrc)
    .then(function(r) { return r.text(); })
    .then(function(svgText) {
      var scale = 2;
      var canvas = document.createElement('canvas');
      canvas.width = svgW * scale;
      canvas.height = svgH * scale;
      var ctx = canvas.getContext('2d');
      // data: URI avoids blob: in img-src CSP
      var dataUri = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgText)));
      var img = new Image();
      img.onload = function() {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function(pngBlob) {
          var url = URL.createObjectURL(pngBlob);
          triggerDownload(url, filename);
          setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
        }, 'image/png');
      };
      img.src = dataUri;
    });
}

function downloadBrandKit() {
  var file = 'sage-brand-kit.zip';
  fetch(file, { method: 'HEAD' })
    .then(function(r) {
      if (r.ok) {
        triggerDownload(file, file);
      } else {
        showBrandKitSoon();
      }
    })
    .catch(function() { showBrandKitSoon(); });
}

function showBrandKitSoon() {
  var btn = document.getElementById('brand-kit-btn');
  var msg = document.getElementById('brand-kit-soon');
  if (btn) btn.classList.add('hidden');
  if (msg) msg.classList.remove('hidden');
}
