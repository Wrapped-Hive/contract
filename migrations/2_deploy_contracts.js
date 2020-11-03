const MultiSig = artifacts.require("MultiSig");

module.exports = function (deployer, network, accounts) {
  const owners = accounts.slice(0, 3)
  
  deployer.deploy(MultiSig, owners);
};
