// Safe DOM helpers — exposes window.Safe.
// Prevents XSS when composing innerHTML from API or user-controlled data.
//
// Usage:
//   Safe.setHTML(el, Safe.html`<p>${user.name}</p>`);
//   Safe.setHTML(el, rows.map(r => Safe.html`<li>${r.name}</li>`));
//   Safe.html`<a href="${Safe.url(externalUrl)}">link</a>`;
//   Safe.html`<div>${Safe.raw(preRenderedSafeHtml)}</div>`;
(function (global) {
  'use strict';

  var HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escapeHTML(v) {
    if (v == null) return '';
    return String(v).replace(/[&<>"']/g, function (c) { return HTML_ESCAPES[c]; });
  }

  // Allow http(s), mailto, tel, relative paths, fragments, query strings.
  // Reject javascript:, data: (except data:image/*), vbscript:, file:, etc.
  function isSafeUrl(v) {
    if (v == null) return false;
    var s = String(v).trim();
    if (!s) return false;
    if (/^\s*(javascript|vbscript|file):/i.test(s)) return false;
    if (/^\s*data:/i.test(s) && !/^\s*data:image\//i.test(s)) return false;
    if (/^(https?:|mailto:|tel:)/i.test(s)) return true;
    if (/^\/\//.test(s)) return false; // protocol-relative — points at an arbitrary external host
    if (/^[\/?#]/.test(s)) return true; // relative
    if (/^[\w.-]+(\/|$)/.test(s)) return true; // bare relative path
    return false;
  }

  function sanitizeUrl(v) { return isSafeUrl(v) ? escapeHTML(v) : ''; }

  function isSafeObj(v) { return v && typeof v === 'object' && v.__safe === true; }
  function isUrlObj(v)  { return v && typeof v === 'object' && v.__url === true; }

  function renderValue(v) {
    if (v == null) return '';
    if (isSafeObj(v)) return v.value;
    if (isUrlObj(v)) return sanitizeUrl(v.value);
    if (Array.isArray(v)) {
      var out = '';
      for (var i = 0; i < v.length; i++) out += renderValue(v[i]);
      return out;
    }
    return escapeHTML(v);
  }

  function html(strings) {
    var out = '';
    for (var i = 0; i < strings.length; i++) {
      out += strings[i];
      if (i + 1 < arguments.length) out += renderValue(arguments[i + 1]);
    }
    return { __safe: true, value: out };
  }

  function raw(value) { return { __safe: true, value: String(value == null ? '' : value) }; }
  function url(value) { return { __url: true, value: value }; }

  function setHTML(el, value) {
    if (!el) return;
    if (isSafeObj(value)) { el.innerHTML = value.value; return; }
    if (Array.isArray(value)) { el.innerHTML = renderValue(value); return; }
    el.textContent = value == null ? '' : String(value);
  }

  global.Safe = { html: html, raw: raw, url: url, setHTML: setHTML, escapeHTML: escapeHTML, isSafeUrl: isSafeUrl };
})(window);
