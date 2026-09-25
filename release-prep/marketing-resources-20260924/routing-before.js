var attachCustomDomains = 'true' === 'true';

function encodeQueryPart(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, function(character) {
    return '%' + character.charCodeAt(0).toString(16).toUpperCase();
  });
}

function querySuffix(request) {
  var query = request.querystring || {};
  var parts = [];
  for (var key in query) {
    if (!Object.prototype.hasOwnProperty.call(query, key)) continue;
    var item = query[key];
    var values = item.multiValue || [item];
    for (var valueIndex = 0; valueIndex < values.length; valueIndex += 1) {
      parts.push(encodeQueryPart(key) + '=' + encodeQueryPart(values[valueIndex].value || ''));
    }
  }
  return parts.length ? '?' + parts.join('&') : '';
}

function redirect(uri, request) {
  var requestHost = request.headers.host ? request.headers.host.value.toLowerCase() : '';
  var redirectHost = attachCustomDomains ? 'www.bwtr.ai' : requestHost;
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: {
      location: { value: 'https://' + redirectHost + uri + querySuffix(request) },
      'cache-control': { value: 'public, max-age=300' }
    }
  };
}

function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var host = request.headers.host ? request.headers.host.value.toLowerCase() : '';
  var canonicalHost = 'www.bwtr.ai';
  var pages = ['/products', '/architecture', '/research', '/about', '/security', '/airports', '/power-utilities', '/connected-industry', '/healthcare'];
  var canonicalUri = uri.replace(/\/{2,}/g, '/');

  if (canonicalUri === '/index.html') {
    canonicalUri = '/';
  }

  if (canonicalUri === '/platform' || canonicalUri === '/platform/' || canonicalUri === '/platform.html' || canonicalUri === '/platform/index.html') {
    canonicalUri = '/architecture/';
  }

  for (var index = 0; index < pages.length; index += 1) {
    var page = pages[index];
    if (canonicalUri === page || canonicalUri === page + '.html' || canonicalUri === page + '/index.html') {
      canonicalUri = page + '/';
      break;
    }
  }

  if ((attachCustomDomains && host !== canonicalHost) || canonicalUri !== uri) {
    return redirect(canonicalUri, request);
  }

  for (var pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    if (uri === pages[pageIndex] + '/') {
      request.uri = pages[pageIndex] + '/index.html';
      break;
    }
  }

  return request;
}
