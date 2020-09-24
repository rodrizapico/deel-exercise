'use strict';

var chai = require('chai');
var chaiHttp = require('chai-http');
var app = require('../src/app');

chai.use(chaiHttp);

describe('Contract Test', () => {
  describe('GET /contract/:id', () => {
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

    it('should return status 401 when called with the wrong profile_id header', (done) => {
      chai.request(app)
        .get('/contracts/1')
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

    it('should return the contract when called with the right profile_id header (client)', (done) => {
      chai.request(app)
        .get('/contracts/1')
        .set('profile_id', 1)
        .end((err, res) => {
          chai.assert.strictEqual(
            res.status,
            200,
            'Status was not 200'
          );

          // Remove the timestamps and compare to see if we got the right contract.
          delete res.body.createdAt;
          delete res.body.updatedAt;
          chai.assert.deepEqual(
            res.body,
            {
              id:1,
              terms: 'bla bla bla',
              status: 'terminated',
              ClientId: 1,
              ContractorId:5
            },
            'Response was not what was expected'
          );
          done(err);
        });
    });

    it('should return the contract when called with the right profile_id header (contractor)', (done) => {
      chai.request(app)
        .get('/contracts/1')
        .set('profile_id', 5)
        .end((err, res) => {
          chai.assert.strictEqual(
            res.status,
            200,
            'Status was not 200'
          );

          // Remove the timestamps and compare to see if we got the right contract.
          delete res.body.createdAt;
          delete res.body.updatedAt;
          chai.assert.deepEqual(
            res.body,
            {
              id:1,
              terms: 'bla bla bla',
              status: 'terminated',
              ClientId: 1,
              ContractorId:5
            },
            'Response was not what was expected'
          );
          done(err);
        });
    });
  });
});
