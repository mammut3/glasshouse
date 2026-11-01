/* Home wallpapers: black, one of the sets fetched when chosen, or the owner's
 * own images uploaded from the browser, one for each time of day. The
 * Photos set rotates instead. None are
 * packaged; with the owner's own, a time of day without one is black.
 * Kept outside assets so updates do not carry them into the rollback copy.
 * Strict ES5 for the TV's Node 0.10/0.12. */
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var execFile = require('child_process').execFile;
var util = require('./util');
var installer = require('./installer');
var msg = require('./say').msg;
var fetchMod = require('./fetch');

var SLOTS = ['morning', 'afternoon', 'evening', 'night'];
// webOS web apps render at 1920x1080 (home-app/appinfo.json), so larger adds nothing on screen.
var MAX_WIDTH = 1920, MAX_HEIGHT = 1080;
var uploadsDir = '/var/lib/tvweb/home-wallpaper-uploads';
var setsDir = '/var/lib/tvweb/home-wallpaper-sets';
var choiceFile = '/var/lib/tvweb/home-wallpaper.json';
var uploading = false;
// The set being fetched, while it is.
var fetching = null;
var MAX_UPLOAD = 5 * 1024 * 1024;
/*
 * The sets, from a tag of their own repo so that they are not in every
 * release's download. A tag's files never change: each is pinned here.
 */
var SETS_BASE = 'https://raw.githubusercontent.com/rorygallagher2024/glasshouse-wallpapers/v2/';
var SETS = {
  landscape: { dir: '', sums: {
    morning: '07b116a4e124b5fa7021638c4653fab3ee1ad55dedeaed75dbcb3cd31cb13cc5',
    afternoon: '5c55ec973573e88f37805a65536ec1a07b5950de40ff19f9e54a30ef808f221c',
    evening: '651cf5c2123d35b4c06b2d317d3dc13e66806eea16a1d5e82c9e060eb8a1a743',
    night: '710be1cc3b9fb79f574f256eda6c64bb28e429c58e3a9d123ff6d5d40e8466eb' } },
  abstract: { dir: 'abstract/', sums: {
    morning: 'c8418d6a80e95c10644a2bad08b9355bea7bd337d32814e7fb298386ac3d7e56',
    afternoon: 'debe27bb99fb15cf51d82d9ad78363d6fa116f20913024d73c584182f040b3e0',
    evening: '1ccb4bbc5b176f26f643c84cdd255bac36707515093b64892630d5b3925e18d1',
    night: '189e934db4b5aff8608110e3cd4562cb70d50c32a044a1f8c441ac924baa84a7' } },
  /*
   * Twenty public-domain and CC0 landscape photos from Wikimedia Commons,
   * cropped to 1920x1080, kept on a tag of this fork's wallpapers branch with
   * their credits (CREDITS.md). Rotating: Glasshouse Home shows each in turn
   * rather than one for each time of day.
   */
  photos: { base: 'https://raw.githubusercontent.com/mammut3/glasshouse/photos-v1/', dir: 'photos/',
    rotate: true, maxEach: 1536 * 1024, sums: {
    p01: '774b17da0002095455f01ccc233cbb7ecfdd376f1de71f0a0be239b665fe2c95',
    p02: '4f5e7b371a4db94d271f3004a4c933901aa3874dee2afd9a4bcc71fd78f61d04',
    p03: 'cbbdc8d14faa2ac24faa676c8866932e694615dcf11eb2da8e93185efa9417e0',
    p04: 'b013ab822a7f099eaaeaff03f930f638191afd324ce21c09bd3c3c5764534dc1',
    p05: '53db5af4814d33a2697c3d512204d3b88881c336a5fe8e46099b2697573cbfb1',
    p06: '9f17ce24836629f1d30adee858683e48cbe0a5143e4aab605d912c237ea2f3d6',
    p07: '05ca74e97d87fd88563a7a507b5e208f63c1b8d1925afd34cbcc29db4043784c',
    p08: 'e1f7462dcbd3c0d864ce785c7d155959fb0a063d4f8fb7d362d1ba5ebca98386',
    p09: '85b485ebf3b1b3865e2247c8f552f4ebc2636b1d00271e3037fd3a149398715b',
    p10: '519fa9b0cfab07851bf8a029196f66f3fc9ea39901585586a2528e07ae10edb0',
    p11: 'e8c168a3e99d39950b9b06fe3d1a610f29e21197e9972936ccefef602b8a1ba8',
    p12: 'd84071028a45800c7bf2c05268bc00ba49b816670d12e01d84615120be131a30',
    p13: '6fdb49a9535e4451968f511b1c316f6b92f8eb410470a72cd15b29b89efb5b87',
    p14: 'eeed73ab93768cb1bf482b07d7bf6e29c08e8c5c15ac45b7296f63693e8ad2a4',
    p15: 'fda4b8b59ddf7cde233ddf409c61a2a765e7e87be07a30452b41103539290030',
    p16: '7451e2693be137a534512af7be2182ae9f5cacfa44357acf207541d64d1d7b98',
    p17: '73ef4e67c4661a76771909525a396ca52a1b300ddeb154425b866abb0c500b2f',
    p18: '94f8195a85f24e2fa6e55688e5bc1cfa9a63456679181db3215eec94a3d95496',
    p19: 'de5d8b26552d1c2e464dedfe66edada95e0902b96fe22e715e90eb07081f6e5b',
    p20: 'fb361d6eac1a9c5ed7e4ea927a05bb0a073e436e96dca4d7b6d68a3c79c6aecf' } }
};
// own is the owner's uploads; black, no picture at all.
var CHOICES = ['black', 'landscape', 'abstract', 'photos', 'own'];

