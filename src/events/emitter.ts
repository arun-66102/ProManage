import { EventEmitter } from 'events';

class AppEmitter extends EventEmitter { }

const appEmitter = new AppEmitter();

// Increase listener limit for production
appEmitter.setMaxListeners(20);

export default appEmitter;
