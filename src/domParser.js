import _ from 'lodash';

const generateId = (title, data) => {
  const filtered = _.head(data.filter((item) => item.title === title));

  return filtered ? filtered.id : _.uniqueId();
};

export default (data, state) => {
  const domParser = new DOMParser();

  try {
    const xmlDoc = domParser.parseFromString(data, 'text/xml');

    const xmlItems = xmlDoc.querySelectorAll('item');
    const xmlTitle = xmlDoc.querySelector('channel > title');
    // const id = _.uniqueId();

    const channelFeed = [...xmlItems].map((item) => {
      const title = item.querySelector('title');
      const link = item.querySelector('link');

      return { title: title.textContent, link: link.textContent };
    });

    const channel = {
      id: generateId(xmlTitle.textContent, state.data),
      title: xmlTitle.textContent,
      items: channelFeed,
    };

    return channel;
  } catch (err) {
    throw new Error(err);
  }
};
