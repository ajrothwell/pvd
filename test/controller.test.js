import Vue from 'vue';
import Vuex from 'vuex';
import mergeDeep from '../util/merge-deep';
import { Controller } from '../src/controller';
import pvdStore from '../src/store';
import config from './config.js';

const sources = pvdStore.createSources(config);
const parcels = pvdStore.createParcels(config);

const prelimStore = {
  state: {
    parcels,
    sources,
  }
}

let mergeStore = mergeDeep(pvdStore.store, prelimStore);

Vue.use(Vuex);
// TODO standardize how payloads are passed around/handled
const store = new Vuex.Store({
  state: mergeStore.state,
  getters: mergeStore.getters,
  mutations: mergeStore.mutations,
});

const opts = { store, config }

const controller = new Controller(opts);

test('first test', async () => {
  await controller.handleSearchFormSubmit('720 tasker');
  console.log('store.state.geocode.data.properties.street_address', store.state.geocode.data.properties.street_address);
  expect(store.state.geocode.data.properties.street_address).toEqual('720 TASKER ST');
});
