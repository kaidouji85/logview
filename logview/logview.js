//**************************************
//*
//* Grobal Value
//*
//**************************************
var net = require('net');
var http = require('http');
var url = require('url');
var path = require('path');
var fs = require('fs');
var index = require('fs').readFileSync('logview.html');
var WebSocketServer = require('websocket').server;
var AcceptConsoleMessagePort = 8124;
var WebSocketServerListenPort = 8080;
var WebSocketConnections = new Array();
var maxLogBuffer = 5000;
var logBuffer = Array();

process.stdin.resume();
process.stdin.setEncoding('utf8');

//**************************************
//*
//* Add logBuffer
//*
//**************************************
function addLogBuffer(mes) {
  
  var log = {time: new Date(), message:mes};
  logBuffer.push(log);
  
  if (logBuffer.length > maxLogBuffer) {
    logBuffer.shift();
  }
}

//**************************************
//*
//* Accept Console Message Server
//*
//**************************************
var acceptMessageServer = net.createServer(function(socket) {
  console.log('Accept Message Server connected');
  
  socket.on('end', function() {
    console.log('Accept Message Server disconnected');
  });
  
  socket.on('data', function(data) {
    var mes = data.toString();
    console.log('Accept Data Process :' + mes);
    addLogBuffer(mes);
    console.log('logdate : ' + logBuffer[logBuffer.length-1].message);
    
    /*
    for(var i=0; i<WebSocketConnections.length; i++) {
      WebSocketConnections[i].sendUTF(mes);
    }
    */
  });
  
  socket.on('error', function(data) {
    console.log('error occured');
  });
  
});
//Listen
acceptMessageServer.listen(AcceptConsoleMessagePort, function() {
  console.log('Accept Message Server Listen : ' + AcceptConsoleMessagePort );
});

//**************************************
//*
//* Websocket Listen Server
//*
//**************************************
var server = http.createServer(function(req, res) {
  
  console.log(req.url);
  if (req.url === '/logview') {
    var file = require('fs').readFileSync("logview.html");
    res.writeHead(200, { 'content-type': 'text/html'});
    res.end(file);
  } else {
    console.log('bad request : ' + req.url);
    res.writeHead(404);
    res.end();
  }
  
});
//Listen
server.listen(WebSocketServerListenPort, function() {
  console.log('Listening on ' + WebSocketServerListenPort);
});

//**************************************
//*
//* Websocket Server
//*
//**************************************
var wsServer = new WebSocketServer({
  httpServer: server,
  autoAcceptConnections: false
});
 
wsServer.on('request', function(req) {
  var conn = req.accept('logview-conn', req.origin);
  conn.lastSendTime = new Date(0);
  WebSocketConnections.push(conn);
  console.log((new Date()) + ' Peer ' + conn.remoteAddress + ' connected.');
  
  conn.on('close', function(reasonCode, description) {
    console.log((new Date()) + ' Peer ' + conn.remoteAddress + ' disconnected.');
    for(var i=0; i<WebSocketConnections.length; i++) {
      if(WebSocketConnections[i]==conn) {
        WebSocketConnections.splice(i,1);
        console.log('delete connection');
      }
    }
  });
  
});

//**************************************
//*
//* input data for stdio
//*
//**************************************
process.stdin.on('data', function(chunk) {
    addLogBuffer(chunk);
});

//**************************************
//*
//* send message to websocket client
//*
//**************************************
function sendMessageToWebsocClient() {
  for(var i=0; i<WebSocketConnections.length; i++) {
    for(var j=0; j<logBuffer.length; j++) {
      if (logBuffer[j].time > WebSocketConnections[i].lastSendTime) {
        WebSocketConnections[i].sendUTF(logBuffer[j].message);
        WebSocketConnections[i].lastSendTime=logBuffer[j].time;
        
      }
    }
  }  
}
setInterval(sendMessageToWebsocClient,500);


