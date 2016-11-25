import { arch, platform } from 'os'

import modulePackage from '../package.json'
import sdkPackage from '../node_modules/sphere-node-sdk/package.json'

const sdkInfo = `node-sdk/${sdkPackage.version}`
const nodeInfo = `Node.js/${process.version}`
const runtimeInfo = `${platform()}; ${arch()}`
const moduleInfo = `${modulePackage.name}/${modulePackage.version}`

export default `${sdkInfo} ${nodeInfo} (${runtimeInfo}) ${moduleInfo}`
