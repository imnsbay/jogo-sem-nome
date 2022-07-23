import express from "express";
import http from "http";
import websocket from "websocket";
import routes from "./express/routes.js";

function server(httpPort, wsPort) {
  //servidor que retorna o html
  const app = express();

  app.use(express.static("public"));
  app.use(routes);
  app.listen(httpPort, () => console.log("Listening http on http://localhost:" + httpPort));

  //servidor websocket
  const httpServer = http.createServer();
  httpServer.listen(wsPort, () => console.log("Listening websocket on port " + wsPort));
  const websocketServer = websocket.server;

  const wsServer = new websocketServer({
    httpServer,
  });

  return wsServer;
}

export default server(4040, 4041);
