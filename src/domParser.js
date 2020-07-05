const checkParsingError = (doc) => {
  const error = doc.querySelector('parsererror');

  if (!error) return false;

  return true;
};

export default (data) => {
  const domParser = new DOMParser();

  const xmlDoc = domParser.parseFromString(data, 'text/xml');

  const isParseError = checkParsingError(xmlDoc);

  if (isParseError) {
    return null;
  }

  const xmlItems = xmlDoc.querySelectorAll('item');
  const xmlTitle = xmlDoc.querySelector('channel > title');

  const channelFeed = [...xmlItems].map((item) => {
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
