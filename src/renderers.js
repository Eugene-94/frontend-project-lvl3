/* eslint no-param-reassign: 0 */
import _ from 'lodash';

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
      const items = _.head(posts.filter((post) => post.id === id)).posts;

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

export const renderUpdate = (state) => {
  const { feeds, posts } = state;

  feeds.forEach((feed) => {
    const { id } = feed;
    const items = _.head(posts.filter((post) => post.id === id)).posts;

    const feedItemsListNode = document.querySelector(`#${id} > .feeds-list`);
    const feedItemsListHtml = items
      .map((item) => {
        const itemNode = getFeedItemNode(item);

        return itemNode.outerHTML;
      })
      .join('');

    feedItemsListNode.innerHTML = feedItemsListHtml;
  });
};
