import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as fs from 'fs';
import log from 'electron-log';
import isDev from 'electron-is-dev';
// 起動 --------------------------------------------------------------

let mainWindow: BrowserWindow;
let locale = 'ja';
let arg_path: string = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true, // レンダラープロセスが Node.js の機能を利用できるようにします
      contextIsolation: false, // メインプロセスとレンダラープロセスの JavaScript コンテキストを分離します
    },
  });
  // mainWindow.maximize();
  mainWindow.setMenuBarVisibility(false);
  // mainWindow.webContents.openDevTools();


  mainWindow.on('close', function (e) {
    // isasから呼ばれた場合は何もAlert出さずに閉じる
  });

  // isasから呼ばれた場合は起動時にwdjファイルのpathが渡される
  if(process.argv.length > 1){
    arg_path = process.argv[1];
  }else{
    arg_path = null;
  }

  await mainWindow.loadFile('index.html');
}

app.whenReady().then(async () => {
  await createWindow();

  // isasはアップデートしない
  // if (!isDev) {
  //   // 起動時に1回だけ
  //   log.info(`アップデートがあるか確認します。${app.name} ${app.getVersion()}`);

  //   await autoUpdater.checkForUpdates();
  // }
});

// アップデート --------------------------------------------------
// autoUpdater.checkForUpdatesAndNotify();

// Angular -> Electron --------------------------------------------------
// ファイルを開く
ipcMain.on('open', (event: Electron.IpcMainEvent) => {
  
  // ファイルの内容を返却
  dialog.showMessageBox({ message: arg_path });
  try {
    const path = arg_path; // isasの場合は、開くファイルが決まっている
    const buff = fs.readFileSync(path);

    // ファイルを読み込む
    let text = buff.toString();

    // リターン
    event.returnValue = {
      status: true,
      path: path,
      text
    };
  } catch (error) {
    event.returnValue = { status: false, message: error.message };
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
    // isasの場合は名前を付けて保存しない
    event.returnValue = '';
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
  'change-lang', (event, lang) => {
  locale = lang;
})

// isasのwdjファイルがあるかどうか確認する
ipcMain.on(
  'get-isas-wdj', (event: Electron.IpcMainEvent) => {
    event.returnValue = arg_path;
})