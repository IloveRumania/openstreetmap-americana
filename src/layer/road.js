"use strict";

import * as Util from "../js/util.js";

// Zoom thresholds
const minZoomAllRoads = 4;
const minZoomMotorwayTrunk = 5;
const minZoomPrimary = 7;
const minZoomSecondary = 9;
const minZoomTertiary = 11;
const minZoomMinor = 12;
const minZoomService = 13;
const minZoomSmallService = 15;

// Road hues/colors
const roadHue = 0; // Default hue for non-special roads
const tollRoadHue = 48;
const buswayHue = 322;
const tertiaryFillColor = "hsl(72, 71%, 92%)";
const serviceColorDefault = "#DECDAB";

// Tunnel dash
const tunDashArray = ["step", ["zoom"], ["literal", [1]], 11, ["literal", [0.5, 0.25]]];

// Helpers
const getBrunnel = (f) => f.brunnel;
const getClass = (f) => f.class;
const getExpressway = (f) => f.expressway || 0;
const getLayer = (f) => f.layer || 0;
const getRamp = (f) => f.ramp || 0;
const getToll = (f) => f.toll || 0;
const isUnpaved = (f) => f.surface === "unpaved";

// Combine constraints for filtering
function combineConstraints(constraint1, constraint2) {
  if (!constraint1) return constraint2 || null;
  if (!constraint2) return constraint1;
  return (f) => constraint1(f) && constraint2(f);
}

// Base road filter
function filterRoad(constraints, brunnel = null) {
  const baseFilter = (f) =>
    ["motorway","trunk","primary","secondary","tertiary","busway","bus_guideway","minor","service"].includes(getClass(f));
  let filter = combineConstraints(baseFilter, constraints);
  if (brunnel) {
    const brunnelFilter = brunnel === "surface"
      ? (f) => !["bridge","tunnel"].includes(getBrunnel(f))
      : (f) => getBrunnel(f) === brunnel;
    filter = combineConstraints(filter, brunnelFilter);
  }
  return filter;
}

// Base layer generator
function baseRoadLayer(id, constraints, brunnel = null, minzoom = minZoomAllRoads, maxzoom = 20) {
  const layer = Util.layerClone({ type: "line" }, id);
  layer.filter = filterRoad(constraints, brunnel);
  layer.minzoom = minzoom;
  layer.maxzoom = maxzoom;
  return layer;
}

// Get paint color based on class
function getFillColor(f) {
  const cls = getClass(f);
  if (cls === "tertiary" || cls === "tertiary_link") return tertiaryFillColor;
  if (cls === "service") {
    const serviceType = f.service || "";
    if (["parking_aisle","driveway","emergency_access"].includes(serviceType) || serviceType === "") {
      return "#ccc"; // keep dark/gray for these exceptions
    }
    return serviceColorDefault;
  }
  if (cls === "motorway") return `hsl(${roadHue}, 50%, 80%)`; // example, adjust as desired
  if (cls === "trunk") return `hsl(${roadHue}, 50%, 70%)`;
  if (getToll(f)) return `hsl(${tollRoadHue}, 60%, 70%)`;
  return `hsl(${roadHue}, 0%, 0%)`; // fallback black for other non-special roads
}

// Base Road class
class Road {
  constructor() {
    this.brunnel = "surface";
    this.minZoomFill = minZoomAllRoads;
    this.minZoomCasing = minZoomAllRoads;
    this.sortKey = 0; // simplified
  }

  fill() {
    const layer = baseRoadLayer("fill", () => true, this.brunnel, this.minZoomFill);
    layer.layout = { "line-cap": "round", "line-join": "round", visibility: "visible" };
    layer.paint = {
      "line-opacity": 1,
      "line-color": ["case", ["has", "class"], ["get", "class"], "black"], // fallback
      "line-color": (f) => getFillColor(f),
      "line-width": 2,
      "line-blur": 0.5
    };
    return layer;
  }

  casing() {
    const layer = baseRoadLayer("casing", () => true, this.brunnel, this.minZoomCasing);
    layer.layout = { "line-cap": "round", "line-join": "round", visibility: "visible" };
    layer.paint = {
      "line-opacity": 1,
      "line-color": (f) => getFillColor(f), // reuse fill color for casing
      "line-width": 4,
      "line-blur": 0.5
    };
    if (this.brunnel === "tunnel") layer.paint["line-dasharray"] = tunDashArray;
    return layer;
  }
}

// Example subclass for Motorway
class Motorway extends Road {
  constructor() {
    super();
    this.filter = (f) => getClass(f) === "motorway" && !getRamp(f);
  }
}

// Export
export const road = new Road();
export const motorway = new Motorway();
