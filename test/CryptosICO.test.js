const {
  time,
  loadFixture,
} = require('@nomicfoundation/hardhat-network-helpers')
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs')
const { expect } = require('chai')
const { ethers } = require('hardhat')

const State = {
  BeforeStart: 0,
  Running: 1,
  AfterEnd: 2,
  Halted: 3,
}

describe('ICO', () => {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshopt in every test.
  async function deployICOFixture() {
    const ONE_WEEK_IN_SECONDS = 7 * 24 * 60 * 60
    const unlockTime = (await time.latest()) + ONE_WEEK_IN_SECONDS + 60

    // Contracts are deployed using the first signer/account by default
    const [
      admin,
      otherAccount,
      anotherAccount,
      depositAccout,
      anotherDepositAccount,
    ] = await ethers.getSigners()

    const CryptosICO = await ethers.getContractFactory('CryptosICO')
    const cryptosICO = await CryptosICO.deploy(depositAccout.address)

    return {
      admin,
      otherAccount,
      anotherAccount,
      depositAccout,
      anotherDepositAccount,
      cryptosICO,
      unlockTime,
    }
  }

  describe('Deployment', function () {
    it('Should set the right deposit account', async () => {
      const { cryptosICO, depositAccout } = await loadFixture(deployICOFixture)
      expect(await cryptosICO.deposit()).to.equal(depositAccout.address)
    })

    it('Should set the right admin', async function () {
      const { admin, cryptosICO } = await loadFixture(deployICOFixture)
      expect(await cryptosICO.admin()).to.equal(admin.address)
    })

    it('Should set the state to "Running"', async function () {
      const { cryptosICO } = await loadFixture(deployICOFixture)
      expect(await cryptosICO.getCurrentState()).to.equal(State.Running)
    })
  })

  describe('Changing States of ICO', () => {
    it('Should NOT let anyone except admit to halt the ICO', async () => {
      const { anotherAccount, cryptosICO } = await loadFixture(deployICOFixture)
      await expect(cryptosICO.connect(anotherAccount).halt()).to.revertedWith(
        'Not Admin!',
      )
    })

    it('Should halt the ICO and change state', async () => {
      const { cryptosICO } = await loadFixture(deployICOFixture)

      await cryptosICO.halt()

      expect(await cryptosICO.getCurrentState()).to.equal(State.Halted)
    })

    it('Should NOT let anyone except admit to resume the ICO', async () => {
      const { anotherAccount, cryptosICO } = await loadFixture(deployICOFixture)
      await expect(cryptosICO.connect(anotherAccount).resume()).to.revertedWith(
        'Not Admin!',
      )
    })

    it('Should revert if ICO already Running', async () => {
      const { cryptosICO } = await loadFixture(deployICOFixture)
      await expect(cryptosICO.resume()).to.revertedWith('ICO Already Running!')
    })

    it('Should change the state to AfterEnd after sales end', async () => {
      const { unlockTime, cryptosICO } = await loadFixture(deployICOFixture)

      // We can increase the time in Hardhat Network
      await time.increaseTo(unlockTime)

      expect(await cryptosICO.getCurrentState()).to.equal(State.AfterEnd)
    })
  })

  // describe('Withdrawals', function () {
  //   describe('Validations', function () {
  //     it('Should revert with the right error if called too soon', async function () {
  //       const { lock } = await loadFixture(deployOneYearLockFixture)

  //       await expect(lock.withdraw()).to.be.revertedWith(
  //         "You can't withdraw yet",
  //       )
  //     })

  //     it('Should revert with the right error if called from another account', async function () {
  //       const { lock, unlockTime, otherAccount } = await loadFixture(
  //         deployOneYearLockFixture,
  //       )

  //       // We can increase the time in Hardhat Network
  //       await time.increaseTo(unlockTime)

  //       // We use lock.connect() to send a transaction from another account
  //       await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
  //         "You aren't the owner",
  //       )
  //     })

  //     it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
  //       const { lock, unlockTime } = await loadFixture(deployOneYearLockFixture)

  //       // Transactions are sent using the first signer by default
  //       await time.increaseTo(unlockTime)

  //       await expect(lock.withdraw()).not.to.be.reverted
  //     })
  //   })

  //   describe('Events', function () {
  //     it('Should emit an event on withdrawals', async function () {
  //       const { lock, unlockTime, lockedAmount } = await loadFixture(
  //         deployOneYearLockFixture,
  //       )

  //       await time.increaseTo(unlockTime)

  //       await expect(lock.withdraw())
  //         .to.emit(lock, 'Withdrawal')
  //         .withArgs(lockedAmount, anyValue) // We accept any value as `when` arg
  //     })
  //   })

  //   describe('Transfers', function () {
  //     it('Should transfer the funds to the owner', async function () {
  //       const { lock, unlockTime, lockedAmount, owner } = await loadFixture(
  //         deployOneYearLockFixture,
  //       )

  //       await time.increaseTo(unlockTime)

  //       await expect(lock.withdraw()).to.changeEtherBalances(
  //         [owner, lock],
  //         [lockedAmount, -lockedAmount],
  //       )
  //     })
  //   })
  // })
})
