export const environment = {
  production: true,
  firebase: {
    apiKey: "AIzaSyA_QvA6gsmiCU7fPKeCC4tfTJX6bZjC69w",
    authDomain: "strcutural-engine.firebaseapp.com",
    databaseURL: "https://strcutural-engine-default-rtdb.firebaseio.com",
    projectId: "strcutural-engine",
    storageBucket: "strcutural-engine.appspot.com",
    messagingSenderId: "424393809904",
    appId: "1:424393809904:web:da2eb60ab855cf4e76c735"
  },
  prevURL: 'https://webdan2azure.azurewebsites.net/api/Function3?code=f3nIwsFrsMe9GKejKZolLp_pZ5gwi3dKWiVDqzMz8GzZAzFukUDNUg==',
  calcURL: 'https://webdan2azure.azurewebsites.net/api/Function3?code=f3nIwsFrsMe9GKejKZolLp_pZ5gwi3dKWiVDqzMz8GzZAzFukUDNUg==',
  printURL: 'https://webdan2azure.azurewebsites.net/api/Function3?code=f3nIwsFrsMe9GKejKZolLp_pZ5gwi3dKWiVDqzMz8GzZAzFukUDNUg==',
  loginURL: 'https://platform.structuralengine.com',
  msalConfig: {
    authWeb: {
      clientId: '15bb0ef3-964e-44a5-9d4e-f182ee78845d',
      authority: 'https://login.microsoftonline.com/ddca41c1-0e3d-484f-a86f-2065b4b21d4d',
      redirectUri: 'https://webdan.malme.app',
    },
    authElectron : {
      clientIdElectron: '15bb0ef3-964e-44a5-9d4e-f182ee78845d',
      authorityElectron: 'https://login.microsoftonline.com/ddca41c1-0e3d-484f-a86f-2065b4b21d4d',
      redirectUriElectron:'msal15bb0ef3-964e-44a5-9d4e-f182ee78845d://auth'
    }
  },
  apiConfig: {
    scopes: ['user.read'],
    uri: 'https://graph.microsoft.com/v1.0/me'
  }
};
