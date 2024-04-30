import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    'extension.addScreenAndView',
    async (uri: vscode.Uri) => {
      const name = await vscode.window.showInputBox({
        prompt: 'Enter the name for the new screen and view',
      })

      if (!name) {
        // User did not enter a name, exit the command
        return
      }

      // Assuming uri is the path to the 'src' folder
      const screenFolder = path.join(uri.fsPath, 'screens')
      const viewFolder = path.join(uri.fsPath, 'views')

      // Create the folders if they don't exist
      if (!fs.existsSync(screenFolder)) {
        fs.mkdirSync(screenFolder)
      }
      if (!fs.existsSync(viewFolder)) {
        fs.mkdirSync(viewFolder)
      }

      // Define file paths
      const screenFilePath = path.join(screenFolder, `${name}Screen.tsx`)
      const viewFilePath = path.join(viewFolder, `${name}View.tsx`)

      // Define file contents
      const screenContent = `import React from 'react';
import { View, Text } from 'react-native';
import { ${name} } from '~/views/${name}View'

const ${name}Screen = () => {
  return (
    <${name}View />
  );
};

export default ${name}Screen;
`

      const viewContent = `import React from 'react';
import { View, Text } from 'react-native';

const ${name}View = () => {
  return (
    <View>
      <Text>${name} View</Text>
    </View>
  );
};

export default ${name}View;
`

      // Write files to disk
      fs.writeFileSync(screenFilePath, screenContent)
      fs.writeFileSync(viewFilePath, viewContent)

      // Show a message to the user
      vscode.window.showInformationMessage(
        `Files created: ${name}Screen.tsx and ${name}View.tsx`
      )
    }
  )

  context.subscriptions.push(disposable)
}

export function deactivate() {}
