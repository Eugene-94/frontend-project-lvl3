import onChange from 'on-change';
import { renderFeed, renderErrors } from './renderers';

export default (appElements, state) => {
  const elements = appElements;

  return onChange(state, (path) => {
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
    if (path === 'networkError') {
      renderErrors(elements, state.networkError);
    }
    if (path === 'posts') {
      renderFeed(state, elements.feedsContainer);
    }
  });
};
