import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  DATABASE_URL: string;
  RABBITMQ_URL: string;
  RABBITMQ_QUEUE: string;
  JWT_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN_DAYS: number;
}

const envsSchema = joi
  .object({
    DATABASE_URL: joi.string().required(),
    RABBITMQ_URL: joi.string().required(),
    RABBITMQ_QUEUE: joi.string().required(),
    JWT_SECRET: joi.string().min(16).required(),
    JWT_ACCESS_EXPIRES_IN: joi.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN_DAYS: joi.number().default(30),
  })
  .unknown(true);

const { error, value } = envsSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value as EnvVars;

export const envs = {
  databaseUrl: envVars.DATABASE_URL,
  rabbitmqUrl: envVars.RABBITMQ_URL,
  rabbitmqQueue: envVars.RABBITMQ_QUEUE,
  jwtSecret: envVars.JWT_SECRET,
  jwtAccessExpiresIn: envVars.JWT_ACCESS_EXPIRES_IN,
  jwtRefreshExpiresInDays: envVars.JWT_REFRESH_EXPIRES_IN_DAYS,
};
