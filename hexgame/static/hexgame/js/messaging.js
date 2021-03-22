import {addPlayer, packageGamestate, updateReadyIndicators, updateGamestate} from './interface.js'

const protocol =  window.location.protocol === 'https:' ? 'wss' : 'ws' 


var chatSocket = new WebSocket(
  // TODO roomname
   protocol + '://'
   + window.location.host
   + '/ws/hexgame/board/'
   + gamename + '/'
);

function onmessage(e) {
  console.log("received message:")
  let message = JSON.parse(e.data);
  console.log(message)
  
  if ('playerReadyMessage' in message) {
    player_ready = message['playerReadyMessage']
    updateReadyIndicators();
  } else if ('playerJoined' in message) {
    addPlayer(message['playerJoined']['username'], message['playerJoined']['num'])
  } else {
    updateGamestate(message);
  }
};

function onclose(e) {
  //console.error('Chat socket closed unexpectedly, or did not open. Reconnecting in 10 sec...');
  console.error('Chat socket closed unexpectedly, or did not open.');
  //// try to reconnect in half a second. If fails, will re-call this function
  //setTimeout(function() {
  //  chatSocket = new WebSocket(
  //    // TODO roomname
  //     protocol + '://'
  //     + window.location.host
  //     + '/ws/board/'
  //     + gamename + '/'
  //  );
  //  chatSocket.onmessage = onmessage;
  //  chatSocket.onclose = onclose;
  //  }, 10000);
};

chatSocket.onmessage = onmessage
chatSocket.onclose = onclose
//chatSocket.onerror = onclose

function resetMessage() {
  chatSocket.send(JSON.stringify({'reset' : true}))
}

function readyMessage() {
  chatSocket.send(packageGamestate())
}

function assignmentMessage(i1,j1,i2,j2,attack) {
  chatSocket.send(JSON.stringify({'assignment': [i1,j1,i2,j2,attack]}))
}

export {resetMessage, readyMessage, assignmentMessage}

