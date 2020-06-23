import 'bootstrap';
import _ from 'lodash';
import * as yup from 'yup';
import './styles/styles.scss';
import { watch } from 'melanke-watchjs';
import axios from 'axios';
import i18next from 'i18next';
import parse from './domParser';
import renderFeed from './feedRenderer';
import resources from './locales';

const routes = {
  urls: [],
};

const schema = yup.object().shape({
  url: yup
    .string()
    .required(i18next.t('errors.required'))
    .url('Type correct URL')
    .notOneOf(routes.urls, 'You have already searched this url'),
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
    _.set(state, 'errors', {});
    routes.urls = [...routes.urls, state.fields.url];
  } else {
    _.set(state, 'isValid', false);
    _.set(state, 'errors', errors);
  }
};

const getData = (state) => {
  const dataArray = [];
  const promises = [];

  routes.urls.forEach((url) => {
    promises.push(axios.get(url).then(({ data }) => {
      const dataItems = parse(data);
      dataArray.push(dataItems);
    }));
  });

  Promise.all(promises).then(() => _.set(state, 'data', dataArray));
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

    const feedsContainer = document.querySelector('.feeds');
    feedsContainer.innerHTML = '';

    const { isValid } = state;
    if (isValid) {
      elements.input.value = '';
      getData(state);
    }
  });

  watch(state, 'errors', () => {
    renderErrors(elements.input, state.errors);
  });

  watch(state, 'data', () => {
    renderFeed(elements, state.data);
  });
};

i18next.init({
  lng: 'en',
  debug: true,
  resources,
}).then(app());
