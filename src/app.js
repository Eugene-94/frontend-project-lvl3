import 'bootstrap';
import _ from 'lodash';
import * as yup from 'yup';
import './styles/styles.scss';
import axios from 'axios';
import i18next from 'i18next';
import parse from './domParser';
import resources from './locales';
import watch from './watchers';
import { identifyFeeds, getProxyUrl } from './utils';

const UPDATE_TIMING = 5000;

const validate = (fields, schema, state) => {
  try {
    schema.notOneOf(state.routes).validateSync(fields, { abortEarly: false });
    return '';
  } catch (e) {
    const { type } = _.head(e.inner);
    return i18next.t(`errors.${type}`);
  }
};

const getUpdatedFeeds = (oldFeeds, newFeeds) => newFeeds.reduce((acc, newFeed) => {
  const { id, title, items } = newFeed;
  const oldTargetFeed = _.head(oldFeeds.filter((oldFeed) => oldFeed.id === id));
  const oldItems = oldTargetFeed.items;
  items.forEach((item) => {
    const isNewPost = !_.some(oldItems, item);
    if (isNewPost) {
      oldItems.unshift(item);
    }
  });

  acc = [{ id, title, items: [...oldItems] }, ...acc];
  return acc;
}, []);


const updateFeed = (state) => {
  const newFeeds = [];

  const promises = state.routes.map((url) => axios.get(getProxyUrl(url))
    .then(({ data }) => {
      const dataItems = identifyFeeds(parse(data), state);
      newFeeds.push(dataItems);
    }));

  Promise.all(promises).then(() => {
    const oldFeeds = state.feeds;
    const updated = getUpdatedFeeds(oldFeeds, newFeeds);

    state.feeds = _.sortBy(updated, ['id']);
  }).finally(setTimeout(updateFeed, UPDATE_TIMING, state));
};

const getData = (url, state) => {
  const stateData = state.feeds;
  state.form.status = 'processing';

  return axios.get(getProxyUrl(url))
    .then(({ data }) => {
      const parsedResponse = parse(data);
      const dataItems = identifyFeeds(parsedResponse, state);
      state.form.status = 'filling';
      state.feeds = [...stateData, dataItems];
    })
    .then(() => {
      state.routes.push(url);
    })
    .catch(({ message }) => {
      state.form.status = 'failed';
      state.form.isValid = false;
      state.form.error = message;
    });
};

const appInit = () => {
  const state = {
    form: {
      status: 'filling',
      isValid: false,
      error: '',
    },
    routes: [],
    feeds: [],
    diff: [],
  };

  const elements = {
    pageContainer: document.querySelector('main > div'),
    form: document.querySelector('.url-form'),
    input: document.querySelector('.url-input'),
    submit: document.querySelector('.url-submit'),
    feedback: document.querySelector('.feedback'),
  };

  const watchedState = watch(elements, state);

  const schema = yup.string().url().required();

  elements.form.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const url = formData.get('url');
    const error = validate(url, schema, watchedState);

    if (!error) {
      watchedState.form.isValid = true;
      watchedState.form.error = '';
      getData(url, watchedState);
    } else {
      watchedState.form.isValid = false;
      watchedState.form.error = error;
    }
  });

  setTimeout(updateFeed, UPDATE_TIMING, watchedState);
};

export default () => i18next.init({
  lng: 'en',
  debug: true,
  resources,
}).then(appInit);
