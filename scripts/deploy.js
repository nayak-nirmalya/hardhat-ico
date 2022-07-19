const hre = require('hardhat')

async function main() {
  const [admin, depositAccout] = await ethers.getSigners()

  console.log('Deploying contracts with the account:', admin.address)
  console.log('Account balance:', (await admin.getBalance()).toString())

  const CryptosICO = await ethers.getContractFactory('CryptosICO')
  const cryptosICO = await CryptosICO.deploy(depositAccout.address)

  console.log('CryptosICO deployed to: ', cryptosICO.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
