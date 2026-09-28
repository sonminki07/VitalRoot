// tests/helpers/url-validator.mjs
// Validator utility for Naver Maps web URLs (Directions & Search/Detail)

/**
 * Validates whether a given URL is a syntactically valid Naver Maps walking or transit directions URL.
 * Standard format:
 *   https://map.naver.com/p/directions/{startLng},{startLat},{startName}/{endLng},{endLat},{endName}/-/{mode}?c=...
 * or legacy format:
 *   https://map.naver.com/v5/directions/...
 */
export function validateNaverDirectionsUrl(urlStr, expectedMode = 'walk') {
  const result = {
    isValid: false,
    errors: [],
    details: {},
  };

  if (!urlStr || typeof urlStr !== 'string') {
    result.errors.push('URL is null, undefined, or not a string');
    return result;
  }

  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch (err) {
    result.errors.push(`Invalid URL syntax: ${err.message}`);
    return result;
  }

  // 1. Protocol & Host validation
  if (parsed.protocol !== 'https:') {
    result.errors.push(`Expected protocol https:, received ${parsed.protocol}`);
  }
  if (parsed.hostname !== 'map.naver.com') {
    result.errors.push(`Expected hostname map.naver.com, received ${parsed.hostname}`);
  }

  // 2. Path validation: matches /p/directions/... or /v5/directions/...
  const isPPath = parsed.pathname.startsWith('/p/directions/');
  const isV5Path = parsed.pathname.startsWith('/v5/directions/');

  if (!isPPath && !isV5Path) {
    result.errors.push(
      `Path must begin with /p/directions/ or /v5/directions/, received ${parsed.pathname}`
    );
    return result;
  }

  // 3. Segment parsing for /p/directions/
  if (isPPath) {
    const rawSegments = parsed.pathname.replace('/p/directions/', '').split('/');
    // Expected structure: [startSegment, endSegment, '-', mode]
    if (rawSegments.length < 4) {
      result.errors.push(`Incomplete directions path segments: ${JSON.stringify(rawSegments)}`);
      return result;
    }

    const [startSeg, endSeg, separator, mode] = rawSegments;

    // Start segment: lng,lat,name
    const startParts = startSeg.split(',');
    if (startParts.length < 2) {
      result.errors.push(`Invalid start coordinate segment: "${startSeg}"`);
    } else {
      const lng = parseFloat(startParts[0]);
      const lat = parseFloat(startParts[1]);
      const name = decodeURIComponent(startParts.slice(2).join(','));
      if (isNaN(lng) || lng < 120 || lng > 135) {
        result.errors.push(`Start longitude out of Korea bounds [120-135]: ${lng}`);
      }
      if (isNaN(lat) || lat < 32 || lat > 44) {
        result.errors.push(`Start latitude out of Korea bounds [32-44]: ${lat}`);
      }
      result.details.start = { lng, lat, name };
    }

    // End segment: lng,lat,name
    const endParts = endSeg.split(',');
    if (endParts.length < 2) {
      result.errors.push(`Invalid end coordinate segment: "${endSeg}"`);
    } else {
      const lng = parseFloat(endParts[0]);
      const lat = parseFloat(endParts[1]);
      const name = decodeURIComponent(endParts.slice(2).join(','));
      if (isNaN(lng) || lng < 120 || lng > 135) {
        result.errors.push(`End longitude out of Korea bounds [120-135]: ${lng}`);
      }
      if (isNaN(lat) || lat < 32 || lat > 44) {
        result.errors.push(`End latitude out of Korea bounds [32-44]: ${lat}`);
      }
      result.details.end = { lng, lat, name };
    }

    // Separator & Mode
    if (separator !== '-') {
      result.errors.push(`Expected waypoint delimiter "-", received "${separator}"`);
    }
    if (expectedMode && mode !== expectedMode) {
      result.errors.push(`Expected mode "${expectedMode}", received "${mode}"`);
    }
    result.details.mode = mode;
  }

  // 4. Query string check
  if (!parsed.searchParams.has('c')) {
    result.errors.push('Missing required camera parameter ?c= in query string');
  } else {
    result.details.camera = parsed.searchParams.get('c');
  }

  result.isValid = result.errors.length === 0;
  return result;
}

/**
 * Validates Naver Detail/Search URL
 */
export function validateNaverDetailUrl(urlStr) {
  const result = {
    isValid: false,
    errors: [],
    searchQuery: null,
  };

  try {
    const parsed = new URL(urlStr);
    if (parsed.hostname !== 'map.naver.com') {
      result.errors.push(`Expected map.naver.com, got ${parsed.hostname}`);
    }
    if (!parsed.pathname.startsWith('/p/search/')) {
      result.errors.push(`Expected /p/search/ path, got ${parsed.pathname}`);
    }
    const query = decodeURIComponent(parsed.pathname.replace('/p/search/', ''));
    if (!query) {
      result.errors.push('Search query is empty');
    }
    result.searchQuery = query;
  } catch (err) {
    result.errors.push(err.message);
  }

  result.isValid = result.errors.length === 0;
  return result;
}
