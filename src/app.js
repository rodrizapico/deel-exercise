const express = require('express');
const bodyParser = require('body-parser');
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
 * @returns wether the job was successfuly paid for.
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

    res.json({ result: 'OK' });
});



module.exports = app;
