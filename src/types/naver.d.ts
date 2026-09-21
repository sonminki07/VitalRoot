// NAVER Maps API v3 TypeScript global definitions

declare namespace naver.maps {
  class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
    y: number;
    x: number;
  }

  class Point {
    constructor(x: number, y: number);
    x: number;
    y: number;
  }

  class Size {
    constructor(width: number, height: number);
    width: number;
    height: number;
  }

  class LatLngBounds {
    constructor(sw: LatLng, ne: LatLng);
    extend(latlng: LatLng): void;
  }

  enum MapTypeId {
    NORMAL,
    TERRAIN,
    SATELLITE,
    HYBRID,
  }

  enum Position {
    CENTER,
    TOP_LEFT,
    TOP_RIGHT,
    BOTTOM_LEFT,
    BOTTOM_RIGHT,
    LEFT_CENTER,
    RIGHT_CENTER,
    TOP_CENTER,
    BOTTOM_CENTER,
  }

  interface MapOptions {
    center?: LatLng;
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    mapTypeId?: MapTypeId;
    zoomControl?: boolean;
    zoomControlOptions?: {
      position?: Position;
    };
    scaleControl?: boolean;
    logoControl?: boolean;
    mapDataControl?: boolean;
  }

  class Map {
    constructor(element: HTMLElement | string, options?: MapOptions);
    setCenter(center: LatLng): void;
    getCenter(): LatLng;
    setZoom(level: number, effect?: boolean): void;
    getZoom(): number;
    panTo(target: LatLng, options?: any): void;
    morph(target: LatLng, zoom?: number, options?: any): void;
    fitBounds(bounds: LatLngBounds, margin?: any): void;
    panToBounds(bounds: LatLngBounds, margin?: any): void;
    setMapTypeId(typeId: MapTypeId): void;
    getMapTypeId(): MapTypeId;
    destroy(): void;
  }

  interface MarkerOptions {
    map: Map;
    position: LatLng;
    title?: string;
    icon?: {
      content?: string | HTMLElement;
      size?: Size;
      anchor?: Point;
      origin?: Point;
    } | string;
    zIndex?: number;
  }

  class Marker {
    constructor(options: MarkerOptions);
    setMap(map: Map | null): void;
    getMap(): Map | null;
    setPosition(position: LatLng): void;
    getPosition(): LatLng;
    setIcon(icon: any): void;
    setZIndex(index: number): void;
  }

  interface PolylineOptions {
    map: Map;
    path: LatLng[];
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
    strokeLineCap?: string;
    strokeLineJoin?: string;
    strokeStyle?: string;
  }

  class Polyline {
    constructor(options: PolylineOptions);
    setMap(map: Map | null): void;
    setPath(path: LatLng[]): void;
    getPath(): any;
  }

  interface InfoWindowOptions {
    content: string | HTMLElement;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    anchorSize?: Size;
    anchorSkew?: boolean;
    anchorColor?: string;
    pixelOffset?: Point;
    disableAnchor?: boolean;
  }

  class InfoWindow {
    constructor(options: InfoWindowOptions);
    open(map: Map, marker: Marker): void;
    close(): void;
    setContent(content: string | HTMLElement): void;
    getMap(): Map | null;
  }

  namespace Event {
    function addListener(target: any, type: string, listener: (...args: any[]) => void): any;
    function removeListener(listener: any): void;
    function clearListeners(target: any, type?: string): void;
    function trigger(target: any, type: string, ...args: any[]): any;
  }
}

interface Window {
  naver: typeof naver;
}
