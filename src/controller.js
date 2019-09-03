/*
The Controller handles events from the UI that have some effect on routing or
data fetching. It is a "thin" class that mostly proxies events to the router and
data manager, and facilitates communication between them.
*/

import Vue from 'vue';
import Router from './router';
import DataManager from './data-manager';

import {
  GeocodeClient,
  OwnerSearchClient,
  HttpClient,
  EsriClient
} from './clients';


console.log('controller.js is being read')

class Controller {
  constructor(opts) {
    const store = this.store = opts.store;
    const config = this.config = opts.config;
    // const eventBus = this.eventBus = opts.eventBus;
    this.history = window.history;

    // the router and data manager need a ref to the controller
    opts.controller = this;

    // create data manager
    const dataManager = this.dataManager = new DataManager(opts);

    // create router
    opts.dataManager = dataManager;
    this.router = new Router(opts);

    // create clients
    this.clients = {};

    // REVIEW do these need the store any more? or can they just pass the
    // response back to this?
    const clientOpts = { config, store, dataManager: this };
    this.clients.geocode = new GeocodeClient(clientOpts);
    this.clients.ownerSearch = new OwnerSearchClient(clientOpts);
    this.clients.http = new HttpClient(clientOpts);
    this.clients.esri = new EsriClient(clientOpts);
  }

  /*
  EVENT HANDLERS
  */

  appDidLoad() {
    // console.log('pvd appDidLoad is running');
    // route once on load
    this.router.hashChanged();
  }

  test() {
    console.log('controller test is firing');
  }

  getMoreRecords(dataSource, highestPageRetrieved) {
    this.dataManager.fetchMoreData(dataSource, highestPageRetrieved);
  }

  filterInputSubmit(value, process, searchCategory) {
    console.log('controller filterInputSubmit is running, value:', value, 'process:', process);
    if (process === 'mapboard') {
      this.handleSearchFormSubmit(value);
    } else {
      this.handleConfigurableInputSubmit(value, searchCategory);
    }
  }

  handleConfigurableInputSubmit(value, searchCategory) {
    console.log('controller handleConfigurableInputSubmit is running, value:', value, 'searchCategory:', searchCategory);
    if (searchCategory === 'address') {
      this.handleSearchFormSubmit(value, searchCategory);
    } else if (searchCategory === 'owner') {
      console.log('searchCategory is owner');
      this.handleSearchFormSubmit(value, searchCategory);
    }
  }

  initializeStatuses(input, searchCategory) {
    this.store.commit('setGeocodeStatus', null);
    if (!searchCategory || searchCategory === 'address') {
      this.store.commit('setGeocodeInput', input);
    } else if (searchCategory === 'owner') {
      this.store.commit('setOwnerSearchInput', input);
    }
    if (this.store.state.lastSearchMethod) {
      this.store.commit('setLastSearchMethod', 'geocode');
    }
    if (this.store.state.clickCoords) {
      this.store.commit('setClickCoords', null);
    }

    // clear out state
    const parcelLayers = Object.keys(this.config.parcels || {});

    for (let parcelLayer of parcelLayers) {
      const configForParcelLayer = this.config.parcels[parcelLayer];
      const multipleAllowed = configForParcelLayer.multipleAllowed;
      let payload;
      // pwd
      if (!multipleAllowed) {
        payload = {
          parcelLayer: parcelLayer,
          multipleAllowed,
          data: null
        }
      // dor
      } else {
        payload = {
          parcelLayer: parcelLayer,
          multipleAllowed,
          data: [],
          status: null,
          activeParcel: null,
          activeAddress: null,
          activeMapreg: null
        }
      }
      // update state
      this.store.commit('setParcelData', payload);
      console.log('initializeStatuses is running');
    }
  }

