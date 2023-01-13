import {serve} from "https://deno.land/std@0.155.0/http/server.ts";
import Router from "./router.ts";
import readRangeHeader from "./readRangeHeader.ts";

const router = new Router();
router.get("/", async () => {
  const html = await Deno.readTextFile("./public/index.html");
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=UTF-8",
    },
  });
});

router.get<{file: string}>("/video/:file", async (req, params) => {
  const {file} = params;
  const fileURL = `https://objectstorage.sa-saopaulo-1.oraclecloud.com/p/x4yitashSSfnmYt0Hx1Chx1FHM2thUiXw5ko9wk7KdV61WxexoAHetsH2Qo-mJpU/n/grrrbxjdhpwf/b/bucket-20230111-1557/o/public/videos/${file}`;

  const resp = await fetch(fileURL);
  const blob = await resp.blob();
  const stream = await blob.arrayBuffer();
  const contentLength = parseInt(resp.headers.get("content-length") || "0") || 0;
  const contentType = "video/mp4";


  const responseHeaders = new Headers();
  const rangeRequest = readRangeHeader(req.headers.get("range"), contentLength);

  responseHeaders.set("content-type", contentType);
  responseHeaders.set("accept-ranges", "bytes");
  responseHeaders.set("X-Content-Type-Options", "nosniff");

  if (rangeRequest == null) {
    responseHeaders.set("Content-Length", contentLength.toString());
    return new Response(stream, {
      status: 206,
      headers: responseHeaders
    });
  }

  const start = rangeRequest.Start;
  const end = rangeRequest.End;

  if (start >= contentLength || end >= contentLength) {
    responseHeaders.set("Content-Range", 'bytes */' + contentLength);

    return new Response(null, {
      status: 416,
      headers: responseHeaders
    })
  }

  responseHeaders.set("Content-Range", 'bytes ' + start + '-' + end + '/' + contentLength);
  responseHeaders.set("Content-Length", start === end ? "0" : (end - start + 1).toString());
  responseHeaders.set("Cache-Control", "no-cache");

  const fileChunk = stream.slice(start, end + 1);

  return new Response(fileChunk, {
    status: 206,
    headers: responseHeaders
  });
});

await serve(router.routes);

