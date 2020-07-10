import 'bootstrap';
import _ from 'lodash';
import * as yup from 'yup';
import './styles/styles.scss';
import axios from 'axios';
import i18next from 'i18next';
import onChange from 'on-change';
import parse from './domParser';
import renderFeed from './feedRenderer';
import resources from './locales';
import { identifyFeeds, getProxyUrl } from './utils';

const UPDATE_TIMING = 5000;

const validate = (fields, schema) => {
  try {
    schema.validateSync(fields, { abortEarly: false });
    return {};
  } catch (e) {
    return _.keyBy(e.inner, 'path');
  }
};

const updateValidationState = (state, schema) => {
  const errors = validate(state.form.fields, schema);
  if (_.isEmpty(errors)) {
    _.set(state, 'form.isValid', true);
    _.set(state, 'form.errors', {});
  } else {
    _.set(state, 'form.isValid', false);
    _.set(state, 'form.errors', errors);
  }
};

const renderUpdate = (data) => {
  const { id, diff } = data;
  const feedContainer = document.getElementById(id);
  const h3 = feedContainer.querySelector('h3');

  diff.forEach((feedItem) => {
    const { title, link } = feedItem;
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.setAttribute('href', link);
    a.textContent = title;
    p.append(a);
    h3.after(p);
  });
};

const buildDiff = (newData, oldData) => {
  const diffs = newData.map((channel) => {
    const { title } = channel;
    const oldChannel = _.head(oldData.filter((item) => item.title === title));
    const { id } = oldChannel;
    const diff = _.differenceBy(channel.items, oldChannel.items, 'title');

    return { id, title, diff };
  });

  return diffs.filter((item) => item.diff.length > 0);
};

const updateFeed = (state) => {
  const newData = [];

  const promises = state.routes.map((url) => axios.get(getProxyUrl(url))
    .then(({ data }) => {
      const dataItems = identifyFeeds(parse(data), state);
      newData.push(dataItems);
    }));

  Promise.all(promises).then(() => {
    const oldData = state.feeds;
    const diff = buildDiff(newData, oldData);

    if (diff.length > 0) {
      renderUpdate(...diff);
      _.set(state, 'feeds', newData);
    }
  }).then(setTimeout(updateFeed, UPDATE_TIMING, state));
};

const getData = (url, state) => {
  const stateData = state.feeds;
  _.set(state, 'form.status', 'processing');

  return axios.get(getProxyUrl(url)).then(({ data }) => {
    const dataItems = identifyFeeds(parse(data), state);
    _.set(state, 'feeds', [...stateData, dataItems]);
    _.set(state, 'isFeedLoaded', true);
    _.set(state, 'form.status', 'filling');
    renderFeed(dataItems);
  }).catch(() => {
    _.set(state, 'form.status', 'failed');
    _.set(state, 'form.errors', { url: { type: 'parse' } });
  });
};

const renderErrors = (element, errors) => {
  const errorElement = document.querySelector('.feedback');
  const form = element.closest('form');
  const error = errors.url;

  if (errorElement) {
    element.classList.remove('is-invalid');
    errorElement.remove();
  }
  if (!error) {
    return;
  }
  const { type } = error;
  const message = i18next.t(`errors.${type}`);

  const feedbackElement = document.createElement('div');
  feedbackElement.classList.add('feedback');
  feedbackElement.classList.add('text-danger');
  feedbackElement.innerHTML = message;
  element.classList.add('is-invalid');
  form.after(feedbackElement);
};

const appInit = () => {
  const state = {
    form: {
      status: 'filling',
      isValid: false,
      fields: {
        url: '',
      },
      errors: {},
    },
    routes: [],
    feeds: [],
    isFeedLoaded: false,
  };

  const elements = {
    pageContainer: document.querySelector('main > div'),
    form: document.querySelector('.url-form'),
    input: document.querySelector('.url-input'),
    submit: document.querySelector('.url-submit'),
  };

  const schema = yup.object().shape({
    url: yup
      .string()
      .required()
      .url()
      .test(
        'is-loaded',
        'The feed has already loaded',
        (value) => !state.routes.includes(value),
      ),
  });

  const watchedState = onChange(state, (path) => {
    if (path === 'form.isValid') {
      elements.submit.disabled = !state.form.isValid;
    }
    if (path === 'form.errors') {
      renderErrors(elements.input, state.form.errors);
    }
    if (path === 'form.status') {
      switch (state.form.status) {
        case 'processing':
          elements.submit.disabled = true;
          elements.input.disabled = true;
          break;
        case 'failed':
          elements.submit.disabled = true;
          break;
        case 'filling':
          elements.submit.disabled = false;
          elements.input.disabled = false;
          elements.input.value = '';
          break;
        default:
          throw new Error('unknown status');
      }
    }
    if (path === 'isFeedLoaded') {
      setTimeout(updateFeed, UPDATE_TIMING, state);
    }
  });

  elements.input.addEventListener('change', ({ target }) => {
    const { value: fieldValue, name: fieldName } = target;

    watchedState.form.fields[fieldName] = fieldValue;
    updateValidationState(watchedState, schema);
  });

  elements.form.addEventListener('submit', (e) => {
    e.preventDefault();

    const { url } = state.form.fields;

    getData(url, watchedState).then(() => {
      state.routes.push(url);
      _.set(state, 'form.fields.url', '');
    });
  });
};

export default () => {
  i18next.init({
    lng: 'en',
    debug: true,
    resources,
  }).then(appInit());
};