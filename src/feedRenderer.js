import CRC32 from 'crc-32';

export default (data) => {
  const feeds = document.querySelector('.feeds > .row');
  const { channelTitle, channelFeed } = data;
  const div = document.createElement('div');
  div.setAttribute('class', 'feeds-list col-lg-6');
  div.setAttribute('id', CRC32.str(channelTitle));
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

  feeds.append(div);
};
