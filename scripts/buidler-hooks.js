/*
 * These hooks are called by the Aragon Buidler plugin during the start task's lifecycle. Use them to perform custom tasks at certain entry points of the development build process, like deploying a token before a proxy is initialized, etc.
 *
 * Link them to the main buidler config file (buidler.config.js) in the `aragon.hooks` property.
 *
 * All hooks receive two parameters:
 * 1) A params object that may contain other objects that pertain to the particular hook.
 * 2) A "bre" or BuidlerRuntimeEnvironment object that contains enviroment objects like web3, Truffle artifacts, etc.
 *
 * Please see AragonConfigHooks, in the plugin's types for further details on these interfaces.
 * https://github.com/aragon/buidler-aragon/blob/develop/src/types.ts#L31
 */
let contrib,currency,contribManager,currencyManager
const root = "0x3e2cfb838b2ad1503bf79a4391e990a014b1eaf20f5de80ac5e441b8ee6e90e4";
const dataURI = "ipfs:QmQJa54XQwEPeyPvUg2bCKZD6AK98hMB4zU4gU1EgpQG4P";
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

module.exports = {
  // Called before a dao is deployed.
  preDao: async ({ log }, { web3, artifacts }) => {
    contrib = await _newToken({artifacts}, {name:"Contrib" , symbol:"CONTRIB", transferable:false})
    currency = await _newToken({artifacts}, {name:"Currency", symbol:"CURRENCY", transferable:true})
  },

  // Called after a dao is deployed.
  postDao: async (
    { dao, _experimentalAppInstaller, log },
    { web3, artifacts }
  ) => {
    contribManager = await _experimentalAppInstaller('token-manager', {skipInitialize:true})
    currencyManager = await _experimentalAppInstaller('token-manager', {skipInitialize:true})
    await contrib.changeController(contribManager.address)
    await currency.changeController(currencyManager.address)
    await contribManager.initialize([contrib.address, false, 0])
    await currencyManager.initialize([currency.address, true, 0])
  },

  // Called after the app's proxy is created, but before it's initialized.
  preInit: async (
    { proxy, _experimentalAppInstaller, log },
    { web3, artifacts }
  ) => {},

  // Called after the app's proxy is initialized.
  postInit: async (
    { proxy, _experimentalAppInstaller, log },
    { web3, artifacts }
  ) => {
    await contribManager.createPermission('MINT_ROLE', proxy.address)
    await currencyManager.createPermission('MINT_ROLE', proxy.address)
  },

  // Called when the start task needs to know the app proxy's init parameters.
  // Must return an array with the proxy's init parameters.
  getInitParams: async ({ log }, { web3, artifacts }) => {
    return [contribManager.address, currencyManager.address, root, dataURI]
  },

  // Called after the app's proxy is updated with a new implementation.
  postUpdate: async ({ proxy, log }, { web3, artifacts }) => {},
}

async function _newToken({artifacts}, {name, symbol, transferable}) {
  const MiniMeTokenFactory = await artifacts.require('MiniMeTokenFactory')
  const MiniMeToken = await artifacts.require('MiniMeToken')
  const factory = await MiniMeTokenFactory.new()
  const token = await MiniMeToken.new(
    factory.address,
    ZERO_ADDRESS,
    0,
    name,
    18,
    symbol,
    transferable
  )
  return token
}
