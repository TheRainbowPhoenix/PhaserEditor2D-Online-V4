// Start listening on port 8080 of localhost.
const server = Deno.listen({ port: 8080 });
console.log("File server running on http://localhost:8080/");

for await (const conn of server) {
  handleHttp(conn).catch(console.error);
}

async function handleHttp(conn: Deno.Conn) {
  const httpConn = Deno.serveHttp(conn);
  for await (const requestEvent of httpConn) {
    // Use the request pathname as filepath
    const url = new URL(requestEvent.request.url);
    let filepath = decodeURIComponent(url.pathname);

    // Default to serving index.html if filepath is root
    if (filepath === '/') {
      filepath = '/index.html';
    }

    // Try opening the file
    let file;
    try {
      file = await Deno.open("." + filepath, { read: true });
    } catch (error) {
      // If the file cannot be opened, return a "404 Not Found" response
      console.error(`Error opening file ${filepath}: ${error}`);
      const notFoundResponse = new Response("404 Not Found", { status: 404 });
      await requestEvent.respondWith(notFoundResponse);
      continue;
    }

    // Determine content type based on file extension
    let contentType = 'application/octet-stream';
    const extension = filepath.split('.').pop();
    if (extension === 'html') {
      contentType = 'text/html';
    } else if (extension === 'js') {
      contentType = 'application/javascript';
    } else if (extension === 'css') {
      contentType = 'text/css';
    } else if (extension === 'json') {
      contentType = 'application/json';
    } else if (extension === 'ico') {
      contentType = 'image/x-icon';
    }

    // Build a readable stream so the file doesn't have to be fully loaded into
    // memory while we send it
    const readableStream = file.readable;

    // Build and send the response
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', contentType);
    const response = new Response(readableStream, { headers: responseHeaders });
    await requestEvent.respondWith(response);
  }
}
