/* global artifacts */
var AirdropDuo = artifacts.require('AirdropDuo.sol')

module.exports = function(deployer) {
  deployer.deploy(AirdropDuo)
}
