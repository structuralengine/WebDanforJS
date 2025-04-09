export const environment = {
  production: false,
  firebase: {
    apiKey: "AIzaSyA_QvA6gsmiCU7fPKeCC4tfTJX6bZjC69w",
    authDomain: "strcutural-engine.firebaseapp.com",
    databaseURL: "https://strcutural-engine-default-rtdb.firebaseio.com",
    projectId: "strcutural-engine",
    storageBucket: "strcutural-engine.appspot.com",
    messagingSenderId: "424393809904",
    appId: "1:424393809904:web:da2eb60ab855cf4e76c735"
  },
  //calcURL: "http://127.0.0.1:5000",
  calcURL: "http://127.0.0.1:8080",
  printURL: " http://localhost:7071/api/Function1",
  environment: "LOCAL",
  loginURL: 'https://platform.malme.app/signup',
  msalConfig: {
    authWeb: {
      clientId: '9e709ca9-c8bc-4cb6-92c5-a9992c4126e7',
      authority: 'https://login.microsoftonline.com/ddca41c1-0e3d-484f-a86f-2065b4b21d4d',
      redirectUri: 'http://localhost:4200',
    },
    authElectron : {
      clientIdElectron: '9084c534-edae-46ba-a3a0-901c9a3bb59a',
      authorityElectron: 'https://login.microsoftonline.com/ddca41c1-0e3d-484f-a86f-2065b4b21d4d',
      redirectUriElectron:'http://localhost'
    }
  },
  apiConfig: {
    scopes: ['user.read'],
    uri: 'https://graph.microsoft.com/v1.0/me'
  }
};