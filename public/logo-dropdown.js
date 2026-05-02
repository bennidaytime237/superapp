function toggleLogoDropdown(event) {
  event.stopPropagation();
  const button = event.currentTarget;
  const menu = button.querySelector('[id$="-dropdown-menu"]');
  if (menu) {
    const isHidden = menu.style.display === 'none' || menu.classList.contains('hidden');
    menu.style.display = isHidden ? 'block' : 'none';
  }
}

function closeLogoDropdown() {
  document.querySelectorAll('[id$="-dropdown-menu"]').forEach(menu => {
    menu.style.display = 'none';
  });
}

function downloadLogoAsPNG() {
  const svg = document.getElementById('logo-svg');
  const svgData = new XMLSerializer().serializeToString(svg);
  const img = new Image();

  img.onload = function() {
    const canvas = document.createElement('canvas');
    canvas.width = svg.getAttribute('width') || 2230;
    canvas.height = svg.getAttribute('height') || 4216;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'sage-logo.png';
    link.click();
    closeLogoDropdown();
  };

  img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
}

function downloadLogoAsSVG() {
  const svg = document.getElementById('logo-svg');
  const svgData = new XMLSerializer().serializeToString(svg).replace(' style="display: none;"', '');
  const blob = new Blob([svgData], { type: 'image/svg+xml' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'sage-logo.svg';
  link.click();
  URL.revokeObjectURL(link.href);
  closeLogoDropdown();
}

function followOnX() {
  window.open('https://twitter.com/sage', '_blank');
  closeLogoDropdown();
}

document.addEventListener('click', function(event) {
  const dropdowns = document.querySelectorAll('[id$="-dropdown-menu"]');
  const buttons = document.querySelectorAll('[id$="-dropdown-btn"]');

  let isClickOnButton = false;
  buttons.forEach(button => {
    if (button.contains(event.target)) {
      isClickOnButton = true;
    }
  });

  let isClickOnMenu = false;
  dropdowns.forEach(menu => {
    if (menu.contains(event.target)) {
      isClickOnMenu = true;
    }
  });

  if (!isClickOnButton && !isClickOnMenu) {
    closeLogoDropdown();
  }
});
