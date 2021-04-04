import {addPlayer, updateReadyIndicators, updateGamestate} from './interface.js'

const protocol =  window.location.protocol === 'https:' ? 'wss' : 'ws' 

var chatSocket;


function onmessage(e) {
  console.log("received message:")
  let message = JSON.parse(e.data);
  console.log(message)
  
  if ('playerJoined' in message) {
    addPlayer(message['playerJoined']['username'], message['playerJoined']['num'])
  } else if ('waitMessage' in message) {
    readies = [true] * usernames.length
    updateReadyIndicators(readies)
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
  //     + GAMENAME + '/'
  //  );
  //  chatSocket.onmessage = onmessage;
  //  chatSocket.onclose = onclose;
  //  }, 10000);
};

function startSocket() {
  chatSocket = new WebSocket(
    // TODO roomname
     protocol + '://'
     + window.location.host
     + '/ws/hexgame/board/'
     + GAMENAME + '/'
  );
  chatSocket.onmessage = onmessage
  chatSocket.onclose = onclose
  //chatSocket.onerror = onclose
}


function unreadyMessage() {
  chatSocket.send(JSON.stringify({'unready' : true}))
}

function resetMessage(opponent) {
  chatSocket.send(JSON.stringify({'reset' : opponent}))
}

function readyMessage() {
  chatSocket.send(JSON.stringify({'playerReady':true}))
}

function assignmentMessage(i1,j1,i2,j2,attack) {
  chatSocket.send(JSON.stringify({'assignment': [i1,j1,i2,j2,attack]}))
}

export {startSocket, resetMessage, readyMessage, assignmentMessage, unreadyMessage}

