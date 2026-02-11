const Joi = require('joi');

const createWalletSchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().max(1000).allow('').optional(),
  primary_currency: Joi.string().length(3).uppercase().required(),
  currencies: Joi.array().items(Joi.string().length(3).uppercase()).required()
});

const updateWalletSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  description: Joi.string().max(1000).allow('').optional(),
  primary_currency: Joi.string().length(3).uppercase().optional()
});

module.exports = {
  createWalletSchema,
  updateWalletSchema
};