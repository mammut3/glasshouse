/*
 * Line icons for HDMI input tiles, chosen from the CEC or input name, for
 * Glasshouse Home and the input bar. Strict ES5: the TV's own browser runs it.
 */
(function (root) {
  var ICONS = {
    handheld: '<rect x="2" y="6" width="20" height="12" rx="3"/><path d="M6.5 6v12M17.5 6v12"/>' +
      '<circle cx="4.3" cy="10" r=".7" fill="currentColor"/><circle cx="19.7" cy="14" r=".7" fill="currentColor"/>',
    console: '<path d="M7 8h10a4 4 0 0 1 4 4l.6 4.2a2.3 2.3 0 0 1-4 1.8L15.5 16h-7l-2.1 2a2.3 2.3 0 0 1-4-1.8L3 12a4 4 0 0 1 4-4z"/>' +
      '<path d="M7.5 10.5v3M6 12h3"/><circle cx="15.5" cy="11" r=".7" fill="currentColor"/><circle cx="17.5" cy="13" r=".7" fill="currentColor"/>',
    stream: '<rect x="4" y="13" width="16" height="6" rx="2"/><path d="M8.5 9.5a5 5 0 0 1 7 0M6 7a8.5 8.5 0 0 1 12 0"/>',
    audio: '<rect x="2" y="10" width="20" height="5" rx="2.5"/><path d="M6 12.5h.01M10 12.5h.01M14 12.5h.01M18 12.5h.01"/>',
    disc: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2"/>',
    pc: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M9 20h6M12 16v4"/>',
    tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 20h8M9 2l3 3 3-3"/>',
    plug: '<path d="M5 9h14v3l-2 3H7l-2-3z"/><path d="M8 15v3h8v-3"/>'
  };
  // Handheld is tested before console so "Switch2 Game Console" gets the handheld.
  /** @type {Array<[string, RegExp]>} */
  var KINDS = [
    ['handheld', /nintendo|switch ?\d|switch game|steam ?deck/],
    ['console', /xbox|playstation|\bps[345]\b|console|gaming/],
    ['stream', /apple ?tv|roku|chromecast|fire ?tv|firestick|shield|google ?tv|streamer/],
    ['audio', /sonos|sound ?bar|receiver|\bavr\b|denon|yamaha|marantz|onkyo|bose/],
    ['disc', /blu-?ray|dvd/],
    ['pc', /\bpc\b|computer|\bmac\b|macbook|laptop|desktop/],
    ['tv', /cable|satellite|xfinity|directv|\bdish\b|tivo/]
  ];
  function kindOf(d) {
    var s = ((d && d.name) || '') + ' ' + ((d && d.id) || '');
    s = s.toLowerCase();
    for (var k = 0; k < KINDS.length; k++) {
      if (KINDS[k][1].test(s)) return KINDS[k][0];
    }
    return 'plug';
  }
  /*
   * Brand marks for the devices the input bar shows as a logo on the brand's
   * colour. Paths from Simple Icons (CC0; Xbox from 10.0.0, since removed
   * there), 24x24. The marks are their owners' trademarks, used here only to
   * name the device on the input it is connected to.
   */
  /** @type {Array<{ match: RegExp, color: string, path: string }>} */
  var BRANDS = [
    { match: /xbox/, color: '#107C10',
      path: 'M4.102 21.033C6.211 22.881 8.977 24 12 24c3.026 0 5.789-1.119 7.902-2.967 1.877-1.912-4.316-8.709-7.902-11.417-3.582 2.708-9.779 9.505-7.898 11.417zm11.16-14.406c2.5 2.961 7.484 10.313 6.076 12.912C23.002 17.48 24 14.861 24 12.004c0-3.34-1.365-6.362-3.57-8.536 0 0-.027-.022-.082-.042-.063-.022-.152-.045-.281-.045-.592 0-1.985.434-4.805 3.246zM3.654 3.426c-.057.02-.082.041-.086.042C1.365 5.642 0 8.664 0 12.004c0 2.854.998 5.473 2.661 7.533-1.401-2.605 3.579-9.951 6.08-12.91-2.82-2.813-4.216-3.245-4.806-3.245-.131 0-.223.021-.281.046v-.002zM12 3.551S9.055 1.828 6.755 1.746c-.903-.033-1.454.295-1.521.339C7.379.646 9.659 0 11.984 0H12c2.334 0 4.605.646 6.766 2.085-.068-.046-.615-.372-1.52-.339C14.946 1.828 12 3.545 12 3.545v.006z' },
    { match: /apple ?tv/, color: '#3a3a3c',
      path: 'M20.57 17.735h-1.815l-3.34-9.203h1.633l2.02 5.987c.075.231.273.9.586 2.012l.297-.997.33-1.006 2.094-6.004H24zm-5.344-.066a5.76 5.76 0 0 1-1.55.207c-1.23 0-1.84-.693-1.84-2.087V9.646h-1.063V8.532h1.121V7.081l1.476-.602v2.062h1.707v1.113H13.38v5.805c0 .446.074.75.214.932.14.182.396.264.75.264.207 0 .495-.041.883-.115zm-7.29-5.343c.017 1.764 1.55 2.358 1.567 2.366-.017.042-.248.842-.808 1.658-.487.71-.99 1.418-1.79 1.435-.783.016-1.03-.462-1.93-.462-.89 0-1.17.445-1.913.478-.758.025-1.344-.775-1.838-1.484-.998-1.451-1.765-4.098-.734-5.88.51-.89 1.426-1.451 2.416-1.46.75-.016 1.468.512 1.93.512.461 0 1.327-.627 2.234-.536.38.016 1.452.157 2.136 1.154-.058.033-1.278.743-1.27 2.219M6.468 7.988c.404-.495.685-1.18.61-1.864-.585.025-1.294.388-1.723.883-.38.437-.71 1.138-.619 1.806.652.05 1.328-.338 1.732-.825Z' },
    { match: /nintendo|switch ?\d|switch game/, color: '#E60012',
      path: 'M14.176 24h3.674c3.376 0 6.15-2.774 6.15-6.15V6.15C24 2.775 21.226 0 17.85 0H14.1c-.074 0-.15.074-.15.15v23.7c-.001.076.075.15.226.15zm4.574-13.199c1.351 0 2.399 1.125 2.399 2.398 0 1.352-1.125 2.4-2.399 2.4-1.35 0-2.4-1.049-2.4-2.4-.075-1.349 1.05-2.398 2.4-2.398zM11.4 0H6.15C2.775 0 0 2.775 0 6.15v11.7C0 21.226 2.775 24 6.15 24h5.25c.074 0 .15-.074.15-.149V.15c.001-.076-.075-.15-.15-.15zM9.676 22.051H6.15c-2.326 0-4.201-1.875-4.201-4.201V6.15c0-2.326 1.875-4.201 4.201-4.201H9.6l.076 20.102zM3.75 7.199c0 1.275.975 2.25 2.25 2.25s2.25-.975 2.25-2.25c0-1.273-.975-2.25-2.25-2.25s-2.25.977-2.25 2.25z' }
  ];
  // The device's brand mark and colour, or null where it has none here.
  root.glasshouseDevBrand = function (d) {
    var s = (((d && d.name) || '') + ' ' + ((d && d.id) || '')).toLowerCase();
    for (var b = 0; b < BRANDS.length; b++) {
      if (BRANDS[b].match.test(s)) {
        return { color: BRANDS[b].color,
          svg: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="' + BRANDS[b].path + '"/></svg>' };
      }
    }
    return null;
  };
  root.glasshouseDevIcon = function (d) {
    return '<i class="dico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + ICONS[kindOf(d)] + '</svg></i>';
  };
// Untyped for the type check, which does not know the name added to it.
})(/** @type {any} */ (window));
