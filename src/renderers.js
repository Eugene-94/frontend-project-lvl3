export const renderFeed = (data) => {
  const { title, items, id } = data;

  const feedsContainer = document.querySelector('.feeds > .row');
  const div = document.createElement('div');
  div.setAttribute('class', 'feeds-list col-lg-6');
  div.setAttribute('id', id);
  const h3 = document.createElement('h3');
  h3.textContent = title;
  div.append(h3);

  items.forEach((feedItem) => {
    const itemTitle = feedItem.title;
    const itemLink = feedItem.link;

    const p = document.createElement('p');
    const a = document.createElement('a');
    a.setAttribute('href', itemLink);
    a.textContent = itemTitle;
    p.append(a);
    div.append(p);
  });

  feedsContainer.append(div);
};

export const renderErrors = (elements, formState) => {
  const { input, feedback } = elements;
  const { isValid, error } = formState;

  if (isValid) {
    input.classList.remove('is-invalid');
    feedback.innerHTML = '';
    return;
  }

  feedback.innerHTML = error;
  input.classList.add('is-invalid');
};

export const renderUpdate = (updatedFeed) => {
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
