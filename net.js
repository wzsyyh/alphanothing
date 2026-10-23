// Rooms over public MQTT brokers: presence via heartbeats, messages relayed by the broker.
// No WebRTC, so it works behind any NAT / firewall that allows WebSockets. No server of our own.
import mqtt from './mqtt.js';

export const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081/mqtt',
];
const PREFIX = 'alphanothing/v2/';
const HEARTBEAT_MS = 3000;
const PEER_TIMEOUT_MS = 30000; // generous so a phone briefly switching apps doesn't drop out

const hex = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => b.toString(16).padStart(2, '0')).join('');
export const selfId = hex(8);

let clients = null;
const handlers = new Map(); // topic -> handle(msg)
const seen = new Set();      // message ids; every message arrives once per broker

function ensureClients() {
  if (clients) return clients;
  clients = BROKERS.map(url => {
    const c = mqtt.connect(url, {
      clientId: 'an_' + selfId + '_' + hex(2),
      keepalive: 30, reconnectPeriod: 2000, connectTimeout: 8000, clean: true,
    });
    let everConnected = false;
    c.on('connect', () => {
      for (const t of handlers.keys()) c.subscribe(t, { qos: 1 });
      if (everConnected) for (const h of handlers.values()) h.reconnected?.();
      everConnected = true;
    });
    c.on('message', (topic, buf) => {
      let msg;
      try { msg = JSON.parse(buf.toString()); } catch { return; }
      if (!msg || !msg.id || seen.has(msg.id)) return;
      seen.add(msg.id);
      if (seen.size > 5000) seen.delete(seen.values().next().value);
      handlers.get(topic)?.(msg);
    });
    c.on('error', () => {});
    return c;
  });
  return clients;
}

export const connectedCount = () => (clients || []).filter(c => c.connected).length;

export function joinRoom(roomId) {
  ensureClients();
  const topic = PREFIX + roomId;
  const peers = new Map(); // peerId -> last seen
  const actions = {};
  const room = { onPeerJoin: null, onPeerLeave: null, onReconnect: null };

  const publish = (a, d, to, qos = 1) => {
    const m = JSON.stringify({ id: hex(8), from: selfId, to, a, d });
    for (const c of clients) c.publish(topic, m, { qos });
  };
  const hello = () => publish('_hi', null, undefined, 0);
  const drop = id => { if (peers.delete(id)) room.onPeerLeave?.(id); };

  const handle = msg => {
    if (msg.from === selfId || (msg.to && msg.to !== selfId)) return;
    if (msg.a === '_bye') return drop(msg.from);
    const isNew = !peers.has(msg.from);
    peers.set(msg.from, Date.now());
    if (isNew) { hello(); room.onPeerJoin?.(msg.from); }
    if (msg.a !== '_hi') actions[msg.a]?.onMessage?.(msg.d, { peerId: msg.from });
  };
  handle.reconnected = () => { hello(); room.onReconnect?.(); };
  handlers.set(topic, handle);
  for (const c of clients) c.subscribe(topic, { qos: 1 }, () => hello());

  const timer = setInterval(() => {
    hello();
    const now = Date.now();
    for (const [id, t] of peers) if (now - t > PEER_TIMEOUT_MS) drop(id);
  }, HEARTBEAT_MS);

  room.makeAction = name => (actions[name] = {
    onMessage: null,
    send: (d, { target } = {}) => publish(name, d, target),
  });
  room.getPeers = () => Object.fromEntries(peers);
  room.leave = () => {
    clearInterval(timer);
    publish('_bye', null, undefined, 0);
    handlers.delete(topic);
    for (const c of clients) c.unsubscribe(topic);
    peers.clear();
  };
  return room;
}
