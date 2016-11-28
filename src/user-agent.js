import { arch, platform } from 'os'
import getPackage from 'load-module-pkg'

import modulePackage from '../package.json'

const sdkInfo = `node-sdk/${getPackage('sphere-node-sdk').version}`
const nodeInfo = `Node.js/${process.version}`
const runtimeInfo = `${platform()}; ${arch()}`
const moduleInfo = `${modulePackage.name}/${modulePackage.version}`

export default `${sdkInfo} ${nodeInfo} (${runtimeInfo}) ${moduleInfo}`
