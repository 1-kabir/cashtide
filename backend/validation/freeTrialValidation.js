const Joi = require('joi');

const createFreeTrialSchema = Joi.object({
  name: Joi.string().max(255).required(),
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().greater(Joi.ref('start_date')).required(),
  notes: Joi.string().max(1000).allow('').optional(),
  related_subscription_id: Joi.string().uuid().optional()
});

const updateFreeTrialSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().greater(Joi.ref('start_date')).optional(),
  notes: Joi.string().max(1000).allow('').optional(),
  status: Joi.string().valid('active', 'expired', 'converted', 'cancelled').optional(),
  related_subscription_id: Joi.string().uuid().optional()
});

module.exports = {
  createFreeTrialSchema,
  updateFreeTrialSchema
};