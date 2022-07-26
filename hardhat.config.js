require('@nomicfoundation/hardhat-toolbox')

task('balance', "Prints an account's balance")
  .addParam('account', "The account's address")
  .setAction(async (taskArgs) => {
    const balance = await ethers.provider.getBalance(taskArgs.account)

    console.log(ethers.utils.formatEther(balance), 'ETH')
  })

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: '0.8.9',
  networks: {
    ganache: {
      url: 'http://127.0.0.1:7545',
      accounts: {
        mnemonic: 'ENTER_YOUR_MNEMONIC!',
      },
    },
  },
}
