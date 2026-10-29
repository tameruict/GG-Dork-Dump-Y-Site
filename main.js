const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const fs = require('fs')

function createWindow () {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1120,
    minHeight: 700,
    backgroundColor: '#10131a',
    title: 'Mango Keywords v3.5 — Dork Studio',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  win.loadFile('index.html')
  win.setMenuBarVisibility(false)
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC: mở file txt/csv/list
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt', 'csv', 'list', 'text'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  if (canceled || !filePaths.length) return null
  try {
    const content = fs.readFileSync(filePaths[0], 'utf-8')
    return { path: filePaths[0], content }
  } catch (e) {
    return { path: filePaths[0], content: '', error: String(e.message || e) }
  }
})

ipcMain.handle('dialog:saveFile', async (event, data, defaultName) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'JSON', extensions: ['json'] }
    ],
    defaultPath: defaultName || 'dorks.txt'
  })
  if (canceled || !filePath) return false
  fs.writeFileSync(filePath, data, 'utf-8')
  return true
})

