'use strict';

var chai = require('chai');
var chaiHttp = require('chai-http');
var app = require('../src/app');

chai.use(chaiHttp);

describe('Balances Test', () => {
  describe('POST /balances/deposit/:userId', () => {
    it('should return status 401 when called without profile_id header', (done) => {
      chai.request(app)
        .post('/balances/deposit/1')
        .send({
          addedBalance: 1
        })
        .end((err, res) => {
          chai.assert.strictEqual(
            res.status,
            401,
            'Status was not 401'
          );

          done(err);
        });
    });

    it('should return status 401 if trying to add balance with a contractor profile', (done) => {
      chai.request(app)
        .post('/balances/deposit/5')
        .set('profile_id', 5)
        .send({
          addedBalance: 1
        })
        .end((err, res) => {
          chai.assert.strictEqual(
            res.status,
            401,
            'Status was not 401'
          );

          done(err);
        });
    });

    it('should return status 401 if trying to add balance with a client profile that \
      isn\'t the requested one', (done) => {
      chai.request(app)
        .post('/balances/deposit/1')
        .set('profile_id', 2)
        .send({
          addedBalance: 1
        })
        .end((err, res) => {
          chai.assert.strictEqual(
            res.status,
            401,
            'Status was not 401'
          );

          done(err);
        });
    });

    it('should return error if trying to add more balance than allowed (25% of total to pay)', (done) => {
      chai.request(app)
        .post('/balances/deposit/1')
        .set('profile_id', 1)
        .send({
          addedBalance: 300
        })
        .end((err, res) => {
          chai.assert.strictEqual(
            res.status,
            401,
            'Status was not 401'
          );

          chai.assert.deepEqual(
            res.body, 
            { result: 'EXCEEDED_25_PERCENT' }, 
            'Response didn\'t have EXCEEDED_25_PERCENT error'
          );

          done(err);
        });
    });

    it('should return ok if trying to add less than 25% of total to pay as balance', (done) => {
      chai.request(app)
        .post('/balances/deposit/1')
        .set('profile_id', 1)
        .send({
          addedBalance: 80
        })
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
          chai.assert.equal(client.balance, 1230, 'Client didn\'t have expected balance');

          done(err);
        });
    });
  });
});
