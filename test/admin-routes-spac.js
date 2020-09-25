'use strict';

var chai = require('chai');
var chaiHttp = require('chai-http');
var app = require('../src/app');

chai.use(chaiHttp);

describe('Admin Test', () => {
  describe('GET /admin/best-profession?start=<date>&end=<date>', () => {

    it('should return best profession in date range', (done) => {
      chai.request(app)
        .get('/admin/best-profession?start=2020-08-10&end=2020-08-14')
        .end((err, res) => {
          chai.assert.strictEqual(
            res.status,
            200,
            'Status was not 200'
          );

          console.log(res.body);

          chai.assert.deepEqual(
            res.body, 
            { bestProfession: 'Programmer' }, 
            'Response wasn\'t expected profession'
          );

          done(err);
        });
    });
  });
});
