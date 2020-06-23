export default (elements, data) => {
  const feeds = elements.pageContainer.querySelector('.feeds');
  data.forEach((channel) => {
    const { channelTitle, channelFeed } = channel;
    const div = document.createElement('div');
    div.setAttribute('class', 'feeds-list');
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
  });
};
