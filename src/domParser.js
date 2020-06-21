export default (data) => {
  const domParser = new DOMParser();

  const xmlDoc = domParser.parseFromString(data, 'text/xml');
  const items = xmlDoc.querySelectorAll('item');

  const channelFeed = [...items].map((item) => {
    const title = item.querySelector('title').firstChild.data;
    const link = item.querySelector('link').firstChild.data;

    return { title, link };
  });

  const channelTitle = xmlDoc.querySelector('channel > title').firstChild.data;

  return { channelTitle, channelFeed };
};
