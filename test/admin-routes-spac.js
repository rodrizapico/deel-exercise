'use strict';

var chai = require('chai');
var chaiHttp = require('chai-http');
var app = require('../src/app');

chai.use(chaiHttp);

describe('Admin Test', () => {
  describe('GET /admin/best-profession?start=<date>&end=<date>', () => {

    it('should return best profession in date range', (done) => {
      chai.request(app)
        .get('/admin/best-profession?start=2020-08-10&end=2020-08-20')
        .end((err, res) => {
          chai.assert.strictEqual(
            res.status,
            200,
            'Status was not 200'
          );

          chai.assert.deepEqual(
            res.body, 
            { bestProfession: 'Programmer' }, 
            'Response wasn\'t expected profession'
          );

          done(err);
        });
    });
  });

  describe('GET /admin/best-clients?start=<date>&end=<date>&limit=<integer>', () => {

    it('should return best clients in date range', (done) => {
      chai.request(app)
        .get('/admin/best-clients?start=2020-08-10&end=2020-08-20&limit=3')
        .end((err, res) => {
          chai.assert.strictEqual(
            res.status,
            200,
            'Status was not 200'
          );

          chai.assert.deepEqual(
            res.body, 
            [
              { id: 4, fullName: 'Ash Kethcum', paid: 2020 },
              { id: 2, fullName: 'Mr Robot', paid: 442 },
              { id: 1, fullName: 'Harry Potter', paid: 442 }
            ],
            'Response wasn\'t expected clients'
          );

          done(err);
        });
    });
  });
});
