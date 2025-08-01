import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as fs from 'fs';
import log from 'electron-log';
import isDev from 'electron-is-dev';
import path from 'path'
import { msalConfig } from './login/config';
import { IPC_MESSAGES } from './login/constants';
import { AuthProvider } from './login/authProvider';
import { getGraphClient } from './login/graph';
// 起動 --------------------------------------------------------------

let mainWindow: BrowserWindow;
let locale = 'ja';
let check = -1;
let arg_path: string = null;
let authProvider : AuthProvider;
autoUpdater.autoDownload = false
// log.transports.file.resolvePath = () => path.join('D:/logs/main.logs')

// パッケージ化後の環境を考慮したパス解決
const getAssetsPath = () =>
  isDev
    ? path.join(__dirname, '../assets/i18n')
    : path.join(process.resourcesPath, 'app/assets/i18n');

export function getLangText(locale: string, fallback: string = 'ja'): any {
  const assetsPath = getAssetsPath();
  const readLangFile = (loc: string) => {
    const filePath = path.join(assetsPath, `${loc}.json`);
    const jsonString = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(jsonString);
  };

  try {
    return readLangFile(locale);
  } catch (error) {
    console.warn(`Failed to load locale '${locale}', falling back to '${fallback}'`, error);
    return readLangFile(fallback);
  }
}

async function createWindow() {
  check = -1;
  const successMessage = buildSuccessMessage(locale);
  authProvider = new AuthProvider(msalConfig, successMessage);
  // log.info("check install k", check);
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  mainWindow.maximize();
  mainWindow.setMenuBarVisibility(false);
  // mainWindow.webContents.openDevTools();
  mainWindow.on('close', function (e) {
    if(check == -1){
      const langText = getLangText(locale)
      let choice = dialog.showMessageBoxSync(this,
        {
          type: 'question',
          buttons: ['Yes', 'No'],
          title: langText.window.closeTitle,
          message: langText.window.closeMessage,
        });
      if (choice == 1) {
        e.preventDefault();
      }
    }
  });
  if (process.argv.length > 1) {
    arg_path = process.argv[1];
  } else {
    arg_path = null;
  }
  await mainWindow.loadFile('index.html');
}

app.whenReady().then(async () => {
  await createWindow();
  if (!isDev) {
    // 起動時に1回だけ
    log.info(`アップデートがあるか確認します。${app.name} ${app.getVersion()}`);
    await autoUpdater.checkForUpdates();
  }
});
// アップデート --------------------------------------------------
//autoUpdater.checkForUpdatesAndNotify();
autoUpdater.on('update-available', (info) => {
  log.info('update-available', info)
  autoUpdater.downloadUpdate();
});
autoUpdater.on('error', (err) => {
  log.info('Error in auto-updater:', err);
});
autoUpdater.on('download-progress', (progressObj) => {
  log.info('Download progress:', progressObj);
});
//when update downloaded, reboot to install
autoUpdater.on('update-downloaded', (info) => {
  log.info('Update-downloaded', info)
  try {
    const langText = getLangText(locale)
    let choice = dialog.showMessageBoxSync(mainWindow,
      {
        type: 'question',
        buttons: ["Ok", "Cancel"],
        message: langText.modal.updateMessage,
      });
    if (choice == 0) {
      let choice1 = dialog.showMessageBoxSync(mainWindow,
        {
          type: 'question',
          buttons: ['Yes', 'No'],
          title: langText.window.closeTitle,
          message: langText.window.closeMessage,
        });
      if (choice1 == 0) {
        check = 0;
        log.info("check install", check);
        autoUpdater.quitAndInstall();
      }
    }
  } catch (error) {
    console.error('Failed to load language file:', error);
  }
});
// Angular -> Electron --------------------------------------------------
ipcMain.on("newWindow", async() => await createWindow())
// ファイルを開く
ipcMain.on('open', (event: Electron.IpcMainEvent) => {
  if (!arg_path) {
    // ファイルを選択
    const paths = dialog.showOpenDialogSync(mainWindow, {
      buttonLabel: 'open', // 確認ボタンのラベル
      filters: [{ name: 'wdj', extensions: ['wdj'] }, { name: 'dsd', extensions: ['dsd'] }],
      properties: [
        'openFile', // ファイルの選択を許可
        'createDirectory', // ディレクトリの作成を許可 (macOS)
      ],
    });

    // キャンセルで閉じた場合
    if (paths == null) {
      event.returnValue = { status: undefined };
      return;
    }

    // ファイルの内容を返却
    try {
      const path = paths[0];
      const buff = fs.readFileSync(path);
      // ファイルを読み込む
      let text = null;
      switch (path.split('.').pop()) {
        case "dsd":
          text = buff;
          break;
        default:
          text = buff.toString();
      }

      // リターン
      event.returnValue = {
        status: true,
        path: path,
        textB: buff,
        text
      };
    } catch (error) {
      event.returnValue = { status: false, message: error.message };
    }
  } else {
    try {
      const path = arg_path;
      const buff = fs.readFileSync(path);

      // ファイルを読み込む
      let text = buff.toString();

      // リターン
      event.returnValue = {
        status: true,
        path: path,
        text
      };
      arg_path = null
    } catch (error) {
      event.returnValue = { status: false, message: error.message };
    }
  }
});

