import 'bootstrap';
import * as yup from 'yup';
import './styles/styles.scss';
import { watch } from 'melanke-watchjs';
import axios from 'axios';
import parse from './domParser';

const schema = yup.object().shape({
  url: yup.string().url().required(),
});

const state = {
  isValid: true,
  urls: [],
  data: [],
};

const elements = {
  pageContainer: document.querySelector('main > div'),
  form: document.querySelector('.url-form'),
  input: document.querySelector('.url-input'),
};

elements.form.addEventListener('submit', (e) => {
  e.preventDefault();
});

elements.input.addEventListener('change', ({ target }) => {
  const current = target.value;

  schema
    .isValid({
      url: current,
    })
    .then((valid) => {
      if (valid) {
        state.isValid = true;
        state.urls.push(current);
        elements.input.value = '';
      } else {
        state.isValid = false;
      }
    });
});

const getData = (urls) => {
  urls.forEach((url) => {
    axios.get(url).then(({ data }) => {
      const dataItems = parse(data);
      state.data.push(dataItems);
    });
  });
};

const renderFeed = (data) => {
  data.forEach((channel) => {
    const { channelTitle, channelFeed } = channel;
    const div = document.createElement('div');
    const h3 = document.createElement('h3');
    h3.textContent = channelTitle;
    div.append(h3);

    channelFeed.forEach((feedItem) => {
      const { title, link } = feedItem;
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.setAttribute('href', link);
      a.textContent = title;
      p.append(a);
      div.append(p);
    });

    elements.pageContainer.append(div);
  });
};

watch(state, 'isValid', () => {
  elements.input.classList.toggle('is-invalid');
});

watch(state, 'urls', () => {
  const { urls } = state;
  getData(urls);
});

watch(state, 'data', () => {
  const { data } = state;
  renderFeed(data);
});
