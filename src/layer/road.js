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

const tunnelDashArray = ["step", ["zoom"], ["literal", [1]], 11, ["literal", [0.5, 0.25]]];

// Helpers
const getBrunnel = (f) => f.brunnel;
const getClass = (f) => f.class;
const getRamp = (f) => f.ramp || 0;
const isService = (f) => f.highway === "service";
const isServiceExcluded = (f) => ["parking_aisle","driveway","emergency_access"].includes(f.service) || f.service == null;

// Combine constraints
function combineConstraints(c1, c2) {
  if (!c1) return c2 || null;
  if (!c2) return c1;
  return (f) => c1(f) && c2(f);
}

// Road filter
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
  const layer = Util.layerClone({ type: "line", source: "road" }, id);
  layer.filter = filterRoad(constraints, brunnel);
  layer.minzoom = minzoom;
  layer.maxzoom = maxzoom;
  return layer;
}

// Fill colors (OSM-Carto + exceptions)
function getFillColor(f) {
  switch(getClass(f)) {
    case "motorway": return "#e892a2";
    case "trunk": return "#f2d16d";
    case "primary": return "#f2e3c8";
    case "secondary": return "#d9e6be";
    case "tertiary": return "hsl(72, 71%, 92%)"; // custom exception
    case "minor": return "#e0e0e0";
    case "busway": return "hsl(322, 70%, 70%)";
    case "service": return isServiceExcluded(f) ? "#e0e0e0" : "#DECDAB";
    default: return "#c0c0c0";
  }
}

// Base Road class
class Road {
  constructor() {
    this.brunnel = "surface";
    this.minZoomFill = minZoomAllRoads;
    this.minZoomCasing = minZoomAllRoads;
    this.sortKey = 0;
  }

  fill() {
    const layer = baseRoadLayer("fill", () => true, this.brunnel, this.minZoomFill);
    layer.layout = { "line-cap": "round", "line-join": "round", visibility: "visible" };
    layer.paint = {
      "line-opacity": 1,
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
      "line-color": "hsl(0, 40%, 40%)",
      "line-width": 4,
      "line-blur": 0.5
    };
    if (this.brunnel === "tunnel") layer.paint["line-dasharray"] = tunnelDashArray;
    return layer;
  }
}

// Subclasses
class Motorway extends Road { constructor() { super(); this.filter = (f) => getClass(f) === "motorway" && !getRamp(f); } }
class Trunk extends Road { constructor() { super(); this.filter = (f) => getClass(f) === "trunk"; } }
class Primary extends Road { constructor() { super(); this.filter = (f) => getClass(f) === "primary"; } }
class Secondary extends Road { constructor() { super(); this.filter = (f) => getClass(f) === "secondary"; } }
class Tertiary extends Road { constructor() { super(); this.filter = (f) => getClass(f) === "tertiary"; } }
class Minor extends Road { constructor() { super(); this.filter = (f) => getClass(f) === "minor"; } }
class Service extends Road { constructor() { super(); this.filter = (f) => getClass(f) === "service"; } }
class Busway extends Road { constructor() { super(); this.filter = (f) => getClass(f) === "busway"; } }
class Tunnel extends Road { constructor() { super(); this.brunnel = "tunnel"; } }

// Export instances
export const road = new Road();
export const roadMotorway = new Motorway();
export const roadTrunk = new Trunk();
export const roadPrimary = new Primary();
export const roadSecondary = new Secondary();
export const roadTertiary = new Tertiary();
export const roadMinor = new Minor();
export const roadService = new Service();
export const roadBusway = new Busway();
export const roadTunnel = new Tunnel();
