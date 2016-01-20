import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import { APP_NAME } from './constants';
import update from './backend/update';
import Lang from './backend/language';
import Manifest from './backend/manifest';
import { addHosts } from './actions/main';
import configureStore from './stores/configureStore';

import App from './components/App';

const store = configureStore();

const titleDOM = document.getElementsByTagName('title')[0];
titleDOM.innerText = APP_NAME;

Manifest.loadFromDisk().then((manifest) => {
    const hostsSet = Array.from(manifest.hosts.values());
    hostsSet.map((hosts) => {
        store.dispatch(addHosts(hosts));
    });
    if (manifest.language) {
        Lang.setLocale(manifest.language);
    }
    ReactDOM.render(
        <Provider store={store}>
            <App manifest={ manifest } />
        </Provider>, document.getElementById('app'));
});

update(false);