import Vue from 'vue';
import Vuex from 'vuex';
import mergeDeep from './util/merge-deep';
import timeout from './util/timeout';
import { Controller } from '../src/controller';
import pvdStore from '../src/store';
import config from './config.js';
import { JestEnvironment } from '@jest/environment';

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
  await Promise.all([
    controller.handleSearchFormSubmit('720 tasker'),
    timeout(4000)
  ]);
  console.log('store.state.geocode.data.properties.street_address', store.state.geocode.data.properties.street_address);
  expect(store.state.geocode.data.properties.street_address).toEqual('720 TASKER ST');
  expect(store.state.sources.opa.data.depth).toEqual('64');
  expect(store.state.sources.opa.data.owner_1).toEqual('BEBOP PROPS LP');
});
