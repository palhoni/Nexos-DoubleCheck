import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({
  allErrors: true,
  strict: true,
});

addFormats(ajv);

export function compileContract(schema: object): ValidateFunction {
  return ajv.compile(schema);
}

export function formatContractErrors(errors: ErrorObject[] | null | undefined): string {
  if (!errors?.length) {
    return 'No contract errors';
  }

  return errors
    .map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`)
    .join('\n');
}
