'use strict';

var chai = require('chai');
var chaiHttp = require('chai-http');
var app = require('../src/app');

chai.use(chaiHttp);

describe('Jobs Test', () => {
  describe('GET /jobs/unpaid', () => {
    it('should return status 401 when called without profile_id header', (done) => {
      chai.request(app)
        .get('/contracts/1')
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
});
