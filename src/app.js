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

module.exports = app;
