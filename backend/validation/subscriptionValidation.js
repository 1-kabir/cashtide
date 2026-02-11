const Joi = require('joi');

const createSubscriptionSchema = Joi.object({
  name: Joi.string().max(255).required(),
  amount: Joi.number().precision(2).positive().required(),
  currency: Joi.string().length(3).uppercase().required(),
  interval_type: Joi.string().valid('weekly', 'monthly', 'yearly').required(),
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().greater(Joi.ref('start_date')).optional(),
  notes: Joi.string().max(1000).allow('').optional(),
  status: Joi.string().valid('active', 'cancelled', 'expired').default('active')
});

const updateSubscriptionSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  amount: Joi.number().precision(2).positive().optional(),
  currency: Joi.string().length(3).uppercase().optional(),
  interval_type: Joi.string().valid('weekly', 'monthly', 'yearly').optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().greater(Joi.ref('start_date')).optional(),
  notes: Joi.string().max(1000).allow('').optional(),
  status: Joi.string().valid('active', 'cancelled', 'expired').optional()
});

module.exports = {
  createSubscriptionSchema,
  updateSubscriptionSchema
};