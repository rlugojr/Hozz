const path = require('path');
import UID from 'uid';

import io from './io';
import log from './log';
import Lang from './language';
import { HOSTS_COUNT_MATHER,
         TOTAL_HOSTS_UID,
         WORKSPACE } from '../constants';

const countRules = (text) => {
    let ret = null;
    let count = 0;
    while ((ret = HOSTS_COUNT_MATHER.exec(text)) !== null) {
        count++;
    }
    return count;
}

class Hosts {
    constructor (options) {
        const { index, uid, name, online, url, count, text } = options;
        this.uid    = uid || UID(16);
        this.url    = url || '';
        this.name   = name || '';
        this.index  = index || 0;
        this.online = online || false;

        if (uid === TOTAL_HOSTS_UID) {
            this.text = text;
            this.count = count || 0;
        } else {
            this.setText(text || '');
        }

        // private properties
        this.__online = null;
        this.__isSyncing = false;
    }

    toObject () {
        const output = {};
        for (let key in this) {
            // not a private property
            if (!this.hasOwnProperty(key) || key.slice(0, 2) === '__') {
                continue;
            }
            output[key] = this[key];
        }
        return output;
    }

    setText (text) {
        this.text = text;
        this.count = countRules(text);
    }

    toggleStatus () {
        this.online = !this.online;
    }

    stashStatus () {
        if (this.__online === null) {
            this.__online = this.online;
            this.online = false;
        }
    }

    popStatus () {
        if (this.__online !== null) {
            this.online = this.__online;
            this.__online = null;
        }
    }

    getStashedStatus () {
        return this.__online;
    }

    isSyncing () {
        return this.__isSyncing;
    }

    save () {
        if (!this.uid || this.uid === TOTAL_HOSTS_UID) {
            return Promise.resolve();
        }
        return io.writeFile(path.join(WORKSPACE, this.uid), this.text);
    }

    remove () {
        if (!this.uid || this.uid === TOTAL_HOSTS_UID) {
            return Promise.resolve();
        }
        return io.unlink(path.join(WORKSPACE, this.uid));
    }

    load () {
        if (this.uid && this.uid !== TOTAL_HOSTS_UID) {
            return io.readFile(path.join(WORKSPACE, this.uid), 'utf-8').then((text) => {
                this.setText(text);
                return Promise.resolve();
            }).catch(log);
        } else {
            return Promise.resolve();
        }
    }

    updateFromUrl () {
        if (this.url) {
            this.__isSyncing = true;
            return io.requestUrl(this.url).then((text) => {
                this.setText(text);
                this.__isSyncing = false;
                return this.save();
            }).catch((error) => {
                log(error);
                this.__isSyncing = false;
                return Promise.resolve();
            });
        } else {
            return Promise.resolve();
        }
    }
}

Hosts.createFromText = (text) => {
    return new Hosts({
        text,
        url: '',
        online: false,
        name: Lang.get('common.new_hosts'),
    });
}

export default Hosts;