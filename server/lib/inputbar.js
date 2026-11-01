/*
 * lib/inputbar.js - keeps the input bar loaded, so a press shows it at once
 *
 * The input bar (assets/inputbar-app/) is an overlay web app. Started on the
 * press, a C1 (webOS 6.5) had it on screen about 0.7 s later; started hidden
 * beforehand with { "preload": "full" }, the press found it loaded and it
 * was up 0.35 s after it. keepAlive in its appinfo.json was not honoured for
 * it, and PalmSystem.hide() left the window up and holding the remote's
 * focus, so it closes for real after each use and is preloaded again here.
 *
 * Preloaded while a remote key opens it and the TV is on: shortly after the
 * server starts, at each switch-on, and whenever it is no longer running,
 * seen through applicationManager/running. A preloaded app has no window,
 * takes no keys and leaves the input in front as it was.
 *
 * Strict ES5: runs on node 0.12.
 */
var luna = require('./luna');

var APP = 'com.tvweb.inputbar';
// After a close, so a press that closed it is not met by a launch at once.
var AFTER_CLOSE_MS = 2000;
var AFTER_START_MS = 30000;
var AFTER_SWITCH_ON_MS = 5000;
// A launch refused this many times in a row (the app removed, say) stops the
// preloading until the server starts again.
var MAX_FAILURES = 5;

var lunaFn = null;
var wantedFn = function () { return false; };
var onFn = function () { return true; };
var sub = null;
var running = null;     // whether the app is running, once the TV has said
var timer = null;
var failures = 0;

function schedule(ms) {
  clearTimeout(timer);
  timer = setTimeout(ensure, ms);
  if (timer.unref) timer.unref();
}

function ensure() {
  timer = null;
  if (failures >= MAX_FAILURES || running !== false) return;
  if (!wantedFn() || !onFn()) return;
  lunaFn('com.webos.applicationManager/launch', { id: APP, preload: 'full' }, function (r) {
    if (r && r.returnValue) {
      failures = 0;
      return;
    }
    failures++;
    console.log('inputbar: preload refused: ' + ((r && (r.errorText || r.errorCode)) || 'no answer') +
      (failures >= MAX_FAILURES ? '; not trying again' : ''));
    if (failures < MAX_FAILURES) schedule(AFTER_CLOSE_MS * failures * 5);
  });
}

function runningChanged(r) {
  if (!r || !Array.isArray(r.running)) return;
  var now = r.running.some(function (a) { return a && a.id === APP; });
  var was = running;
  running = now;
  if (!now && was !== false) schedule(AFTER_CLOSE_MS);
}

/*
 * opts: luna (call), wanted() whether a remote key opens the bar, on()
 * whether the TV is on.
 */
function init(opts) {
  opts = opts || {};
  lunaFn = opts.luna;
  if (typeof opts.wanted === 'function') wantedFn = opts.wanted;
  if (typeof opts.on === 'function') onFn = opts.on;
}

function start() {
  if (sub || !lunaFn) return;
  sub = new luna.Subscription('com.webos.applicationManager/running', { subscribe: true }, null, {});
  sub.handlers.message = runningChanged;
  sub.start();
  schedule(AFTER_START_MS);
}

// The TV switched on, or a key was set to open the bar.
function poke() {
  schedule(AFTER_SWITCH_ON_MS);
}

module.exports = { init: init, start: start, poke: poke, APP: APP };
