function triggerDownload(url, filename) {
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function downloadSVG(src, filename) {
  triggerDownload(src, filename);
}

function downloadAsPNG(svgSrc, filename, svgW, svgH) {
  fetch(svgSrc)
    .then(function(r) {
      if (!r.ok) throw new Error('SVG fetch failed: ' + r.status);
      return r.text();
    })
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
        triggerDownload(canvas.toDataURL('image/png'), filename);
      };
      img.src = dataUri;
    })
    .catch(function(e) { console.warn('PNG download failed:', e.message); });
}

function downloadBrandKit() {
  triggerDownload('sage-brand-kit.zip', 'sage-brand-kit.zip');
}

document.addEventListener('click', function(e) {
  var btn = e.target.closest('[data-action]');
  if (!btn) return;
  var action = btn.dataset.action;
  if (action === 'download-svg') {
    downloadSVG(btn.dataset.src, btn.dataset.filename);
  } else if (action === 'download-png') {
    downloadAsPNG(btn.dataset.src, btn.dataset.filename, +btn.dataset.width, +btn.dataset.height);
  } else if (action === 'download-brand-kit') {
    downloadBrandKit();
  }
});
