import { combineReducers } from 'redux';

import { TOGGLE_WHOLE_ONLINE,
         SET_LANGUAGE,
         ADD_HOSTS,
         UPDATE_HOSTS,
         REMOVE_HOSTS } from '../actions/main';

const online = (state = true, action) => {
    switch (action.type) {
        case TOGGLE_WHOLE_ONLINE:
            return !state;
        default:
            return state;
    }
}

const language = (state = 'en-US', action) => {
    switch (action.type) {
        case SET_LANGUAGE:
            return action.value;
        default:
            return state;
    }
}

const hosts = (state = [], action) => {
    switch (action.type) {
        case ADD_HOSTS:
            return [
                ...state,
                action.value
            ];
        default:
            return state;
    }
}

export default combineReducers({
    online,
    language,
    hosts,
});