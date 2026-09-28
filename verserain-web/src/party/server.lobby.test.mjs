// The shared global-lobby room forgets players as soon as they disconnect,
// so its STATE_UPDATE broadcasts stay the size of who is online; game rooms
// keep a disconnected player's entry so they can reconnect mid-game.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Server from './server.js';

function makeServer(id) {
  const sent = [];
  const room = { id, storage: { async get() {}, async put() {}, async delete() {}, async list() { return new Map(); } }, broadcast: (m) => sent.push(m) };
  return { srv: new Server(room), sent };
}
const connect = (srv, id, query = 'name=P') =>
  srv.onConnect({ id }, { request: new Request(`https://x.partykit.dev/parties/main/room?${query}`) });

test('global-lobby drops disconnected players', () => {
  const { srv, sent } = makeServer('global-lobby');
  for (let i = 0; i < 5; i++) { connect(srv, `c${i}`); srv.onClose({ id: `c${i}` }); }
  connect(srv, 'live');
  assert.deepEqual(Object.keys(srv.state.players), ['live']);
  const last = JSON.parse(sent.at(-1));
  assert.deepEqual(Object.keys(last.state.players), ['live']);
});

test('game rooms keep a disconnected player for reconnects', () => {
  const { srv } = makeServer('ROOM42');
  connect(srv, 'a', 'name=A&playerKey=key-a');
  srv.onClose({ id: 'a' });
  assert.equal(srv.state.players.a.connected, false);
  connect(srv, 'a2', 'name=A&playerKey=key-a');
  assert.deepEqual(Object.keys(srv.state.players), ['a2']);
  assert.equal(srv.state.players.a2.connected, true);
});