// A set's pictures: one for each time of day, or a rotating set's own list.
function setKeys(name) { return SETS[name] && SETS[name].rotate ? Object.keys(SETS[name].sums) : SLOTS; }
function rotating() { return !!(SETS[choice] && SETS[choice].rotate); }
var choice = 'black';

function init(stateDir) {
  uploadsDir = path.join(stateDir, 'home-wallpaper-uploads');
  setsDir = path.join(stateDir, 'home-wallpaper-sets');
  choiceFile = path.join(stateDir, 'home-wallpaper.json');
  var saved = util.readJson(choiceFile, null);
  if (saved && CHOICES.indexOf(saved.choice) !== -1) choice = saved.choice;
  else migrate();
}

function sha256(file) {
  try { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); } catch (e) { return null; }
}

/*
 * Before the choice, uploads were the only wallpapers, and Add example
 * pictures copied the landscape set into them. Four uploads that are exactly
 * that set become it, kept rather than fetched again; any other uploads are
 * the owner's own.
 */
function migrate() {
  var own = SLOTS.filter(function (key) { return fs.existsSync(path.join(uploadsDir, key + '.jpg')); });
  choice = own.length ? 'own' : 'black';
  var set = SETS.landscape.sums;
  if (own.length === SLOTS.length && SLOTS.every(function (key) { return sha256(path.join(uploadsDir, key + '.jpg')) === set[key]; })) {
    try {
      util.mkdirp(path.join(setsDir, 'landscape'));
      SLOTS.forEach(function (key) { fs.renameSync(path.join(uploadsDir, key + '.jpg'), path.join(setsDir, 'landscape', key + '.jpg')); });
      choice = 'landscape';
    } catch (e) { console.error('home: could not keep the landscape wallpapers: ' + e.message); }
  }
  saveChoice();
}

function saveChoice() {
  try { fs.writeFileSync(choiceFile, JSON.stringify({ choice: choice }) + '\n'); }
  catch (e) { console.error('home: could not save the wallpaper choice: ' + e.message); }
}

function status() {
  var slots = {}, revision = [choice];
  setKeys(choice).forEach(function (key) {
    var file = image(key), st = null;
    try { if (file) st = fs.statSync(file); } catch (e) {}
    slots[key] = !!st;
    revision.push(st ? String(Number(st.mtime)) + '-' + st.size : '0');
  });
  var keys = Object.keys(slots);
  return { available: keys.some(function (key) { return slots[key]; }),
    choice: choice, choices: CHOICES, fetching: fetching,
    uploading: uploading || !!fetching, slots: slots, revision: revision.join('.'),
    // A rotating set's pictures, in the order Glasshouse Home shows them.
    rotate: rotating() ? keys.filter(function (key) { return slots[key]; }) : null };
}

function setFile(name, key) { return path.join(setsDir, name, key + '.jpg'); }

// The picture for a time of day, from the chosen set or the owner's own.
function image(key) {
  if (setKeys(choice).indexOf(key) === -1 || choice === 'black') return null;
  var file = choice === 'own' ? path.join(uploadsDir, key + '.jpg') : setFile(choice, key);
  try { if (fs.statSync(file).isFile()) return file; } catch (e) {}
  return null;
}

