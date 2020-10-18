const Migrations = artifacts.require("Migrations");
const MultiSig = artifacts.require("MultiSig");

module.exports = function (deployer) {
  deployer.deploy(Migrations);
  deployer.deploy(MultiSig);
};
