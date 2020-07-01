import 'bootstrap';
import _ from 'lodash';
import * as yup from 'yup';
import './styles/styles.scss';
import axios from 'axios';
import i18next from 'i18next';
import parse from './domParser';
import renderFeed from './feedRenderer';
import resources from './locales';

const onChange = require('on-change');

const PROXY = 'https://cors-anywhere.herokuapp.com/';
const UPDATE_TIMING = 5000;

const routes = {
  urls: [],
};
const schema = yup.object().shape({
  url: yup
    .string()
    .required()
    .url()
    .test(
      'is-loaded',
      'The feed has already loaded',
      (value) => !routes.urls.includes(value),
    ),
});

const elements = {
  pageContainer: document.querySelector('main > div'),
  form: document.querySelector('.url-form'),
  input: document.querySelector('.url-input'),
  submit: document.querySelector('.url-submit'),
  feeds: document.querySelector('.feeds > .row'),
};

const validate = (fields) => {
  try {
    schema.validateSync(fields, { abortEarly: false });
    return {};
  } catch (e) {
    return _.keyBy(e.inner, 'path');
  }
};

const updateValidationState = (state) => {
  const errors = validate(state.fields);
  if (_.isEqual(errors, {})) {
    _.set(state, 'isValid', true);
    _.set(state, 'url', state.fields.url);
    _.set(state, 'errors', {});
  } else {
    _.set(state, 'isValid', false);
    _.set(state, 'errors', errors);
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

const getProxyUrl = (link) => {
  const url = new URL(link);

  return `${PROXY}${url.hostname}${url.pathname}${url.search}`;
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
  const promises = [];

  routes.urls.forEach((url) => {
    promises.push(axios.get(getProxyUrl(url)).then(({ data }) => {
      const dataItems = parse(data, state);
      newData.push(dataItems);
    }));
  });

  Promise.all(promises).then(() => {
    const oldData = state.data;
    const diff = buildDiff(newData, oldData);

    if (diff.length > 0) {
      renderUpdate(...diff);
      _.set(state, 'data', newData);
    }
  });

  return (() => setTimeout(updateFeed, UPDATE_TIMING, state))();
};

const getData = (url, state) => {
  const stateData = state.data;
  _.set(state, 'status', 'processing');

  axios.get(getProxyUrl(url)).then(({ data }) => {
    try {
      const dataItems = parse(data, state);
      _.set(state, 'data', [...stateData, dataItems]);
      _.set(state, 'status', 'filling');
      renderFeed(dataItems, elements);
      setTimeout(updateFeed, UPDATE_TIMING, state);
    } catch (e) {
      _.set(state, 'status', 'failed');
      _.set(state, 'errors', { url: { type: 'parse' } });
    }
  });
};

const renderErrors = (element, errors) => {
  const errorElement = document.querySelector('.feedback');
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
  elements.form.after(feedbackElement);
};

const app = () => {
  const state = {
    status: 'filling',
    isValid: false,
    url: '',
    fields: {
      url: '',
    },
    data: [],
  };

  const watchedState = onChange(state, (path) => {
    if (path === 'isValid') {
      elements.submit.disabled = !state.isValid;
    }
    if (path === 'errors') {
      renderErrors(elements.input, state.errors);
    }
    if (path === 'status') {
      switch (state.status) {
        case 'processing':
          elements.submit.disabled = true;
          break;
        case 'failed':
          elements.submit.disabled = true;
          break;
        case 'filling':
          elements.submit.disabled = false;
          _.set(state, 'url', '');
          break;
        default:
          throw new Error('unknown status');
      }
    }
  });

  elements.input.addEventListener('change', ({ target }) => {
    const { value, name } = target;
    const fieldValue = value;
    const fieldName = name;

    watchedState.fields[fieldName] = fieldValue;
    updateValidationState(watchedState);
  });

  elements.form.addEventListener('submit', (e) => {
    e.preventDefault();

    const { isValid, url } = state;
    if (isValid) {
      getData(url, watchedState);
      elements.input.value = '';
      routes.urls.push(state.url);
    }
  });
};

i18next.init({
  lng: 'en',
  debug: true,
  resources,
}).then(app());
