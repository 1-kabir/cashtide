const Joi = require('joi');

const createTransactionSchema = Joi.object({
  type: Joi.string().valid('income', 'expense', 'transfer', 'subscription', 'free_trial').required(),
  amount: Joi.number().precision(2).positive().required(),
  currency: Joi.string().length(3).uppercase().required(),
  notes: Joi.string().max(1000).allow('').optional(),
  url_reference: Joi.string().uri().allow('').optional(),
  date: Joi.date().iso().optional() // defaults to now if not provided
});

const updateTransactionSchema = Joi.object({
  type: Joi.string().valid('income', 'expense', 'transfer', 'subscription', 'free_trial').optional(),
  amount: Joi.number().precision(2).positive().optional(),
  currency: Joi.string().length(3).uppercase().optional(),
  notes: Joi.string().max(1000).allow('').optional(),
  url_reference: Joi.string().uri().allow('').optional(),
  date: Joi.date().iso().optional()
});

module.exports = {
  createTransactionSchema,
  updateTransactionSchema
};