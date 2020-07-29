/* eslint no-param-reassign: 0 */
const getFeedItemNode = (feedItem) => {
  const { title, link } = feedItem;

  const p = document.createElement('p');
  const a = document.createElement('a');
  a.setAttribute('href', link);
  a.textContent = title;
  p.append(a);

  return p;
};

export const renderFeed = (state, container) => {
  const { feeds, posts } = state;

  const feedsHtml = feeds
    .map((feed) => {
      const { title, id } = feed;
      const items = posts.filter((post) => post.feedId === id);

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

      return feedContainer.outerHTML;
    })
    .join('');
  container.innerHTML = feedsHtml;
};

export const renderErrors = (elements, error) => {
  const { input, feedback } = elements;

  if (!error) {
    input.classList.remove('is-invalid');
    feedback.innerHTML = '';
    return;
  }

  feedback.innerHTML = error;
  input.classList.add('is-invalid');
};
