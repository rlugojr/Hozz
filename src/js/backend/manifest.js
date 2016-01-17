const path = require('path');
const mkdirp = require('mkdirp');

import io from './io';
import log from './log';
import Hosts from './hosts';
import Lang from './language';
import { MANIFEST,
         WORKSPACE,
         TOTAL_HOSTS_UID,
         NO_PERM_ERROR_TAG,
         NO_PERM_ERROR_TAG_WIN32 } from '../constants';

try {
    mkdirp.sync(WORKSPACE);
} catch (e) {
    log('Make workspace folder failed: ', e);
}

const sysHostsPath = () => {
    if (process.platform === 'win32') {
        return path.join(process.env.SYSTEMROOT, './system32/drivers/etc/hosts');
    } else {
        return '/etc/hosts';
    }
}

class Manifest {
    constructor (options) {
        const { online, language, content } = options;
        const __content = Array.from(content);

        // private properties
        this.__hostsMap = new Map();

        // public properties
        this.online = typeof(online) === 'undefined' ? true : online;
        this.language = typeof(language) === 'undefined' ? navigator.language : language;

        this.content = __content.map((element) => {
            if (element.type === 'group') {
                element.content = typeof(element.content) === 'undefined' ? [] : element.content.map((hosts) => {
                    if (typeof(hosts.uid) !== 'undefined') {
                        const newHosts = new Hosts(hosts);
                        this.__hostsMap.set(newHosts.uid, newHosts);
                        return newHosts;
                    }
                    return null;
                }).filter(element => element !== null);
                return element;
            } else if (typeof(element.uid) !== 'undefined') {
                    const newHosts = new Hosts(element);
                    this.__hostsMap.set(newHosts.uid, newHosts);
                    return newHosts;
            } else {
                return null;
            }
        }).filter(element => element !== null);

        // for debug
        window['manifest'] = this;
    }

    getHostsByUid (uid) {
        return this.__hostsMap.get(uid);
    }

    setHostsByUid (uid, hosts) {
        return this.__hostsMap.set(uid, hosts);
    }

    getHostsList () {
        return Array.from(this.__hostsMap.values()).sort((A, B) => {
            return (A.index | 0) - (B.index | 0);
        });
    }

    sortHosts () {
        this.getHostsList().forEach((hosts, index) => {
            hosts.index = index;
        });
    }

    addHosts (hosts) {
        this.sortHosts();
        hosts.index = this.getHostsList().length;
        this.__hostsMap.set(hosts.uid, hosts);
        return this;
    }

    /**
     * TODO: fix
     */
    removeHosts (hosts) {
        this.__hostsMap.delete(hosts.uid);
        this.sortHosts();
        return this;
    }

    moveHostsIndex (fromIndex, toIndex) {
        if (fromIndex === toIndex ||
            fromIndex < 0 ||
            toIndex > this.getHostsList().length) {
            return;
        }
        const list = this.getHostsList();
        list.splice(toIndex, 0, list.splice(fromIndex, 1)[0]);
        list.forEach((hosts, index) => {
            hosts.index = index;
        });
    }

    getMergedHosts () {
        let totalCount = 0;
        let totalHostsText = '';
        for (let hosts of this.getHostsList()) {
            if (!this.online) {
                hosts.stashStatus();
            } else {
                hosts.popStatus();
            }
            if (hosts.online) {
                totalHostsText += hosts.text + '\n';
                totalCount += hosts.count;
            }
        }
        return new Hosts({
            uid: TOTAL_HOSTS_UID,
            name: 'All',
            count: totalCount,
            text: totalHostsText,
            online: this.online,
        });
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
        output.content = output.content.map((element) => {
            if (element.type === 'group') {
                const elements = [].concat(element);
                elements.content = elements.content.map((hosts) => {
                    const hostsObj = hosts.toObject();
                    delete hostsObj.text;
                    return hostsObj;
                });
                return elements;
            } else if (typeof(element.uid) !== 'undefined') {
                const hostsObj = element.toObject();
                delete hostsObj.text;
                return hostsObj;
            } else {
                return null;
            }
        })
        return output;
    }

    commit () {
        return io.writeFile(MANIFEST, JSON.stringify(this.toObject()));
    }

    loadSysHosts () {
        return io.readFile(sysHostsPath(), 'utf-8').then((text) => {
            return Promise.resolve(Hosts.createFromText(text));
        }).catch((e) => {
            log(e);
            return Promise.resolve(null);
        });
    }

    saveSysHosts (hosts) {
        return io.writeFile(sysHostsPath(), this.online ? hosts.text : '').catch((error) => {
            if (error &&
                error.message &&
                (error.message.indexOf(NO_PERM_ERROR_TAG) > -1 ||
                 error.message.indexOf(NO_PERM_ERROR_TAG_WIN32) > -1)) {
                return Promise.reject(error);
            }
            log(error);
            return Promise.resolve();
        });
    }
}

Manifest.loadFromDisk = () => {
    return io.readFile(MANIFEST, 'utf-8').then((text) => {
        try {
            return Promise.resolve(JSON.parse(text));
        } catch (e) {
            return Promise.resolve({});
        }
    }).catch(() => {
        return Promise.resolve({});
    }).then((json) => {
        const manifest = new Manifest(json);
        if (manifest.content.length > 0) {
            const promises = [];
            for (let hosts of manifest.__hostsMap.values()) {
                promises.push(hosts.load());
            }
            return Promise.all(promises).then(() => {
                return Promise.resolve(manifest);
            });
        } else {
            return manifest.loadSysHosts().then((hosts) => {
                hosts.online = true;
                hosts.name = Lang.get('common.default_hosts');
                hosts.save();
                manifest.addHosts(hosts).commit();
                return Promise.resolve(manifest);
            });
        }
    });
}

export default Manifest;