// Every slot's image, or with only, that slot's alone.
function removeUploads(cb, only) {
  if (uploading) return cb({ ok: false, error: msg('srv.home.wallUploading', 'Wait for the wallpaper upload to finish.') });
  if (only !== undefined && SLOTS.indexOf(only) === -1) return cb({ ok: false, error: msg('srv.home.wallSlot', 'unknown wallpaper slot') });
  try {
    (only !== undefined ? [only] : SLOTS).forEach(function (key) {
      [key + '.jpg', key + '.jpg.part'].forEach(function (name) {
        try { fs.unlinkSync(path.join(uploadsDir, name)); } catch (e) { if (e.code !== 'ENOENT') throw e; }
      });
    });
  } catch (e) { return cb({ ok: false, error: e.message }); }
  cb({ ok: true, wallpapers: status() });
}

// The browser re-encodes uploads as JPEG. Check the format and frame bounds
// again here; no filename or image metadata becomes a filesystem path.
function validJpeg(buf) {
  if (buf.length < 12 || buf.readUInt16BE(0) !== 65496 || buf.readUInt16BE(buf.length - 2) !== 65497) return false;
  var at = 2, components = 0, scanned = false, quantised = false, huffman = false;
  while (at + 2 <= buf.length) {
    if (buf[at++] !== 255) return false;
    while (buf[at] === 255) at++;
    var marker = buf[at++];
    if (marker === 217) return at === buf.length && !!components && scanned && quantised && huffman;
    if (at + 2 > buf.length) return false;
    var len = buf.readUInt16BE(at);
    if (len < 2 || at + len > buf.length) return false;
    if (marker === 192 || marker === 194) {
      if (len < 8) return false;
      var height = buf.readUInt16BE(at + 3), width = buf.readUInt16BE(at + 5);
      var count = buf[at + 7];
      if (components || buf[at + 2] !== 8 || (count !== 1 && count !== 3) || len !== 8 + 3 * count ||
          !width || !height || width > MAX_WIDTH || height > MAX_HEIGHT) return false;
      components = count;
    }
    if (marker === 219) { if (len < 67) return false; quantised = true; }
    if (marker === 196) { if (len < 20) return false; huffman = true; }
    if (marker === 218) {
      var scanComponents = buf[at + 2];
      if (!components || !quantised || !huffman || !scanComponents || scanComponents > components || len !== 6 + 2 * scanComponents) return false;
      at += len;
      var start = at;
      // Entropy data may contain escaped FF bytes and restart markers.
      // A scan must reach another marker, not merely end in a claimed EOI.
      while (at < buf.length) {
        if (buf[at] !== 255) { at++; continue; }
        var next = buf[at + 1];
        if (next === 0 || (next >= 208 && next <= 215)) { at += 2; continue; }
        break;
      }
      if (at === start) return false;
      scanned = true;
      continue;
    }
    at += len;
  }
  return false;
}

function upload(key, req, cb) {
  function refused(text, code) { cb({ ok: false, error: text, status: code || 400 }); }
  if (SLOTS.indexOf(key) === -1) return refused('unknown wallpaper slot');
  if (uploading) return refused(msg('srv.home.wallUploading', 'Wait for the wallpaper upload to finish.'), 409);
  var length = String(req.headers['content-length'] || '');
  if (req.headers['transfer-encoding'] || !/^\d{1,8}$/.test(length) || +length < 1 || +length > MAX_UPLOAD) {
    return refused(msg('srv.home.wallUploadSize', 'The uploaded JPEG must be at most 5 MB and state its size.'), 413);
  }
  uploading = true;
  var chunks = [], got = 0, ended = false, finished = false;
  var file = path.join(uploadsDir, key + '.jpg'), staging = file + '.part';
  var timer = setTimeout(function () { finish(msg('srv.home.wallUploadTimeout', 'The wallpaper upload timed out.'), 408); }, 30000);
  function finish(text, code, abandoned) {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    chunks = [];
    uploading = false;
    if (abandoned) return;
    if (text) return refused(text, code);
    cb({ ok: true, wallpapers: status() });
  }
  req.on('aborted', function () { if (!ended) finish(null, null, true); });
  req.on('error', function () { if (!ended) finish(null, null, true); });
  req.on('close', function () { if (!ended) finish(null, null, true); });
  req.on('data', function (chunk) {
    if (finished) return;
    got += chunk.length;
    if (got > +length) return finish(msg('srv.home.wallUploadSize', 'The uploaded JPEG must be at most 5 MB and state its size.'), 413);
    chunks.push(chunk);
  });
  req.on('end', function () {
    if (finished) return;
    ended = true;
    clearTimeout(timer);
    var buf = Buffer.concat(chunks);
    chunks = [];
    if (got !== +length || !validJpeg(buf)) {
      return finish(msg('srv.home.wallUploadImage', 'Choose a valid JPEG up to 1920 × 1080 pixels.'));
    }
    try { if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir); }
    catch (e) { return finish(e.message, 500); }
    execFile('df', ['-k', uploadsDir], { timeout: 5000 }, function (err, out) {
      var free = err ? null : installer.parseDf(out);
      if (free === null || free < buf.length + 5 * 1024 * 1024) {
        return finish(msg('srv.home.wallUploadSpace', 'Not enough confirmed free space for the wallpaper.'), 507);
      }
      fs.writeFile(staging, buf, { mode: parseInt('600', 8) }, function (writeError) {
        if (writeError) { util.unlinkQuiet(staging); return finish(writeError.message, 500); }
        fs.rename(staging, file, function (renameError) {
          if (renameError) util.unlinkQuiet(staging);
          // A picture of the owner's own is chosen by uploading it.
          else if (choice !== 'own') ownChosen();
          finish(renameError && renameError.message, renameError ? 500 : null);
        });
      });
    });
  });
}

