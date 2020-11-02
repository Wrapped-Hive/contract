const { assert, expect } = require('chai')
const chai = require('chai')
chai.use(require('chai-as-promised'))

const MultiSig = artifacts.require('MultiSig')

const { owners, generateSigs } = require('../test-accounts.js')

contract('MultiSig', () => {
  owners.pop()
  owners.pop()

  let instance
  beforeEach(async () => {
    instance = await MultiSig.new(owners)
  })

  describe('ModifyOwner', () => {
    const nonce = 10
    const _txIndex = 0
    let sigV = []
    let sigR = []
    let sigS = []

    const playOwner = owners[owners.length - 1]

    // Remove owner
    it('0. Should submit owner for modifing', async () => {
      const res = await instance.submitModifyOwner(playOwner, false, { from: owners[0] })

      const { logs } = res

      assert.equal(logs[0].event, 'SubmitModifyOwner')
      assert.equal(logs[0].args.owner, playOwner)
      assert.equal(logs[0].args.modifyOwnerIndex, 0)
      assert.equal(logs[0].args.add, false)

      const tx = await instance.modifyOwners(0)
      assert.equal(tx.executed, false)
    })

    it('1. Should remove owner', async () => {
      sigV = []
      sigR = []
      sigS = []
      // call an external function to generate VRS signatures using test account details
      const sigs = await generateSigs([nonce, _txIndex, false], (count = owners.length - 2))
      sigV = sigs.sigV
      sigR = sigs.sigR
      sigS = sigs.sigS

      await instance.submitModifyOwner(playOwner, false, { from: owners[0] })
      const res =  await instance.modifyOwner(
        nonce,
        _txIndex,
        sigV,
        sigR,
        sigS,
        { from: owners[0] }
      )

      const { logs } = res

      assert.equal(logs[0].event, 'RemovedOwner')
      assert.equal(logs[0].args.owner, playOwner)

      const tx = await instance.modifyOwners(0)
      assert.equal(tx.executed, true)
    })

    // Add owner
    it('2. Should add owner', async () => {
      sigV = []
      sigR = []
      sigS = []
      // call an external function to generate VRS signatures using test account details
      const sigs = await generateSigs([nonce, _txIndex, true], (count = owners.length - 2))
      sigV = sigs.sigV
      sigR = sigs.sigR
      sigS = sigs.sigS

      const acc = "0x65aDc38eD73c89522c97ec058bbbA49090e9Ac97"
      await instance.submitModifyOwner(acc, true, { from: owners[0] })

      const res =  await instance.modifyOwner(
        nonce,
        _txIndex,
        sigV,
        sigR,
        sigS,
        { from: owners[0] }
      )

      const { logs } = res

      assert.equal(logs[0].event, 'AddedOwner')
      assert.equal(logs[0].args.owner, acc)

      const tx = await instance.modifyOwners(0)
      assert.equal(tx.executed, true)
    })

    // modifyOwner schould fail if transaction already executed
    it('3. Should reject if already executed', async () => {
      sigV = []
      sigR = []
      sigS = []
      // call an external function to generate VRS signatures using test account details
      const sigs = await generateSigs([nonce, _txIndex, false], (count = owners.length - 2))
      sigV = sigs.sigV
      sigR = sigs.sigR
      sigS = sigs.sigS

      await instance.submitModifyOwner(playOwner, false, { from: owners[0] })
      
      await instance.modifyOwner(
        nonce,
        _txIndex,
        sigV,
        sigR,
        sigS,
        { from: owners[0] }
      )

      await expect(instance.modifyOwner(
        nonce,
        _txIndex,
        sigV,
        sigR,
        sigS,
        { from: owners[0] }
      )).to.be
        .rejected
    })

    // modifyOwner schould fail if not called by a owner
    it('4. Should reject if not called by owner', async () => {
      await expect(instance.modifyOwner(
        nonce,
        _txIndex,
        sigV,
        sigR,
        sigS,
        { from: owners[0] }
      )).to.be
        .rejected
    })
  })

  describe('execute', () => {
    const nonce = 10
    const _txIndex = 0
    let sigV = []
    let sigR = []
    let sigS = []

    beforeEach(async () => {
      const to = owners[0]
      const data = '0x0'

      await instance.submitTransaction(to, data, { from: owners[0] })

      sigV = []
      sigR = []
      sigS = []
      // call an external function to generate VRS signatures using test account details
      const sigs = await generateSigs([nonce, _txIndex], (count = owners.length - 2))
      sigV = sigs.sigV
      sigR = sigs.sigR
      sigS = sigs.sigS
    })

    // execute transaction using offchain signatures schould succeed
    it('5. Should execute with offchain signatures', async () => {
      const res = await instance.execute(
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
    it('6. Should reject if already executed', async () => {
      await instance.execute(
        nonce,
        _txIndex,
        sigV,
        sigR,
        sigS,
        { from: owners[0] }
      )

      await expect(
        instance.execute(nonce, _txIndex, sigV, sigR, sigS, {
          from: owners[0],
        })
      ).to.be.rejected
    })

    // execute transaction schould fail if not called by owner
    it('7. Should reject if not called by owner', async () => {
      await expect(
        instance.execute(nonce, _txIndex, sigV, sigR, sigS, {
          from: owners[9],
        })
      ).to.be.rejected
    })

    // execute transaction schould fail if an account isn't a recorded owner
    it('8. Should reject if signature not up to 80% of approved owners', async () => {
      sigV.pop()
      sigR.pop()
      sigS.pop()
      
      await expect(
        instance.execute(nonce, _txIndex, sigV, sigR, sigS, {
          from: owners[0],
        })
      ).to.be.rejected
    })
  })
})
