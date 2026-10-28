/* Public Tizen application APIs. No Mac server, network address or credentials. */
(function () {
  'use strict';
  var IDS = {
    stremio: 'IkWsFHtOY9.Stremio', netflix: 'org.tizen.netflix-app',
    disneyplus: 'MCmYXNxgcu.DisneyPlus', youtube: '9Ur5IzDKqV.TizenYouTube',
    appletv: 'com.samsung.tv.aria-video', primevideo: 'org.tizen.primevideo',
    abciview: 'mWK87Xghap.ABCiview', sbs: 'OyE7OuxlUi.SBSOnDemand',
    applemusic: 'org.tizen.apple.apple-music'
  };
  var STREAMING = ['as6cYRgkPy.Binge', '73iTZRTc34.Stan', '5b8c3eb16b.BeamCTVDev',
    'cj37Ni3qXM.HBONow', 'LBUAQX1exg.Hulu', 'gzcc4LRFBF.Peacock', 'rJyOSqC6Up.CBSAllAccess',
    'Rk72oKFsRS.OtterKidsProd', '70fRFUwYlD.OtterGAProd', 'PvWgqxV3Xa.YouTubeTV',
    'XtU8fQk2gN.ESPN', 'ZmmGjO6VKO.slingtv', 'VtuWAiZdHN.STARZPlay', 'ckfgqqzvt0.dplus',
    'kk8MbItQ0H.VUDU', 'Jz7aUrV2Q4.Twitch', 'OK2Rdkjmsi.IMDbTV', 'Ob3XhAVMu6.amcplus',
    'KaLitts8bq.tenplaySamsungTizen', 'eYuOiOLYQX.KayoSports', 'Ne2ZsPWdKl.9NOW',
    '3KA0pm7a7V.TubiTV', 'rJeHak5zRg.Spotify', 'icp4AvUPiA.7plus'];
  var CONSUMER_SYSTEM = ['org.tizen.browser', 'com.microsoft.copilot'];
  var EXTRA_BRANDS = {'rJeHak5zRg.Spotify': 'spotify', '5b8c3eb16b.BeamCTVDev': 'hbomax', 'cj37Ni3qXM.HBONow': 'hbomax', '3KA0pm7a7V.TubiTV': 'tubi'};
  var INTERNAL = ['adplatform.ADPlayer', 'WykOS4t4F0.cmsWebApp', '25emanual3.emanual',
    'd0m1lV1nt2.emanual', '2022ePop01.SmartTV',
    'ZODRT12q2l.WebAccountExtension', 'ByJlgt0XeD.CastSettingsApp', 'tv6pbVMQFF.PrivacyChoices'];
  var SELF = 'nClrkHome1.FrameHome';
  function api() { return window.tizen && window.tizen.application; }
  /* TizenBrew serves modules from 127.0.0.1:8081 without Tizen APIs.
     service/bridge.js (started by TizenBrew) answers on port 8091. */
  var BRIDGE = 'http://127.0.0.1:8091';
  function bridged() {
    return !api() && location.hostname === '127.0.0.1' && location.port === '8081';
  }
  function bridge(path, done, timeout) {
    var xhr = new XMLHttpRequest(), finished = false;
    function finish(err, value) { if (finished) return; finished = true; done(err, value); }
    try {
      xhr.open('GET', BRIDGE + path, true);
      xhr.timeout = timeout || 8000;
      xhr.onload = function () {
        var body = null;
        try { body = JSON.parse(xhr.responseText); } catch (err) { body = null; }
        if (xhr.status === 200 && body && body.ok) finish(null, body);
        else finish({ message: 'The TV could not open this screen.', detail: body && body.error || ('Bridge status ' + xhr.status) });
      };
      xhr.onerror = xhr.ontimeout = function () {
        finish({ message: 'CleanFrame bridge is not running.', detail: 'Reopen CleanFrame from TizenBrew so its service starts.' });
      };
      xhr.send();
    } catch (err) { finish({ message: 'CleanFrame bridge is not running.', detail: err && err.message || '' }); }
  }
  function selfId() {
    try { return api().getCurrentApplication().appInfo.id || SELF; }
    catch (err) { return SELF; }
  }
  function unavailable(done) {
    done({ message: 'Open CleanFrame on the TV to use this control.', detail: 'The web preview cannot control the TV.' });
  }
  function failure(err) {
    return { message: 'The TV could not open this screen.', detail: err && (err.message || err.name) || 'Try again, or press the remote’s Home button to return to CleanFrame.' };
  }
  function bounded(done, timeout) {
    var finished = false, timer = setTimeout(function () { finish({ message: 'The TV did not respond. Please try again.' }); }, timeout || 8000);
    function finish(err, value) { if (finished) return; finished = true; clearTimeout(timer); done(err, value); }
    return finish;
  }
  function launchApp(id, done) {
    if (bridged()) { bridge('/launch?id=' + encodeURIComponent(id), function (err) { done(err || null); }); return; }
    if (!api()) { unavailable(done); return; }
    var finish = bounded(done);
    try { api().launch(id, function () { finish(null); }, function (err) { finish(failure(err)); }); }
    catch (err) { finish(failure(err)); }
  }
  function launch(brand, done) {
    if (!IDS[brand]) { done({message: 'This app has no launch target.'}); return; }
    launchApp(IDS[brand], done);
  }
  function art(done) {
    if (!api()) { unavailable(done); return; }
    var finish = bounded(done);
    try {
      var data = [new tizen.ApplicationControlData('mode', ['fullscreen']), new tizen.ApplicationControlData('requester', ['mobile'])];
      var control = new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/default', null, null, null, data);
      api().launchAppControl(control, 'org.tizen.art-app', function () { finish(null); }, function (err) { finish(failure(err)); });
    } catch (err) { finish(failure(err)); }
  }
  /* Switch to the first connected HDMI input when tv.window is available,
     then open Samsung's TV viewer full screen. Without tv.window (e.g. inside
     TizenBrew) the viewer opens on the last used input. */
  function input(done) {
    if (bridged()) { launchApp('org.tizen.tv-viewer', done); return; }
    if (!api()) { unavailable(done); return; }
    var t = window.tizen, opened = false;
    function viewer() { if (opened) return; opened = true; launchApp('org.tizen.tv-viewer', done); }
    try {
      if (!t.tvwindow || !t.systeminfo) { viewer(); return; }
      var guard = setTimeout(viewer, 3000);
      t.systeminfo.getPropertyValue('VIDEOSOURCE', function (info) {
        var src = null;
        (info.connected || []).forEach(function (s) { if (!src && s.type === 'HDMI') src = s; });
        if (!src) { clearTimeout(guard); viewer(); return; }
        try {
          t.tvwindow.setSource(src, function () { clearTimeout(guard); viewer(); },
            function () { clearTimeout(guard); viewer(); }, 'MAIN');
        } catch (err) { clearTimeout(guard); viewer(); }
      }, function () { clearTimeout(guard); viewer(); });
    } catch (err) { viewer(); }
  }
  function home(done) { launchApp('com.samsung.tv.csfs', done); }
  function settings(done) { launchApp('com.samsung.tv.coba.setting', done); }
  function apps(done) {
    if (bridged()) {
      bridge('/apps', function (err, body) {
        if (err) { done(err); return; }
        /* file:// icons do not load from the http module page; use brand icons only. */
        var list = (body.apps || []).map(function (a) { return { id: a.id, name: a.name, show: a.show, iconPath: '' }; });
        done(null, sortApps(list));
      }, 20000);
      return;
    }
    if (!api()) { unavailable(done); return; }
    // Large installed catalogues can take longer than a launch response.
    var finish = bounded(done, 20000);
    try {
      api().getAppsInfo(function (list) { finish(null, sortApps(list)); }, function (err) { finish(failure(err)); });
    } catch (err) { finish(failure(err)); }
  }
  function sortApps(list) {
        var known = {}, seen = {}, result = [], self = selfId();
        Object.keys(IDS).forEach(function (brand) { known[IDS[brand]] = brand; });
        list.forEach(function (a) {
          var primary = !!known[a.id], stream = STREAMING.indexOf(a.id) >= 0;
          var consumer = /^[A-Za-z0-9]{10}\.[A-Za-z0-9_-]+$/.test(a.id) || CONSUMER_SYSTEM.indexOf(a.id) >= 0;
          if (a.id === self || INTERNAL.indexOf(a.id) >= 0 || seen[a.id] || !a.name || (!primary && !stream && (!a.show || !consumer))) return;
          if (!primary && /(?:service|worker|preview|promotion|plugin|launcher|test|sdk|^ep[ -]|factory|daemon)/i.test(a.name + ' ' + a.id)) return;
          if (/-dummy$/.test(a.id) || a.id === 'com.samsung.tv.cobalt-yt') return;
          seen[a.id] = true;
          result.push({ appId: a.id, name: a.name, brand: known[a.id] || EXTRA_BRANDS[a.id] || '', icon: a.iconPath || '', rank: primary ? Object.keys(IDS).indexOf(known[a.id]) : (stream ? 20 : 30) });
        });
        result.sort(function (a, b) { return a.rank - b.rank || a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
        return result;
  }
  window.FrameDevice = { launch: launch, launchApp: launchApp, input: input, art: art, home: home, settings: settings, apps: apps };
}());
