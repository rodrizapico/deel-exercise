'use strict';

var chai = require('chai');
var chaiHttp = require('chai-http');
var app = require('../src/app');

chai.use(chaiHttp);

describe('Jobs Test', () => {
  describe('GET /jobs/unpaid', () => {
    it('should return status 401 when called without profile_id header', (done) => {
      chai.request(app)
        .get('/jobs/unpaid')
        .end((err, res) => {
          chai.assert.strictEqual(
            res.status,
            401,
            'Status was not 401'
          );

          done(err);
        });
    });

    it('should return unpaid jobs from active contracts (client)', (done) => {
      chai.request(app)
        .get('/jobs/unpaid')
        .set('profile_id', 1)
        .end((err, res) => {
          chai.assert.strictEqual(
            res.status,
            200,
            'Status was not 200'
          );

          chai.assert.lengthOf(res.body, 1, 'Response didn\'t have expected length');
          const job = {price: res.body[0].price, contractId: res.body[0].ContractId};
          chai.assert.deepEqual(
            job, 
            { price: 201, contractId: 2 }, 
            'Response didn\'t have expected jobs'
          );

          done(err);
        });
    });

    it('should return unpaid jobs from active contracts (contractor)', (done) => {
      chai.request(app)
        .get('/jobs/unpaid')
        .set('profile_id', 6)
        .end((err, res) => {
          chai.assert.strictEqual(
            res.status,
            200,
            'Status was not 200'
          );

          chai.assert.lengthOf(res.body, 2, 'Response didn\'t have expected length');

          const jobs = [
            {price: res.body[0].price, contractId: res.body[0].ContractId},
            {price: res.body[1].price, contractId: res.body[1].ContractId}
          ];
          chai.assert.deepEqual(
            jobs, 
            [{ price: 201, contractId: 2 }, { price: 202, contractId: 3 }], 
            'Response didn\'t have expected jobs'
          );

          done(err);
        });
    });
  });

  describe('POST /jobs/:job_id/pay', () => {
    it('should return status 401 when called without profile_id header', (done) => {
      chai.request(app)
        .post('/jobs/1/pay')
        .end((err, res) => {
          chai.assert.strictEqual(
            res.status,
            401,
            'Status was not 401'
          );

          done(err);
        });
    });

    it('should return status 401 if trying to pay with a contractor profile', (done) => {
      chai.request(app)
        .post('/jobs/1/pay')
        .set('profile_id', 5)
        .end((err, res) => {
          chai.assert.strictEqual(
            res.status,
            401,
            'Status was not 401'
          );

          done(err);
        });
    });

    it('should return status 401 if trying to pay with a client profile that isn\'t associated to the \
      job', (done) => {
      chai.request(app)
        .post('/jobs/1/pay')
        .set('profile_id', 2)
        .end((err, res) => {
          chai.assert.strictEqual(
            res.status,
            401,
            'Status was not 401'
          );

          done(err);
        });
    });

    it('should return error if trying to pay with the right client but job is already paid', (done) => {
      chai.request(app)
        .post('/jobs/6/pay')
        .set('profile_id', 4)
        .end((err, res) => {
          chai.assert.strictEqual(
            res.status,
            401,
            'Status was not 401'
          );

          chai.assert.deepEqual(
            res.body, 
            { result: 'ALREADY_PAID' }, 
            'Response didn\'t have ALREADY_PAID error'
          );

          done(err);
        });
    });

    it('should return error if trying to pay with the right client but not enough balance', (done) => {
      chai.request(app)
        .post('/jobs/5/pay')
        .set('profile_id', 4)
        .end((err, res) => {
          chai.assert.strictEqual(
            res.status,
            401,
            'Status was not 401'
          );

          chai.assert.deepEqual(
            res.body, 
            { result: 'NOT_ENOUGH_BALANCE' }, 
            'Response didn\'t have NOT_ENOUGH_BALANCE error'
          );

          done(err);
        });
    });

    it('should return ok if trying to pay with the right client and he has enough balance', (done) => {
      chai.request(app)
        .post('/jobs/1/pay')
        .set('profile_id', 1)
        .end(async (err, res) => {
          chai.assert.strictEqual(
            res.status,
            200,
            'Status was not 200'
          );

          chai.assert.deepEqual(
            res.body, 
            { result: 'OK' }, 
            'Response didn\'t have OK status'
          );

          const {Profile} = app.get('models');
          const client = await Profile.findOne({ where: { id: 1 } });
          const contractor = await Profile.findOne({ where: { id: 5 } });

          chai.assert.equal(client.balance, 950, 'Client didn\'t have expected balance');
          chai.assert.equal(contractor.balance, 264, 'Contractor didn\'t have expected balance');

          done(err);
        });
    });

  });
});