// 上書き保存
ipcMain.on(
  'overWrite',
  async (event: Electron.IpcMainEvent, path: string, data: string) => {
    fs.writeFile(path, data, async function (error) {
      if (error != null) {
        await dialog.showMessageBox({ message: 'error : ' + error });
      }
    });
    event.returnValue = path;
  }
);

// 名前を付けて保存
ipcMain.on(
  'saveFile',
  async (event: Electron.IpcMainEvent, filename: string, data: string) => {
    // 場所とファイル名を選択
    const path = dialog.showSaveDialogSync(mainWindow, {
      buttonLabel: 'save', // ボタンのラベル
      filters: [{ name: 'wdj', extensions: ['wdj'] }],
      defaultPath: filename,
      properties: [
        'createDirectory', // ディレクトリの作成を許可 (macOS)
      ],
    });

    // キャンセルで閉じた場合
    if (path == null) {
      event.returnValue = '';
    }

    // ファイルの内容を返却
    try {
      fs.writeFileSync(path, data);
      event.returnValue = path;
    } catch (error) {
      await dialog.showMessageBox({ message: 'error : ' + error });
      event.returnValue = '';
    }
  }
);

ipcMain.on(
  'saveFileExcel',
  async (event: Electron.IpcMainEvent, filename: string, data: string) => {
    // 場所とファイル名を選択
    const path = dialog.showSaveDialogSync(mainWindow, {
      buttonLabel: 'save', // ボタンのラベル
      filters: [{ name: 'xlsx', extensions: ['xlsx'] }],
      defaultPath: filename,
      properties: [
        'createDirectory', // ディレクトリの作成を許可 (macOS)
      ],
    });

    // キャンセルで閉じた場合
    if (path == null) {
      event.returnValue = '';
    }

    // ファイルの内容を返却
    try {
      fs.writeFileSync(path, data);
      event.returnValue = path;
    } catch (error) {
      if(path != null){
        await dialog.showMessageBox({ message: 'error : ' + error });
      }
      event.returnValue = '';
    }
  }
);

// アラートを表示する
ipcMain.on(
  'alert',
  async (event: Electron.IpcMainEvent, message: string) => {
    await dialog.showMessageBox({ message });
    event.returnValue = '';
  }
);
ipcMain.on(
  'alertConfirm',
  async (event: Electron.IpcMainEvent, message: string) => {
    let choice = dialog.showMessageBoxSync(mainWindow,
      {
        type: 'question',
        buttons: ["Ok", "Cancel"],
        message: message,
      });
    event.returnValue = choice;
  }
);
ipcMain.on(
  'change-lang', (event, lang) => {
    locale = lang;
    const newSuccessMessage = buildSuccessMessage(locale)
    if (authProvider) {
      authProvider.setSuccessTemplate(newSuccessMessage)
    }
  })
ipcMain.on(
  'get-main-wdj', (event: Electron.IpcMainEvent) => {
    event.returnValue = arg_path;
  })

//Event login, logout
ipcMain.on(IPC_MESSAGES.LOGIN, async () => {
  const account = await authProvider.login();
  await mainWindow.loadFile(path.join(__dirname, "./index.html"));

  const tokenRequest = {
    account: account,
    scopes: []
  };

  const tokenResponse = await authProvider.getToken(tokenRequest);
  const userClaims = tokenResponse.idTokenClaims
  const listClaims = []
  if (userClaims) {
    Object.entries(userClaims).forEach((claim: [string, unknown], index: number) => {
      listClaims.push({ id: index, claim: claim[0], value: claim[1] });
    });
  }
  mainWindow.webContents.send(IPC_MESSAGES.GET_PROFILE, listClaims);
});

ipcMain.on(IPC_MESSAGES.LOGOUT, async () => {
  await authProvider.logout();
  await mainWindow.loadFile(path.join(__dirname, "./index.html"));
});

function buildSuccessMessage(locale: string): string {
  const langText = getLangText(locale);

  return `
    <!DOCTYPE html>
    <html lang="${locale}">
    <head>
      <meta charset="UTF-8">
      <title>My App</title>
    </head>
    <body>
      <h1>${langText.menu.loginSuccessTitle}</h1>
      <p>${langText.menu.loginSuccessDescription}</p>
    </body>
    </html>`;
}
