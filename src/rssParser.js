const checkParsingError = (doc) => {
  const error = doc.querySelector('parsererror');

  if (!error) return false;

  return true;
};

export default (data) => {
  const rssParser = new DOMParser();

  const xmlDoc = rssParser.parseFromString(data, 'text/xml');

  const isParseError = checkParsingError(xmlDoc);

  if (isParseError) {
    throw new Error('There is parsing error');
  }

  const items = xmlDoc.querySelectorAll('item');
  const xmlTitle = xmlDoc.querySelector('channel > title');

  const channelFeed = [...items].map((item) => {
    const title = item.querySelector('title');
    const link = item.querySelector('link');

    return { title: title.textContent, link: link.textContent };
  });

  const channel = {
    title: xmlTitle.textContent,
    items: channelFeed,
  };

  return channel;
};
