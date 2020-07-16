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
    return { message: e.message, type: _.head(e.inner).type };
  }
};

const updateValidationState = (state, schema) => {
  const error = validate(state.form.fields, schema);
  if (_.isEmpty(error)) {
    _.set(state, 'form.isValid', true);
    _.set(state, 'form.error', {});
  } else {
    _.set(state, 'form.isValid', false);
    _.set(state, 'form.error', error);
  }
};

const renderUpdate = (updatedFeed) => {
  const { id, diff } = updatedFeed;
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

  return axios.get(getProxyUrl(url)).then(({ data }) => {
    const parsedResponse = parse(data);
    const dataItems = identifyFeeds(parsedResponse, state);
    _.set(state, 'isFeedLoaded', true);
    _.set(state, 'form.status', 'filling');
    _.set(state, 'feeds', [...stateData, dataItems]);
  }).catch(({ message }) => {
    _.set(state, 'form.status', 'failed');
    _.set(state, 'form.error', { message });
  });
};

const renderErrors = (elements, error) => {
  const { input, feedback } = elements;
  const { message, type } = error;

  if (_.isEmpty(error)) {
    input.classList.remove('is-invalid');
    return;
  }

  feedback.innerHTML = type ? i18next.t(`errors.${type}`) : message;
  input.classList.add('is-invalid');
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
    isFeedLoaded: false,
  };

  const elements = {
    pageContainer: document.querySelector('main > div'),
    form: document.querySelector('.url-form'),
    input: document.querySelector('.url-input'),
    submit: document.querySelector('.url-submit'),
    feedback: document.querySelector('.feedback'),
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

  const watchedState = onChange(state, (path, value, previousValue) => {
    if (path === 'form.isValid') {
      // elements.submit.disabled = !state.form.isValid;
      if (value) elements.feedback.textContent = '';
    }
    if (path === 'form.error') {
      renderErrors(elements, state.form.error);
    }
    if (path === 'form.status') {
      switch (state.form.status) {
        case 'processing':
          elements.submit.disabled = true;
          elements.input.disabled = true;
          break;
        case 'failed':
          elements.submit.disabled = false;
          elements.input.disabled = false;
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
    if (path === 'feeds') {
      const isNewFeed = value.length !== previousValue.length;
      if (isNewFeed) {
        renderFeed(_.last(value));
      }
    }
    if (path === 'diff') {
      renderUpdate(...value);
    }
    if (path === 'isFeedLoaded') {
      setTimeout(updateFeed, UPDATE_TIMING, watchedState);
    }
  });

  elements.input.addEventListener('change', ({ target }) => {
    const { value: fieldValue, name: fieldName } = target;

    watchedState.form.fields[fieldName] = fieldValue;
  });

  elements.form.addEventListener('submit', (e) => {
    e.preventDefault();

    updateValidationState(watchedState, schema);

    if (_.isEmpty(watchedState.form.error)) {
      const { url } = watchedState.form.fields;

      getData(url, watchedState).finally(() => {
        watchedState.routes.push(url);
        _.set(watchedState, 'form.fields.url', '');
      });
    }
  });
};

export default () => {
  i18next.init({
    lng: 'en',
    debug: true,
    resources,
  }).then(appInit());
};