/*
 * Black, a set or the owner's own. A set is fetched the first time it is
 * chosen, each picture checked against its pinned sum; only the chosen set is
 * kept, so the other is removed. The owner's own uploads are always kept.
 */
function choose(name, cb) {
  if (CHOICES.indexOf(name) === -1) return cb({ ok: false, error: msg('srv.home.wallChoice', 'unknown wallpaper choice') });
  if (uploading || fetching) return cb({ ok: false, error: msg('srv.home.wallUploading', 'Wait for the wallpaper upload to finish.'), status: 409 });
  function chosen() {
    choice = name;
    saveChoice();
    Object.keys(SETS).forEach(function (other) { if (other !== name) removeSet(other); });
    cb({ ok: true, wallpapers: status() });
  }
  if (!SETS[name]) return chosen();
  var dir = path.join(setsDir, name);
  var missing = setKeys(name).filter(function (key) { return sha256(setFile(name, key)) !== SETS[name].sums[key]; });
  var maxEach = SETS[name].maxEach || MAX_UPLOAD;
  if (!missing.length) return chosen();
  try { util.mkdirp(dir); } catch (e) { return cb({ ok: false, error: e.message }); }
  fetching = name;
  function failed(error) {
    fetching = null;
    cb({ ok: false, error: error, wallpapers: status() });
  }
  execFile('df', ['-k', dir], { timeout: 5000 }, function (err, out) {
    var free = err ? null : installer.parseDf(out);
    if (free === null || free < missing.length * maxEach + 5 * 1024 * 1024) {
      return failed(msg('srv.home.wallUploadSpace', 'Not enough confirmed free space for the wallpaper.'));
    }
    (function next(i) {
      if (i >= missing.length) { fetching = null; return chosen(); }
      var key = missing[i], file = setFile(name, key), staging = file + '.part';
      fetchMod.download((SETS[name].base || SETS_BASE) + SETS[name].dir + key + '.jpg', staging, {}, function (fetchError) {
        if (fetchError) { util.unlinkQuiet(staging); return failed(fetchError.message); }
        fs.readFile(staging, function (readError, buf) {
          if (readError) { util.unlinkQuiet(staging); return failed(readError.message); }
          if (buf.length > maxEach || crypto.createHash('sha256').update(buf).digest('hex') !== SETS[name].sums[key] || !validJpeg(buf)) {
            util.unlinkQuiet(staging);
            return failed(msg('srv.home.wallExampleBad', 'A wallpaper did not download intact. Try again later.'));
          }
          try { fs.chmodSync(staging, parseInt('600', 8)); } catch (e) {}
          fs.rename(staging, file, function (renameError) {
            if (renameError) { util.unlinkQuiet(staging); return failed(renameError.message); }
            next(i + 1);
          });
        });
      });
    })(0);
  });
}

function ownChosen() {
  choice = 'own';
  saveChoice();
  Object.keys(SETS).forEach(removeSet);
}

function removeSet(name) {
  var dir = path.join(setsDir, name);
  setKeys(name).forEach(function (key) { util.unlinkQuiet(path.join(dir, key + '.jpg')); util.unlinkQuiet(path.join(dir, key + '.jpg.part')); });
  try { fs.rmdirSync(dir); } catch (e) {}
}

module.exports = { init: init, status: status, image: image, upload: upload, removeUploads: removeUploads,
  choose: choose, SETS: SETS };
