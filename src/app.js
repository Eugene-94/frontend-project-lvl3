/* eslint no-param-reassign: 0 */

import 'bootstrap';
import _ from 'lodash';
import * as yup from 'yup';
import './styles/styles.scss';
import axios from 'axios';
import i18next from 'i18next';
import parse from './domParser';
import resources from './locales';
import watch from './watchers';
import getProxyUrl from './utils';

const UPDATE_TIMING = 5000;

const getUrlsList = (feeds) => feeds.map(({ url }) => url);

const validate = (url, schema, state) => {
  const urlsList = getUrlsList(state.feeds);
  try {
    schema.notOneOf(urlsList).validateSync(url, { abortEarly: false });
    return null;
  } catch (e) {
    const { type } = _.head(e.inner);
    return i18next.t(`errors.${type}`);
  }
};

const updateFeed = (state) => {
  const newPosts = [];

  const promises = state.feeds.map(({ id, url }) => axios.get(getProxyUrl(url))
    .then(({ data }) => {
      const parsedResponse = parse(data);
      const targetPosts = parsedResponse.items
        .map(({ title, link }) => ({ feedId: id, title, link }));
      newPosts.push(...targetPosts);
    }));

  Promise.all(promises).then(() => {
    const oldPosts = state.posts;
    const updated = _.uniqBy([...newPosts, ...oldPosts], 'title');

    state.posts = _.sortBy(updated, ['feedId']);
  }).finally(setTimeout(updateFeed, UPDATE_TIMING, state));
};

const getData = (url, state) => {
  state.form.status = 'processing';

  return axios.get(getProxyUrl(url))
    .then(({ data }) => {
      const parsedResponse = parse(data);
      const id = _.uniqueId('feed_');
      const newFeed = { id, url, title: parsedResponse.title };
      const newPosts = parsedResponse.items.map(({ title, link }) => ({ feedId: id, title, link }));

      state.posts = [...state.posts, ...newPosts];
      state.feeds = [...state.feeds, newFeed];

      state.form.status = 'filling';
      state.netWorkError = null;
    })
    .catch(({ message }) => {
      state.netWorkError = message;
    });
};

const appInit = () => {
  const state = {
    form: {
      status: 'filling',
      isValid: false,
      error: null,
    },
    feeds: [],
    posts: [],
    networkError: null,
  };

  const elements = {
    pageContainer: document.querySelector('main > div'),
    form: document.querySelector('.url-form'),
    input: document.querySelector('.url-input'),
    submit: document.querySelector('.url-submit'),
    feedback: document.querySelector('.feedback'),
    feedsContainer: document.querySelector('.feeds > .row'),
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
