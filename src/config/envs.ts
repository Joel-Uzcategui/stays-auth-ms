import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  DATABASE_URL: string;
  RABBITMQ_URL: string;
  RABBITMQ_QUEUE: string;
  JWT_PRIVATE_KEY: string;
  JWT_PUBLIC_KEY: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN_DAYS: number;
}

const envsSchema = joi
  .object({
    DATABASE_URL: joi.string().required(),
    RABBITMQ_URL: joi.string().required(),
    RABBITMQ_QUEUE: joi.string().required(),
    JWT_PRIVATE_KEY: joi.string().base64().required(),
    JWT_PUBLIC_KEY: joi.string().base64().required(),
    JWT_ACCESS_EXPIRES_IN: joi.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN_DAYS: joi.number().default(30),
  })
  .unknown(true);

const result = envsSchema.validate(process.env) as {
  error?: joi.ValidationError;
  value: EnvVars;
};

if (result.error) {
  throw new Error(`Config validation error: ${result.error.message}`);
}

const envVars = result.value;

const decodePem = (base64: string) =>
  Buffer.from(base64, 'base64').toString('utf8');

export const envs = {
  databaseUrl: envVars.DATABASE_URL,
  rabbitmqUrl: envVars.RABBITMQ_URL,
  rabbitmqQueue: envVars.RABBITMQ_QUEUE,
  jwtPrivateKey: decodePem(envVars.JWT_PRIVATE_KEY),
  jwtPublicKey: decodePem(envVars.JWT_PUBLIC_KEY),
  jwtAccessExpiresIn: envVars.JWT_ACCESS_EXPIRES_IN,
  jwtRefreshExpiresInDays: envVars.JWT_REFRESH_EXPIRES_IN_DAYS,
};
