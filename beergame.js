// Your web app's Firebase configuration
// チャンジエージェントの本番用
const firebaseConfig = {
  apiKey: "AIzaSyCyOX-dmAo0mHc_Ohh63GFgC7A0J7wxEtY",
  authDomain: "beergame-f76d2.firebaseapp.com",
  databaseURL: "https://beergame-f76d2.firebaseio.com",
  projectId: "beergame-f76d2",
  storageBucket: "beergame-f76d2.appspot.com",
  messagingSenderId: "874526895178",
  appId: "1:874526895178:web:6033edbdb530f613ba0ab3",
  measurementId: "G-THFN6PG1XH"
};

// プロジェクトデザインの本番用
// const firebaseConfig = {
//   apiKey: "AIzaSyBUbOj3ktkRZ4K-tOAWRxtwn5ZJ_XNHVo0",
//   authDomain: "beergame-pd.firebaseapp.com",
//   projectId: "beergame-pd",
//   storageBucket: "beergame-pd.appspot.com",
//   messagingSenderId: "219793923167",
//   appId: "1:219793923167:web:de1d10e851af3cabbb4fea",
//   measurementId: "G-675YTKNL0H"
// };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.firestore().settings({ experimentalForceLongPolling: true });
// firebase.firestore.setLogLevel('debug');
firebase.analytics();
var db = firebase.firestore();

var gameId = null;

function checkLang() {
  const paramArray = [];
  const urlParam = location.search.substring(1);
  if (urlParam) {
    const param = urlParam.split('&');
    for (let i = 0; i < param.length; i++) {
      const paramItem = param[i].split('=');
      paramArray[paramItem[0]] = paramItem[1];
    }
  }

  if (paramArray['lang'] === 'en') {
    // 英語
    gameInstance.SendMessage('LoginSceneController', 'SelectLang', 'en');
  } else {
    // 日本語
    gameInstance.SendMessage('LoginSceneController', 'SelectLang', 'ja');
  }
}

function login(email, password) {
  firebase.auth().signInWithEmailAndPassword(email, password).then(function(user) {
    console.log(user);
    gameInstance.SendMessage('LoginSceneController', 'LoginSuccess');
  }).catch(function(error) {
    console.log(error);
    gameInstance.SendMessage('LoginSceneController', 'LoginFailed');
  });
}

function getLoginUserId() {
  const user = firebase.auth().currentUser;
  if (user) {
    const loginId = user.email.replace(/@example.com/g, '');
    gameInstance.SendMessage('BeerGameDirector', 'LoginUserId', loginId);
    gameInstance.SendMessage('ResultSceneManager', 'LoginUserId', loginId);
  } else {
    gameInstance.SendMessage('BeerGameDirector', 'LoginUserId', '');
    gameInstance.SendMessage('ResultSceneManager', 'LoginUserId', '');
  }
}

function loadGameData() {
  const user = firebase.auth().currentUser;
  if (user) {
    const loginId = user.email.replace(/@example.com/g, '');
    getGameByUser(loginId).then(function(game) {
      if (game) {
        game.onSnapshot({
            // Listen for document metadata changes
            includeMetadataChanges: true
        }, function(doc) {
            const data = doc.data();
            delete data.event;
            delete data.members;
            const dataString = JSON.stringify(data);
            gameInstance.SendMessage('TeamSceneController', 'UpdateData', dataString);
            gameInstance.SendMessage('BeerGameDirector', 'UpdateData', dataString);
            gameInstance.SendMessage('ResultSceneManager', 'UpdateData', dataString);
        });
      }
    }).catch(function(error) {
      console.log(error);
      gameInstance.SendMessage('TeamSceneController', 'FailedData', error);
      gameInstance.SendMessage('BeerGameDirector', 'FailedData', error);
      gameInstance.SendMessage('ResultSceneManager', 'FailedData', error);
    });
  }
}

async function getGameByUser(userName) {
  try {
    var users = await db.collection("users").where("id", "==", userName).get();
    if (users.size == 0) {
      console.log('User Not Found');
      return null;
    }

    var user = null;
    users.forEach((_user) => {
      user = _user.data();
    });

    if (!user.game) {
      alert('No Game');
      return null;
    }

    var game = await user.game.get();
    if (!game.exists) {
      alert('Game Not Found');
      return null;
    }
    
    gameId = game.id;

    var gameDoc = await db.collection("games").doc(game.id);
    return gameDoc;
  } catch (error) {
    alert(error.message);
  }
}

async function updateGameData(updateJson) {
  var updateObj = JSON.parse(updateJson);
  if (gameId) {
    db.collection("games").doc(gameId).update(updateObj).then(function() {
    }).catch(function(error) {
      console.log(error);
      gameInstance.SendMessage('TeamSceneController', 'FailedData', error);
    });
  }
}

function downloadCSV(gameData) {
  const game = JSON.parse(gameData);
  let csv = '\ufeff' + 'ターン,在庫(小売店),受注残(小売店),発注(小売店),受注(小売店),在庫(二次卸),受注残(二次卸),発注(二次卸),受注(二次卸),在庫(一次卸),受注残(一次卸),発注(一次卸),受注(一次卸),在庫(工場),受注残(工場),発注(工場),受注(工場)\n';
  for (let i = 0; i < 50; i++) {
    csv += `${i+1}, ${game.retail_store.stock_history[i]}, ${game.retail_store.remain_order_history[i]}, ${game.retail_store.send_order_history[i]}, ${game.retail_store.receive_order_history[i]}, `;
    csv += `${game.secondary_store.stock_history[i]}, ${game.secondary_store.remain_order_history[i]}, ${game.secondary_store.send_order_history[i]}, ${game.secondary_store.receive_order_history[i]}, `;
    csv += `${game.primary_store.stock_history[i]}, ${game.primary_store.remain_order_history[i]}, ${game.primary_store.send_order_history[i]}, ${game.primary_store.receive_order_history[i]}, `;
    csv += `${game.beer_factory.stock_history[i]}, ${game.beer_factory.remain_order_history[i]}, ${game.beer_factory.send_order_history[i]}, ${game.beer_factory.receive_order_history[i]}\n`;
  }
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = `${game.team_name}_result.csv`;
  link.click();
}
