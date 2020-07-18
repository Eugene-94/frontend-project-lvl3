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

const validate = (fields, schema) => {
  try {
    schema.validateSync(fields, { abortEarly: false });
    return '';
  } catch (e) {
    const { type } = _.head(e.inner);
    return i18next.t(`errors.${type}`);
  }
};

const buildDiff = (newFeeds, oldFeeds) => {
  const diffs = newFeeds.map((channel) => {
    const { title } = channel;
    const oldChannel = _.head(oldFeeds.filter((item) => item.title === title));
    const { id } = oldChannel;
    const diff = _.differenceBy(channel.items, oldChannel.items, 'title');

    return { id, title, diff };
  });

  return diffs.filter((item) => item.diff.length > 0);
};

const updateFeed = (state) => {
  const newFeeds = [];

  const promises = state.routes.map((url) => axios.get(getProxyUrl(url))
    .then(({ data }) => {
      const dataItems = identifyFeeds(parse(data), state);
      newFeeds.push(dataItems);
    }));

  Promise.all(promises).then(() => {
    const oldFeeds = state.feeds;
    const diff = buildDiff(newFeeds, oldFeeds);

    if (diff.length > 0) {
      _.set(state, 'diff', diff);
      _.set(state, 'feeds', newFeeds);
    }
  }).finally(setTimeout(updateFeed, UPDATE_TIMING, state));
};

const getData = (url, state) => {
  const stateData = state.feeds;
  _.set(state, 'form.status', 'processing');

  return axios.get(getProxyUrl(url))
    .then(({ data }) => {
      const parsedResponse = parse(data);
      const dataItems = identifyFeeds(parsedResponse, state);
      _.set(state, 'form.status', 'filling');
      _.set(state, 'feeds', [...stateData, dataItems]);
    })
    .then(() => {
      state.routes.push(url);
    })
    .catch(({ message }) => {
      _.set(state, 'form.status', 'failed');
      _.set(state, 'form.isValid', false);
      _.set(state, 'form.error', message);
    });
};

const appInit = () => {
  const state = {
    form: {
      status: 'filling',
      isValid: false,
      fields: {
        url: '',
      },
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

  const schema = yup.object().shape({
    url: yup
      .string()
      .required()
      .url()
      .test(
        'is-loaded',
        'The feed has already loaded',
        (value) => !watchedState.routes.includes(value),
      ),
  });

  elements.form.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const url = formData.get('url');
    const error = validate({ url }, schema);

    if (!error) {
      _.set(watchedState, 'form.isValid', true);
      _.set(watchedState, 'form.error', '');
      getData(url, watchedState);
    } else {
      _.set(watchedState, 'form.isValid', false);
      _.set(watchedState, 'form.error', error);
    }
  });

  setTimeout(updateFeed, UPDATE_TIMING, watchedState);
};

export default () => {
  i18next.init({
    lng: 'en',
    debug: true,
    resources,
  }).then(appInit());
};
