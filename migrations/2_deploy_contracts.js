const MultiSig = artifacts.require("MultiSig");

module.exports = function (deployer, network, accounts) {
  const owners = accounts.slice(0, 3)
  const numConfirmationRequired = 2
  
  deployer.deploy(MultiSig, owners, numConfirmationRequired);
};
