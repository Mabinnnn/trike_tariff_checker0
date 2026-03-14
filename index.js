// index.js

// Create the <html> and <head> elements
document.documentElement.lang = "en";

const head = document.head;

// Meta charset
const metaCharset = document.createElement("meta");
metaCharset.setAttribute("charset", "UTF-8");
head.appendChild(metaCharset);

// Favicon
const linkFavicon = document.createElement("link");
linkFavicon.setAttribute("rel", "icon");
linkFavicon.setAttribute("type", "image/svg+xml");
linkFavicon.setAttribute("href", "/vite.svg");
head.appendChild(linkFavicon);

// Viewport meta
const metaViewport = document.createElement("meta");
metaViewport.setAttribute("name", "viewport");
metaViewport.setAttribute("content", "width=device-width, initial-scale=1.0");
head.appendChild(metaViewport);

// Title
const title = document.createElement("title");
title.innerText = "TrikeTariffChecker";
head.appendChild(title);

// MapLibre CSS
const mapCss = document.createElement("link");
mapCss.setAttribute("href", "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css");
mapCss.setAttribute("rel", "stylesheet");
head.appendChild(mapCss);

// MapLibre JS
const mapJs = document.createElement("script");
mapJs.src = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js";
document.body.appendChild(mapJs);

// Body content
const rootDiv = document.createElement("div");
rootDiv.id = "root";
document.body.appendChild(rootDiv);

// Your React entry point
const mainScript = document.createElement("script");
mainScript.type = "module";
mainScript.src = "/src/main.jsx";
document.body.appendChild(mainScript);
