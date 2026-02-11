const Joi = require('joi');

const shareWalletSchema = Joi.object({
  email: Joi.string().email().required(),
  permission_level: Joi.string().valid('read', 'write', 'admin').required()
});

const updateSharedWalletSchema = Joi.object({
  permission_level: Joi.string().valid('read', 'write', 'admin').optional()
});

module.exports = {
  shareWalletSchema,
  updateSharedWalletSchema
};