export default (data) => {
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
