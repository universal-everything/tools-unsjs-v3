#!/usr/bin/env node
import path from 'path'
import { main as fetchData } from './fetch-data.js'
import { main as ganache } from './ganache.js'
import { main as manager } from './manager.js'

const args = process.argv.slice(2)
let config

if (args[0] === '--help' || args[0] === '-h') args[0] = 'help'

const help = () => {
  console.log(`
    Usage:
        ens-test-env start [--no-graph|--no-reset|--no-deploy|--config]
        ens-test-env data [--load|--compress]
        ens-test-env help
    
    Options:
        --no-graph   Don't run graph-node
        --no-reset   Don't reset data folder
        --no-deploy  Don't deploy contracts
        --config     Specify config directory
        --load       Load data from archive
        --compress   Compress data folder to archive
    `)
}

const checkKnownArgs = (maxArgs, ...knownArgs) => {
  const knownArgsArr = [...knownArgs]
  const unknownArgs = args.slice(1).filter((arg) => !knownArgsArr.includes(arg))
  if (unknownArgs.length > 0) {
    console.log(`Unknown arguments: ${unknownArgs.join(', ')}`)
    help()
    process.exit(1)
  }
  if (args.length > maxArgs) {
    console.log(`Too many arguments: ${args.join(', ')}`)
    help()
    process.exit(1)
  }
}

const start = () => {
  checkKnownArgs(2, '--no-graph', '--no-reset', '--no-deploy')
  if (args.includes('--no-graph') && args.includes('--no-reset')) {
    console.log("Can't use --no-graph and --no-reset at the same time")
    return help()
  }
  const opts = {
    deployGraph: !args.includes('--no-graph'),
    resetData: !args.includes('--no-reset'),
    deployContracts: !args.includes('--no-deploy'),
  }
  ganache(opts.deployContracts, config)
  manager(opts.deployGraph, config)
}

const data = () => {
  checkKnownArgs(1, '--load', '--compress')
  fetchData(args[1], config)
}

const main = async () => {
  const configArgInx = args.indexOf('--config') + 1
  if (configArgInx > 0) {
    try {
      config = (
        await import(path.join(process.env.PROJECT_CWD, args[configArgInx]))
      ).default
      args.slice(configArgInx - 1, 2)
    } catch {
      console.log(`Config file ${args[configArgInx]} not found`)
      return help()
    }
  } else {
    config = (
      await import(path.join(process.env.PROJECT_CWD, 'ens-test-env.config.js'))
    ).default
  }
  if (!config || !config.ganache || !config.graph) {
    console.log('No valid config found')
    return help()
  }
  switch (args[0]) {
    case 'help':
      help()
      break
    case 'start':
      start()
      break
    case 'data':
      data()
      break
    case undefined:
      console.log('Provide a command or argument.')
      help()
      break
    default:
      console.log(`Unknown command: ${args[0]}`)
      help()
      break
  }
}

main()