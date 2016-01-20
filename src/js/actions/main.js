export const TOGGLE_WHOLE_ONLINE = 'TOGGLE_WHOLE_ONLINE';
export const SET_LANGUAGE = 'SET_LANGUAGE';
export const ADD_HOSTS = 'ADD_HOSTS';
export const UPDATE_HOSTS = 'UPDATE_HOSTS';
export const REMOVE_HOSTS = 'REMOVE_HOSTS';

export function addHosts (hosts) {
    return {
        type: ADD_HOSTS,
        value: hosts
    };
}