  async handleSearchFormSubmit(value, searchCategory) {
    const input = value;
    console.log('phila-vue-datafetch controller.js, handleSearchFormSubmit is running, value:', value, 'searchCategory:', searchCategory, 'this:', this);

    this.initializeStatuses(value, searchCategory);
    console.log('after await initializeStatuses is running');

    // TODO rename to aisResponse
    let aisResponse = await this.clients.geocode.fetch(input)
    console.log('after await aisResponse:', aisResponse);

    // the old didGeocode() starts here
    // TODO - a lifecycle hook that triggers this in mapboard
    let geocodeZoom = 19;
    if (this.config.map.geocodeZoom) {
      geocodeZoom = this.config.map.geocodeZoom;
    }

    console.log('DataManager.didGeocode:', aisResponse, 'geocodeZoom:', geocodeZoom);
    this.router.didGeocode();
    // TODO there actually is no way pvd runs all the way through without parcels
    if (!this.config.parcels) {
      if (this.store.state.map) {
        this.store.commit('setMapCenter', aisResponse.geometry.coordinates);
        this.store.commit('setMapZoom', geocodeZoom);
      }
      return
    }
    // end of part moving to mapboard

    // TODO
    const {activeParcelLayer, lastSearchMethod} = this.store.state;
    const parcelLayers = Object.keys(this.config.parcels || {});

    // if it is a dor parcel query, and the geocode fails, coordinates can still be used
    // to get dor parcels which are not in ais
    // set coords to the ais coords OR the click if there is no ais result

    let coords = aisResponse.geometry.coordinates,
        [lng, lat] = coords,
        latlng = L.latLng(lat, lng);

    // all of this happens whether geocode failed or succeeded
    // search box or onload - get parcels by id
    // (unless it fails and you are allowed to get them by LatLng on failure)
    if (aisResponse) {
      // console.log('didGeocode lastSearchMethod:', lastSearchMethod, '- attempting to get all parcel layers:', parcelLayers, ' by ID');
      // loop through the parcels, and get them by their ids
      for (let parcelLayer of parcelLayers) {
        const configForParcelLayer = this.config.parcels[parcelLayer];
        const parcelIdInGeocoder = configForParcelLayer.parcelIdInGeocoder
        const parcelId = aisResponse.properties[parcelIdInGeocoder];
        if (parcelId && parcelId.length > 0) {
          this.dataManager.getParcelsById(parcelId, parcelLayer);
        } else {
          if (configForParcelLayer.getByLatLngIfIdFails) {
            // console.log(parcelLayer, 'Id failed - had to get by LatLng')
            console.log('in if lastSearchMethod === geocode, parcelLayer:', parcelLayer);
            this.dataManager.getParcelsByLatLng(latlng, parcelLayer);
          }
        }
      }
    }

    // console.log('in didGeocode, activeTopicConfig:', this.activeTopicConfig());
    const activeTopicConfig = this.dataManager.activeTopicConfig();
    // console.log('activeTopicConfig.zoomToShape:', activeTopicConfig.zoomToShape);
    // const geocodeData = this.store.state.geocode.data || null;
    // const geocodeProperties = geocodeData.properties || null;
    // const newShape = geocodeProperties.opa_account_num || null;

    // TODO - zoom stuff should move to mapboard and be based on lifecycle
    // only recenter the map on geocode
    if (lastSearchMethod === 'geocode' && this.store.state.geocode.status !== 'error') {
      if (!activeTopicConfig.zoomToShape) {
        // console.log('NO ZOOM TO SHAPE - NOW IT SHOULD NOT BE ZOOMING TO THE SHAPE ON GEOCODE');
        if (this.store.state.map) {
          let geocodeZoom = 19;
          if (this.config.map.geocodeZoom) {
            geocodeZoom = this.config.map.geocodeZoom;
          }
          this.store.commit('setMapCenter', coords);
          this.store.commit('setMapZoom', geocodeZoom);
        }
      } else {
        // console.log('ZOOM TO SHAPE - NOW IT SHOULD BE ZOOMING TO THE SHAPE ON GEOCODE');
        // this.store.commit('setMapBoundsBasedOnShape', newShape);
      }
    }
  }

  handleMapClick(e) {
    // console.log('handle map click', e, this);

    // TODO figure out why form submits via enter key are generating a map
    // click event and remove this
    if (e.originalEvent.keyCode === 13) {
      return;
    }
    this.store.commit('setLastSearchMethod', 'reverseGeocode');
    this.store.commit('setClickCoords', null);

    // get parcels that intersect map click xy
    const latLng = e.latlng;
    this.store.commit('setClickCoords', latLng);
    this.store.commit('setGeocodeInput', null);

    // if click is on a topic with pwd parcels, you do not want to find dor parcels unless the
    // click was actually on a pwd parcel that could be geocoded, because just running
    // getDorParcelsByLatLng changes the Deeds topic in the UI, and the click could have been
    // on the road
    // there is a callback after geocode to get dor parcels
    const activeParcelLayer = this.store.state.activeParcelLayer;
    // console.log('in handleMapClick, latlng:', latLng, 'activeParcelLayer:', activeParcelLayer);
    this.dataManager.getParcelsByLatLng(latLng, activeParcelLayer);
  }

  // util for making sure topic headers are visible after clicking on one
  // adapted from: https://stackoverflow.com/questions/123999/how-to-tell-if-a-dom-element-is-visible-in-the-current-viewport/7557433#7557433
  // REVIEW this is returning true even when the topic header isn't visible,
  // probably because of a timing issue. it's good enough without this check for
  // now. commenting out.
  // isElementInViewport(el) {
  //   const rect = el.getBoundingClientRect();
  //
  //   // check visibility of each side of bounding rect
  //   const topVisible = rect.top >= 0;
  //   const leftVisible = rect.left >= 0;
  //   const bottomVisible = rect.bottom <= (
  //     window.innerHeight || document.documentElement.clientHeight
  //   );
  //   const rightVisible = rect.right <= (
  //     window.innerWidth || document.documentElement.clientWidth
  //   );
  //
  //   return (topVisible && leftVisible && bottomVisible && rightVisible);
  // }

  handleTopicHeaderClick(topic) {
    // console.log('Controller.handleTopicHeaderClick', topic);

    this.router.routeToTopic(topic);//.then(function(targetExists) {

    /*
    scroll to top of topic header
    */

    // get element
    const els = document.querySelectorAll(`[data-topic-key='${topic}']`);
    const el = els.length === 1 && els[0];

    // handle null el - this shouldn't happen, but just in case
    if (!el) return;

    Vue.nextTick(() => {
      // REVIEW this check is returning true even when the header el isn't
      // really visible, probbaly because of a timing issue. it works well
      // enough without it. commenting out for now.
      // const visible = this.isElementInViewport(el);

      // if (!visible) {
        el.scrollIntoView();
      // }
    });
  }

  // handleRefinePanelClick(selectedServices) {
  //   console.log('handleRefinePanelClick is running, selectedServices:', selectedServices);
  //   this.router.routeToServices(selectedServices)
  // }

  goToDefaultAddress(address) {
    this.router.routeToAddress(address);
  }

  resetGeocode() {
    this.dataManager.resetGeocode();
  }

  // routeToNoAddress() {
  //   this.router.routeToNoAddress();
  // }
}

export default Controller;
