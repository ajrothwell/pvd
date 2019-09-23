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

describe('handleSearchFormSubmit', () => {
  test('Regular residential parcel', async () => {
    await Promise.all([
      controller.handleSearchFormSubmit('720 tasker'),
      timeout(3000)
    ]);
    console.log('store.state.geocode.data.properties.street_address', store.state.geocode.data.properties.street_address);
    expect(store.state.geocode.data.properties.street_address).toEqual('720 TASKER ST');
    expect(store.state.sources.opa.data.depth).toEqual('64');
    expect(store.state.sources.opa.data.zoning).toEqual('RSA5 ');
  });
  
  test('Commercial Parcel, regular', async () => {
    await Promise.all([
      controller.handleSearchFormSubmit('1234 mkt'),
      timeout(3000)
    ]);
    console.log('store.state.geocode.data.properties.street_address', store.state.geocode.data.properties.street_address);
    expect(store.state.geocode.data.properties.street_address).toEqual('1234 MARKET ST');
    // expect(store.state.sources.liPermits.data.rows[0]._featureId).toEqual('feat-liPermits-0');
    expect(store.state.sources.opa.data.depth).toEqual('190');
    expect(store.state.sources.opa.data.zoning).toEqual('CMX5 ');
  });
  
  test('DoR No PWD Option 1', async () => {
    await Promise.all([
        controller.handleSearchFormSubmit('6117 nassau'),
        timeout(3000)
      ]);
    
    expect(store.state.geocode.data.properties.street_address).toEqual('6117 NASSAU RD');
    expect(store.state.parcels.dor.activeParcel).toEqual(462122);
    expect(store.state.parcels.pwd.id).toEqual(405718);
    expect(store.state.sources.opa.data.depth).toEqual("93.25");
  });
  
  test('DoR No PWD Option 2', async () => {
    await Promise.all([
        controller.handleSearchFormSubmit('5945 lawndale'),
        timeout(3000)
      ]);
    
    expect(store.state.geocode.data.properties.street_address).toEqual('5945 LAWNDALE ST');
    expect(store.state.parcels.dor.activeParcel).toEqual(120811);
    expect(store.state.parcels.pwd.id).toEqual(422357);
    expect(store.state.sources.opa.data.depth).toEqual("65");
  });
  
  test('PWD No DoR Parcel Option 1', async () => {
    await Promise.all([
      controller.handleSearchFormSubmit('5208 Wayne Ave'),
      timeout(3000) // Add a timeout to allow fetchData to complete
    ]);
    expect(store.state.geocode.data.properties.street_address).toEqual('5208 WAYNE AVE');
    expect(store.state.parcels.dor.activeParcel).toEqual(388525);
    expect(store.state.parcels.pwd.id).toEqual(55659);
    expect(store.state.sources.opa.data.depth).toEqual('198.5');
    expect(store.state.sources.opa.data.zoning).toEqual('RTA1 ');
  });
  
  test('PWD No DoR Parcel Option 2', async () => {
    await Promise.all([
      controller.handleSearchFormSubmit('3674 Richmond'),
      timeout(3000) // Add a timeout to allow fetchData to complete
    ]);
    expect(store.state.geocode.data.properties.street_address).toEqual('3674 RICHMOND ST');
    expect(store.state.parcels.dor.activeParcel).toEqual(572173);
    expect(store.state.parcels.pwd.id).toEqual(479818);
    expect(store.state.sources.opa.data.depth).toEqual('223.75');
    expect(store.state.sources.opa.data.zoning).toEqual('ICMX ');
  });
};
