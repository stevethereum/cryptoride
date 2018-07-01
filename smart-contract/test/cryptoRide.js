const cryptoRide = artifacts.require('./cryptoRide.sol')

contract('cryptoRide', function ([owner, Pelotonia, donor1, donor2, hacker]) {
  let cryptoRide
  let cryptoRideAddress

  beforeEach('setup contract and Oracle for each test', async function () {
      cryptoRide = await cryptoRide.new(Pelotonia)
      cryptoRideAddress = await cryptoRide.address
      await forceOracleStatus('ongoing')
  })

  it('has an owner equal to its deployer', async function () {
      assert.equal(await cryptoRide.ownerAddress(), owner)
  })

  it('correctly sets Pelotonia address at deployment', async function () {
      assert.equal(await cryptoRide.PelotoniaAddress(), Pelotonia)
  })

  it('is initially deployed with an ONGOING status', async function () {
      assert.equal(await cryptoRide.challengeStatus(), 'ongoing')
  })

  it('is initially deployed in an unpaused state', async function () {
      assert.equal(await cryptoRide.paused(), false)
  })

  it('is initially deployed with a total donations amount equal to 0', async function () {
      assert.equal(await cryptoRide.totalDonation(), 0)
  })

  it('can be refreshed by its owner', async function () {
      // To be able to query the Oracle, the contract needs some balance
      await cryptoRide.sendTransaction({ value: 1e+18, from: donor1 })

      await cryptoRide.refreshChallengeStatus()
      await waitForOracleCallback()

      assert.equal(await cryptoRide.challengeStatus(), 'ongoing')
  })

  it('can be refreshed by Pelotonia', async function () {
      // To be able to query the Oracle, the contract needs some balance
      await cryptoRide.sendTransaction({ value: 1e+18, from: donor1 })

      await cryptoRide.refreshChallengeStatus({ from: Pelotonia })
      await waitForOracleCallback()

      assert.equal(await cryptoRide.challengeStatus(), 'ongoing')
  })

  it('cannot be refreshed by a hacker', async function () {
      // To be able to query the Oracle, the contract needs some balance
      await cryptoRide.sendTransaction({ value: 1e+18, from: donor1 })

      try {
          await cryptoRide.refreshChallengeStatus({ from: hacker })
          assert.fail()
      } catch (error) {
          assert(error.toString().includes('revert'), error.toString())
      }
  })

  it('can be paused by its owner', async function () {
      assert.equal(await cryptoRide.paused(), false)
      await cryptoRide.pause()
      assert.equal(await cryptoRide.paused(), true)
  })

  it('can be paused by Pelotonia', async function () {
      assert.equal(await cryptoRide.paused(), false)
      await cryptoRide.pause({ from: Pelotonia })
      assert.equal(await cryptoRide.paused(), true)
  })

  it('cannot be paused by a hacker', async function () {
      assert.equal(await cryptoRide.paused(), false)

      try {
          await cryptoRide.pause({ from: hacker })
          assert.fail()
      } catch (error) {
          assert(error.toString().includes('revert'), error.toString())
      }

      assert.equal(await cryptoRide.paused(), false)
  })

  it('can be unpaused by its owner', async function () {
      await cryptoRide.pause()
      assert.equal(await cryptoRide.paused(), true)

      await cryptoRide.unpause()
      assert.equal(await cryptoRide.paused(), false)
  })

  it('can be unpaused by Pelotonia', async function () {
      await cryptoRide.pause({ from: Pelotonia })
      assert.equal(await cryptoRide.paused(), true)

      await cryptoRide.unpause({ from: Pelotonia })
      assert.equal(await cryptoRide.paused(), false)
  })

  it('cannot be unpaused by a hacker', async function () {
      await cryptoRide.pause()
      assert.equal(await cryptoRide.paused(), true)

      try {
          await cryptoRide.unpause({ from: hacker })
          assert.fail()
      } catch (error) {
          assert(error.toString().includes('revert'), error.toString())
      }

      assert.equal(await cryptoRide.paused(), true)
  })

  it('cannot be refreshed anymore once ACCOMPLISHED', async function () {
      // To be able to query the Oracle, the contract needs some balance
      await cryptoRide.sendTransaction({ value: 1e+18, from: donor1 })

      await forceOracleStatus('accomplished')
      await cryptoRide.refreshChallengeStatus()
      await waitForOracleCallback()

      try {
          await cryptoRide.refreshChallengeStatus()
          assert.fail()
      } catch (error) {
          assert(error.toString().includes('revert'), error.toString())
      }

      assert.equal(await cryptoRide.challengeStatus(), 'accomplished')
  })

  it('cannot be refreshed anymore once FAILED', async function () {
      // To be able to query the Oracle, the contract needs some balance
      await cryptoRide.sendTransaction({ value: 1e+18, from: donor1 })

      await forceOracleStatus('failed')
      await cryptoRide.refreshChallengeStatus()
      await waitForOracleCallback()

      try {
          await cryptoRide.refreshChallengeStatus()
          assert.fail()
      } catch (error) {
          assert(error.toString().includes('revert'), error.toString())
      }

      assert.equal(await cryptoRide.challengeStatus(), 'failed')
  })

  it('successfully remains in ONGOING status when refreshed if challenge is ongoing', async function() {
      // To be able to query the Oracle, the contract needs some balance
      await cryptoRide.sendTransaction({ value: 1e+18, from: donor1 })

      assert.equal(await cryptoRide.challengeStatus(), 'ongoing')

      await forceOracleStatus('ongoing')

      await cryptoRide.refreshChallengeStatus()
      await waitForOracleCallback()

      assert.equal(await cryptoRide.challengeStatus(), 'ongoing')
  })

  it('successfully updates to ACCOMPLISHED status when refreshed if challenge is accomplished', async function() {
      // To be able to query the Oracle, the contract needs some balance
      await cryptoRide.sendTransaction({ value: 1e+18, from: donor1 })

      assert.equal(await cryptoRide.challengeStatus(), 'ongoing')

      await forceOracleStatus('accomplished')

      await cryptoRide.refreshChallengeStatus()
      await waitForOracleCallback()

      assert.equal(await cryptoRide.challengeStatus(), 'accomplished')
  })

  it('successfully updates to FAILED status when refreshed if challenge is failed', async function() {
      // To be able to query the Oracle, the contract needs some balance
      await cryptoRide.sendTransaction({ value: 1e+18, from: donor1 })

      assert.equal(await cryptoRide.challengeStatus(), 'ongoing')

      await forceOracleStatus('failed')

      await cryptoRide.refreshChallengeStatus()
      await waitForOracleCallback()

      assert.equal(await cryptoRide.challengeStatus(), 'failed')
  })

  it('accepts incoming donations when ONGOING', async function () {
      const donation = 1e+18

      assert.equal(await cryptoRide.totalDonation(), 0)
      assert.equal(await cryptoRide.donorDonations(donor1), 0)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), 0)

      await cryptoRide.sendTransaction({ value: donation, from: donor1 })

      assert.equal(await cryptoRide.totalDonation(), donation)
      assert.equal(await cryptoRide.donorDonations(donor1), donation)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), donation)
  })

  it('does not accept incoming donations when ACCOMPLISHED', async function () {
      const donation = 1e+18
      const donor1BalanceBeforeDonation = web3.eth.getBalance(donor1).toNumber()

      assert.equal(await cryptoRide.totalDonation(), 0)
      assert.equal(await cryptoRide.donorDonations(donor1), 0)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), 0)

      await forceOracleStatus('accomplished')
      await cryptoRide.refreshChallengeStatus()
      await waitForOracleCallback()

      try {
          await cryptoRide.sendTransaction({ value: donation, from: donor1 })
          assert.fail()
      } catch (error) {
          assert(error.toString().includes('revert'), error.toString())
      }

      assert.equal(await cryptoRide.totalDonation(), 0)
      assert.equal(await cryptoRide.donorDonations(donor1), 0)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), 0)
  })

  it('does not accept incoming donations when FAILED', async function () {
      const donation = 1e+18
      const donor1BalanceBeforeDonation = web3.eth.getBalance(donor1).toNumber()

      assert.equal(await cryptoRide.totalDonation(), 0)
      assert.equal(await cryptoRide.donorDonations(donor1), 0)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), 0)

      await forceOracleStatus('failed')
      await cryptoRide.refreshChallengeStatus()
      await waitForOracleCallback()

      try {
          await cryptoRide.sendTransaction({ value: donation, from: donor1 })
          assert.fail()
      } catch (error) {
          assert(error.toString().includes('revert'), error.toString())
      }

      assert.equal(await cryptoRide.totalDonation(), 0)
      assert.equal(await cryptoRide.donorDonations(donor1), 0)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), 0)
  })

  it('does not accept incoming donations when paused', async function () {
      const donation = 1e+18
      const donor1BalanceBeforeDonation = web3.eth.getBalance(donor1).toNumber()

      assert.equal(await cryptoRide.totalDonation(), 0)
      assert.equal(await cryptoRide.donorDonations(donor1), 0)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), 0)

      await cryptoRide.pause()
      assert.equal(await cryptoRide.paused(), true)

      try {
          await cryptoRide.sendTransaction({ value: donation, from: donor1 })
          assert.fail()
      } catch (error) {
          assert(error.toString().includes('revert'), error.toString())
      }

      assert.equal(await cryptoRide.totalDonation(), 0)
      assert.equal(await cryptoRide.donorDonations(donor1), 0)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), 0)
  })

  it('does not allow to withdraw individual donations when ONGOING', async function () {
      const donation = 1e+18

      assert.equal(await cryptoRide.totalDonation(), 0)
      assert.equal(await cryptoRide.donorDonations(donor1), 0)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), 0)

      await cryptoRide.sendTransaction({ value: donation, from: donor1 })

      assert.equal(await cryptoRide.totalDonation(), donation)
      assert.equal(await cryptoRide.donorDonations(donor1), donation)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), donation)

      try {
          await cryptoRide.withdrawDonorDonation({ from: donor1 })
          assert.fail()
      } catch (error) {
          assert(error.toString().includes('revert'), error.toString())
      }

      assert.equal(await cryptoRide.totalDonation(), donation)
      assert.equal(await cryptoRide.donorDonations(donor1), donation)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), donation)
  })

  it('does not allow to withdraw individual donations when ACCOMPLISHED', async function () {
      const donation = 1e+18

      assert.equal(await cryptoRide.totalDonation(), 0)
      assert.equal(await cryptoRide.donorDonations(donor1), 0)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), 0)

      await cryptoRide.sendTransaction({ value: donation, from: donor1 })

      assert.equal(await cryptoRide.totalDonation(), donation)
      assert.equal(await cryptoRide.donorDonations(donor1), donation)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), donation)

      await forceOracleStatus('accomplished')
      await cryptoRide.refreshChallengeStatus()
      await waitForOracleCallback()

      try {
          await cryptoRide.withdrawDonorDonation({ from: donor1 })
          assert.fail()
      } catch (error) {
          assert(error.toString().includes('revert'), error.toString())
      }

      assert.equal(await cryptoRide.totalDonation(), donation)
      assert.equal(await cryptoRide.donorDonations(donor1), donation)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), donation)
  })

  it('does not allow a hacker to withdraw all donations when ACCOMPLISHED', async function () {
      const donation = 1e+18

      assert.equal(await cryptoRide.totalDonation(), 0)
      assert.equal(await cryptoRide.donorDonations(donor1), 0)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), 0)

      await cryptoRide.sendTransaction({ value: donation, from: donor1 })

      assert.equal(await cryptoRide.totalDonation(), donation)
      assert.equal(await cryptoRide.donorDonations(donor1), donation)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), donation)

      await forceOracleStatus('accomplished')
      await cryptoRide.refreshChallengeStatus()
      await waitForOracleCallback()

      try {
          await cryptoRide.withDrawAllDonations({ from: hacker })
          assert.fail()
      } catch (error) {
          assert(error.toString().includes('revert'), error.toString())
      }

      assert.equal(await cryptoRide.totalDonation(), donation)
      assert.equal(await cryptoRide.donorDonations(donor1), donation)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), donation)
  })

  it('does not allow a donor to withdraw all donations when ACCOMPLISHED', async function () {
      const donation = 1e+18

      assert.equal(await cryptoRide.totalDonation(), 0)
      assert.equal(await cryptoRide.donorDonations(donor1), 0)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), 0)

      await cryptoRide.sendTransaction({ value: donation, from: donor1 })

      assert.equal(await cryptoRide.totalDonation(), donation)
      assert.equal(await cryptoRide.donorDonations(donor1), donation)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), donation)

      await forceOracleStatus('accomplished')
      await cryptoRide.refreshChallengeStatus()
      await waitForOracleCallback()

      try {
          await cryptoRide.withDrawAllDonations({ from: donor1 })
          assert.fail()
      } catch (error) {
          assert(error.toString().includes('revert'), error.toString())
      }

      assert.equal(await cryptoRide.totalDonation(), donation)
      assert.equal(await cryptoRide.donorDonations(donor1), donation)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), donation)
  })

  it('does not allow Pelotonia to withdraw all donations when FAILED', async function () {
      const donation = 1e+18

      assert.equal(await cryptoRide.totalDonation(), 0)
      assert.equal(await cryptoRide.donorDonations(donor1), 0)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), 0)

      await cryptoRide.sendTransaction({ value: donation, from: donor1 })

      assert.equal(await cryptoRide.totalDonation(), donation)
      assert.equal(await cryptoRide.donorDonations(donor1), donation)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), donation)

      await forceOracleStatus('failed')
      await cryptoRide.refreshChallengeStatus()
      await waitForOracleCallback()

      try {
          await cryptoRide.withDrawAllDonations({ from: Pelotonia })
          assert.fail()
      } catch (error) {
          assert(error.toString().includes('revert'), error.toString())
      }

      assert.equal(await cryptoRide.totalDonation(), donation)
      assert.equal(await cryptoRide.donorDonations(donor1), donation)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), donation)
  })

  it('does not allow the owner to withdraw all donations when FAILED', async function () {
      const donation = 1e+18

      assert.equal(await cryptoRide.totalDonation(), 0)
      assert.equal(await cryptoRide.donorDonations(donor1), 0)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), 0)

      await cryptoRide.sendTransaction({ value: donation, from: donor1 })

      assert.equal(await cryptoRide.totalDonation(), donation)
      assert.equal(await cryptoRide.donorDonations(donor1), donation)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), donation)

      await forceOracleStatus('failed')
      await cryptoRide.refreshChallengeStatus()
      await waitForOracleCallback()

      try {
          await cryptoRide.withDrawAllDonations({ from: owner })
          assert.fail()
      } catch (error) {
          assert(error.toString().includes('revert'), error.toString())
      }

      assert.equal(await cryptoRide.totalDonation(), donation)
      assert.equal(await cryptoRide.donorDonations(donor1), donation)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), donation)
  })

  it('correctly executes across its full lifecycle, for a successful challenge scenario', async function() {
      const donation1 = 1e+18
      const donation2 = 2e+18
      const totalDonation = donation1 + donation2
      const PelotoniaBalanceBeforeWithDrawal = web3.eth.getBalance(Pelotonia).toNumber()

      await cryptoRide.sendTransaction({ value: donation1, from: donor1 })
      await cryptoRide.sendTransaction({ value: donation2, from: donor2 })

      assert.equal(await cryptoRide.challengeStatus(), 'ongoing')
      assert.equal(await cryptoRide.totalDonation(), totalDonation)
      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), totalDonation)

      await forceOracleStatus('accomplished')
      await cryptoRide.refreshChallengeStatus()
      await waitForOracleCallback()

      assert.equal(await cryptoRide.challengeStatus(), 'accomplished')

      await cryptoRide.withDrawAllDonations()

      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), 0)
      assert.equal(web3.eth.getBalance(Pelotonia).toNumber(), PelotoniaBalanceBeforeWithDrawal + totalDonation)

      assert.equal(await cryptoRide.challengeStatus(), 'accomplished')
  })

  it('correctly executes across its full lifecycle, for a failed challenge scenario', async function () {
      const donation1 = 1e+18
      const donation2 = 2e+18
      const totalDonor1Donation = donation1 + donation2

      const donation3 = 1e+17
      const totalDonor2Donation = donation3

      const totalDonorsDonation = totalDonor1Donation + totalDonor2Donation

      const donor1BalanceBeforeDonation = web3.eth.getBalance(donor1).toNumber()
      const donor2BalanceBeforeDonation = web3.eth.getBalance(donor2).toNumber()

      const donationReceipt1 = await cryptoRide.sendTransaction({ value: donation1, from: donor1 })
      const donationReceipt2 = await cryptoRide.sendTransaction({ value: donation2, from: donor1 })
      const donationReceipt3 = await cryptoRide.sendTransaction({ value: donation3, from: donor2 })

      assert.equal(await cryptoRide.donorDonations(donor1), totalDonor1Donation)
      assert.equal(await cryptoRide.donorDonations(donor2), totalDonor2Donation)
      assert.equal(await cryptoRide.totalDonation(), totalDonorsDonation)

      await forceOracleStatus('failed')
      await cryptoRide.refreshChallengeStatus()
      await waitForOracleCallback()

      const withdrawalReceipt1 = await cryptoRide.withdrawDonorDonation({ from: donor1 })
      const withdrawalReceipt2 = await cryptoRide.withdrawDonorDonation({ from: donor2 })

      assert.equal(web3.eth.getBalance(cryptoRideAddress).toNumber(), 0)

      const donationTransactionCost1 = await getTransactionCost(donationReceipt1)
      const donationTransactionCost2 = await getTransactionCost(donationReceipt2)
      const donationTransactionCost3 = await getTransactionCost(donationReceipt3)

      const withdrawalTransactionCost1 = await getTransactionCost(withdrawalReceipt1)
      const withdrawalTransactionCost2 = await getTransactionCost(withdrawalReceipt2)

      assert.equal(web3.eth.getBalance(donor1).toNumber(), donor1BalanceBeforeDonation - donationTransactionCost1 - donationTransactionCost2 - withdrawalTransactionCost1)
      assert.equal(web3.eth.getBalance(donor2).toNumber(), donor2BalanceBeforeDonation - donationTransactionCost3 - withdrawalTransactionCost2)
  })

  /*
   * Helper to get the cost of a transaction - note that we need to gather
   * the necessary input for calculation from 2 different sources...
  */
  async function getTransactionCost(receipt) {
    const gasUsed = receipt.receipt.gasUsed
    const tx = await web3.eth.getTransaction(receipt.tx)
    const gasPrice = tx.gasPrice

    return gasUsed * gasPrice
  }

  /*
   * Helper to wait for Oracle callback
  */
  async function waitForOracleCallback() {
      await promisifyLogWatch(cryptoRide.LogChallengeStatusRefreshed({ fromBlock: 'latest' }))
  }

  /*
  * Helper to remotely update the test Oracle endpoint
  */
  async function forceOracleStatus(status) {
      const util = require('util')
      const exec = util.promisify(require('child_process').exec)

      const awsCliCommand = 'aws lambda update-function-configuration --profile cryptizens-lambdas-deployer --function-name cryptoRideTest --environment Variables={status=' + status + '}'

      const { stdout, stderr } = await exec(awsCliCommand)
  }

  /*
  * @credit https://github.com/AdamJLemmon
  * Helper to wait for log emission. * @param {Object} _event The event to wait for.
  */
  function promisifyLogWatch(_event) {
    return new Promise((resolve, reject) => {
      _event.watch((error, log) => {
        _event.stopWatching();
        if (error !== null)
        reject(error)
        resolve(log)
  }) })}
})
