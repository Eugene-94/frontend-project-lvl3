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
import { identifyFeeds, getProxyUrl } from './utils';

const UPDATE_TIMING = 5000;

const getUrlsList = (feeds) => feeds.map(({ url }) => url);

const validate = (url, schema, state) => {
  const urlsList = getUrlsList(state.feeds);
  try {
    schema.notOneOf(urlsList).validateSync(url, { abortEarly: false });
    return '';
  } catch (e) {
    const { type } = _.head(e.inner);
    return i18next.t(`errors.${type}`);
  }
};

const getUpdatedPosts = (oldPosts, newPosts) => newPosts.reduce((acc, newPost) => {
  const { id, posts } = newPost;
  const oldTargetPost = _.head(oldPosts.filter((oldFeed) => oldFeed.id === id));
  const oldItems = oldTargetPost.posts;
  posts.forEach((item) => {
    const isNewPost = !_.some(oldItems, item);
    if (isNewPost) {
      oldItems.unshift(item);
    }
  });

  acc = [{ id, posts: [...oldItems] }, ...acc];
  return acc;
}, []);


const updateFeed = (state) => {
  const newPosts = [];
  const urlsList = getUrlsList(state.feeds);

  const promises = urlsList.map((url) => axios.get(getProxyUrl(url))
    .then(({ data }) => {
      const parsedResponse = parse(data);
      const id = identifyFeeds(parsedResponse, state);
      const newPost = { id, posts: parsedResponse.items };
      newPosts.push(newPost);
    }));

  Promise.all(promises).then(() => {
    const oldPosts = state.posts;
    const updated = getUpdatedPosts(oldPosts, newPosts);

    state.posts = _.sortBy(updated, ['id']);
  }).finally(setTimeout(updateFeed, UPDATE_TIMING, state));
};

const getData = (url, state) => {
  state.form.status = 'processing';

  return axios.get(getProxyUrl(url))
    .then(({ data }) => {
      const parsedResponse = parse(data);
      const id = identifyFeeds(parsedResponse, state);
      const newFeed = { id, url, title: parsedResponse.title };
      const newPosts = { id, posts: parsedResponse.items };

      state.feeds = [...state.feeds, newFeed];
      state.posts = [...state.posts, newPosts];

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
