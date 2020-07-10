import _ from 'lodash';

const PROXY = 'https://cors-anywhere.herokuapp.com/';

const generateIdByTitle = (title, data) => {
  const filtered = _.head(data.filter((item) => item.title === title));

  return filtered ? filtered.id : _.uniqueId();
};

export const identifyFeeds = (feed, state) => {
  const { title } = feed;
  const id = generateIdByTitle(title, state.feeds);

  return { id, ...feed };
};

export const getProxyUrl = (link) => {
  const url = new URL(link);

  return `${PROXY}${url.hostname}${url.pathname}${url.search}`;
};
