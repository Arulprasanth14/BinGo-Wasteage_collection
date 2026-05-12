// Stub for react-native-maps on web platform.
// react-native-maps is native-only and cannot run in a browser.
// This prevents Metro from crashing when bundling for web.

const emptyComponent = () => null;

const MapView = emptyComponent;
const Marker = emptyComponent;
const Polyline = emptyComponent;
const Polygon = emptyComponent;
const Circle = emptyComponent;
const Callout = emptyComponent;
const UrlTile = emptyComponent;
const WMSTile = emptyComponent;
const AnimatedRegion = class {};
const PROVIDER_GOOGLE = 'google';
const PROVIDER_DEFAULT = null;

module.exports = {
  default: MapView,
  MapView,
  Marker,
  Polyline,
  Polygon,
  Circle,
  Callout,
  UrlTile,
  WMSTile,
  AnimatedRegion,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
};
