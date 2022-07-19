const {
  time,
  loadFixture,
} = require('@nomicfoundation/hardhat-network-helpers')
const { expect } = require('chai')
const { ethers } = require('hardhat')

const State = {
  BeforeStart: 0,
  Running: 1,
  AfterEnd: 2,
  Halted: 3,
}

const TOKEN_PRICE = 0.001

const toWei = (etherValue) => ethers.utils.parseEther(etherValue).toString()
const toEther = (weiValue) => ethers.utils.formatEther(weiValue).toString()

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

  describe('Investing in ICO', () => {
    it('Should NOT revert if the ICO in running State', async function () {
      const { otherAccount, cryptosICO } = await loadFixture(deployICOFixture)

      const currentState = await cryptosICO.getCurrentState()

      if (currentState == State.Running) {
        await expect(
          cryptosICO.connect(otherAccount).invest({ value: toWei('1') }),
        ).to.not.reverted
      } else {
        this.skip()
      }
    })

    it("Should emit event 'Invest'", async () => {
      const { otherAccount, cryptosICO } = await loadFixture(deployICOFixture)
      const ETH_VALUE = '15'
      const expectedTokenCount = ETH_VALUE / TOKEN_PRICE

      await expect(
        cryptosICO.connect(otherAccount).invest({ value: toWei(ETH_VALUE) }),
      )
        .to.emit(cryptosICO, 'Invest')
        .withArgs(otherAccount.address, toWei(ETH_VALUE), expectedTokenCount)
    })

    it('can NOT invest if ETH amount is low', async () => {
      const { otherAccount, cryptosICO } = await loadFixture(deployICOFixture)
      const ETH_VALUE = '0.0001'

      await expect(
        cryptosICO.connect(otherAccount).invest({ value: toWei(ETH_VALUE) }),
      ).to.revertedWith('Investment Value is not in acceptable range!')
    })

    it('can NOT invest if ETH amount is higher than maximum amount', async () => {
      const { otherAccount, cryptosICO } = await loadFixture(deployICOFixture)
      const ETH_VALUE = '18'

      await expect(
        cryptosICO.connect(otherAccount).invest({ value: toWei(ETH_VALUE) }),
      ).to.revertedWith('Investment Value is not in acceptable range!')
    })

    it('can NOT invest if invest amount will reach hardcap', async () => {
      const {
        admin,
        otherAccount,
        anotherAccount,
        cryptosICO,
      } = await loadFixture(deployICOFixture)
      const ETH_VALUE = '15'

      await cryptosICO.connect(admin).invest({ value: toWei(ETH_VALUE) })
      await cryptosICO.connect(otherAccount).invest({ value: toWei(ETH_VALUE) })
      await cryptosICO
        .connect(anotherAccount)
        .invest({ value: toWei(ETH_VALUE) })

      await expect(
        cryptosICO.connect(otherAccount).invest({ value: toWei(ETH_VALUE) }),
      ).to.revertedWith('Hardcap Reached!')
    })
  })

  describe('Burning Token', () => {
    it('Should burn remaining tokens after ICO ends', async function () {
      const { admin, unlockTime, cryptosICO } = await loadFixture(
        deployICOFixture,
      )

      await time.increaseTo(unlockTime)
      const burned = await cryptosICO.burn()

      if (burned) {
        expect(await cryptosICO.balances(admin.address)).to.equal('0')
      } else {
        this.skip()
      }
    })
  })
})
