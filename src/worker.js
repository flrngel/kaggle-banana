importScripts("/browser.js");

self.onmessage = async (event) => {
  const { image } = event.data;
  const blob = await removeBackground(image);
  self.postMessage({ blob });
};
