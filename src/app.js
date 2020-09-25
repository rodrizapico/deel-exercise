const express = require('express');
const bodyParser = require('body-parser');
const moment = require('moment');
const {sequelize} = require('./model');
const {getProfile} = require('./middleware/getProfile');
const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize);
app.set('models', sequelize.models);

/**
 * @returns contract by id.
 */
app.get('/contracts/:id', getProfile, async (req, res) =>{
    const {Contract} = req.app.get('models');
    const {id} = req.params;
    const profileId = req.profile.id;
    const contract = await Contract.findOne({where: {id}});

    if(!contract) 
      return res.status(404).end();
    else if (contract.ClientId != profileId && contract.ContractorId !== profileId)
      return res.status(401).end();
    res.json(contract);
});

/**
 * @returns contracts for requesting user.
 */
app.get('/contracts', getProfile, async (req, res) =>{
    const {Contract} = req.app.get('models');
    const profileId = req.profile.id;
    const contracts = await Contract.findAll({
      where: {
        [app.get('sequelize').Op.or]: [
          {ClientId: profileId},
          {ContractorId: profileId}
        ],
        status: {
          [app.get('sequelize').Op.not]: 'terminated',
        }
      }
    });

    res.json(contracts);
});

/**
 * @returns unpaid jobs for requesting user.
 */
app.get('/jobs/unpaid', getProfile, async (req, res) =>{
    const {Job, Contract} = req.app.get('models');

    const profileId = req.profile.id;
    const jobs = await Job.findAll({
      where: { paid: { [app.get('sequelize').Op.not]: true } },
      include: [
        {
          model: Contract,
          attributes: [],
          where: {
            [app.get('sequelize').Op.or]: [
              {ClientId: profileId},
              {ContractorId: profileId}
            ],
            status: 'in_progress'
          }
        }
      ]
    });

    res.json(jobs);
});

/**
 * @returns whether the job was successfuly paid for.
 */
app.post('/jobs/:job_id/pay', getProfile, async (req, res) =>{
    const {Job, Contract} = req.app.get('models');

    if (req.profile.type === 'contractor')
      return res.status(401).end();

    const job = await Job.findOne({
      where: { id: req.params.job_id },
      include: [ Contract ]
    });

    const profileId = req.profile.id;
    if (job.Contract.ClientId !== profileId)
      return res.status(401).end();
    else if (job.paid)
      return res.status(401).json({ result: 'ALREADY_PAID' });
    else if (job.price > req.profile.balance)
      return res.status(401).json({ result: 'NOT_ENOUGH_BALANCE' });

    // TODO: should add a try/catch here to check for errors.
    var contractor = await job.Contract.getContractor();
    contractor.balance += job.price;
    await contractor.save();

    req.profile.balance -= job.price;
    await req.profile.save();

    job.paid = true;
    await job.save();

    res.json({ result: 'OK' });
});

/**
 * @returns whether the balance was successfuly added.
 */
app.post('/balances/deposit/:userId', getProfile, async (req, res) =>{
    const {Job, Contract} = req.app.get('models');
    const profileId = req.profile.id;

    if (req.profile.type === 'contractor' || profileId != req.params.userId)
      return res.status(401).end();

    const jobs = await Job.findAll({
      where: { paid: { [app.get('sequelize').Op.not]: true } },
      include: [
        {
          model: Contract,
          attributes: [],
          where: {ClientId: profileId},
        }
      ]
    });

    const totalDue = jobs.reduce((accum, job) => accum + job.price, 0);

    if (req.body.addedBalance > totalDue / 4)
      return res.status(401).json({ result: 'EXCEEDED_25_PERCENT' });

    // TODO: should add a try/catch here to check for errors.
    req.profile.balance += req.body.addedBalance;
    await req.profile.save();

    res.json({ result: 'OK' });
});

/**
 * @returns the profession that earned most in the given time period.
 */
app.get('/admin/best-profession', async (req, res) =>{
    const { Job, Contract, Profile } = req.app.get('models');

    const fromDate = req.query.start;
    const toDate = req.query.end;

    const earningsPerProfession = await Profile.findAll({
      where: { type: 'contractor' },
      attributes: [ 'profession' ],
      include: [{ 
        model: Contract,
        as: 'Contractor',
        required: true,
        attributes: [],
        include: [{
          model: Job,
          required: true,
          attributes: [
            [app.get('sequelize').fn('sum', app.get('sequelize').col('price')), 'earnings'],
          ],
          where: {
            paymentDate: {
              [app.get('sequelize').Op.gt]: moment(fromDate, 'YYYY-MM-DD').startOf('day'),
              [app.get('sequelize').Op.lt]: moment(toDate, 'YYYY-MM-DD').endOf('day'),
            },
          }
        }]
      }],
      group: ['profession'],
      raw: true
    });

    // Couldn't manage to get the 'order by' working at the same time as group with Sequelize 
    // quickly, so to save time I just get the group results and find the best profession for 
    // the period myself.
    const topProfession = earningsPerProfession.map((profEarnings) => {
      return {
        profession: profEarnings.profession, 
        earnings: profEarnings['Contractor.Jobs.earnings']  
      };
    }).reduce((accum, profEarnings) => profEarnings.earnings > accum.earnings ? profEarnings : accum)


    res.json({ bestProfession: topProfession.profession });
});

/**
 * @returns the clieents that paied the most in the given time period.
 */
app.get('/admin/best-clients', async (req, res) =>{
    const { Job, Contract, Profile } = req.app.get('models');

    const fromDate = req.query.start;
    const toDate = req.query.end;
    const limit = req.query.limit || 2;

    var bestClients = await Profile.findAll({
      where: { type: 'client' },
      attributes: [ 'id', 'firstName', 'lastName' ],
      include: [{ 
        model: Contract,
        as: 'Client',
        required: true,
        attributes: [],
        include: [{
          model: Job,
          required: true,
          attributes: [
            [app.get('sequelize').fn('sum', app.get('sequelize').col('price')), 'paid'],
          ],
          where: {
            paymentDate: {
              [app.get('sequelize').Op.gt]: moment(fromDate, 'YYYY-MM-DD').startOf('day'),
              [app.get('sequelize').Op.lt]: moment(toDate, 'YYYY-MM-DD').endOf('day'),
            },
          }
        }]
      }],
      group: ['Profile.id'],
      
      // This syntax (as reccomended by Sequelize's documentation) is ignored and 
      // just orders by descending profile id.
      // order: [[Profile.associations.Client, Contract.associations.Jobs, 'paid', 'DESC']],
      // So instead I'm using this literal syntax that works.
      order: app.get('sequelize').literal('`Client.Jobs.paid` DESC'),
      // However, when using the literal syntax, trying to use limit at the same time
      // breaks everything, so I'll just limit it by hand after the query. 
      // In real production code I wouldn't do this, but for this exercise it should 
      // be fine.
      // limit: limit,
      raw: true
    });

    bestClients = bestClients.map((client) => {
      return {
        id: client.id,
        fullName: client.firstName + ' ' + client.lastName,
        paid: client['Client.Jobs.paid']
      };
    });

    res.json(bestClients.slice(0, limit));
});



module.exports = app;
