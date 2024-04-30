import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    'extension.addScreenAndView',
    async (uri: vscode.Uri) => {
      // Prompt for the screen/view name
      const name = await vscode.window.showInputBox({
        prompt: 'Enter the name for the new screen and view',
      })

      if (!uri) {
        const workspaceFolders = vscode.workspace.workspaceFolders
        if (!workspaceFolders) {
          vscode.window.showErrorMessage('No workspace is open.')
          return
        }
        // Use the first workspace folder and append the 'src' folder to it
        const workspaceRoot = workspaceFolders[0].uri.fsPath
        uri = vscode.Uri.file(path.join(workspaceRoot, 'src'))
      }

      if (!name) {
        // User did not enter a name, exit the command
        return
      }

      // Get the list of subfolders in 'screens' and 'views'
      const screenSubfolders = getSubfolders(path.join(uri.fsPath, 'screens'))
      const viewSubfolders = getSubfolders(path.join(uri.fsPath, 'views'))

      // Combine the lists and add an option to create a new subfolder
      const subfolders = Array.from(
        new Set([...screenSubfolders, ...viewSubfolders])
      )
      subfolders.sort() // Sort the list alphabetically
      subfolders.unshift("Root of 'screens/views'") // Add option for the root
      subfolders.unshift('Create new subfolder...') // Add option to create a new subfolder at the beginning

      // Show quick pick for subfolders
      const subfolder = await vscode.window.showQuickPick(subfolders, {
        placeHolder: 'Select a subfolder or create a new one',
      })

      if (!subfolder) {
        // User did not select a subfolder, exit the command
        return
      }

      let finalSubfolder
      if (subfolder === 'Create new subfolder...') {
        // Prompt user to enter a new subfolder name
        finalSubfolder = await vscode.window.showInputBox({
          prompt: 'Enter the name for the new subfolder',
        })

        if (!finalSubfolder) {
          // User did not enter a subfolder name, exit the command
          return
        }
      } else if (subfolder !== "Root of 'screens/views'") {
        // If the user did not select the root, use the selected subfolder
        finalSubfolder = subfolder
      }

      // Construct the folder paths
      const screenFolder = path.join(uri.fsPath, 'screens', finalSubfolder)
      const viewFolder = path.join(uri.fsPath, 'views', finalSubfolder)

      // Create the subfolders if they don't exist
      if (!fs.existsSync(screenFolder)) {
        fs.mkdirSync(screenFolder, { recursive: true })
      }
      if (!fs.existsSync(viewFolder)) {
        fs.mkdirSync(viewFolder, { recursive: true })
      }

      // Define file paths
      const screenFilePath = path.join(screenFolder, `${name}Screen.tsx`)
      const viewFilePath = path.join(viewFolder, `${name}View.tsx`)

      // Check if the files already exist
      const screenFileExists = fs.existsSync(screenFilePath)
      const viewFileExists = fs.existsSync(viewFilePath)

      // Ask the user for confirmation if either file exists
      if (screenFileExists || viewFileExists) {
        const overwrite = await vscode.window.showWarningMessage(
          `The file${screenFileExists && viewFileExists ? 's' : ''} ${
            screenFileExists ? `${name}Screen.tsx` : ''
          }${screenFileExists && viewFileExists ? ' and ' : ''}${
            viewFileExists ? `${name}View.tsx` : ''
          } already exist${
            screenFileExists && viewFileExists ? '' : 's'
          }. Do you want to overwrite?`,
          { modal: true },
          'Yes',
          'No'
        )

        if (overwrite !== 'Yes') {
          // User chose not to overwrite the existing file(s)
          vscode.window.showInformationMessage('Operation cancelled.')
          return
        }
      }

      // Get the workspace root path
      const workspaceRoot = vscode.workspace.workspaceFolders
        ? vscode.workspace.workspaceFolders[0].uri.fsPath
        : null

      // Create a relative path from the workspace root
      const relativeScreenPath = path.relative(workspaceRoot, screenFilePath)
      const relativeViewPath = path.relative(workspaceRoot, viewFilePath)

      // Transform the paths to the desired format
      const transformedScreenPath = transformPath(relativeScreenPath)
      const transformedViewPath = transformPath(relativeViewPath)

      // Define file contents
      const screenContent = `import React from 'react'
import { ${name}View } from '${transformedViewPath}'

const ${name}Screen = () => {
  return <${name}View />
}

export default ${name}Screen
`

      const viewContent = `import React from 'react'
import { View, Text } from 'react-native'
import styled from 'styled-components'

export const ${name}View = () => {
  return (
    <View>
      <Text>${name} View</Text>
    </View>
  )
}
`

      // Write files to disk
      fs.writeFileSync(screenFilePath, screenContent)
      fs.writeFileSync(viewFilePath, viewContent)

      // Open the created files in the editor
      const screenUri = vscode.Uri.file(screenFilePath)
      const viewUri = vscode.Uri.file(viewFilePath)

      // Open the Screen file and then the View file
      const screenDocument = await vscode.window.showTextDocument(screenUri, {
        preview: false,
      })
      vscode.window.showTextDocument(viewUri, {
        preview: false,
        viewColumn: vscode.ViewColumn.Beside,
      })

      // Show a message to the user
      vscode.window.showInformationMessage(
        `Files created: ${path.join(
          finalSubfolder,
          `${name}Screen.tsx`
        )} and ${path.join(finalSubfolder, `${name}View.tsx`)}`
      )
    }
  )

  context.subscriptions.push(disposable)
}

// Helper function to get subfolders within a given folder
function getSubfolders(folderPath: string): string[] {
  if (!fs.existsSync(folderPath)) {
    return []
  }

  return fs
    .readdirSync(folderPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
}

// Helper function to transform the path to the desired format
function transformPath(filePath: string): string {
  // Remove the file extension
  let withoutExtension = filePath.replace(/\.[^/.]+$/, '')
  // Remove the 'src/' prefix
  withoutExtension = withoutExtension.replace(/^src\//, '')
  // Prepend with '~/'
  return `~/${withoutExtension}`
}

export function deactivate() {}
