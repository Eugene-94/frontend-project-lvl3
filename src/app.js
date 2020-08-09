/* eslint no-param-reassign: 0 */

import 'bootstrap';
import _ from 'lodash';
import * as yup from 'yup';
import './styles/styles.scss';
import axios from 'axios';
import i18next from 'i18next';
import parse from './rssParser';
import resources from './locales';
import watch from './watchers';

const UPDATE_TIMING = 5000;
const PROXY = 'https://cors-anywhere.herokuapp.com/';

const getProxyUrl = (link) => {
  const url = new URL(link);

  return `${PROXY}${url.hostname}${url.pathname}${url.search}`;
};

const getUrlsList = (feeds) => feeds.map(({ url }) => url);

const validate = (url, schema, feeds) => {
  const urlsList = getUrlsList(feeds);
  try {
    schema.notOneOf(urlsList).validateSync(url, { abortEarly: false });
    return null;
  } catch (e) {
    const { type } = _.head(e.inner);
    return i18next.t(`errors.${type}`);
  }
};

const updateFeed = (state) => {
  const promises = state.feeds.map(({ id, url }) => axios.get(getProxyUrl(url))
    .then(({ data }) => {
      const parsedResponse = parse(data);
      const targetPosts = parsedResponse.items.map((item) => ({ ...item, feedId: id }));
      const oldPosts = state.posts;
      const update = _.differenceWith(targetPosts, oldPosts, _.isEqual);

      state.posts = [...update, ...state.posts];
    }));

  Promise.all(promises).then(() => {
    setTimeout(updateFeed, UPDATE_TIMING, state)
  });
};

const getData = (url, state) => {
  state.form.status = 'processing';

  return axios.get(getProxyUrl(url))
    .then(({ data }) => {
      const parsedResponse = parse(data);
      const id = _.uniqueId();
      const newFeed = { id, url, title: parsedResponse.title };
      const newPosts = parsedResponse.items.map((item) => ({ ...item, feedId: id }));

      state.posts.push(newPosts);
      state.feeds.push(newFeed);

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
    const error = validate(url, schema, watchedState.feeds);

    if (!error) {
      watchedState.form.isValid = true;
      watchedState.form.error = null;
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
