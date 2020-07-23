const getFeedItemNode = (feedItem) => {
  const { title, link } = feedItem;

  const p = document.createElement('p');
  const a = document.createElement('a');
  a.setAttribute('href', link);
  a.textContent = title;
  p.append(a);

  return p;
};

export const renderFeed = (data, container) => {
  const { title, items, id } = data;

  const feedContainer = document.createElement('div');
  feedContainer.setAttribute('class', 'feed col-lg-6');
  feedContainer.setAttribute('id', id);

  const feedItemsList = document.createElement('div');
  feedItemsList.setAttribute('class', 'feeds-list');

  const h3 = document.createElement('h3');
  h3.textContent = title;
  feedContainer.append(h3);
  h3.after(feedItemsList);

  items.forEach((feedItem) => {
    feedItemsList.append(getFeedItemNode(feedItem));
  });

  container.append(feedContainer);
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

export const renderUpdate = (updatedFeeds) => {
  updatedFeeds.forEach((feed) => {
    const { id, items } = feed;
    const feedItemsListNode = document.querySelector(`#${id} > .feeds-list`);
    const feedItemsListHtml = items.reduce((acc, item) => {
      const itemNode = getFeedItemNode(item);

      return `${acc}${itemNode.outerHTML}`;
    }, '');

    feedItemsListNode.innerHTML = feedItemsListHtml;
  });
};
