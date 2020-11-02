const { assert, expect } = require('chai')
const chai = require('chai')
chai.use(require('chai-as-promised'))

const MultiSig = artifacts.require('MultiSig')

const { owners, generateSigs } = require('../test-accounts.js')

contract('MultiSig', () => {
  const numOfConfirmationRequired = 1

  let instance
  beforeEach(async () => {
    instance = await MultiSig.new(owners, numOfConfirmationRequired)
  })

  describe('executeTransaction', () => {
    beforeEach(async () => {
      const to = owners[0]
      const data = '0x0'

      await instance.submitTransaction(to, data, { from: owners[0] })
      await instance.confirmTransaction(0, { from: owners[0] })
      await instance.confirmTransaction(0, { from: owners[1] })
    })

    // execute transaction schould succeed
    it('Should execute', async () => {
      const res = await instance.executeTransaction(0, { from: owners[0] })
      const { logs } = res

      assert.equal(logs[0].event, 'ExecuteTransaction')
      assert.equal(logs[0].args.owner, owners[0])
      assert.equal(logs[0].args.txIndex, 0)

      const tx = await instance.transactions(0)
      assert.equal(tx.executed, true)
    })

    // execute transaction schould fail if transaction already executed
    it('Should reject if already executed', async () => {
      await instance.executeTransaction(0, { from: owners[0] })

      await expect(instance.executeTransaction(0, { from: owners[0] })).to.be
        .rejected
    })

    // execute transaction schould fail if not called by owner
    it('Should reject if not called by owner', async () => {
      await expect(instance.executeTransaction(0, { from: owners[4] })).to.be
        .rejected
    })
  })

  describe('executeWithOffChainSigs', () => {
    const nonce = 10
    const _txIndex = 0
    let sigV = []
    let sigR = []
    let sigS = []

    beforeEach(async () => {
      const to = owners[0]
      const data = '0x0'

      await instance.submitTransaction(to, data, { from: owners[0] })

      // call an external function to generate VRS signatures using test account details
      const sigs = await generateSigs(nonce, _txIndex, (count = 3))
      sigV = sigs.sigV
      sigR = sigs.sigR
      sigS = sigs.sigS
    })

    // execute transaction using offchain signatures schould succeed
    it('Should execute with offchain signatures', async () => {
      const res = await instance.executeWithOffChainSigs(
        nonce,
        _txIndex,
        sigV,
        sigR,
        sigS,
        { from: owners[0] }
      )
      const { logs } = res

      assert.equal(logs[0].event, 'ExecuteTransaction')
      assert.equal(logs[0].args.owner, owners[0])
      assert.equal(logs[0].args.txIndex, 0)

      const tx = await instance.transactions(0)
      assert.equal(tx.executed, true)
    })

    // execute transaction using offchain signatures schould fail if transaction already executed
    it('Should reject if already executed', async () => {
      await instance.executeWithOffChainSigs(
        nonce,
        _txIndex,
        sigV,
        sigR,
        sigS,
        { from: owners[0] }
      )

      await expect(
        instance.executeWithOffChainSigs(nonce, _txIndex, sigV, sigR, sigS, {
          from: owners[0],
        })
      ).to.be.rejected
    })

    // execute transaction schould fail if not called by owner
    it('Should reject if not called by owner', async () => {
      await expect(
        instance.executeWithOffChainSigs(nonce, _txIndex, sigV, sigR, sigS, {
          from: owners[4],
        })
      ).to.be.rejected
    })

    // execute transaction schould fail if not called by owner
    it('Should reject if less confirmations found than required', async () => {
      sigV.shift()
      sigR.shift()
      sigS.shift()
      
      await expect(
        instance.executeWithOffChainSigs(nonce, _txIndex, sigV, sigR, sigS, {
          from: owners[4],
        })
      ).to.be.rejected
    })

    // execute transaction schould fail if an account isn't a recorded owner
    it('Should reject if an account isn\'t a recorded owner', async () => {
      // call an external function to generate VRS signatures using test account details
      const sigs = await generateSigs(nonce, _txIndex, count = 4)
      sigV = sigs.sigV
      sigR = sigs.sigR
      sigS = sigs.sigS

      await expect(
        instance.executeWithOffChainSigs(nonce, _txIndex, sigV, sigR, sigS, {
          from: owners[4],
        })
      ).to.be.rejected
    })
  })
})
