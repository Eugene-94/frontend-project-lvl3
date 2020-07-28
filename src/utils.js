import _ from 'lodash';

const PROXY = 'https://cors-anywhere.herokuapp.com/';

const generateIdByTitle = (title, data) => {
  const filtered = _.head(data.filter((item) => item.title === title));

  return filtered ? filtered.id : _.uniqueId('feed_');
};

export const identifyFeeds = (feed, state) => {
  const { title } = feed;
  return generateIdByTitle(title, state.feeds);
};

export const getProxyUrl = (link) => {
  const url = new URL(link);

  return `${PROXY}${url.hostname}${url.pathname}${url.search}`;
};
