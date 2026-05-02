const DEPLOYER = "0x4e98F2ccb2c55AdCa6fA5AdbaF63248B238A23A1";
module.exports = [
  0,              // minDelay (0 for testnet)
  [DEPLOYER],     // proposers
  [DEPLOYER],     // executors
  DEPLOYER,       // admin
];
