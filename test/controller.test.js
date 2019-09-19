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

// test('first test', async () => {
//   await Promise.all([
//     controller.handleSearchFormSubmit('720 tasker'),
//     timeout(4000)
//   ]);
//   console.log('store.state.geocode.data.properties.street_address', store.state.geocode.data.properties.street_address);
//   expect(store.state.geocode.data.properties.street_address).toEqual('720 TASKER ST');
//   expect(store.state.sources.opa.data.depth).toEqual('64');
//   expect(store.state.sources.opa.data.zoning).toEqual('RSA5 ');
// });

test('second test', async () => {
  await Promise.all([
    controller.handleSearchFormSubmit('1234 mkt'),
    timeout(4000)
  ]);
  console.log('store.state.geocode.data.properties.street_address', store.state.geocode.data.properties.street_address);
  expect(store.state.geocode.data.properties.street_address).toEqual('1234 MARKET ST');
  // expect(store.state.sources.liPermits.data.rows[0]._featureId).toEqual('feat-liPermits-0');
  expect(store.state.sources.opa.data.depth).toEqual('190');
  expect(store.state.sources.opa.data.zoning).toEqual('CMX5 ');
});

test('third test', async () => {
  jest.setTimeout(15000);
  await Promise.all([
    // controller.handleSearchFormSubmit('6117 nassau'),
    controller.handleSearchFormSubmit('5208 wayne'),
    // controller.handleSearchFormSubmit('5226 MORRIS'),
    // controller.handleSearchFormSubmit('465 W QUEEN LN'),
    timeout(10000)
  ]);
  console.log('store.state.geocode.data.properties.street_address', store.state.geocode.data.properties.street_address);
  // expect(store.state.geocode.data.properties.street_address).toEqual('465 W QUEEN LN');
  expect(store.state.geocode.data.properties.street_address).toEqual('5208 WAYNE AVE');
  // expect(store.state.geocode.data.properties.street_address).toEqual('5226 MORRIS ST');
  
  // expect(store.state.sources.liPermits.data.rows[0]._featureId).toEqual('feat-liPermits-0');
  // expect(store.state.sources.opa.data.depth).toEqual('93.25');
  // expect(store.state.sources.opa.data.zoning).toEqual('RSA3 ');
});
