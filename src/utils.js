const PROXY = 'https://cors-anywhere.herokuapp.com/';

export default (link) => {
  const url = new URL(link);

  return `${PROXY}${url.hostname}${url.pathname}${url.search}`;
};
