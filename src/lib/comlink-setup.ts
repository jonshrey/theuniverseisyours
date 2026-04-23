import Worker from './worker?worker'
const worker = new Worker();
const api = wrap<API>(worker);