import 'bootstrap';
import _ from 'lodash';
import CRC32 from 'crc-32';
import * as yup from 'yup';
import './styles/styles.scss';
import { watch } from 'melanke-watchjs';
import axios from 'axios';
import i18next from 'i18next';
import parse from './domParser';
import renderFeed from './feedRenderer';
import resources from './locales';

const PROXY = 'https://cors-anywhere.herokuapp.com/';
const UPDATE_TIMING = 5000;

const routes = {
  urls: [],
};

const schema = yup.object().shape({
  url: yup
    .string()
    .required(i18next.t('errors.required'))
    .url('Type correct URL')
    .notOneOf(routes.urls),
});

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
    routes.urls = [...routes.urls, state.fields.url];
  } else {
    _.set(state, 'isValid', false);
    _.set(state, 'errors', errors);
  }
};

const renderUpdate = (data) => {
  const { channelTitle, diff } = data;
  const id = CRC32.str(channelTitle);
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
    const { channelTitle } = channel;
    const oldChannel = _.head(oldData.filter((item) => item.channelTitle === channelTitle));
    const diff = _.differenceBy(channel.channelFeed, oldChannel.channelFeed, 'title');

    return { channelTitle, diff };
  });

  return diffs.filter((item) => item.diff.length > 0);
};

const updateFeed = (state) => {
  const newData = [];
  const promises = [];

  routes.urls.forEach((url) => {
    promises.push(axios.get(getProxyUrl(url)).then(({ data }) => {
      const dataItems = parse(data);
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

  axios.get(getProxyUrl(url)).then(({ data }) => {
    const dataItems = parse(data);
    _.set(state, 'data', [...stateData, dataItems]);
    renderFeed(dataItems);
    setTimeout(updateFeed, UPDATE_TIMING, state);
  });
};

const elements = {
  pageContainer: document.querySelector('main > div'),
  form: document.querySelector('.url-form'),
  input: document.querySelector('.url-input'),
};

const renderErrors = (element, errors) => {
  const errorElement = element.nextElementSibling;
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
  feedbackElement.classList.add('invalid-feedback');
  feedbackElement.innerHTML = message;
  element.classList.add('is-invalid');
  element.after(feedbackElement);
};

const app = () => {
  const state = {
    isValid: false,
    url: '',
    fields: {
      url: '',
    },
    data: [],
  };

  elements.input.addEventListener('change', ({ target }) => {
    const { value, name } = target;
    const fieldValue = value;
    const fieldName = name;

    state.fields[fieldName] = fieldValue;
    updateValidationState(state);
  });

  elements.form.addEventListener('submit', (e) => {
    e.preventDefault();

    const { isValid } = state;
    if (isValid) {
      elements.input.value = '';
    }
  });

  watch(state, 'errors', () => {
    renderErrors(elements.input, state.errors);
  });

  watch(state, 'url', () => {
    const { url } = state;
    getData(url, state);
  });
};

i18next.init({
  lng: 'en',
  debug: true,
  resources,
}).then(app());
