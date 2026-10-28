/* CleanFrame TizenBrew bridge.
   TizenBrew serves app modules over http://127.0.0.1:8081, where the TV does
   not expose the Tizen web APIs. This service runs inside TizenBrew's own
   service (which has the tizen object and the application.launch privilege)
   and offers a tiny local HTTP API that CleanFrame's device.js calls.
   Plain ES5: older TizenBrew services run on an old Node.js. */
'use strict';

var http = require('http');
var url = require('url');
var PORT = 8091;

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(body));
}

function errText(err) {
  return (err && (err.message || err.name)) || String(err);
}

function launch(id, res) {
  try {
    tizen.application.launch(id,
      function () { send(res, 200, { ok: true }); },
      function (err) { send(res, 500, { ok: false, error: errText(err) }); });
  } catch (err) {
    send(res, 500, { ok: false, error: errText(err) });
  }
}

function apps(res) {
  try {
    tizen.application.getAppsInfo(function (list) {
      var out = [];
      for (var i = 0; i < list.length; i++) {
        var a = list[i];
        out.push({ id: a.id, name: a.name, show: a.show, iconPath: a.iconPath });
      }
      send(res, 200, { ok: true, apps: out });
    }, function (err) { send(res, 500, { ok: false, error: errText(err) }); });
  } catch (err) {
    send(res, 500, { ok: false, error: errText(err) });
  }
}

var server = http.createServer(function (req, res) {
  var u = url.parse(req.url, true);
  if (req.method === 'OPTIONS') { send(res, 204, {}); return; }
  if (u.pathname === '/ping') { send(res, 200, { ok: true, bridge: 'cleanframe' }); return; }
  if (u.pathname === '/launch' && u.query.id) { launch(String(u.query.id), res); return; }
  if (u.pathname === '/apps') { apps(res); return; }
  send(res, 404, { ok: false, error: 'unknown' });
});

server.on('error', function () {
  /* Port already in use: a previous start of this service is still running. */
});

server.listen(PORT, '127.0.0.1');
