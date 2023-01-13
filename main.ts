import {serve} from "https://deno.land/std@0.155.0/http/server.ts";

function readRangeHeader(range: string | null, totalLength: number) {
  if (range == null || range.length == 0)
    return null;

  var array = range.split(/bytes=([0-9]*)-([0-9]*)/);
  var start = parseInt(array[1]);
  var end = parseInt(array[2]);
  var result = {
    Start: isNaN(start) ? 0 : start,
    End: isNaN(end) ? (totalLength - 1) : end
  };

  if (!isNaN(start) && isNaN(end)) {
    result.Start = start;
    result.End = totalLength - 1;
  }

  if (isNaN(start) && !isNaN(end)) {
    result.Start = totalLength - end;
    result.End = totalLength - 1;
  }

  return result;
}

await serve(async (req) => {
  const url = new URL(req.url);

  if (url.pathname === "/") {
    const html = await Deno.readTextFile("./public/index.html");
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=UTF-8",
      },
    });
  }

  let contentLength;
  let contentType;
  let stream;

  if (url.pathname === "/video") {
    const fileURL = `https://objectstorage.sa-saopaulo-1.oraclecloud.com/p/fPS8g3EDgTdmLqgGmjfjUwBeBOOKByMqyNKeEBYAH5J9ltXwgXOR-VRlOV0Jaakr/n/grrrbxjdhpwf/b/bucket-20230111-1557/o/public/videos/Big%20Buck%20Bunny%20Demo.mp4`;
    const fileURL2 = `https://objectstorage.sa-saopaulo-1.oraclecloud.com/p/fYB6fZxum_9-ZLZ8isHQt1rzEuCzBZsdVTJeJuP1TnzOj6E-uKkZZxoZcFYzIAfk/n/grrrbxjdhpwf/b/bucket-20230111-1557/o/public/videos/BigBuckBunny_640x360.m4v`;

    const resp = await fetch(fileURL2);
    // const resp = await cache(`https://objectstorage.sa-saopaulo-1.oraclecloud.com/p/fYB6fZxum_9-ZLZ8isHQt1rzEuCzBZsdVTJeJuP1TnzOj6E-uKkZZxoZcFYzIAfk/n/grrrbxjdhpwf/b/bucket-20230111-1557/o/public/videos/BigBuckBunny_640x360.m4v`);
    // const file = await Deno.open(resp.path, { read: true });
    // const blob = await readAll(file);
    // stream = blob.buffer;
    const blob = await resp.blob();
    stream = await blob.arrayBuffer();
    contentLength = resp.headers.get("content-length");
    contentType = "video/mp4";
  } else {
    return new Response("Not Found", {
      status: 404,
    });
  }

  const responseHeaders: {[key: string]: any} = {};
  const rangeRequest = readRangeHeader(req.headers.get("range"), contentLength);

  if (rangeRequest == null) {
    responseHeaders['Content-Type'] = contentType;
    responseHeaders['Content-Length'] = contentLength;  // File size.
    responseHeaders['Accept-Ranges'] = 'bytes';

    return new Response(stream.slice(0, 1), {
      status: 206,
      headers: responseHeaders
    });
  }

  var start = rangeRequest.Start;
  var end = rangeRequest.End;

  if (start >= contentLength || end >= contentLength) {
    responseHeaders['Content-Range'] = 'bytes */' + contentLength; // File size.

    return new Response(null, {
      status: 416,
      headers: responseHeaders
    })
  }

  responseHeaders['Content-Range'] = 'bytes ' + start + '-' + end + '/' + contentLength;
  responseHeaders['Content-Length'] = start === end ? 0 : (end - start + 1);
  responseHeaders['Content-Type'] = contentType;
  responseHeaders['Accept-Ranges'] = 'bytes';
  responseHeaders['Cache-Control'] = 'no-cache';
  responseHeaders['Etag'] = 'W/"' + contentLength + '-' + Date.now() + '"';

  const fileChunk = stream.slice(start, end + 1);

  return new Response(fileChunk, {
    status: 206,
    headers: responseHeaders
  });
});

