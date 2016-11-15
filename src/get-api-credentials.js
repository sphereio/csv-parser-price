'use strict'

export default function getApiCredentials (moduleName) {
  const env = process.env

  return {
    client_id:
      env.CM_DEV_CLIENT_ID ||
      env.CM_CLIENT_ID ||
      env[`CM_CLIENT_ID_${moduleName}`],
    client_secret:
      env.CM_DEV_CLIENT_SECRET ||
      env.CM_CLIENT_SECRET ||
      env[`CM_CLIENT_SECRET_${moduleName}`],
    project_key:
      env.CM_DEV_PROJECT_KEY ||
      env.CM_PROJECT_KEY ||
      env[`CM_PROJECT_KEY_${moduleName}`],
  }
}
